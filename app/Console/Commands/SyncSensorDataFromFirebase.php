<?php

namespace App\Console\Commands;

use App\Models\Blok;
use App\Services\FirebaseSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncSensorDataFromFirebase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'firebase:sync-sensors {--blok= : Sync specific blok code}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync sensor readings from Firebase to MySQL for historical data';

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
        $this->info('Starting sensor data sync from Firebase to MySQL...');

        $blokCode = $this->option('blok');
        
        if ($blokCode) {
            // Sync specific blok
            $this->info("Syncing sensor data for blok: {$blokCode}");
            $result = $this->firebaseSync->syncSensorReadingsFromFirebase($blokCode);
            
            if (isset($result['error'])) {
                $this->error("✗ Failed to sync {$blokCode}: " . $result['error']);
                return Command::FAILURE;
            }
            
            $this->info("✓ Synced {$result['synced']} sensor readings for {$blokCode}");
            return Command::SUCCESS;
        }

        // Sync all bloks
        $bloks = Blok::whereNotNull('code')->get();
        
        if ($bloks->isEmpty()) {
            $this->warn('No bloks found with code. Please ensure bloks have codes set.');
            return Command::SUCCESS;
        }

        $this->info("Found {$bloks->count()} blok(s) to sync");

        $totalSynced = 0;
        $successCount = 0;
        $failedCount = 0;

        foreach ($bloks as $blok) {
            try {
                $blokCode = $blok->code;
                $this->line("Syncing blok: {$blokCode}...");
                
                $result = $this->firebaseSync->syncSensorReadingsFromFirebase($blokCode);
                
                if (isset($result['error'])) {
                    $this->warn("  ⚠ {$blokCode}: " . $result['error']);
                    $failedCount++;
                } else {
                    $synced = $result['synced'] ?? 0;
                    $totalSynced += $synced;
                    if ($synced > 0) {
                        $this->info("  ✓ {$blokCode}: {$synced} readings synced");
                    } else {
                        $this->line("  - {$blokCode}: No new data to sync");
                    }
                    $successCount++;
                }
            } catch (\Exception $e) {
                $this->error("  ✗ {$blokCode}: " . $e->getMessage());
                Log::error("Failed to sync sensor data for blok", [
                    'blok_code' => $blok->code,
                    'error' => $e->getMessage()
                ]);
                $failedCount++;
            }
        }

        $this->newLine();
        $this->info("Sync completed!");
        $this->info("Total readings synced: {$totalSynced}");
        $this->info("Success: {$successCount}, Failed: {$failedCount}");

        return Command::SUCCESS;
    }
}

