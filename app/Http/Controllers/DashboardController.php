<?php

namespace App\Http\Controllers;

use App\Models\Blok;
use App\Models\RobotSchedule;
use App\Models\SensorReading;
use App\Models\Notification;
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
        $bloks = Blok::whereHas('kebun', function($query) use ($user) {
            $query->where('owner_id', $user->id);
        })->with('kebun')->get()->map(function($blok) {
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
     * Get maturity data from all bloks
     */
    protected function getMaturityData(): array
    {
        $bloks = Blok::whereHas('kebun', function($query) {
            $query->where('owner_id', Auth::id());
        })->get();

        if ($bloks->isEmpty()) {
            return [
                ['name' => 'Mentah', 'value' => 0, 'color' => '#ef4444'],
                ['name' => 'Hampir Matang', 'value' => 0, 'color' => '#f59e0b'],
                ['name' => 'Matang', 'value' => 0, 'color' => '#22c55e'],
                ['name' => 'Lewat Matang', 'value' => 0, 'color' => '#6b7280'],
            ];
        }

        $totalMentah = $bloks->sum('persentase_mentah') / $bloks->count();
        $totalHampirMatang = $bloks->sum('persentase_hampir_matang') / $bloks->count();
        $totalMatang = $bloks->sum('persentase_matang') / $bloks->count();
        $totalLewatMatang = $bloks->sum('persentase_lewat_matang') / $bloks->count();

        return [
            ['name' => 'Mentah', 'value' => round($totalMentah, 1), 'color' => '#ef4444'],
            ['name' => 'Hampir Matang', 'value' => round($totalHampirMatang, 1), 'color' => '#f59e0b'],
            ['name' => 'Matang', 'value' => round($totalMatang, 1), 'color' => '#22c55e'],
            ['name' => 'Lewat Matang', 'value' => round($totalLewatMatang, 1), 'color' => '#6b7280'],
        ];
    }

    /**
     * Get latest sensor readings
     */
    protected function getLatestSensorData(): array
    {
        $bloks = Blok::whereHas('kebun', function($query) {
            $query->where('owner_id', Auth::id());
        })->pluck('id');

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
        $bloks = Blok::whereHas('kebun', function($query) {
            $query->where('owner_id', Auth::id());
        })->pluck('id');

        if ($bloks->isEmpty()) {
            return [];
        }

        $schedules = RobotSchedule::whereIn('blok_id', $bloks)
            ->where('status', 'pending')
            ->where('scheduled_at', '>=', now())
            ->orderBy('scheduled_at', 'asc')
            ->limit(5)
            ->with('blok')
            ->get()
            ->map(function($schedule) {
                return [
                    'id' => $schedule->id,
                    'waktu' => $schedule->scheduled_at->format('H:i'),
                    'tipe' => ucfirst(str_replace('_', ' ', $schedule->mission_type)),
                    'blok' => $schedule->blok->name ?? 'Unknown',
                    'status' => ucfirst($schedule->status),
                ];
            });

        return $schedules->toArray();
    }
}

