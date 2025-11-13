<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RobotSchedule;
use App\Models\Blok;
use App\Models\ActivityLog;
use App\Services\FirebaseSyncService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

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
            $user = $request->user;

            $validator = Validator::make($request->all(), [
                'blok_id' => 'required|exists:bloks,id',
                'mission_type' => 'required|in:deteksi,penyiraman,pemupukan,kombinasi',
                'description' => 'nullable|string',
                'scheduled_at' => 'required|date|after:now',
                'priority' => 'nullable|in:low,medium,high,urgent',
                'mission_details' => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $blok = Blok::findOrFail($request->blok_id);

            // Create schedule in MySQL
            $schedule = RobotSchedule::create([
                'blok_id' => $request->blok_id,
                'created_by' => $user->id,
                'mission_type' => $request->mission_type,
                'description' => $request->description,
                'scheduled_at' => $request->scheduled_at,
                'priority' => $request->priority ?? 'medium',
                'mission_details' => $request->mission_details,
                'status' => 'pending',
            ]);

            // Push to Firebase for robot to read
            $pushed = $this->firebaseSync->pushRobotScheduleToFirebase($schedule);

            if (!$pushed) {
                return response()->json([
                    'success' => false,
                    'message' => 'Schedule created but failed to push to Firebase'
                ], 500);
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
            $user = $request->user;
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
            $user = $request->user;
            $schedule = RobotSchedule::findOrFail($id);

            if ($schedule->status === 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot cancel completed schedule'
                ], 400);
            }

            $schedule->update(['status' => 'cancelled']);

            // Remove from Firebase
            $scheduleKey = 'schedule_' . $schedule->id;
            $this->firebaseSync->firebase->deleteDatabaseData("robot/schedules/{$scheduleKey}");

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
