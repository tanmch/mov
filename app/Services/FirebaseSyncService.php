<?php

namespace App\Services;

use App\Models\SensorReading;
use App\Models\RobotSchedule;
use App\Models\DetectionResult;
use App\Models\Blok;
use App\Models\Notification;
use Illuminate\Support\Facades\Log;

class FirebaseSyncService
{
    protected $firebase;

    public function __construct(FirebaseService $firebase)
    {
        $this->firebase = $firebase;
    }

    /**
     * Push robot schedule to Firebase for ESP32 to read
     */
    public function pushRobotScheduleToFirebase(RobotSchedule $schedule): bool
    {
        try {
            // Ensure blok relationship is loaded
            if (!$schedule->relationLoaded('blok')) {
                $schedule->load('blok');
            }
            
            $blok = $schedule->blok;
            
            if (!$blok) {
                throw new \Exception("Blok not found for schedule #{$schedule->id}");
            }
            
            $scheduleKey = 'schedule_' . $schedule->id;

            // Prepare Firebase data
            $firebaseData = [
                'schedule_id' => $schedule->id,
                'blok_id' => $blok->code ?? "blok_{$blok->id}",
                'mission_type' => $schedule->mission_type,
                'priority' => $schedule->priority ?? 'medium',
                'status' => $schedule->status ?? 'pending',
                'mission_details' => $schedule->mission_details ?? [],
            ];
            
            // Add scheduled_at if exists
            if ($schedule->scheduled_at) {
                $firebaseData['scheduled_at'] = $schedule->scheduled_at->toIso8601String();
            }
            
            // Add created_at if exists
            if ($schedule->created_at) {
                $firebaseData['created_at'] = $schedule->created_at->timestamp * 1000; // milliseconds
            }

            // Write to Firebase
            $this->firebase->setDatabaseData(
                "robot/schedules/{$scheduleKey}",
                $firebaseData
            );

            // Update schedule with Firebase path
            $schedule->update([
                'firebase_status_path' => "robot/schedules/{$scheduleKey}"
            ]);

            Log::info("Robot schedule pushed to Firebase", [
                'schedule_id' => $schedule->id,
                'path' => "robot/schedules/{$scheduleKey}",
                'blok_code' => $blok->code,
            ]);

            return true;

        } catch (\Exception $e) {
            $errorMessage = $e->getMessage();
            
            // Provide more specific error messages
            if (strpos($errorMessage, 'invalid_grant') !== false) {
                $errorMessage = "Firebase credentials are invalid or expired. Please regenerate service account key from Firebase Console.";
            } elseif (strpos($errorMessage, 'Permission denied') !== false) {
                $errorMessage = "Firebase permission denied. Please check service account permissions.";
            } elseif (strpos($errorMessage, 'Network') !== false || strpos($errorMessage, 'timeout') !== false) {
                $errorMessage = "Firebase network error. Please check your internet connection.";
            }
            
            Log::error("Failed to push schedule to Firebase", [
                'schedule_id' => $schedule->id,
                'error' => $errorMessage,
                'original_error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // Re-throw with more user-friendly message
            throw new \Exception($errorMessage);
        }
    }

    /**
     * Get Firebase kebun ID (always 1 for single kebun structure)
     * This ensures all bloks use kebun_1 in Firebase regardless of MySQL kebun_id
     */
    protected function getFirebaseKebunId(): int
    {
        return 1; // Always use kebun_1 in Firebase
    }

    /**
     * Sync sensor readings from Firebase to MySQL
     * Syncs current sensor data from /sensors as historical data
     * Also syncs from /sensor_history if available (optional)
     */
    public function syncSensorReadingsFromFirebase(string $blokCode): array
    {
        try {
            $blok = Blok::where('code', $blokCode)->first();
            
            if (!$blok) {
                throw new \Exception("Blok not found: {$blokCode}");
            }

            $synced = 0;
            // Always use kebun_id = 1 for Firebase structure (single kebun in Firebase)
            $kebunId = $this->getFirebaseKebunId();

            // 1. Sync current sensor data from /sensors (save as historical)
            // This is the main source since /sensor_history may not exist
            $sensorData = $this->firebase->getDatabaseData(
                "kebuns/kebun_{$kebunId}/bloks/{$blokCode}/sensors"
            );

            if ($sensorData && is_array($sensorData)) {
                foreach ($sensorData as $sensorType => $data) {
                    if (!is_array($data) || !isset($data['value'])) continue;

                    $status = SensorReading::determineStatus(
                        $sensorType,
                        $data['value'] ?? 0
                    );

                    // Get timestamp from Firebase or use current time
                    $timestamp = isset($data['timestamp']) 
                        ? \Carbon\Carbon::createFromTimestampMs($data['timestamp'])
                        : now();

                    // Check if this exact reading already exists (same timestamp and value)
                    $existing = SensorReading::where('blok_id', $blok->id)
                        ->where('sensor_type', $sensorType)
                        ->where('reading_time', $timestamp)
                        ->where('value', $data['value'])
                        ->first();

                    if (!$existing) {
                        // Also check if we have a recent reading (within last minute) with same value
                        // to avoid storing duplicate readings if sync runs too frequently
                        $recentReading = SensorReading::where('blok_id', $blok->id)
                            ->where('sensor_type', $sensorType)
                            ->where('reading_time', '>=', $timestamp->copy()->subMinute())
                            ->where('value', $data['value'])
                            ->first();

                        if (!$recentReading) {
                            SensorReading::create([
                                'blok_id' => $blok->id,
                                'sensor_type' => $sensorType,
                                'value' => $data['value'] ?? 0,
                                'unit' => $data['unit'] ?? ($sensorType === 'suhu_udara' ? '°C' : '%'),
                                'status' => $status,
                                'firebase_path' => "kebuns/kebun_{$kebunId}/bloks/{$blokCode}/sensors/{$sensorType}",
                                'reading_time' => $timestamp,
                                'metadata' => $data,
                            ]);
                            $synced++;

                            // Create notification if critical or warning
                            if ($status === 'critical' || $status === 'warning') {
                                $this->createSensorAlert($blok, $sensorType, $data['value']);
                            }
                        }
                    }
                }
            }

            // 2. Sync sensor_history (historical data) - Optional, if exists
            // This is a fallback if ESP32 also writes to sensor_history
            // Always use kebun_id = 1 for Firebase structure
            $sensorHistory = $this->firebase->getDatabaseData(
                "kebuns/kebun_{$kebunId}/bloks/{$blokCode}/sensor_history"
            );

            if ($sensorHistory && is_array($sensorHistory)) {
                foreach ($sensorHistory as $timestampMs => $historyData) {
                    if (!is_array($historyData)) continue;

                    $readingTime = \Carbon\Carbon::createFromTimestampMs($timestampMs);

                    // Sync each sensor type from history
                    foreach (['suhu_udara', 'kelembapan_udara', 'kelembapan_tanah'] as $sensorType) {
                        if (!isset($historyData[$sensorType])) continue;

                        $value = (float) $historyData[$sensorType];
                        $status = SensorReading::determineStatus($sensorType, $value);

                        // Check if already exists
                        $existing = SensorReading::where('blok_id', $blok->id)
                            ->where('sensor_type', $sensorType)
                            ->where('reading_time', $readingTime)
                            ->where('value', $value)
                            ->first();

                        if (!$existing) {
                            SensorReading::create([
                                'blok_id' => $blok->id,
                                'sensor_type' => $sensorType,
                                'value' => $value,
                                'unit' => $sensorType === 'suhu_udara' ? '°C' : '%',
                                'status' => $status,
                                'firebase_path' => "kebuns/kebun_{$kebunId}/bloks/{$blokCode}/sensor_history/{$timestampMs}",
                                'reading_time' => $readingTime,
                                'metadata' => $historyData,
                            ]);
                            $synced++;

                            // Create notification if critical or warning
                            if ($status === 'critical' || $status === 'warning') {
                                $this->createSensorAlert($blok, $sensorType, $value);
                            }
                        }
                    }
                }
            }

            if ($synced === 0) {
                return ['synced' => 0, 'message' => 'No new sensor data to sync (data may already be synced)'];
            }

            return [
                'synced' => $synced,
                'message' => "Synced {$synced} sensor readings from Firebase to MySQL"
            ];

        } catch (\Exception $e) {
            Log::error("Failed to sync sensor readings from Firebase", [
                'blok_code' => $blokCode,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return ['synced' => 0, 'error' => $e->getMessage()];
        }
    }

    /**
     * Get robot status from Firebase
     */
    public function getRobotStatus(): ?array
    {
        try {
            $status = $this->firebase->getDatabaseData('robot/status');
            return $status ?: null;
        } catch (\Exception $e) {
            Log::error("Failed to get robot status from Firebase", [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Get active robot mission from Firebase
     */
    public function getActiveMission(): ?array
    {
        try {
            $mission = $this->firebase->getDatabaseData('robot/active_mission');
            return $mission ?: null;
        } catch (\Exception $e) {
            Log::error("Failed to get active mission from Firebase", [
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Sync detection results from Firebase to MySQL
     */
    public function syncDetectionResultsFromFirebase(string $blokCode): array
    {
        try {
            $blok = Blok::where('code', $blokCode)->first();
            
            if (!$blok) {
                throw new \Exception("Blok not found: {$blokCode}");
            }

            // Get detection data from Firebase
            $detectionData = $this->firebase->getDatabaseData(
                "detections/{$blokCode}/history"
            );

            if (!$detectionData) {
                return ['synced' => 0, 'message' => 'No detection data in Firebase'];
            }

            $synced = 0;
            foreach ($detectionData as $timestamp => $data) {
                if (!is_array($data)) continue;

                $detectedAt = \Carbon\Carbon::createFromTimestampMs($timestamp);

                // Check if already exists
                $existing = DetectionResult::where('blok_id', $blok->id)
                    ->where('detected_at', $detectedAt)
                    ->first();

                if (!$existing) {
                    DetectionResult::create([
                        'blok_id' => $blok->id,
                        'robot_schedule_id' => $data['schedule_id'] ?? null,
                        'image_path' => null,
                        'image_url' => $data['image_url'] ?? null,
                        'maturity_level' => $data['maturity_level'] ?? 'mentah',
                        'confidence_score' => $data['confidence_score'] ?? 0,
                        'mango_count' => $data['mango_count'] ?? 1,
                        'bounding_boxes' => $data['bounding_boxes'] ?? null,
                        'ai_metadata' => $data,
                        'detection_source' => 'robot_camera',
                        'detected_at' => $detectedAt,
                    ]);
                    $synced++;
                }
            }

            // Update blok maturity percentages
            if ($synced > 0) {
                $blok->updateMaturityPercentages();
            }

            return [
                'synced' => $synced,
                'message' => "Synced {$synced} detection results"
            ];

        } catch (\Exception $e) {
            Log::error("Failed to sync detection results from Firebase", [
                'blok_code' => $blokCode,
                'error' => $e->getMessage()
            ]);
            return ['synced' => 0, 'error' => $e->getMessage()];
        }
    }

    /**
     * Delete robot schedule from Firebase
     */
    public function deleteRobotScheduleFromFirebase(int $scheduleId): bool
    {
        try {
            $scheduleKey = 'schedule_' . $scheduleId;
            
            // Delete from Firebase
            $this->firebase->deleteDatabaseData("robot/schedules/{$scheduleKey}");
            
            Log::info("Robot schedule deleted from Firebase", [
                'schedule_id' => $scheduleId,
                'path' => "robot/schedules/{$scheduleKey}"
            ]);
            
            return true;
            
        } catch (\Exception $e) {
            Log::error("Failed to delete schedule from Firebase", [
                'schedule_id' => $scheduleId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Update schedule status from Firebase (when robot completes mission)
     */
    public function updateScheduleFromFirebase(int $scheduleId): bool
    {
        try {
            $schedule = RobotSchedule::find($scheduleId);
            
            if (!$schedule) {
                throw new \Exception("Schedule not found: {$scheduleId}");
            }

            // Get mission result from Firebase
            $result = $this->firebase->getDatabaseData(
                "robot/mission_results/schedule_{$scheduleId}"
            );

            if (!$result) {
                return false;
            }

            // Update schedule in MySQL
            $schedule->update([
                'status' => $result['success'] ? 'completed' : 'failed',
                'completed_at' => isset($result['completed_at']) 
                    ? \Carbon\Carbon::createFromTimestampMs($result['completed_at'])
                    : now(),
                'progress_percentage' => 100,
                'result_data' => $result,
            ]);

            // Create notification
            $this->createMissionCompletedNotification($schedule, $result);

            return true;

        } catch (\Exception $e) {
            Log::error("Failed to update schedule from Firebase", [
                'schedule_id' => $scheduleId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Create sensor alert notification
     */
    protected function createSensorAlert(Blok $blok, string $sensorType, float $value): void
    {
        $sensorLabels = [
            'suhu_udara' => 'Suhu Udara',
            'kelembapan_udara' => 'Kelembapan Udara',
            'kelembapan_tanah' => 'Kelembapan Tanah',
        ];

        $kebun = $blok->kebun;
        $owner = $kebun->owner;

        Notification::create([
            'user_id' => $owner->id,
            'title' => 'Peringatan Sensor Kritis',
            'message' => "{$sensorLabels[$sensorType]} mencapai {$value} di {$blok->name}, {$kebun->name}. Perlu perhatian segera!",
            'type' => 'sensor',
            'related_type' => 'Blok',
            'related_id' => $blok->id,
            'data' => [
                'sensor_type' => $sensorType,
                'value' => $value,
                'blok_id' => $blok->id,
                'kebun_id' => $kebun->id,
            ],
        ]);
    }

    /**
     * Create mission completed notification
     */
    protected function createMissionCompletedNotification(RobotSchedule $schedule, array $result): void
    {
        $blok = $schedule->blok;
        $kebun = $blok->kebun;
        $owner = $kebun->owner;

        $message = $result['success']
            ? "Misi {$schedule->mission_type} berhasil diselesaikan di {$blok->name}"
            : "Misi {$schedule->mission_type} gagal di {$blok->name}";

        Notification::create([
            'user_id' => $owner->id,
            'title' => 'Misi Robot Selesai',
            'message' => $message,
            'type' => 'robot',
            'related_type' => 'RobotSchedule',
            'related_id' => $schedule->id,
            'data' => [
                'schedule_id' => $schedule->id,
                'blok_id' => $blok->id,
                'result' => $result,
            ],
        ]);
    }

    /**
     * Initialize Firebase structure for a new blok
     */
    public function initializeBlokInFirebase(Blok $blok): bool
    {
        try {
            $blokCode = $blok->code ?? "blok_{$blok->id}";
            // Always use kebun_id = 1 for Firebase structure (single kebun in Firebase)
            $kebunId = $this->getFirebaseKebunId();

            // Initialize blok info
            $this->firebase->setDatabaseData(
                "kebuns/kebun_{$kebunId}/bloks/{$blokCode}/info",
                [
                    'name' => $blok->name,
                    'luas' => (float) $blok->luas,
                    'jumlah_pohon' => $blok->jumlah_pohon,
                    'status' => $blok->status,
                ]
            );

            // Initialize sensors with realistic default values
            $timestamp = now()->timestamp * 1000; // milliseconds
            $this->firebase->setDatabaseData(
                "kebuns/kebun_{$kebunId}/bloks/{$blokCode}/sensors",
                [
                    'suhu_udara' => [
                        'value' => round(25 + (rand(0, 100) / 10), 1), // 25.0 - 35.0°C
                        'unit' => '°C',
                        'status' => 'normal',
                        'timestamp' => $timestamp,
                    ],
                    'kelembapan_udara' => [
                        'value' => round(50 + (rand(0, 300) / 10), 1), // 50.0 - 80.0%
                        'unit' => '%',
                        'status' => 'normal',
                        'timestamp' => $timestamp,
                    ],
                    'kelembapan_tanah' => [
                        'value' => round(40 + (rand(0, 400) / 10), 1), // 40.0 - 80.0%
                        'unit' => '%',
                        'status' => 'normal',
                        'timestamp' => $timestamp,
                    ],
                ]
            );

            // Update blok with Firebase path
            $blok->update([
                'firebase_path' => "kebuns/kebun_{$kebunId}/bloks/{$blokCode}"
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error("Failed to initialize blok in Firebase", [
                'blok_id' => $blok->id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }
}

