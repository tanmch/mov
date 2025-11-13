<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SensorReading;
use App\Models\Blok;
use App\Services\FirebaseSyncService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SensorController extends Controller
{
    protected $firebaseSync;

    public function __construct(FirebaseSyncService $firebaseSync)
    {
        $this->firebaseSync = $firebaseSync;
    }

    /**
     * Get all sensor readings with filters
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $perPage = $request->get('per_page', 50);
            $blokId = $request->get('blok_id');
            $sensorType = $request->get('sensor_type');
            $status = $request->get('status');
            $dateFrom = $request->get('date_from');
            $dateTo = $request->get('date_to');

            $query = SensorReading::with('blok');

            if ($blokId) {
                $query->where('blok_id', $blokId);
            }

            if ($sensorType) {
                $query->where('sensor_type', $sensorType);
            }

            if ($status) {
                $query->where('status', $status);
            }

            if ($dateFrom) {
                $query->where('reading_time', '>=', $dateFrom);
            }

            if ($dateTo) {
                $query->where('reading_time', '<=', $dateTo);
            }

            $readings = $query->orderBy('reading_time', 'desc')->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $readings
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch sensor readings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get latest sensor readings for all bloks or specific blok
     */
    public function latest(Request $request): JsonResponse
    {
        try {
            $blokId = $request->get('blok_id');

            $query = SensorReading::query();

            if ($blokId) {
                $query->where('blok_id', $blokId);
            }

            // Get latest reading for each sensor type and blok
            $latest = $query->orderBy('reading_time', 'desc')
                ->get()
                ->groupBy('blok_id')
                ->map(function ($blokReadings) {
                    return $blokReadings->groupBy('sensor_type')->map(function ($typeReadings) {
                        return $typeReadings->first();
                    });
                });

            return response()->json([
                'success' => true,
                'data' => $latest
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch latest readings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get sensor readings for specific blok with history
     */
    public function blokReadings($blokId, Request $request): JsonResponse
    {
        try {
            $blok = Blok::with('kebun')->findOrFail($blokId);
            $hours = $request->get('hours', 24); // Last 24 hours by default

            $readings = SensorReading::where('blok_id', $blokId)
                ->where('reading_time', '>=', now()->subHours($hours))
                ->orderBy('reading_time', 'asc')
                ->get()
                ->groupBy('sensor_type');

            // Get latest reading for each sensor
            $latestReadings = $blok->latestSensorReadings();

            return response()->json([
                'success' => true,
                'data' => [
                    'blok' => $blok,
                    'latest_readings' => $latestReadings,
                    'history' => $readings,
                    'period_hours' => $hours,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Blok not found'
            ], 404);
        }
    }

    /**
     * Sync sensor readings from Firebase for specific blok
     */
    public function syncFromFirebase(Request $request): JsonResponse
    {
        try {
            $blokCode = $request->get('blok_code');

            if (!$blokCode) {
                return response()->json([
                    'success' => false,
                    'message' => 'Blok code is required'
                ], 422);
            }

            $result = $this->firebaseSync->syncSensorReadingsFromFirebase($blokCode);

            return response()->json([
                'success' => true,
                'message' => $result['message'],
                'data' => $result
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sync failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get sensor statistics for a blok
     */
    public function statistics($blokId, Request $request): JsonResponse
    {
        try {
            $days = $request->get('days', 7); // Last 7 days by default
            $blok = Blok::findOrFail($blokId);

            $readings = SensorReading::where('blok_id', $blokId)
                ->where('reading_time', '>=', now()->subDays($days))
                ->get()
                ->groupBy('sensor_type');

            $statistics = [];
            foreach ($readings as $sensorType => $sensorReadings) {
                $values = $sensorReadings->pluck('value');
                $statistics[$sensorType] = [
                    'avg' => round($values->avg(), 2),
                    'min' => round($values->min(), 2),
                    'max' => round($values->max(), 2),
                    'current' => round($sensorReadings->last()->value ?? 0, 2),
                    'unit' => $sensorReadings->first()->unit ?? '',
                    'status' => $sensorReadings->last()->status ?? 'normal',
                    'total_readings' => $sensorReadings->count(),
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'blok' => $blok,
                    'period_days' => $days,
                    'statistics' => $statistics,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to calculate statistics: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get critical/warning sensor alerts
     */
    public function alerts(Request $request): JsonResponse
    {
        try {
            $hours = $request->get('hours', 1); // Last 1 hour by default

            $alerts = SensorReading::with(['blok.kebun'])
                ->whereIn('status', ['warning', 'critical'])
                ->where('reading_time', '>=', now()->subHours($hours))
                ->orderBy('reading_time', 'desc')
                ->get()
                ->groupBy('status');

            return response()->json([
                'success' => true,
                'data' => [
                    'critical_count' => $alerts['critical']->count() ?? 0,
                    'warning_count' => $alerts['warning']->count() ?? 0,
                    'total_count' => $alerts->flatten()->count(),
                    'alerts' => $alerts,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch alerts: ' . $e->getMessage()
            ], 500);
        }
    }
}
