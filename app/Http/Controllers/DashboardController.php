<?php

namespace App\Http\Controllers;

use App\Models\Blok;
use App\Models\RobotSchedule;
use App\Models\SensorReading;
use App\Models\Notification;
use App\Models\SensorThreshold;
use App\Services\FirebaseSyncService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class DashboardController extends Controller
{
    protected $firebaseSync;

    public function __construct(FirebaseSyncService $firebaseSync)
    {
        $this->firebaseSync = $firebaseSync;
    }

    /**
     * Display the dashboard
     */
    public function index(Request $request): Response
    {
        $user = Auth::user();
        
        // Get robot status from Firebase
        $robotStatus = $this->getRobotStatus();
        
        // Get maturity data from all bloks
        $maturityData = $this->getMaturityData();
        
        // Get latest sensor readings
        $sensorData = $this->getLatestSensorData();
        
        // Trend data now comes from Firebase (24 hours), no need to fetch from MySQL
        $trendData = [];
        
        // Get notifications
        $notifications = $this->getNotifications($user);
        
        // Get upcoming robot schedules
        $upcomingSchedules = $this->getUpcomingSchedules();
        
        // Get bloks for Firebase real-time listener
        // K-Petani and Petani see the same kebuns (owned by K-Petani)
        if ($user->role === 'k-petani') {
            // K-Petani sees kebuns they own
            $bloks = Blok::whereHas('kebun', function($query) use ($user) {
                $query->where('owner_id', $user->id);
            })->with('kebun')->get();
        } else {
            // Petani sees kebuns owned by K-Petani users
            $bloks = Blok::whereHas('kebun.owner', function($query) {
                $query->where('role', 'k-petani');
            })->with('kebun')->get();
        }
        
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

        // Get blok options for dropdown
        $blokOptions = $bloks->map(function($blok) {
            return [
                'value' => $blok['id'],
                'label' => $blok['code'] ?? "Blok #{$blok['id']}",
            ];
        });

        // Get sensor thresholds (same as Monitoring Sensor IoT)
        $thresholds = SensorThreshold::orderBy('sensor_type')->get();
        $defaults = SensorThreshold::getDefaults();
        
        $thresholdsData = [];
        foreach (['suhu_udara', 'kelembapan_udara', 'kelembapan_tanah'] as $sensorType) {
            $threshold = $thresholds->where('sensor_type', $sensorType)->first();
            if ($threshold) {
                $thresholdsData[$sensorType] = [
                    'normal_min' => $threshold->normal_min,
                    'normal_max' => $threshold->normal_max,
                    'warning_min' => $threshold->warning_min,
                    'warning_max' => $threshold->warning_max,
                    'critical_min' => $threshold->critical_min,
                    'critical_max' => $threshold->critical_max,
                ];
            } else {
                $thresholdsData[$sensorType] = $defaults[$sensorType] ?? [];
            }
        }

        return Inertia::render('Dashboard', [
            'robotStatus' => $robotStatus,
            'maturityData' => $maturityData,
            'sensorData' => $sensorData,
            'trendData' => $trendData,
            'notifications' => $notifications,
            'upcomingSchedules' => $upcomingSchedules,
            'bloks' => $bloks,
            'blokOptions' => $blokOptions,
            'selectedTimeRange' => '24h', // Default, data comes from Firebase
            'selectedBlokId' => 'average', // Default, data comes from Firebase
            'thresholds' => $thresholdsData, // Sensor thresholds for status calculation
        ]);
    }

    /**
     * Get robot status from Firebase
     */
    protected function getRobotStatus(): array
    {
        $status = $this->firebaseSync->getRobotStatus();
        $activeMission = $this->firebaseSync->getActiveMission();

        if (!$status) {
            return [
                'nama' => 'MOV Bot Alpha',
                'status' => 'offline',
                'battery' => 0,
                'lokasi' => 'Tidak diketahui',
                'misi' => null,
                'progress' => 0,
            ];
        }

        return [
            'nama' => $status['name'] ?? 'MOV Bot Alpha',
            'status' => $status['current_state'] ?? 'offline',
            'battery' => $status['battery_level'] ?? 0,
            'lokasi' => $status['location'] ?? 'Tidak diketahui',
            'misi' => $activeMission ? ($activeMission['mission_type'] ?? null) : null,
            'progress' => $activeMission ? ($activeMission['progress_percentage'] ?? 0) : 0,
        ];
    }

    /**
     * Get maturity data from all bloks (per blok and average)
     */
    protected function getMaturityData(): array
    {
        $user = Auth::user();
        
        // K-Petani and Petani see the same kebuns
        if ($user->role === 'k-petani') {
            $bloks = Blok::whereHas('kebun', function($query) use ($user) {
                $query->where('owner_id', $user->id);
            })->get();
        } else {
            $bloks = Blok::whereHas('kebun.owner', function($query) {
                $query->where('role', 'k-petani');
            })->get();
        }

        if ($bloks->isEmpty()) {
            return [
                'average' => [
                    ['name' => 'Mentah', 'value' => 0, 'color' => '#ef4444'],
                    ['name' => 'Hampir Matang', 'value' => 0, 'color' => '#f59e0b'],
                    ['name' => 'Matang', 'value' => 0, 'color' => '#22c55e'],
                    ['name' => 'Lewat Matang', 'value' => 0, 'color' => '#6b7280'],
                ],
                'perBlok' => [],
            ];
        }

        // Calculate average
        $totalMentah = $bloks->sum('persentase_mentah') / $bloks->count();
        $totalHampirMatang = $bloks->sum('persentase_hampir_matang') / $bloks->count();
        $totalMatang = $bloks->sum('persentase_matang') / $bloks->count();
        $totalLewatMatang = $bloks->sum('persentase_lewat_matang') / $bloks->count();

        // Per blok data
        $perBlok = $bloks->map(function($blok) {
            return [
                'blok_id' => $blok->id,
                'blok_code' => $blok->code,
                'blok_name' => $blok->name,
                'data' => [
                    ['name' => 'Mentah', 'value' => round($blok->persentase_mentah ?? 0, 1), 'color' => '#ef4444'],
                    ['name' => 'Hampir Matang', 'value' => round($blok->persentase_hampir_matang ?? 0, 1), 'color' => '#f59e0b'],
                    ['name' => 'Matang', 'value' => round($blok->persentase_matang ?? 0, 1), 'color' => '#22c55e'],
                    ['name' => 'Lewat Matang', 'value' => round($blok->persentase_lewat_matang ?? 0, 1), 'color' => '#6b7280'],
                ],
            ];
        })->toArray();

        return [
            'average' => [
                ['name' => 'Mentah', 'value' => round($totalMentah, 1), 'color' => '#ef4444'],
                ['name' => 'Hampir Matang', 'value' => round($totalHampirMatang, 1), 'color' => '#f59e0b'],
                ['name' => 'Matang', 'value' => round($totalMatang, 1), 'color' => '#22c55e'],
                ['name' => 'Lewat Matang', 'value' => round($totalLewatMatang, 1), 'color' => '#6b7280'],
            ],
            'perBlok' => $perBlok,
        ];
    }

    /**
     * Get latest sensor readings
     */
    protected function getLatestSensorData(): array
    {
        $user = Auth::user();
        
        // K-Petani and Petani see the same kebuns
        if ($user->role === 'k-petani') {
            $bloks = Blok::whereHas('kebun', function($query) use ($user) {
                $query->where('owner_id', $user->id);
            })->pluck('id');
        } else {
            $bloks = Blok::whereHas('kebun.owner', function($query) {
                $query->where('role', 'k-petani');
            })->pluck('id');
        }

        if ($bloks->isEmpty()) {
            return [
                'suhuUdara' => 0,
                'kelembabanUdara' => 0,
                'kelembabanTanah' => 0,
                'avgKematangan' => 0,
            ];
        }

        // Get latest readings for each sensor type
        $suhuUdara = SensorReading::whereIn('blok_id', $bloks)
            ->where('sensor_type', 'suhu_udara')
            ->orderBy('reading_time', 'desc')
            ->first();

        $kelembabanUdara = SensorReading::whereIn('blok_id', $bloks)
            ->where('sensor_type', 'kelembapan_udara')
            ->orderBy('reading_time', 'desc')
            ->first();

        $kelembabanTanah = SensorReading::whereIn('blok_id', $bloks)
            ->where('sensor_type', 'kelembapan_tanah')
            ->orderBy('reading_time', 'desc')
            ->first();

        // Calculate average maturity
        $avgKematangan = Blok::whereIn('id', $bloks)
            ->avg('persentase_matang') ?? 0;

        return [
            'suhuUdara' => $suhuUdara ? (float) $suhuUdara->value : 0,
            'kelembabanUdara' => $kelembabanUdara ? (float) $kelembabanUdara->value : 0,
            'kelembabanTanah' => $kelembabanTanah ? (float) $kelembabanTanah->value : 0,
            'avgKematangan' => round($avgKematangan, 1),
        ];
    }

    /**
     * Get sensor trend data with time range and blok filter support
     */
    protected function getSensorTrendData(string $timeRange = '24h', string $selectedBlokId = 'average'): array
    {
        $bloksQuery = Blok::whereHas('kebun', function($query) {
            $query->where('owner_id', Auth::id());
        });

        // Filter by blok if not average
        if ($selectedBlokId !== 'average') {
            $bloksQuery->where('id', $selectedBlokId);
        }

        $bloks = $bloksQuery->pluck('id');

        if ($bloks->isEmpty()) {
            return [];
        }

        // Determine start time and grouping based on time range
        switch ($timeRange) {
            case '1h':
                $startTime = now()->subHour();
                $groupFormat = 'H:i';
                $interval = 'minute';
                $dataPoints = 12; // Every 5 minutes
                break;
            case '7d':
                $startTime = now()->subDays(7);
                $groupFormat = 'Y-m-d';
                $interval = 'day';
                $dataPoints = 7;
                break;
            case '30d':
                $startTime = now()->subDays(30);
                $groupFormat = 'Y-m-d';
                $interval = 'day';
                $dataPoints = 30;
                break;
            default: // 24h
                $startTime = now()->subHours(24);
                $groupFormat = 'H:00';
                $interval = 'hour';
                $dataPoints = 24;
                break;
        }
        
        // Get readings grouped by time interval
        $readings = SensorReading::whereIn('blok_id', $bloks)
            ->where('reading_time', '>=', $startTime)
            ->orderBy('reading_time', 'asc')
            ->get()
            ->groupBy(function($reading) use ($groupFormat) {
                return $reading->reading_time->format($groupFormat);
            });

        $trendData = [];
        
        if ($interval === 'minute') {
            // For 1h: show data every 5 minutes (12 points)
            $now = now();
            for ($i = 11; $i >= 0; $i--) {
                $timePoint = $now->copy()->subMinutes($i * 5);
                // Round to nearest 5 minutes for grouping
                $roundedMinutes = floor($timePoint->minute / 5) * 5;
                $timePoint->minute($roundedMinutes)->second(0);
                $timeKey = $timePoint->format('H:i');
                
                // Get all readings and filter by time window (within 5 minutes)
                $timeReadings = SensorReading::whereIn('blok_id', $bloks)
                    ->where('reading_time', '>=', $startTime)
                    ->whereBetween('reading_time', [
                        $timePoint->copy()->subMinutes(2),
                        $timePoint->copy()->addMinutes(2)
                    ])
                    ->get();
                
                $suhu = $timeReadings->where('sensor_type', 'suhu_udara')->avg('value') ?? 0;
                $kelembapan = $timeReadings->where('sensor_type', 'kelembapan_udara')->avg('value') ?? 0;
                $kelembapanTanah = $timeReadings->where('sensor_type', 'kelembapan_tanah')->avg('value') ?? 0;

                $trendData[] = [
                    'time' => $timePoint->format('H:i'),
                    'suhu' => round($suhu, 1),
                    'kelembapan' => round($kelembapan, 1),
                    'kelembapanTanah' => round($kelembapanTanah, 1),
                ];
            }
        } elseif ($interval === 'hour') {
            // For 24h: show data every hour (24 points)
            for ($i = 23; $i >= 0; $i--) {
                $timePoint = now()->copy()->subHours($i);
                $timeKey = $timePoint->format('H:00');
                $timeReadings = $readings->get($timeKey, collect());
                
                $suhu = $timeReadings->where('sensor_type', 'suhu_udara')->avg('value') ?? 0;
                $kelembapan = $timeReadings->where('sensor_type', 'kelembapan_udara')->avg('value') ?? 0;
                $kelembapanTanah = $timeReadings->where('sensor_type', 'kelembapan_tanah')->avg('value') ?? 0;

                $trendData[] = [
                    'time' => $timePoint->format('H:00'),
                    'suhu' => round($suhu, 1),
                    'kelembapan' => round($kelembapan, 1),
                    'kelembapanTanah' => round($kelembapanTanah, 1),
                ];
            }
        } else {
            // For 7d and 30d: show daily averages
            $current = Carbon::parse($startTime);
            $end = now();
            
            while ($current <= $end) {
                $dayKey = $current->format('Y-m-d');
                $dayReadings = $readings->get($dayKey, collect());
                
                $suhu = $dayReadings->where('sensor_type', 'suhu_udara')->avg('value') ?? 0;
                $kelembapan = $dayReadings->where('sensor_type', 'kelembapan_udara')->avg('value') ?? 0;
                $kelembapanTanah = $dayReadings->where('sensor_type', 'kelembapan_tanah')->avg('value') ?? 0;

                $trendData[] = [
                    'time' => $current->format('d M'),
                    'suhu' => round($suhu, 1),
                    'kelembapan' => round($kelembapan, 1),
                    'kelembapanTanah' => round($kelembapanTanah, 1),
                ];
                
                $current->addDay();
            }
        }

        return $trendData;
    }

    /**
     * Get notifications for user
     */
    protected function getNotifications($user): array
    {
        $notifications = Notification::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function($notif) {
                $timeAgo = $notif->created_at->diffForHumans();
                
                // Determine icon and type based on notification type
                $icon = 'ℹ️';
                $type = 'info';
                
                if ($notif->type === 'sensor') {
                    $icon = '⚠️';
                    $type = 'warning';
                } elseif ($notif->type === 'robot') {
                    $icon = '✅';
                    $type = 'success';
                }

                return [
                    'id' => $notif->id,
                    'type' => $type,
                    'icon' => $icon,
                    'message' => $notif->message,
                    'time' => $timeAgo,
                ];
            });

        return $notifications->toArray();
    }

    /**
     * Get upcoming robot schedules
     */
    protected function getUpcomingSchedules(): array
    {
        $user = Auth::user();
        
        // K-Petani and Petani see the same kebuns
        if ($user->role === 'k-petani') {
            $bloks = Blok::whereHas('kebun', function($query) use ($user) {
                $query->where('owner_id', $user->id);
            })->pluck('id');
        } else {
            $bloks = Blok::whereHas('kebun.owner', function($query) {
                $query->where('role', 'k-petani');
            })->pluck('id');
        }

        if ($bloks->isEmpty()) {
            return [];
        }

        $schedules = RobotSchedule::whereIn('blok_id', $bloks)
            ->whereIn('status', ['pending', 'in_progress', 'paused'])
            ->orderBy('scheduled_at', 'asc')
            ->limit(10)
            ->with(['blok.kebun', 'creator'])
            ->get()
            ->map(function($schedule) {
                return [
                    'id' => $schedule->id,
                    'blok_id' => $schedule->blok_id,
                    'blok_code' => $schedule->blok->code ?? null,
                    'blok_name' => $schedule->blok->name ?? null,
                    'blok' => $schedule->blok->name ?? 'Unknown',
                    'mission_type' => $schedule->mission_type,
                    'description' => $schedule->description,
                    'scheduled_at' => $schedule->scheduled_at ? $schedule->scheduled_at->toISOString() : null,
                    'started_at' => $schedule->started_at ? $schedule->started_at->toISOString() : null,
                    'completed_at' => $schedule->completed_at ? $schedule->completed_at->toISOString() : null,
                    'status' => $schedule->status,
                    'priority' => $schedule->priority,
                    'progress_percentage' => $schedule->progress_percentage ?? 0,
                    'mission_details' => $schedule->mission_details ?? [],
                    'created_by' => $schedule->creator->name ?? null,
                    // Legacy fields for backward compatibility
                    'waktu' => $schedule->scheduled_at ? $schedule->scheduled_at->format('H:i') : '-',
                    'tipe' => ucfirst(str_replace('_', ' ', $schedule->mission_type)),
                ];
            });

        return $schedules->toArray();
    }
}

