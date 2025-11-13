<?php

namespace App\Http\Controllers;

use App\Models\SensorReading;
use App\Models\Blok;
use App\Models\Kebun;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Carbon\Carbon;

class SensorController extends Controller
{
    // FirebaseSyncService will be used later for real-time updates
    // For now, we'll work with MySQL data only

    /**
     * Display sensor monitoring page
     */
    public function index(Request $request): Response
    {
        try {
            $user = $request->user();
            $selectedBlokId = $request->get('blok_id', 'all');
            $period = $request->get('period', '24h'); // 24h, 7d, 30d

            // Get all bloks user can access
            $bloksQuery = Blok::with(['kebun']);
            
            if ($user->role === 'petani') {
                $bloksQuery->whereHas('kebun', function ($q) use ($user) {
                    $q->where('owner_id', $user->id);
                });
            }
            
            $bloks = $bloksQuery->orderBy('code', 'asc')->get();
        
        // Get blok options for filter
        $blokOptions = [['value' => 'all', 'label' => 'Semua Blok']];
        foreach ($bloks as $blok) {
            $blokOptions[] = [
                'value' => $blok->id,
                'label' => $blok->code . ' - ' . $blok->name
            ];
        }

        // Calculate time range based on period
        $timeRange = match($period) {
            '24h' => now()->subHours(24),
            '7d' => now()->subDays(7),
            '30d' => now()->subDays(30),
            default => now()->subHours(24),
        };

        // Get latest sensor readings
        $latestReadingsQuery = SensorReading::with(['blok.kebun'])
            ->where('reading_time', '>=', $timeRange);
        
        if ($selectedBlokId !== 'all') {
            $latestReadingsQuery->where('blok_id', $selectedBlokId);
        } else {
            $blokIds = $bloks->pluck('id')->toArray();
            if (!empty($blokIds)) {
                $latestReadingsQuery->whereIn('blok_id', $blokIds);
            } else {
                // If no bloks, return empty result
                $latestReadingsQuery->whereRaw('1 = 0');
            }
        }

        // Get latest reading for each sensor type
        $latestReadings = collect([]);
        try {
            $latestReadings = $latestReadingsQuery
                ->orderBy('reading_time', 'desc')
                ->get()
                ->groupBy('sensor_type')
                ->map(function ($readings) {
                    return $readings->first();
                });
        } catch (\Exception $e) {
            \Log::error('Error getting latest readings: ' . $e->getMessage());
        }

        // Get current sensor values (latest for each type)
        $currentSensors = [
            'suhu_udara' => $latestReadings->get('suhu_udara'),
            'kelembapan_udara' => $latestReadings->get('kelembapan_udara'),
            'kelembapan_tanah' => $latestReadings->get('kelembapan_tanah'),
        ];

        // Get historical data for charts
        $historyQuery = SensorReading::where('reading_time', '>=', $timeRange);
        
        if ($selectedBlokId !== 'all') {
            $historyQuery->where('blok_id', $selectedBlokId);
        } else {
            $blokIds = $bloks->pluck('id')->toArray();
            if (!empty($blokIds)) {
                $historyQuery->whereIn('blok_id', $blokIds);
            } else {
                // If no bloks, return empty result
                $historyQuery->whereRaw('1 = 0');
            }
        }

        $historyData = collect([]);
        $blokCodesArray = [];
        try {
            // Get all readings grouped by time and blok
            $allReadings = $historyQuery
                ->with('blok')
                ->orderBy('reading_time', 'asc')
                ->get();
            
            // Group by time interval first
            $timeGrouped = $allReadings->groupBy(function ($reading) use ($period) {
                if ($period === '24h') {
                    return $reading->reading_time->format('H:00');
                } elseif ($period === '7d') {
                    return $reading->reading_time->format('Y-m-d');
                } else {
                    return $reading->reading_time->format('Y-m-d');
                }
            });
            
            // Get all unique bloks from readings
            $blokCodes = $allReadings->pluck('blok.code')->filter()->unique()->sort()->values();
            
            // Build chart data with per-blok comparison
            $historyData = $timeGrouped->map(function ($readings, $timeKey) use ($blokCodes, $period) {
                if ($readings->isEmpty()) {
                    return null;
                }
                
                $firstReading = $readings->first();
                $timeFormat = $period === '24h' 
                    ? $firstReading->reading_time->format('H:i')
                    : ($period === '7d' 
                        ? $firstReading->reading_time->format('d M')
                        : $firstReading->reading_time->format('d M'));
                
                // Initialize data point with time
                $dataPoint = ['time' => $timeFormat];
                
                // Group readings by blok
                $byBlok = $readings->groupBy('blok.code');
                
                // Add data for each blok
                foreach ($blokCodes as $blokCode) {
                    $blokReadings = $byBlok->get($blokCode, collect());
                    
                    if ($blokReadings->isNotEmpty()) {
                        $bySensorType = $blokReadings->groupBy('sensor_type');
                        
                        $suhuReadings = $bySensorType->get('suhu_udara');
                        $kelembapanUdaraReadings = $bySensorType->get('kelembapan_udara');
                        $kelembapanTanahReadings = $bySensorType->get('kelembapan_tanah');
                        
                        // Add data with blok code as suffix
                        $dataPoint["suhu_{$blokCode}"] = round($suhuReadings ? $suhuReadings->avg('value') : 0, 1);
                        $dataPoint["kelembUdara_{$blokCode}"] = round($kelembapanUdaraReadings ? $kelembapanUdaraReadings->avg('value') : 0, 1);
                        $dataPoint["kelembTanah_{$blokCode}"] = round($kelembapanTanahReadings ? $kelembapanTanahReadings->avg('value') : 0, 1);
                    } else {
                        // No data for this blok at this time
                        $dataPoint["suhu_{$blokCode}"] = null;
                        $dataPoint["kelembUdara_{$blokCode}"] = null;
                        $dataPoint["kelembTanah_{$blokCode}"] = null;
                    }
                }
                
                return $dataPoint;
            })
            ->filter() // Remove null values
            ->values();
            
            // Also pass blok codes for frontend
            $blokCodesArray = $blokCodes->toArray();
        } catch (\Exception $e) {
            \Log::error('Error getting history data: ' . $e->getMessage());
            $blokCodesArray = [];
        }

        // Get alerts (critical/warning readings)
        $alertsQuery = SensorReading::with(['blok.kebun'])
            ->whereIn('status', ['warning', 'critical'])
            ->where('reading_time', '>=', now()->subHours(24));
        
        if ($selectedBlokId !== 'all') {
            $alertsQuery->where('blok_id', $selectedBlokId);
        } else {
            $blokIds = $bloks->pluck('id')->toArray();
            if (!empty($blokIds)) {
                $alertsQuery->whereIn('blok_id', $blokIds);
            } else {
                $alertsQuery->whereRaw('1 = 0');
            }
        }
        
        $alerts = collect([]);
        try {
            $alerts = $alertsQuery
                ->orderBy('reading_time', 'desc')
                ->get()
                ->map(function ($reading) {
                    return [
                        'id' => $reading->id,
                        'type' => $reading->status,
                        'sensor' => match($reading->sensor_type) {
                            'suhu_udara' => 'Suhu Udara',
                            'kelembapan_udara' => 'Kelembaban Udara',
                            'kelembapan_tanah' => 'Kelembaban Tanah',
                            default => $reading->sensor_type,
                        },
                        'nilai' => ($reading->value ?? 0) . ' ' . ($reading->unit ?? ''),
                        'blok' => $reading->blok->code ?? 'Unknown',
                        'waktu' => $reading->reading_time->diffForHumans(),
                        'pesan' => $this->getAlertMessage($reading->sensor_type, $reading->status, $reading->value),
                    ];
                });
        } catch (\Exception $e) {
            \Log::error('Error getting alerts: ' . $e->getMessage());
        }

            return Inertia::render('MonitoringSensor', [
                'bloks' => $bloks->map(function ($blok) {
                    return [
                        'id' => $blok->id,
                        'code' => $blok->code,
                        'name' => $blok->name,
                        'kebun_id' => $blok->kebun_id,
                        'kebun' => $blok->kebun ? [
                            'id' => $blok->kebun->id,
                            'name' => $blok->kebun->name,
                        ] : null,
                    ];
                }),
                'blokOptions' => $blokOptions,
                'selectedBlokId' => $selectedBlokId,
                'period' => $period,
                'currentSensors' => $currentSensors,
                'chartData' => $historyData,
                'chartBlokCodes' => $blokCodesArray ?? [], // Pass blok codes for chart
                'alerts' => $alerts,
                'lastUpdate' => $latestReadings->max('reading_time')?->diffForHumans() ?? 'Tidak ada data',
            ]);
        } catch (\Exception $e) {
            \Log::error('SensorController@index error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            // Return with empty data on error
            return Inertia::render('MonitoringSensor', [
                'bloks' => [],
                'blokOptions' => [['value' => 'all', 'label' => 'Semua Blok']],
                'selectedBlokId' => 'all',
                'period' => '24h',
                'currentSensors' => [],
                'chartData' => [],
                'chartBlokCodes' => [],
                'alerts' => [],
                'lastUpdate' => 'Error loading data',
                'error' => 'Terjadi kesalahan saat memuat data sensor. Silakan coba lagi.',
            ]);
        }
    }

    /**
     * Get alert message based on sensor type and status
     */
    private function getAlertMessage(string $sensorType, string $status, ?float $value = null): string
    {
        if ($sensorType === 'suhu_udara') {
            if ($status === 'critical') {
                return "Suhu sangat tinggi (>40°C) - Berbahaya untuk tanaman!";
            }
            return "Suhu melebihi batas normal (>35°C)";
        }

        if (in_array($sensorType, ['kelembapan_udara', 'kelembapan_tanah'])) {
            if ($status === 'critical') {
                return "Kelembapan sangat rendah (<20%) - Tanaman membutuhkan penyiraman segera!";
            }
            return "Kelembapan rendah (<30%) - Disarankan melakukan penyiraman";
        }

        return "Nilai sensor di luar batas normal";
    }
}
