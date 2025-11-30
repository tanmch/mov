<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\Blok;
use App\Services\FirebaseService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SimulateSensorData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sensor:simulate 
                            {--interval=5 : Interval dalam detik untuk update sensor data}
                            {--once : Run sekali saja, tidak loop}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Simulasi data sensor di Firebase (berubah setiap 5 detik)';

    protected $firebase;
    protected $isRunning = true;
    protected $sensorTypes = ['suhu_udara', 'kelembapan_udara', 'kelembapan_tanah'];

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
        $interval = (int) $this->option('interval');
        $once = $this->option('once');

        $this->info("🔬 Sensor Simulation Mode");
        $this->info("Interval: {$interval} detik");
        $this->info("Tekan Ctrl+C untuk stop");
        $this->newLine();

        // Handle Ctrl+C gracefully (only on Unix-like systems)
        if (function_exists('pcntl_signal') && PHP_OS_FAMILY !== 'Windows') {
            pcntl_signal(SIGINT, [$this, 'handleSignal']);
            pcntl_signal(SIGTERM, [$this, 'handleSignal']);
        }

        do {
            // Check if any user has enabled simulation
            $usersWithSimulation = User::where('enable_sensor_simulation', true)->get();

            if ($usersWithSimulation->isEmpty()) {
                if (!$once) {
                    $this->warn("⏸️  Tidak ada user yang mengaktifkan simulasi sensor. Menunggu...");
                    sleep($interval);
                    continue;
                } else {
                    $this->warn("⏸️  Tidak ada user yang mengaktifkan simulasi sensor.");
                    return Command::SUCCESS;
                }
            }

            // Always fetch latest bloks to include newly added bloks
            // This ensures newly added bloks will be included in simulation
            $bloks = Blok::with('kebun')->get();

            if ($bloks->isEmpty()) {
                if (!$once) {
                    $this->warn("⏸️  Tidak ada blok ditemukan. Menunggu...");
                    sleep($interval);
                    continue;
                } else {
                    $this->warn("⏸️  Tidak ada blok ditemukan.");
                    return Command::SUCCESS;
                }
            }

            // Random selection: pick random blok and random sensor type
            $randomBlok = $bloks->random();
            $randomSensorType = $this->sensorTypes[array_rand($this->sensorTypes)];
            
            $blokCode = $randomBlok->code ?? "blok_{$randomBlok->id}";
            $blokName = $randomBlok->name ?? $blokCode;
            // Always use kebun_id = 1 for Firebase structure (single kebun in Firebase)
            $kebunId = 1;

            $sensorLabel = [
                'suhu_udara' => 'Suhu Udara',
                'kelembapan_udara' => 'Kelembapan Udara',
                'kelembapan_tanah' => 'Kelembapan Tanah',
            ][$randomSensorType] ?? $randomSensorType;

            $this->info("🔄 Updating {$sensorLabel} di Blok {$blokCode} ({$blokName})...");

            $timestamp = now()->timestamp * 1000; // milliseconds

            try {
                // Get existing sensor data first (to preserve other sensors)
                $existingSensors = [];
                try {
                    $existingData = $this->firebase->getDatabaseData("kebuns/kebun_{$kebunId}/bloks/{$blokCode}/sensors");
                    if ($existingData && is_array($existingData)) {
                        $existingSensors = $existingData;
                    }
                } catch (\Exception $e) {
                    // If no existing data, start fresh
                    $existingSensors = [];
                }

                // Generate random value for current sensor type
                $value = 0;
                $unit = '';
                $status = 'normal';

                switch ($randomSensorType) {
                    case 'suhu_udara':
                        $value = round(25 + (rand(0, 100) / 10), 1); // 25.0 - 35.0°C
                        $unit = '°C';
                        $status = ($value > 32) ? 'warning' : (($value > 35) ? 'critical' : 'normal');
                        break;
                    case 'kelembapan_udara':
                        $value = round(50 + (rand(0, 300) / 10), 1); // 50.0 - 80.0%
                        $unit = '%';
                        $status = ($value < 50) ? 'warning' : (($value < 40) ? 'critical' : 'normal');
                        break;
                    case 'kelembapan_tanah':
                        $value = round(40 + (rand(0, 400) / 10), 1); // 40.0 - 80.0%
                        $unit = '%';
                        $status = ($value < 40) ? 'warning' : (($value < 30) ? 'critical' : 'normal');
                        break;
                }

                // Update only the current sensor type, preserve others
                $existingSensors[$randomSensorType] = [
                    'value' => $value,
                    'unit' => $unit,
                    'status' => $status,
                    'timestamp' => $timestamp,
                ];

                // Update sensors in Firebase (only the current sensor type will change)
                $this->firebase->setDatabaseData(
                    "kebuns/kebun_{$kebunId}/bloks/{$blokCode}/sensors",
                    $existingSensors
                );

                $this->info("✅ Updated {$sensorLabel} di Blok {$blokCode}: {$value} {$unit} ({$status}) - " . now()->format('H:i:s'));

            } catch (\Exception $e) {
                $this->error("❌ Error updating Blok {$blokCode} - {$sensorLabel}: " . $e->getMessage());
                Log::error('Sensor simulation error', [
                    'blok_id' => $randomBlok->id,
                    'blok_code' => $blokCode,
                    'sensor_type' => $randomSensorType,
                    'error' => $e->getMessage()
                ]);
            }

            if ($once) {
                break;
            }

            // Sleep for interval seconds
            sleep($interval);

            // Handle signals if available (only on Unix-like systems)
            if (function_exists('pcntl_signal_dispatch') && PHP_OS_FAMILY !== 'Windows') {
                pcntl_signal_dispatch();
            }

        } while ($this->isRunning);

        $this->newLine();
        $this->info('🛑 Sensor simulation stopped.');

        return Command::SUCCESS;
    }

    /**
     * Handle termination signals
     */
    public function handleSignal(int $signal, int|false $previousExitCode = 0): int|false
    {
        $this->isRunning = false;
        return false;
    }
}

