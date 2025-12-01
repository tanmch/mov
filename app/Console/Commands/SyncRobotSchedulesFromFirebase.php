<?php

namespace App\Console\Commands;

use App\Models\RobotSchedule;
use App\Services\FirebaseSyncService;
use App\Services\FirebaseService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class SyncRobotSchedulesFromFirebase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'firebase:sync-robot-schedules';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync robot schedule status and results from Firebase to MySQL';

    protected $firebaseSync;
    protected $firebase;

    /**
     * Create a new command instance.
     */
    public function __construct(FirebaseSyncService $firebaseSync, FirebaseService $firebase)
    {
        parent::__construct();
        $this->firebaseSync = $firebaseSync;
        $this->firebase = $firebase;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting robot schedules sync from Firebase to MySQL...');

        try {
            // Get all schedules from Firebase
            $schedulesPath = 'robot/schedules';
            $schedules = $this->firebase->getDatabaseData($schedulesPath);

            if (!$schedules || !is_array($schedules)) {
                $this->warn('No schedules found in Firebase');
                return Command::SUCCESS;
            }

            $this->info("Found " . count($schedules) . " schedule(s) in Firebase");

            $updated = 0;
            $failed = 0;

            foreach ($schedules as $scheduleKey => $scheduleData) {
                try {
                    $scheduleId = $scheduleData['schedule_id'] ?? null;
                    
                    if (!$scheduleId) {
                        continue;
                    }

                    $schedule = RobotSchedule::find($scheduleId);
                    
                    if (!$schedule) {
                        continue;
                    }

                    // Check if status has changed
                    $firebaseStatus = $scheduleData['status'] ?? 'pending';
                    $mysqlStatus = $schedule->status;

                    // Get mission results if available
                    $missionResultsPath = "robot/mission_results/{$scheduleKey}";
                    $resultData = $this->firebase->getDatabaseData($missionResultsPath);

                    $needsUpdate = false;
                    $updateData = [];

                    // Update status if different
                    if ($firebaseStatus !== $mysqlStatus) {
                        $updateData['status'] = $firebaseStatus;
                        $needsUpdate = true;
                    }

                    // Update from mission results
                    if ($resultData) {
                        if (isset($resultData['completed_at'])) {
                            $completedAt = Carbon::createFromTimestampMs($resultData['completed_at']);
                            if (!$schedule->completed_at || $schedule->completed_at->ne($completedAt)) {
                                $updateData['completed_at'] = $completedAt;
                                $updateData['status'] = $resultData['success'] ? 'completed' : 'failed';
                                $needsUpdate = true;
                            }
                        }

                        if (isset($resultData['started_at'])) {
                            $startedAt = Carbon::createFromTimestampMs($resultData['started_at']);
                            if (!$schedule->started_at || !$schedule->started_at->equalTo($startedAt)) {
                                $updateData['started_at'] = $startedAt;
                                $needsUpdate = true;
                            }
                        }

                        if (isset($resultData['progress_percentage'])) {
                            $progress = (int) $resultData['progress_percentage'];
                            if ($schedule->progress_percentage !== $progress) {
                                $updateData['progress_percentage'] = $progress;
                                $needsUpdate = true;
                            }
                        }

                        // Update result_data
                        $updateData['result_data'] = $resultData;
                        $needsUpdate = true;
                    }

                    if ($needsUpdate) {
                        $schedule->update($updateData);
                        $updated++;
                        $blokCode = $schedule->blok ? $schedule->blok->code : 'N/A';
                        $this->info("  ✓ Updated schedule #{$scheduleId} ({$blokCode})");
                    }
                } catch (\Exception $e) {
                    $this->error("  ✗ Failed to sync schedule {$scheduleKey}: " . $e->getMessage());
                    Log::error("Failed to sync robot schedule from Firebase", [
                        'schedule_key' => $scheduleKey,
                        'error' => $e->getMessage()
                    ]);
                    $failed++;
                }
            }

            $this->newLine();
            $this->info("Sync completed!");
            $this->info("Updated: {$updated}, Failed: {$failed}");

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("✗ Failed to sync robot schedules: " . $e->getMessage());
            Log::error("Failed to sync robot schedules from Firebase", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return Command::FAILURE;
        }
    }
}

