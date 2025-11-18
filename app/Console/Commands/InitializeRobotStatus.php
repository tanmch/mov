<?php

namespace App\Console\Commands;

use App\Services\FirebaseService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class InitializeRobotStatus extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'robot:init-status 
                            {--battery=85 : Initial battery level (0-100)}
                            {--state=idle : Initial robot state (active, idle, charging, offline)}
                            {--location= : Initial location (e.g., A1)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Initialize robot status and battery in Firebase';

    protected $firebase;

    /**
     * Create a new command instance.
     */
    public function __construct(FirebaseService $firebase)
    {
        parent::__construct();
        $this->firebase = $firebase;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Initializing robot status in Firebase...');

        $battery = (int) $this->option('battery');
        $state = $this->option('state');
        $location = $this->option('location') ?: 'Tidak diketahui';

        // Validate battery level
        if ($battery < 0 || $battery > 100) {
            $this->error('Battery level must be between 0 and 100');
            return 1;
        }

        // Validate state
        $validStates = ['active', 'idle', 'charging', 'offline'];
        if (!in_array($state, $validStates)) {
            $this->error('Invalid state. Must be one of: ' . implode(', ', $validStates));
            return 1;
        }

        try {
            // Initialize robot status
            $statusData = [
                'current_state' => $state,
                'battery_level' => $battery,
                'current_location' => $location,
                'name' => 'MOV Bot Alpha',
                'last_update' => now()->timestamp * 1000, // milliseconds
            ];

            $this->firebase->setDatabaseData('robot/status', $statusData);

            $this->info("✓ Robot status initialized:");
            $this->line("  - State: {$state}");
            $this->line("  - Battery: {$battery}%");
            $this->line("  - Location: {$location}");
            $this->line("  - Path: robot/status");

            // Initialize empty active mission (optional)
            $this->firebase->setDatabaseData('robot/active_mission', null);
            $this->info("✓ Active mission cleared");

            Log::info("Robot status initialized in Firebase", [
                'state' => $state,
                'battery' => $battery,
                'location' => $location,
            ]);

            $this->info("\n✅ Robot status successfully initialized in Firebase!");
            $this->line("You can now see the status in Dashboard and Robot Control pages.");

            return 0;

        } catch (\Exception $e) {
            $this->error("✗ Failed to initialize robot status: " . $e->getMessage());
            Log::error("Failed to initialize robot status", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return 1;
        }
    }
}

