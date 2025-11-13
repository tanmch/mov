<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\FirebaseService;
use App\Models\Kebun;
use App\Models\Blok;
use Illuminate\Support\Facades\Log;

class SetupFirebaseStructure extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'firebase:setup-structure 
                            {--example : Create example data if no kebun/blok exists}
                            {--force : Overwrite existing data}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Setup Firebase Realtime Database structure for sensor monitoring';

    protected $firebase;

    /**
     * Execute the console command.
     */
    public function handle(FirebaseService $firebase)
    {
        $this->firebase = $firebase;

        $this->info('🔥 Setting up Firebase Realtime Database structure...');
        $this->newLine();

        try {
            // Get all kebuns and bloks
            $kebuns = Kebun::with('bloks')->get();
            $bloks = Blok::with('kebun')->get();

            if ($kebuns->isEmpty() && $bloks->isEmpty()) {
                if ($this->option('example')) {
                    $this->warn('No kebun/blok found. Creating example data...');
                    $this->createExampleData();
                    $kebuns = Kebun::with('bloks')->get();
                    $bloks = Blok::with('kebun')->get();
                } else {
                    $this->error('No kebun/blok found in database.');
                    $this->info('Run with --example flag to create example data.');
                    return Command::FAILURE;
                }
            }

            $this->info("Found {$kebuns->count()} kebun(s) and {$bloks->count()} blok(s)");
            $this->newLine();

            $created = 0;
            $skipped = 0;
            $errors = 0;

            // Create structure for each blok
            foreach ($bloks as $blok) {
                $kebun = $blok->kebun;
                
                if (!$kebun) {
                    $this->warn("Blok #{$blok->id} has no kebun, skipping...");
                    $skipped++;
                    continue;
                }

                $kebunId = $kebun->id;
                $blokCode = $blok->code ?? "blok_{$blok->id}";

                $this->line("Processing: Kebun #{$kebunId} → Blok {$blokCode}");

                try {
                    // Check if data already exists
                    $existingData = $this->firebase->getDatabaseData(
                        "kebuns/kebun_{$kebunId}/bloks/{$blokCode}/sensors"
                    );

                    if ($existingData && !$this->option('force')) {
                        $this->warn("  ⚠️  Data already exists. Use --force to overwrite.");
                        $skipped++;
                        continue;
                    }

                    // Create structure
                    $this->createBlokStructure($kebunId, $blokCode, $blok);

                    $this->info("  ✅ Created structure for blok {$blokCode}");
                    $created++;

                } catch (\Exception $e) {
                    $this->error("  ❌ Error: " . $e->getMessage());
                    Log::error('Firebase setup error', [
                        'blok_id' => $blok->id,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                    $errors++;
                }
            }

            $this->newLine();
            $this->info("✅ Setup complete!");
            $this->table(
                ['Status', 'Count'],
                [
                    ['Created', $created],
                    ['Skipped', $skipped],
                    ['Errors', $errors],
                ]
            );

            if ($created > 0) {
                $this->newLine();
                $this->info('🎉 Firebase structure created successfully!');
                $this->info('You can now test real-time updates at: http://localhost:8000/sensor');
            }

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('Fatal error: ' . $e->getMessage());
            Log::error('Firebase setup fatal error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return Command::FAILURE;
        }
    }

    /**
     * Create Firebase structure for a blok
     */
    protected function createBlokStructure(int $kebunId, string $blokCode, Blok $blok)
    {
        $timestamp = now()->timestamp * 1000; // milliseconds

        // Create blok info
        $this->firebase->setDatabaseData(
            "kebuns/kebun_{$kebunId}/bloks/{$blokCode}/info",
            [
                'name' => $blok->name,
                'luas' => (float) $blok->luas,
                'jumlah_pohon' => $blok->jumlah_pohon,
                'status' => $blok->status,
            ]
        );

        // Create sensors with example data
        $sensors = [
            'suhu_udara' => [
                'value' => 28.5,
                'unit' => '°C',
                'status' => 'normal',
                'timestamp' => $timestamp,
            ],
            'kelembapan_udara' => [
                'value' => 75,
                'unit' => '%',
                'status' => 'normal',
                'timestamp' => $timestamp,
            ],
            'kelembapan_tanah' => [
                'value' => 62,
                'unit' => '%',
                'status' => 'normal',
                'timestamp' => $timestamp,
            ],
        ];

        $this->firebase->setDatabaseData(
            "kebuns/kebun_{$kebunId}/bloks/{$blokCode}/sensors",
            $sensors
        );

        // Update blok with Firebase path
        $blok->update([
            'firebase_path' => "kebuns/kebun_{$kebunId}/bloks/{$blokCode}"
        ]);
    }

    /**
     * Create example kebun and blok for testing
     */
    protected function createExampleData()
    {
        // Create example kebun
        $kebun = Kebun::firstOrCreate(
            ['name' => 'Kebun Contoh'],
            [
                'description' => 'Kebun contoh untuk testing Firebase',
                'location' => 'Bogor, Jawa Barat',
                'latitude' => -6.5971,
                'longitude' => 106.8060,
                'luas' => 10.0,
                'jenis_mangga' => 'Gedong',
                'status' => 'active',
                'owner_id' => 1, // Assuming user ID 1 exists
            ]
        );

        // Create 4 bloks with 70 trees each
        $blokCodes = ['A1', 'A2', 'A3', 'A4'];
        $bloksCreated = [];

        foreach ($blokCodes as $code) {
            $blok = Blok::firstOrCreate(
                [
                    'kebun_id' => $kebun->id,
                    'code' => $code,
                ],
                [
                    'name' => "Blok {$code}",
                    'luas' => 2.5, // 2.5 ha per blok
                    'jumlah_pohon' => 70, // 70 pohon per blok
                    'status' => 'sehat',
                ]
            );

            $bloksCreated[] = $blok;
            $this->info("  ✅ Created blok {$code} with 70 pohon");
        }

        $totalPohon = count($bloksCreated) * 70;
        $this->info("Created example kebun #{$kebun->id} with " . count($bloksCreated) . " bloks (total: {$totalPohon} pohon)");
    }
}

