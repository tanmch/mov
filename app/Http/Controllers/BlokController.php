<?php

namespace App\Http\Controllers;

use App\Models\Blok;
use App\Models\Kebun;
use App\Services\FirebaseSyncService;
use App\Services\FirebaseService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class BlokController extends Controller
{
    protected $firebaseSync;
    protected $firebase;

    public function __construct(FirebaseSyncService $firebaseSync, FirebaseService $firebase)
    {
        $this->firebaseSync = $firebaseSync;
        $this->firebase = $firebase;
    }

    /**
     * Show the form for creating a new blok
     */
    public function create(Request $request): Response
    {
        $user = Auth::user();
        $kebunId = $request->get('kebun_id');

        // Get kebuns that user can access
        if ($user->role === 'k-petani') {
            $kebuns = Kebun::where('owner_id', $user->id)->get();
        } else {
            $kebuns = Kebun::whereHas('owner', function($query) {
                $query->where('role', 'k-petani');
            })->get();
        }

        return Inertia::render('Blok/Create', [
            'kebuns' => $kebuns,
            'selectedKebunId' => $kebunId,
        ]);
    }

    /**
     * Store a newly created blok
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'kebun_id' => 'required|exists:kebuns,id',
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'luas' => 'nullable|numeric|min:0',
            'jumlah_pohon' => 'nullable|integer|min:0',
            'status' => 'nullable|in:sehat,perlu_perhatian,maintenance',
        ]);

        // Ensure user has access to this kebun
        $user = Auth::user();
        $kebun = Kebun::findOrFail($validated['kebun_id']);
        
        if ($user->role === 'k-petani' && $kebun->owner_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        // Check if code already exists for this kebun
        $existingBlok = Blok::where('kebun_id', $validated['kebun_id'])
            ->where('code', $validated['code'])
            ->first();

        if ($existingBlok) {
            return back()->withErrors(['code' => 'Kode blok sudah digunakan untuk kebun ini.'])->withInput();
        }

        $blok = Blok::create([
            'kebun_id' => $validated['kebun_id'],
            'code' => $validated['code'],
            'name' => $validated['name'],
            'luas' => $validated['luas'] ?? 0,
            'jumlah_pohon' => $validated['jumlah_pohon'] ?? 0,
            'status' => $validated['status'] ?? 'sehat',
        ]);

        // Sync to Firebase
        try {
            $this->firebaseSync->initializeBlokInFirebase($blok);
        } catch (\Exception $e) {
            Log::error('Failed to sync blok to Firebase', [
                'blok_id' => $blok->id,
                'error' => $e->getMessage()
            ]);
            // Continue even if Firebase sync fails
        }

        return redirect()->route('kebun')
            ->with('success', 'Blok berhasil dibuat: ' . $blok->code);
    }

    /**
     * Show the form for editing the specified blok
     */
    public function edit(Blok $blok): Response
    {
        // Ensure user has access to this blok's kebun
        $user = Auth::user();
        $kebun = $blok->kebun;
        
        if ($user->role === 'k-petani' && $kebun->owner_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        // Get kebuns that user can access
        if ($user->role === 'k-petani') {
            $kebuns = Kebun::where('owner_id', $user->id)->get();
        } else {
            $kebuns = Kebun::whereHas('owner', function($query) {
                $query->where('role', 'k-petani');
            })->get();
        }

        return Inertia::render('Blok/Edit', [
            'blok' => $blok,
            'kebuns' => $kebuns,
        ]);
    }

    /**
     * Update the specified blok
     */
    public function update(Request $request, Blok $blok): RedirectResponse
    {
        // Ensure user has access to this blok's kebun
        $user = Auth::user();
        $kebun = $blok->kebun;
        
        if ($user->role === 'k-petani' && $kebun->owner_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validate([
            'kebun_id' => 'required|exists:kebuns,id',
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'luas' => 'nullable|numeric|min:0',
            'jumlah_pohon' => 'nullable|integer|min:0',
            'status' => 'nullable|in:sehat,perlu_perhatian,maintenance',
        ]);

        // Check if code already exists for this kebun (excluding current blok)
        $existingBlok = Blok::where('kebun_id', $validated['kebun_id'])
            ->where('code', $validated['code'])
            ->where('id', '!=', $blok->id)
            ->first();

        if ($existingBlok) {
            return back()->withErrors(['code' => 'Kode blok sudah digunakan untuk kebun ini.'])->withInput();
        }

        $oldCode = $blok->code;
        $oldKebunId = $blok->kebun_id;

        $blok->update($validated);

        // Sync to Firebase if code or kebun_id changed
        if ($oldCode !== $validated['code'] || $oldKebunId !== $validated['kebun_id']) {
            try {
                // Delete old Firebase path if code or kebun changed
                if ($oldCode !== $validated['code'] || $oldKebunId !== $validated['kebun_id']) {
                    $oldPath = "kebuns/kebun_{$oldKebunId}/bloks/{$oldCode}";
                    $this->firebase->deleteDatabaseData($oldPath);
                }

                // Initialize new Firebase path
                $this->firebaseSync->initializeBlokInFirebase($blok);
            } catch (\Exception $e) {
                Log::error('Failed to sync blok update to Firebase', [
                    'blok_id' => $blok->id,
                    'error' => $e->getMessage()
                ]);
                // Continue even if Firebase sync fails
            }
        } else {
            // Just update info in Firebase
            try {
                $blokCode = $blok->code;
                // Always use kebun_id = 1 for Firebase structure (single kebun in Firebase)
                $kebunId = 1;
                
                $this->firebase->setDatabaseData(
                    "kebuns/kebun_{$kebunId}/bloks/{$blokCode}/info",
                    [
                        'name' => $blok->name,
                        'luas' => (float) $blok->luas,
                        'jumlah_pohon' => $blok->jumlah_pohon,
                        'status' => $blok->status,
                    ]
                );
            } catch (\Exception $e) {
                Log::error('Failed to update blok info in Firebase', [
                    'blok_id' => $blok->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return redirect()->route('kebun')
            ->with('success', 'Blok berhasil diperbarui.');
    }

    /**
     * Remove the specified blok
     */
    public function destroy(Blok $blok): RedirectResponse
    {
        // Ensure user has access to this blok's kebun
        $user = Auth::user();
        $kebun = $blok->kebun;
        
        if ($user->role === 'k-petani' && $kebun->owner_id !== $user->id) {
            abort(403, 'Unauthorized');
        }

        // Check if blok has schedules or other dependencies
        if ($blok->robotSchedules()->count() > 0) {
            return redirect()->back()
                ->withErrors(['blok' => 'Blok yang memiliki jadwal robot tidak dapat dihapus. Hapus jadwal terlebih dahulu.']);
        }

        $blokCode = $blok->code;
        // Always use kebun_id = 1 for Firebase structure (single kebun in Firebase)
        $kebunId = 1;

        // Delete from Firebase
        try {
            $firebasePath = "kebuns/kebun_{$kebunId}/bloks/{$blokCode}";
            $this->firebase->deleteDatabaseData($firebasePath);
        } catch (\Exception $e) {
            Log::error('Failed to delete blok from Firebase', [
                'blok_id' => $blok->id,
                'error' => $e->getMessage()
            ]);
            // Continue with deletion even if Firebase delete fails
        }

        $blok->delete();

        return redirect()->route('kebun')
            ->with('success', 'Blok berhasil dihapus.');
    }
}
