<?php

namespace App\Http\Controllers;

use App\Models\Kebun;
use App\Models\Blok;
use App\Models\SensorReading;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class KebunController extends Controller
{
    /**
     * Display the kebun monitoring page
     */
    public function index(Request $request): Response
    {
        $user = Auth::user();
        
        // Get kebuns based on user role
        if ($user->role === 'k-petani') {
            // K-Petani sees kebuns they own
            $kebuns = Kebun::where('owner_id', $user->id)
                ->with(['bloks' => function($query) {
                    $query->orderBy('code');
                }])
                ->get();
        } else {
            // Petani sees kebuns owned by K-Petani users
            $kebuns = Kebun::whereHas('owner', function($query) {
                $query->where('role', 'k-petani');
            })
            ->with(['bloks' => function($query) {
                $query->orderBy('code');
            }])
            ->get();
        }
        
        // Process kebuns and bloks with sensor data
        $kebunsData = $kebuns->map(function($kebun) {
            $bloks = $kebun->bloks->map(function($blok) {
                // Get latest sensor readings for this blok
                $latestReadings = SensorReading::where('blok_id', $blok->id)
                    ->orderBy('reading_time', 'desc')
                    ->take(3)
                    ->get();
                
                $suhu = null;
                $kelembapan = null;
                $kelembapanTanah = null;
                
                foreach ($latestReadings as $reading) {
                    if ($reading->sensor_type === 'suhu_udara' && $suhu === null) {
                        $suhu = round($reading->value, 1);
                    }
                    if ($reading->sensor_type === 'kelembapan_udara' && $kelembapan === null) {
                        $kelembapan = round($reading->value, 1);
                    }
                    if ($reading->sensor_type === 'kelembapan_tanah' && $kelembapanTanah === null) {
                        $kelembapanTanah = round($reading->value, 1);
                    }
                }
                
                // Determine status based on sensor data or default
                $status = $blok->status ?? 'sehat';
                
                // If kelembapan is low, set to 'perhatian'
                if ($kelembapan !== null && $kelembapan < 50) {
                    $status = 'perhatian';
                }
                
                return [
                    'id' => $blok->id,
                    'code' => $blok->code,
                    'name' => $blok->name,
                    'status' => $status,
                    'suhu' => $suhu ?? 27, // Default temperature
                    'kelembapan' => $kelembapan ?? 70, // Default humidity
                    'kelembapanTanah' => $kelembapanTanah, // Can be null if no data
                    'trees' => $blok->jumlah_pohon ?? 20, // Default trees
                    'luas' => $blok->luas ?? 0,
                ];
            });
            
            return [
                'id' => $kebun->id,
                'name' => $kebun->name,
                'description' => $kebun->description,
                'location' => $kebun->location,
                'luas' => $kebun->luas ?? 0,
                'bloks' => $bloks,
            ];
        });
        
        // Calculate summary stats
        $allBloks = $kebuns->flatMap->bloks;
        $summary = [
            'total_kebun' => $kebuns->count(),
            'total_blok' => $allBloks->count(),
            'total_pohon' => $allBloks->sum('jumlah_pohon') ?? 0,
            'blok_sehat' => $allBloks->where('status', 'sehat')->count(),
            'blok_siap_panen' => $allBloks->where('status', 'siap-panen')->count(),
            'blok_perhatian' => $allBloks->where('status', 'perhatian')->count(),
        ];
        
        return Inertia::render('KebunMonitoring', [
            'kebuns' => $kebunsData,
            'summary' => $summary,
        ]);
    }

    /**
     * Show the form for creating a new kebun
     */
    public function create(): Response
    {
        return Inertia::render('Kebun/Create');
    }

    /**
     * Store a newly created kebun
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'location' => 'required|string|max:255',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'luas' => 'nullable|numeric|min:0',
            'jenis_mangga' => 'nullable|string|max:255',
        ]);

        $user = Auth::user();

        $kebun = Kebun::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'location' => $validated['location'],
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'luas' => $validated['luas'] ?? 0,
            'jenis_mangga' => $validated['jenis_mangga'] ?? null,
            'owner_id' => $user->id,
            'status' => 'active',
        ]);

        return redirect()->route('kebun')
            ->with('success', 'Kebun berhasil dibuat: ' . $kebun->name);
    }

    /**
     * Show the form for editing the specified kebun
     */
    public function edit(Kebun $kebun): Response
    {
        // Ensure user owns this kebun (for K-Petani)
        $user = Auth::user();
        if ($user->role === 'k-petani' && $kebun->owner_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        return Inertia::render('Kebun/Edit', [
            'kebun' => $kebun,
        ]);
    }

    /**
     * Update the specified kebun
     */
    public function update(Request $request, Kebun $kebun): RedirectResponse
    {
        // Ensure user owns this kebun (for K-Petani)
        $user = Auth::user();
        if ($user->role === 'k-petani' && $kebun->owner_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'location' => 'required|string|max:255',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'luas' => 'nullable|numeric|min:0',
            'jenis_mangga' => 'nullable|string|max:255',
            'status' => 'nullable|in:active,inactive,maintenance',
        ]);

        $kebun->update($validated);

        return redirect()->route('kebun')
            ->with('success', 'Kebun berhasil diperbarui.');
    }

    /**
     * Remove the specified kebun
     */
    public function destroy(Kebun $kebun): RedirectResponse
    {
        // Ensure user owns this kebun (for K-Petani)
        $user = Auth::user();
        if ($user->role === 'k-petani' && $kebun->owner_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        // Check if kebun has bloks
        if ($kebun->bloks()->count() > 0) {
            return redirect()->back()
                ->withErrors(['kebun' => 'Kebun yang memiliki blok tidak dapat dihapus. Hapus semua blok terlebih dahulu.']);
        }

        $kebun->delete();

        return redirect()->route('kebun')
            ->with('success', 'Kebun berhasil dihapus.');
    }
}
