<?php

namespace App\Console\Commands;

use App\Models\RobotSchedule;
use App\Services\FirebaseSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AutoStartSchedules extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'robot:auto-start-schedules';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically start robot schedules when scheduled time is reached';

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
        $this->info('Checking for schedules to auto-start...');

        $now = Carbon::now();
        
        // Find schedules that are pending and scheduled time has been reached
        // Only check schedules from last 24 hours to avoid processing very old schedules
        $schedulesToStart = RobotSchedule::where('status', 'pending')
            ->where('scheduled_at', '<=', $now)
            ->where('scheduled_at', '>=', $now->copy()->subHours(24)) // Only check schedules from last 24 hours
            ->whereNull('started_at')
            ->with('blok')
            ->get();

        if ($schedulesToStart->isEmpty()) {
            $this->info('No schedules to start at this time.');
            return 0;
        }

        $this->info("Found {$schedulesToStart->count()} schedule(s) to start.");

        $started = 0;
        $failed = 0;

        foreach ($schedulesToStart as $schedule) {
            try {
                // Update status to in_progress
                $schedule->update([
                    'status' => 'in_progress',
                    'started_at' => $now,
                    'progress_percentage' => 0,
                ]);

                // Push updated status to Firebase
                $pushed = $this->firebaseSync->pushRobotScheduleToFirebase($schedule);

                if ($pushed) {
                    $this->info("✓ Started schedule #{$schedule->id} - {$schedule->blok->code} ({$schedule->mission_type})");
                    $started++;
                    
                    Log::info("Auto-started robot schedule", [
                        'schedule_id' => $schedule->id,
                        'blok_id' => $schedule->blok_id,
                        'mission_type' => $schedule->mission_type,
                        'scheduled_at' => $schedule->scheduled_at,
                    ]);
                } else {
                    $this->warn("⚠ Schedule #{$schedule->id} updated in database but failed to push to Firebase");
                    $failed++;
                }

            } catch (\Exception $e) {
                $this->error("✗ Failed to start schedule #{$schedule->id}: " . $e->getMessage());
                $failed++;
                
                Log::error("Failed to auto-start schedule", [
                    'schedule_id' => $schedule->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->info("Completed: {$started} started, {$failed} failed.");

        return 0;
    }
}

