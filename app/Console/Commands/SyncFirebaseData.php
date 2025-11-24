<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\FirebaseSyncService;
use App\Models\Blok;
use App\Models\RobotSchedule;
use Illuminate\Support\Facades\Log;

class SyncFirebaseData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'firebase:sync-all 
                            {--blok= : Sync specific blok code}
                            {--sensor-only : Only sync sensor readings}
                            {--detection-only : Only sync detection results}
                            {--robot-only : Only sync robot mission results}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync all data from Firebase to MySQL database (sensors, detections, robot missions)';

    protected $firebaseSync;

    /**
     * Create a new command instance.
     */
    public function __construct(FirebaseSyncService $firebaseSync)
    {
        parent::__construct();
        $this->firebaseSync = $firebaseSync;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔄 Starting Firebase data synchronization...');
        
        $blokCode = $this->option('blok');
        $sensorOnly = $this->option('sensor-only');
        $detectionOnly = $this->option('detection-only');
        $robotOnly = $this->option('robot-only');

        $totalSynced = [
            'sensors' => 0,
            'detections' => 0,
            'robot_missions' => 0,
        ];

        try {
            // Get bloks to sync
            if ($blokCode) {
                $bloks = Blok::where('code', $blokCode)->get();
                if ($bloks->isEmpty()) {
                    $this->error("Blok dengan code '{$blokCode}' tidak ditemukan.");
                    return 1;
                }
            } else {
                $bloks = Blok::all();
            }

            $this->info("📦 Found {$bloks->count()} blok(s) to sync");

            // Sync sensor readings
            if (!$detectionOnly && !$robotOnly) {
                $this->info("\n📊 Syncing sensor readings...");
                foreach ($bloks as $blok) {
                    if (!$blok->code) {
                        $this->warn("⚠️  Blok #{$blok->id} tidak memiliki code, skip...");
                        continue;
                    }
                    
                    $result = $this->firebaseSync->syncSensorReadingsFromFirebase($blok->code);
                    $synced = $result['synced'] ?? 0;
                    $totalSynced['sensors'] += $synced;
                    
                    if ($synced > 0) {
                        $this->info("  ✅ Blok {$blok->code}: {$synced} sensor readings synced");
                    } else {
                        $this->line("  ⚪ Blok {$blok->code}: No new sensor data");
                    }
                }
            }

            // Sync detection results
            if (!$sensorOnly && !$robotOnly) {
                $this->info("\n🔍 Syncing detection results...");
                foreach ($bloks as $blok) {
                    if (!$blok->code) {
                        $this->warn("⚠️  Blok #{$blok->id} tidak memiliki code, skip...");
                        continue;
                    }
                    
                    $result = $this->firebaseSync->syncDetectionResultsFromFirebase($blok->code);
                    $synced = $result['synced'] ?? 0;
                    $totalSynced['detections'] += $synced;
                    
                    if ($synced > 0) {
                        $this->info("  ✅ Blok {$blok->code}: {$synced} detection results synced");
                    } else {
                        $this->line("  ⚪ Blok {$blok->code}: No new detection data");
                    }
                }
            }

            // Sync robot mission results
            if (!$sensorOnly && !$detectionOnly) {
                $this->info("\n🤖 Syncing robot mission results...");
                $result = $this->firebaseSync->syncRobotMissionResults();
                $synced = $result['synced'] ?? 0;
                $totalSynced['robot_missions'] = $synced;
                
                if ($synced > 0) {
                    $this->info("  ✅ {$synced} robot mission results synced");
                } else {
                    $this->line("  ⚪ No new robot mission results");
                }
            }

            // Summary
            $this->info("\n" . str_repeat('=', 50));
            $this->info("📊 Sync Summary:");
            $this->info("  • Sensor Readings: {$totalSynced['sensors']}");
            $this->info("  • Detection Results: {$totalSynced['detections']}");
            $this->info("  • Robot Missions: {$totalSynced['robot_missions']}");
            $this->info(str_repeat('=', 50));
            
            $total = array_sum($totalSynced);
            if ($total > 0) {
                $this->info("✅ Successfully synced {$total} records!");
            } else {
                $this->warn("⚠️  No new data to sync.");
            }

            Log::info('Firebase sync completed', $totalSynced);

            return 0;

        } catch (\Exception $e) {
            $this->error("❌ Error: " . $e->getMessage());
            Log::error('Firebase sync failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return 1;
        }
    }

}

