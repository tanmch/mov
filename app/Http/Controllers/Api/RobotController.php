<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RobotSchedule;
use App\Models\Blok;
use App\Models\Kebun;
use App\Models\ActivityLog;
use App\Services\FirebaseSyncService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class RobotController extends Controller
{
    protected $firebaseSync;

    public function __construct(FirebaseSyncService $firebaseSync)
    {
        $this->firebaseSync = $firebaseSync;
    }

    /**
     * Get robot status from Firebase
     */
    public function status(): JsonResponse
    {
        try {
            $status = $this->firebaseSync->getRobotStatus();

            if (!$status) {
                return response()->json([
                    'success' => true,
                    'message' => 'Robot status not available',
                    'data' => [
                        'current_state' => 'offline',
                        'battery_level' => 0,
                    ]
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $status
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get robot status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get active mission from Firebase
     */
    public function activeMission(): JsonResponse
    {
        try {
            $mission = $this->firebaseSync->getActiveMission();

            return response()->json([
                'success' => true,
                'data' => $mission
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get active mission: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all robot schedules
     */
    public function schedules(Request $request): JsonResponse
    {
        try {
            $perPage = $request->get('per_page', 15);
            $blokId = $request->get('blok_id');
            $status = $request->get('status');
            $missionType = $request->get('mission_type');

            $query = RobotSchedule::with(['blok.kebun', 'creator']);

            if ($blokId) {
                $query->where('blok_id', $blokId);
            }

            if ($status) {
                $query->where('status', $status);
            }

            if ($missionType) {
                $query->where('mission_type', $missionType);
            }

            $schedules = $query->orderBy('scheduled_at', 'desc')->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $schedules
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch schedules: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new robot schedule (K-Petani only)
     */
    public function createSchedule(Request $request): JsonResponse
    {
        try {
            $user = Auth::user() ?? $request->user;
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }

            $validator = Validator::make($request->all(), [
                'blok_id' => 'required', // Can be numeric ID or string code
                'mission_type' => 'required|in:deteksi,penyiraman,pemupukan,kombinasi',
                'description' => 'nullable|string',
                'scheduled_at' => 'required|date|after:now',
                'priority' => 'nullable|in:low,medium,high,urgent',
                'mission_details' => 'nullable|array',
                'kebun_id' => 'nullable|integer', // Optional kebun_id from request
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Handle blok_id - can be numeric ID or string code
            $blokId = $request->blok_id;
            $blok = null;
            
            // Try to find by numeric ID first
            if (is_numeric($blokId)) {
                $blok = Blok::find($blokId);
            }
            
            // If not found by ID, try to find by code
            if (!$blok) {
                $blok = Blok::where('code', $blokId)->first();
            }
            
            // If still not found, create it (firstOrCreate)
            if (!$blok) {
                // Get or create kebun first
                $kebunId = $request->kebun_id ?? 1; // Default to kebun_1 to match Firebase structure
                $kebun = Kebun::firstOrCreate(
                    ['id' => $kebunId],
                    [
                        'name' => "Kebun {$kebunId}",
                        'owner_id' => $user->id, // Use current user as owner
                    ]
                );
                
                // Create blok with code
                $blok = Blok::firstOrCreate(
                    [
                        'code' => $blokId,
                        'kebun_id' => $kebun->id,
                    ],
                    [
                        'name' => $blokId, // Use code as name
                        'luas' => 0.00, // Default luas in hectares
                        'jumlah_pohon' => 0, // Default jumlah pohon
                        'status' => 'sehat', // Default status
                    ]
                );
            }
            
            // Ensure blok has kebun relationship
            if (!$blok->kebun) {
                $kebunId = $request->kebun_id ?? $blok->kebun_id ?? 1;
                $kebun = Kebun::firstOrCreate(
                    ['id' => $kebunId],
                    [
                        'name' => "Kebun {$kebunId}",
                        'owner_id' => $user->id,
                    ]
                );
                $blok->kebun_id = $kebun->id;
                $blok->save();
            }

            // Create schedule in MySQL
            // Use $blok->id (numeric ID) instead of $request->blok_id (which could be string code)
            $schedule = RobotSchedule::create([
                'blok_id' => $blok->id, // Use the numeric ID from the found/created blok
                'created_by' => $user->id,
                'mission_type' => $request->mission_type,
                'description' => $request->description,
                'scheduled_at' => $request->scheduled_at,
                'priority' => $request->priority ?? 'medium',
                'mission_details' => $request->mission_details,
                'status' => 'pending',
            ]);

            // Load relationship for Firebase push
            $schedule->load('blok.kebun');

            // Push to Firebase for robot to read
            $firebaseError = null;
            $firebaseWarning = null;
            try {
                $pushed = $this->firebaseSync->pushRobotScheduleToFirebase($schedule);

                if (!$pushed) {
                    $firebaseError = 'Failed to push to Firebase (check server logs)';
                    $firebaseWarning = 'Jadwal berhasil dibuat, namun gagal disinkronkan ke Firebase. Silakan periksa koneksi Firebase atau hubungi administrator.';
                    \Log::error("Failed to push schedule to Firebase", [
                        'schedule_id' => $schedule->id,
                        'blok_id' => $schedule->blok_id,
                    ]);
                }
            } catch (\Exception $e) {
                $errorMessage = $e->getMessage();
                
                // Provide user-friendly warning message
                if (strpos($errorMessage, 'invalid_grant') !== false || strpos($errorMessage, 'credentials') !== false) {
                    $firebaseWarning = 'Jadwal berhasil dibuat, namun gagal disinkronkan ke Firebase karena kredensial tidak valid. Silakan hubungi administrator untuk memperbarui kredensial Firebase.';
                } elseif (strpos($errorMessage, 'Permission denied') !== false) {
                    $firebaseWarning = 'Jadwal berhasil dibuat, namun gagal disinkronkan ke Firebase karena masalah izin. Silakan hubungi administrator.';
                } elseif (strpos($errorMessage, 'Network') !== false || strpos($errorMessage, 'timeout') !== false) {
                    $firebaseWarning = 'Jadwal berhasil dibuat, namun gagal disinkronkan ke Firebase karena masalah koneksi. Silakan coba lagi nanti.';
                } else {
                    $firebaseWarning = 'Jadwal berhasil dibuat, namun gagal disinkronkan ke Firebase. Silakan periksa log server untuk detail lebih lanjut.';
                }
                
                $firebaseError = $errorMessage;
                \Log::error("Exception while pushing schedule to Firebase", [
                    'schedule_id' => $schedule->id,
                    'error' => $errorMessage,
                    'trace' => $e->getTraceAsString(),
                ]);
            }
            
            // Even if Firebase push fails, schedule is still created in database
            // Return success with warning if Firebase failed
            if ($firebaseError) {
                return response()->json([
                    'success' => true,
                    'message' => 'Jadwal berhasil dibuat',
                    'warning' => $firebaseWarning ?? $firebaseError,
                    'data' => $schedule->load(['blok', 'creator'])
                ], 201);
            }

            // Log activity
            ActivityLog::logActivity(
                $user->id,
                'create',
                'RobotSchedule',
                $schedule->id,
                "K-Petani {$user->name} created robot schedule for {$blok->name}"
            );

            return response()->json([
                'success' => true,
                'message' => 'Robot schedule created successfully',
                'data' => $schedule->load(['blok', 'creator'])
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create schedule: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update robot schedule (K-Petani only)
     */
    public function updateSchedule(Request $request, $id): JsonResponse
    {
        try {
            $user = Auth::user() ?? $request->user;
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }
            $schedule = RobotSchedule::findOrFail($id);

            // Can't update if already in progress or completed
            if (in_array($schedule->status, ['in_progress', 'completed'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot update schedule that is in progress or completed'
                ], 400);
            }

            $validator = Validator::make($request->all(), [
                'scheduled_at' => 'sometimes|date',
                'priority' => 'sometimes|in:low,medium,high,urgent',
                'mission_details' => 'sometimes|array',
                'description' => 'sometimes|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $oldValues = $schedule->only(['scheduled_at', 'priority', 'mission_details', 'description']);
            
            $schedule->update($request->only(['scheduled_at', 'priority', 'mission_details', 'description']));

            // Update in Firebase
            $this->firebaseSync->pushRobotScheduleToFirebase($schedule);

            // Log activity
            ActivityLog::logActivity(
                $user->id,
                'update',
                'RobotSchedule',
                $schedule->id,
                "K-Petani {$user->name} updated robot schedule #{$schedule->id}",
                $oldValues,
                $schedule->only(['scheduled_at', 'priority', 'mission_details', 'description'])
            );

            return response()->json([
                'success' => true,
                'message' => 'Schedule updated successfully',
                'data' => $schedule->load(['blok', 'creator'])
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update schedule: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cancel robot schedule (K-Petani only)
     */
    public function cancelSchedule(Request $request, $id): JsonResponse
    {
        try {
            $user = Auth::user() ?? $request->user;
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }
            $schedule = RobotSchedule::findOrFail($id);

            if ($schedule->status === 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot cancel completed schedule'
                ], 400);
            }

            $schedule->update(['status' => 'cancelled']);

            // Remove from Firebase
            $this->firebaseSync->deleteRobotScheduleFromFirebase($schedule->id);

            // Log activity
            ActivityLog::logActivity(
                $user->id,
                'update',
                'RobotSchedule',
                $schedule->id,
                "K-Petani {$user->name} cancelled robot schedule #{$schedule->id}"
            );

            return response()->json([
                'success' => true,
                'message' => 'Schedule cancelled successfully',
                'data' => $schedule
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to cancel schedule: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete robot schedule (K-Petani only) - Soft delete for history
     */
    public function deleteSchedule(Request $request, $id): JsonResponse
    {
        try {
            $user = Auth::user() ?? $request->user;
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized'
                ], 401);
            }
            
            $schedule = RobotSchedule::findOrFail($id);
            
            // Perform soft delete
            $schedule->delete();
            
            // Remove from Firebase
            $this->firebaseSync->deleteRobotScheduleFromFirebase($schedule->id);
            
            // Log activity
            ActivityLog::logActivity(
                $user->id,
                'delete',
                'RobotSchedule',
                $schedule->id,
                "K-Petani {$user->name} deleted robot schedule #{$schedule->id} from history"
            );
            
            return response()->json([
                'success' => true,
                'message' => 'Schedule deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete schedule: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get schedule details
     */
    public function showSchedule($id): JsonResponse
    {
        try {
            $schedule = RobotSchedule::with(['blok.kebun', 'creator', 'detectionResults'])
                ->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => $schedule
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Schedule not found'
            ], 404);
        }
    }

    /**
     * Sync mission results from Firebase (called by webhook or cron)
     */
    public function syncMissionResults(Request $request): JsonResponse
    {
        try {
            $scheduleId = $request->get('schedule_id');

            if (!$scheduleId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Schedule ID is required'
                ], 422);
            }

            $updated = $this->firebaseSync->updateScheduleFromFirebase($scheduleId);

            if ($updated) {
                return response()->json([
                    'success' => true,
                    'message' => 'Mission results synced successfully'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'No results found in Firebase'
                ], 404);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sync failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get upcoming schedules
     */
    public function upcomingSchedules(Request $request): JsonResponse
    {
        try {
            $days = $request->get('days', 7);

            $schedules = RobotSchedule::with(['blok.kebun', 'creator'])
                ->whereIn('status', ['pending'])
                ->where('scheduled_at', '>=', now())
                ->where('scheduled_at', '<=', now()->addDays($days))
                ->orderBy('scheduled_at', 'asc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'period_days' => $days,
                    'total' => $schedules->count(),
                    'schedules' => $schedules,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch upcoming schedules: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get schedule statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        try {
            $days = $request->get('days', 30);

            $schedules = RobotSchedule::where('created_at', '>=', now()->subDays($days))->get();

            $stats = [
                'total' => $schedules->count(),
                'by_status' => $schedules->groupBy('status')->map->count(),
                'by_mission_type' => $schedules->groupBy('mission_type')->map->count(),
                'completed' => $schedules->where('status', 'completed')->count(),
                'failed' => $schedules->where('status', 'failed')->count(),
                'pending' => $schedules->where('status', 'pending')->count(),
                'success_rate' => $schedules->count() > 0 
                    ? round(($schedules->where('status', 'completed')->count() / $schedules->count()) * 100, 2)
                    : 0,
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'period_days' => $days,
                    'statistics' => $stats,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to calculate statistics: ' . $e->getMessage()
            ], 500);
        }
    }
}
