<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\FirebaseSyncService;
use App\Models\Blok;
use Illuminate\Support\Facades\Log;

class FirebaseSyncController extends Controller
{
    protected $firebaseSync;

    public function __construct(FirebaseSyncService $firebaseSync)
    {
        $this->firebaseSync = $firebaseSync;
    }

    /**
     * Sync all Firebase data to MySQL
     */
    public function syncAll(Request $request)
    {
        $user = Auth::user();
        
        // Only K-petani can trigger manual sync
        if ($user->role !== 'K-petani') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya K-petani yang dapat melakukan sinkronisasi manual',
            ], 403);
        }

        try {
            $blokCode = $request->input('blok');
            $sensorOnly = $request->boolean('sensor_only');
            $detectionOnly = $request->boolean('detection_only');
            $robotOnly = $request->boolean('robot_only');

            $results = [
                'sensors' => ['synced' => 0, 'message' => ''],
                'detections' => ['synced' => 0, 'message' => ''],
                'robot_missions' => ['synced' => 0, 'message' => ''],
            ];

            // Get bloks to sync
            if ($blokCode) {
                $bloks = Blok::where('code', $blokCode)->get();
                if ($bloks->isEmpty()) {
                    return response()->json([
                        'success' => false,
                        'message' => "Blok dengan code '{$blokCode}' tidak ditemukan",
                    ], 404);
                }
            } else {
                $bloks = Blok::all();
            }

            // Sync sensor readings
            if (!$detectionOnly && !$robotOnly) {
                foreach ($bloks as $blok) {
                    if (!$blok->code) continue;
                    $result = $this->firebaseSync->syncSensorReadingsFromFirebase($blok->code);
                    $results['sensors']['synced'] += $result['synced'] ?? 0;
                }
                $results['sensors']['message'] = "Synced {$results['sensors']['synced']} sensor readings";
            }

            // Sync detection results
            if (!$sensorOnly && !$robotOnly) {
                foreach ($bloks as $blok) {
                    if (!$blok->code) continue;
                    $result = $this->firebaseSync->syncDetectionResultsFromFirebase($blok->code);
                    $results['detections']['synced'] += $result['synced'] ?? 0;
                }
                $results['detections']['message'] = "Synced {$results['detections']['synced']} detection results";
            }

            // Sync robot mission results
            if (!$sensorOnly && !$detectionOnly) {
                $result = $this->firebaseSync->syncRobotMissionResults();
                $results['robot_missions'] = $result;
            }

            $totalSynced = $results['sensors']['synced'] + $results['detections']['synced'] + $results['robot_missions']['synced'];

            Log::info('Manual Firebase sync triggered', [
                'user_id' => $user->id,
                'results' => $results,
            ]);

            return response()->json([
                'success' => true,
                'message' => "Berhasil sinkronisasi data Firebase. Total: {$totalSynced} records",
                'results' => $results,
                'total_synced' => $totalSynced,
            ]);

        } catch (\Exception $e) {
            Log::error('Manual Firebase sync failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal melakukan sinkronisasi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get sync status (last sync time, counts, etc.)
     */
    public function getStatus()
    {
        $user = Auth::user();
        
        if ($user->role !== 'K-petani') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya K-petani yang dapat melihat status sinkronisasi',
            ], 403);
        }

        try {
            $totalBloks = Blok::count();
            $totalSensors = \App\Models\SensorReading::count();
            $totalDetections = \App\Models\DetectionResult::count();
            $totalRobotMissions = \App\Models\RobotSchedule::whereNotNull('completed_at')->count();

            return response()->json([
                'success' => true,
                'status' => [
                    'total_bloks' => $totalBloks,
                    'total_sensors' => $totalSensors,
                    'total_detections' => $totalDetections,
                    'total_robot_missions' => $totalRobotMissions,
                    'last_sync' => now()->toIso8601String(),
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mendapatkan status: ' . $e->getMessage(),
            ], 500);
        }
    }
}

