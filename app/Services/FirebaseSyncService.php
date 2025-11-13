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
            $blok = $schedule->blok;
            $scheduleKey = 'schedule_' . $schedule->id;

            $firebaseData = [
                'schedule_id' => $schedule->id,
                'blok_id' => $blok->code ?? "blok_{$blok->id}",
                'mission_type' => $schedule->mission_type,
                'priority' => $schedule->priority,
                'scheduled_at' => $schedule->scheduled_at->toIso8601String(),
                'status' => $schedule->status,
                'mission_details' => $schedule->mission_details ?? [],
                'created_at' => $schedule->created_at->timestamp * 1000, // milliseconds
            ];

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
                'path' => "robot/schedules/{$scheduleKey}"
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error("Failed to push schedule to Firebase", [
                'schedule_id' => $schedule->id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Sync sensor readings from Firebase to MySQL
     */
    public function syncSensorReadingsFromFirebase(string $blokCode): array
    {
        try {
            $blok = Blok::where('code', $blokCode)->first();
            
            if (!$blok) {
                throw new \Exception("Blok not found: {$blokCode}");
            }

            // Get sensor data from Firebase
            $sensorData = $this->firebase->getDatabaseData(
                "kebuns/kebun_{$blok->kebun_id}/bloks/{$blokCode}/sensors"
            );

            if (!$sensorData) {
                return ['synced' => 0, 'message' => 'No sensor data in Firebase'];
            }

            $synced = 0;
            foreach ($sensorData as $sensorType => $data) {
                if (!is_array($data)) continue;

                $status = SensorReading::determineStatus(
                    $sensorType,
                    $data['value'] ?? 0
                );

                // Check if this reading already exists (avoid duplicates)
                $timestamp = isset($data['timestamp']) 
                    ? \Carbon\Carbon::createFromTimestampMs($data['timestamp'])
                    : now();

                $existing = SensorReading::where('blok_id', $blok->id)
                    ->where('sensor_type', $sensorType)
                    ->where('reading_time', $timestamp)
                    ->first();

                if (!$existing) {
                    SensorReading::create([
                        'blok_id' => $blok->id,
                        'sensor_type' => $sensorType,
                        'value' => $data['value'] ?? 0,
                        'unit' => $data['unit'] ?? '',
                        'status' => $status,
                        'firebase_path' => "kebuns/kebun_{$blok->kebun_id}/bloks/{$blokCode}/sensors/{$sensorType}",
                        'reading_time' => $timestamp,
                        'metadata' => $data,
                    ]);
                    $synced++;

                    // Create notification if critical
                    if ($status === 'critical') {
                        $this->createSensorAlert($blok, $sensorType, $data['value']);
                    }
                }
            }

            return [
                'synced' => $synced,
                'message' => "Synced {$synced} sensor readings"
            ];

        } catch (\Exception $e) {
            Log::error("Failed to sync sensor readings from Firebase", [
                'blok_code' => $blokCode,
                'error' => $e->getMessage()
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
            $kebunId = $blok->kebun_id;

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

            // Initialize empty sensors
            $this->firebase->setDatabaseData(
                "kebuns/kebun_{$kebunId}/bloks/{$blokCode}/sensors",
                [
                    'suhu_udara' => ['value' => 0, 'unit' => '°C', 'status' => 'normal'],
                    'kelembapan_udara' => ['value' => 0, 'unit' => '%', 'status' => 'normal'],
                    'kelembapan_tanah' => ['value' => 0, 'unit' => '%', 'status' => 'normal'],
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

