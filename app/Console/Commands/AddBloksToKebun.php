<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\FirebaseService;
use App\Models\Kebun;
use App\Models\Blok;
use Illuminate\Support\Facades\Log;

class AddBloksToKebun extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'kebun:add-bloks 
                            {--kebun-id= : ID of kebun to add bloks to}
                            {--force : Overwrite existing bloks}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Add 4 bloks (A1, A2, A3, A4) with 70 pohon each to a kebun';

    protected $firebase;

    /**
     * Execute the console command.
     */
    public function handle(FirebaseService $firebase)
    {
        $this->firebase = $firebase;

        $kebunId = $this->option('kebun-id');

        // If no kebun-id provided, get the first kebun
        if (!$kebunId) {
            $kebun = Kebun::first();
            if (!$kebun) {
                $this->error('No kebun found. Please create a kebun first or specify --kebun-id');
                return Command::FAILURE;
            }
            $kebunId = $kebun->id;
        } else {
            $kebun = Kebun::find($kebunId);
            if (!$kebun) {
                $this->error("Kebun with ID {$kebunId} not found.");
                return Command::FAILURE;
            }
        }

        $this->info("🌳 Adding bloks to Kebun #{$kebunId}: {$kebun->name}");
        $this->newLine();

        $blokCodes = ['A1', 'A2', 'A3', 'A4'];
        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors = 0;

        foreach ($blokCodes as $code) {
            try {
                // Check if blok already exists
                $existingBlok = Blok::where('kebun_id', $kebunId)
                    ->where('code', $code)
                    ->first();

                if ($existingBlok && !$this->option('force')) {
                    $this->warn("  ⚠️  Blok {$code} already exists (ID: {$existingBlok->id}, {$existingBlok->jumlah_pohon} pohon). Use --force to update.");
                    $skipped++;
                    continue;
                }

                // Create or update blok
                $blok = Blok::updateOrCreate(
                    [
                        'kebun_id' => $kebunId,
                        'code' => $code,
                    ],
                    [
                        'name' => "Blok {$code}",
                        'luas' => 2.5, // 2.5 ha per blok
                        'jumlah_pohon' => 70, // 70 pohon per blok
                        'status' => 'sehat',
                    ]
                );

                if ($existingBlok) {
                    $this->info("  ✅ Updated blok {$code} (ID: {$blok->id}) - 70 pohon");
                    $updated++;
                } else {
                    $this->info("  ✅ Created blok {$code} (ID: {$blok->id}) - 70 pohon");
                    $created++;
                }

                // Setup Firebase structure for this blok
                try {
                    $this->createBlokFirebaseStructure($kebunId, $code, $blok);
                    $this->line("     🔥 Firebase structure created");
                } catch (\Exception $e) {
                    $this->warn("     ⚠️  Firebase error: " . $e->getMessage());
                    Log::error('Firebase setup error for blok', [
                        'blok_id' => $blok->id,
                        'error' => $e->getMessage()
                    ]);
                }

            } catch (\Exception $e) {
                $this->error("  ❌ Error creating blok {$code}: " . $e->getMessage());
                Log::error('Blok creation error', [
                    'kebun_id' => $kebunId,
                    'code' => $code,
                    'error' => $e->getMessage()
                ]);
                $errors++;
            }
        }

        $this->newLine();
        $this->info("✅ Complete!");
        $this->table(
            ['Status', 'Count'],
            [
                ['Created', $created],
                ['Updated', $updated],
                ['Skipped', $skipped],
                ['Errors', $errors],
            ]
        );

        $totalPohon = ($created + $updated) * 70;
        if ($totalPohon > 0) {
            $this->newLine();
            $this->info("🌳 Total pohon added/updated: {$totalPohon} pohon");
        }

        return Command::SUCCESS;
    }

    /**
     * Create Firebase structure for a blok
     */
    protected function createBlokFirebaseStructure(int $kebunId, string $blokCode, Blok $blok)
    {
        // Always use kebun_id = 1 for Firebase structure (single kebun in Firebase)
        $kebunId = 1;
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
}

