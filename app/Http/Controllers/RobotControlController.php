<?php

namespace App\Http\Controllers;

use App\Models\Blok;
use App\Models\RobotSchedule;
use App\Services\FirebaseSyncService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class RobotControlController extends Controller
{
    protected $firebaseSync;

    public function __construct(FirebaseSyncService $firebaseSync)
    {
        $this->firebaseSync = $firebaseSync;
    }

    /**
     * Display the robot control page
     */
    public function index(Request $request): Response
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
        
        $bloks = $bloks->map(function($blok) {
            return [
                'id' => $blok->id,
                'code' => $blok->code,
                'name' => $blok->name,
                'kebun_id' => $blok->kebun_id,
                'kebun' => [
                    'id' => $blok->kebun->id ?? null,
                    'name' => $blok->kebun->name ?? 'Unknown',
                ],
            ];
        });

        // Get initial robot status from Firebase
        $robotStatus = $this->getRobotStatus();
        
        // Get initial active mission
        $activeMission = $this->getActiveMission();

        // Get recent schedules (last 30 days)
        $blokIds = $bloks->pluck('id')->toArray();
        $recentSchedules = [];
        
        if (!empty($blokIds)) {
            $recentSchedules = RobotSchedule::whereIn('blok_id', $blokIds)
                ->with(['blok.kebun', 'creator'])
                ->orderBy('scheduled_at', 'desc')
                ->limit(20)
                ->get()
                ->map(function($schedule) {
                    return [
                        'id' => $schedule->id,
                        'blok_id' => $schedule->blok_id,
                        'blok_code' => $schedule->blok->code ?? null,
                        'blok_name' => $schedule->blok->name ?? null,
                        'mission_type' => $schedule->mission_type,
                        'description' => $schedule->description,
                        'scheduled_at' => $schedule->scheduled_at?->toIso8601String(),
                        'started_at' => $schedule->started_at?->toIso8601String(),
                        'completed_at' => $schedule->completed_at?->toIso8601String(),
                        'status' => $schedule->status,
                        'priority' => $schedule->priority,
                        'progress_percentage' => $schedule->progress_percentage ?? 0,
                        'mission_details' => $schedule->mission_details,
                        'created_by' => $schedule->creator->name ?? null,
                    ];
                })
                ->toArray();
        }

        return Inertia::render('RobotControl', [
            'bloks' => $bloks->toArray(),
            'initialRobotStatus' => $robotStatus,
            'initialActiveMission' => $activeMission,
            'recentSchedules' => $recentSchedules,
        ]);
    }

    /**
     * Get robot status from Firebase
     */
    protected function getRobotStatus(): array
    {
        $status = $this->firebaseSync->getRobotStatus();

        if (!$status) {
            return [
                'current_state' => 'offline',
                'battery_level' => 0,
                'current_location' => null,
                'last_update' => null,
            ];
        }

        return [
            'current_state' => $status['current_state'] ?? 'offline',
            'battery_level' => $status['battery_level'] ?? 0,
            'current_location' => $status['current_location'] ?? null,
            'last_update' => $status['last_update'] ?? null,
        ];
    }

    /**
     * Get active mission from Firebase
     */
    protected function getActiveMission(): ?array
    {
        $mission = $this->firebaseSync->getActiveMission();

        if (!$mission) {
            return null;
        }

        return [
            'schedule_id' => $mission['schedule_id'] ?? null,
            'blok_id' => $mission['blok_id'] ?? null,
            'mission_type' => $mission['mission_type'] ?? null,
            'started_at' => $mission['started_at'] ?? null,
            'progress_percentage' => $mission['progress_percentage'] ?? 0,
            'current_task' => $mission['current_task'] ?? null,
            'images_captured' => $mission['images_captured'] ?? 0,
            'total_images' => $mission['total_images'] ?? 0,
        ];
    }
}

