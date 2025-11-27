<?php

namespace App\Http\Controllers;

use App\Models\Blok;
use App\Models\DetectionResult;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;

class DetectionController extends Controller
{
    /**
     * Display the detection page
     */
    public function index(): Response
    {
        $user = Auth::user();
        
        // Get bloks for dropdown - semua user (K-petani dan petani) bisa melihat semua blok
        // Tidak ada filter berdasarkan user, semua blok tersedia untuk semua user
        // Hapus duplikat berdasarkan code (jika ada blok dengan code yang sama, ambil yang pertama)
        $bloks = Blok::with('kebun')
            ->orderBy('code')
            ->orderBy('name')
            ->get()
            ->unique(function($blok) {
                // Gunakan code sebagai key untuk unique, jika code null gunakan id
                return $blok->code ?? $blok->id;
            })
            ->values(); // Re-index array setelah unique
        
        $blokOptions = $bloks->map(function($blok) {
            return [
                'value' => $blok->id,
                'label' => $blok->code . ' - ' . $blok->name,
            ];
        });

        // Get detection history for this user
        $detectionHistory = DetectionResult::where('uploaded_by', $user->id)
            ->with(['blok.kebun'])
            ->orderBy('detected_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function($detection) {
                $bestDetection = $detection->ai_metadata['best_detection'] ?? null;
                $statusMap = [
                    'Unripe' => 'Muda',
                    'Half-Ripe' => 'Setengah Matang',
                    'Ripe' => 'Matang',
                    'OverRipe' => 'Terlalu Matang',
                ];
                $status = $bestDetection ? ($statusMap[$bestDetection['className']] ?? $bestDetection['className']) : 'Tidak Diketahui';
                
                // Build full image URL - pastikan menggunakan URL lengkap dari storage
                $imageUrl = $detection->image_url;
                if ($imageUrl && !str_starts_with($imageUrl, 'http')) {
                    // Jika relative path, buat full URL menggunakan asset()
                    $imageUrl = asset('storage/' . str_replace('storage/', '', ltrim($imageUrl, '/')));
                }
                
                return [
                    'id' => $detection->id,
                    'imageUrl' => $imageUrl, // URL lengkap dari server
                    'maturity' => $bestDetection['maturity'] ?? 0,
                    'status' => $status,
                    'confidence' => $detection->confidence_score / 100,
                    'className' => $bestDetection['className'] ?? 'Unknown',
                    'recommendation' => $this->getRecommendation($detection->maturity_level, $status),
                    'timestamp' => $detection->detected_at ? $detection->detected_at->diffForHumans() : 'Tidak diketahui',
                    'detections' => $detection->bounding_boxes ?? [],
                    'blok_code' => $detection->blok->code ?? null,
                    'blok_name' => $detection->blok->name ?? null,
                ];
            });

        return Inertia::render('DeteksiKematangan', [
            'blokOptions' => $blokOptions,
            'detectionHistory' => $detectionHistory,
        ]);
    }

    /**
     * Store detection result
     */
    public function store(Request $request)
    {
        // Log incoming request for debugging
        \Log::info('Detection store request:', [
            'blok_id' => $request->blok_id,
            'blok_id_type' => gettype($request->blok_id),
            'has_image' => $request->hasFile('image'),
            'image_size' => $request->hasFile('image') ? $request->file('image')->getSize() : null,
            'detections' => $request->detections ? 'present' : 'missing',
            'detections_length' => $request->detections ? strlen($request->detections) : 0,
            'all_keys' => array_keys($request->all()),
        ]);

        $validator = Validator::make($request->all(), [
            'blok_id' => 'required|integer|exists:bloks,id',
            'image' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120', // 5MB max
            'detections' => 'required|string', // JSON string from frontend
        ]);

        if ($validator->fails()) {
            \Log::error('Validation failed:', [
                'errors' => $validator->errors()->toArray(),
                'request_data' => [
                    'blok_id' => $request->blok_id,
                    'has_image' => $request->hasFile('image'),
                    'has_detections' => !empty($request->detections),
                ],
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = Auth::user();
        $blok = Blok::findOrFail($request->blok_id);

        try {
            // Parse detections JSON
            $detections = json_decode($request->detections, true);
            if (!is_array($detections) || empty($detections)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data deteksi tidak valid',
                ], 422);
            }

            // Store image
            $imagePath = $request->file('image')->store('detections', 'public');
            $imageUrl = Storage::url($imagePath);
            // Pastikan URL lengkap dengan domain untuk response
            $fullImageUrl = asset('storage/' . str_replace('storage/', '', ltrim($imageUrl, '/')));

            // Get best detection (highest confidence)
            $bestDetection = collect($detections)->sortByDesc('confidence')->first();
            
            // Map maturity status to database enum
            // Handle both 'status' and 'className' fields
            $status = $bestDetection['status'] ?? $bestDetection['className'] ?? 'Muda';
            $maturity = $bestDetection['maturity'] ?? 0;
            $maturityLevel = $this->mapMaturityLevel($status, $maturity);
            
            // Calculate average confidence and mango count
            $avgConfidence = collect($detections)->avg('confidence') * 100;
            $mangoCount = count($detections);

            // Store detection result
            $detectionResult = DetectionResult::create([
                'blok_id' => $blok->id,
                'image_path' => $imagePath,
                'image_url' => $imageUrl,
                'maturity_level' => $maturityLevel,
                'confidence_score' => $avgConfidence,
                'mango_count' => $mangoCount,
                'bounding_boxes' => $detections,
                'ai_metadata' => [
                    'detections' => $detections,
                    'best_detection' => $bestDetection,
                ],
                'detection_source' => 'manual_upload',
                'uploaded_by' => $user->id,
                'detected_at' => now(),
            ]);

            // Update blok maturity percentages
            $blok->updateMaturityPercentages();

            // Create notification
            $statusForNotification = $bestDetection['status'] ?? $bestDetection['className'] ?? 'Tidak Diketahui';
            $notificationMessage = $this->getNotificationMessage($maturityLevel, $statusForNotification, $blok->code);
            
            // Determine notification type based on maturity level
            $notificationType = 'success'; // Default to success
            if ($maturityLevel === 'lewat_matang') {
                $notificationType = 'warning';
            } elseif ($maturityLevel === 'mentah') {
                $notificationType = 'info';
            }
            
            Notification::create([
                'user_id' => $user->id,
                'type' => $notificationType,
                'title' => 'Deteksi Kematangan Berhasil',
                'message' => $notificationMessage,
                'related_type' => 'DetectionResult',
                'related_id' => $detectionResult->id,
                'data' => [
                    'detection_id' => $detectionResult->id,
                    'blok_id' => $blok->id,
                    'blok_code' => $blok->code,
                    'maturity_level' => $maturityLevel,
                ],
                'is_read' => false,
                'read_at' => null,
            ]);

            return response()->json([
                'success' => true,
                'message' => $notificationMessage,
                'detection' => $detectionResult,
                'image_url' => $fullImageUrl, // URL lengkap dari server
            ]);
        } catch (\Exception $e) {
            \Log::error('Failed to store detection result', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'blok_id' => $request->blok_id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan hasil deteksi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Map maturity status to database enum
     */
    private function mapMaturityLevel(string $status, int $maturity): string
    {
        // Check status string first
        $statusLower = strtolower($status);
        if (strpos($statusLower, 'matang') !== false && strpos($statusLower, 'terlalu') === false && strpos($statusLower, 'lewat') === false && strpos($statusLower, 'overripe') === false) {
            if ($maturity >= 75) {
                return 'matang';
            } else {
                return 'hampir_matang';
            }
        }
        if (strpos($statusLower, 'terlalu') !== false || strpos($statusLower, 'lewat') !== false || strpos($statusLower, 'overripe') !== false) {
            return 'lewat_matang';
        }
        if (strpos($statusLower, 'setengah') !== false || strpos($statusLower, 'hampir') !== false || strpos($statusLower, 'half') !== false) {
            return 'hampir_matang';
        }
        
        // Fallback to maturity percentage
        if ($maturity >= 75) {
            return 'matang';
        } elseif ($maturity >= 50) {
            return 'hampir_matang';
        } else {
            return 'mentah';
        }
    }

    /**
     * Get notification message based on maturity level
     */
    private function getNotificationMessage(string $maturityLevel, string $status, string $blokCode): string
    {
        $messages = [
            'matang' => "Buah mangga di Blok {$blokCode} sudah matang dan siap dipanen! 🥭✅",
            'hampir_matang' => "Buah mangga di Blok {$blokCode} hampir matang. Perkiraan siap panen dalam 5-7 hari. 🥭⏳",
            'mentah' => "Buah mangga di Blok {$blokCode} masih mentah. Perlu perawatan lebih lanjut. 🥭🌱",
            'lewat_matang' => "Buah mangga di Blok {$blokCode} sudah lewat matang. Segera panen! 🥭⚠️",
        ];

        return $messages[$maturityLevel] ?? "Deteksi kematangan di Blok {$blokCode} berhasil dilakukan.";
    }

    /**
     * Get recommendation based on maturity level
     */
    private function getRecommendation(string $maturityLevel, string $status): string
    {
        $recommendations = [
            'matang' => 'Siap dipanen dalam 1-2 hari. Buah sudah matang optimal.',
            'hampir_matang' => 'Tunggu 5-7 hari lagi. Buah masih dalam proses pematangan.',
            'mentah' => 'Perlu perawatan lebih lanjut. Buah masih memerlukan waktu untuk matang.',
            'lewat_matang' => 'Segera panen! Buah sudah lewat matang dan perlu segera dipanen.',
        ];

        return $recommendations[$maturityLevel] ?? 'Perlu monitoring lebih lanjut.';
    }

    /**
     * Delete detection history
     */
    public function destroy($id)
    {
        $user = Auth::user();
        
        $detection = DetectionResult::where('uploaded_by', $user->id)
            ->findOrFail($id);
        
        // Delete image file
        if ($detection->image_path && Storage::disk('public')->exists($detection->image_path)) {
            Storage::disk('public')->delete($detection->image_path);
        }
        
        $detection->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Riwayat deteksi berhasil dihapus',
        ]);
    }

    /**
     * Delete all detection history for current user
     */
    public function destroyAll()
    {
        $user = Auth::user();
        
        $detections = DetectionResult::where('uploaded_by', $user->id)->get();
        
        // Delete all image files
        foreach ($detections as $detection) {
            if ($detection->image_path && Storage::disk('public')->exists($detection->image_path)) {
                Storage::disk('public')->delete($detection->image_path);
            }
        }
        
        DetectionResult::where('uploaded_by', $user->id)->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Semua riwayat deteksi berhasil dihapus',
        ]);
    }
}
