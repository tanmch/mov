<?php

namespace App\Console\Commands;

use App\Models\Kebun;
use App\Models\Blok;
use App\Services\FirebaseSyncService;
use App\Services\FirebaseService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class Setup5Bloks extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'kebun:setup-5-bloks 
                            {--kebun-id=1 : ID kebun yang akan digunakan}
                            {--force : Force update existing bloks}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Setup 5 blok dengan 23/24 pohon per blok dan sync ke Firebase';

    protected $firebase;
    protected $firebaseSync;

    public function __construct(FirebaseService $firebase, FirebaseSyncService $firebaseSync)
    {
        parent::__construct();
        $this->firebase = $firebase;
        $this->firebaseSync = $firebaseSync;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $kebunId = $this->option('kebun-id');
        $force = $this->option('force');

        $this->info('🌳 Setting up 5 bloks dengan 23/24 pohon per blok...');
        $this->newLine();

        // Get or create kebun
        $kebun = Kebun::find($kebunId);
        if (!$kebun) {
            // Get first K-Petani user
            $kPetani = \App\Models\User::where('role', 'k-petani')->first();
            
            if (!$kPetani) {
                $this->error('❌ Tidak ada user K-Petani. Silakan buat user K-Petani terlebih dahulu.');
                return Command::FAILURE;
            }

            $this->info("📝 Membuat kebun baru dengan ID: {$kebunId}...");
            $kebun = Kebun::create([
                'id' => $kebunId,
                'name' => "Kebun {$kebunId}",
                'owner_id' => $kPetani->id,
                'luas' => 2.5,
                'status' => 'aktif',
            ]);
            $this->info("✅ Kebun berhasil dibuat: {$kebun->name}");
        } else {
            $this->info("✅ Kebun ditemukan: {$kebun->name}");
        }

        // Define 5 bloks dengan 23/24 pohon
        $bloksData = [
            ['code' => 'A1', 'name' => 'Blok A1', 'trees' => 23, 'status' => 'sehat'],
            ['code' => 'A2', 'name' => 'Blok A2', 'trees' => 24, 'status' => 'sehat'],
            ['code' => 'B1', 'name' => 'Blok B1', 'trees' => 23, 'status' => 'sehat'],
            ['code' => 'B2', 'name' => 'Blok B2', 'trees' => 24, 'status' => 'sehat'],
            ['code' => 'C1', 'name' => 'Blok C1', 'trees' => 23, 'status' => 'sehat'],
        ];

        $created = 0;
        $updated = 0;
        $firebaseSynced = 0;
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($bloksData as $index => $blokData) {
                $this->info("📦 Processing Blok {$blokData['code']}...");

                // Check if blok exists
                $blok = Blok::where('code', $blokData['code'])
                    ->where('kebun_id', $kebun->id)
                    ->first();

                if ($blok) {
                    if (!$force) {
                        $this->warn("   ⚠️  Blok {$blokData['code']} sudah ada. Gunakan --force untuk update.");
                        continue;
                    }

                    // Update existing blok
                    $blok->update([
                        'name' => $blokData['name'],
                        'jumlah_pohon' => $blokData['trees'],
                        'status' => $blokData['status'],
                        'luas' => 0.5, // Default luas per blok
                    ]);
                    $updated++;
                    $this->info("   ✅ Blok {$blokData['code']} diupdate: {$blokData['trees']} pohon");
                } else {
                    // Create new blok
                    $blok = Blok::create([
                        'code' => $blokData['code'],
                        'name' => $blokData['name'],
                        'kebun_id' => $kebun->id,
                        'jumlah_pohon' => $blokData['trees'],
                        'status' => $blokData['status'],
                        'luas' => 0.5, // Default luas per blok
                    ]);
                    $created++;
                    $this->info("   ✅ Blok {$blokData['code']} dibuat: {$blokData['trees']} pohon");
                }

                // Sync to Firebase
                try {
                    $this->info("   🔥 Syncing Blok {$blokData['code']} ke Firebase...");
                    
                    // Initialize blok info in Firebase
                    $this->firebase->setDatabaseData(
                        "kebuns/kebun_{$kebun->id}/bloks/{$blokData['code']}/info",
                        [
                            'name' => $blok->name,
                            'luas' => (float) $blok->luas,
                            'jumlah_pohon' => $blok->jumlah_pohon,
                            'status' => $blok->status,
                        ]
                    );

                    // Initialize sensors with default values
                    $timestamp = now()->timestamp * 1000; // milliseconds
                    $sensors = [
                        'suhu_udara' => [
                            'value' => 28.5 + ($index * 0.5), // Vary temperature slightly
                            'unit' => '°C',
                            'status' => 'normal',
                            'timestamp' => $timestamp,
                        ],
                        'kelembapan_udara' => [
                            'value' => 70 + ($index * 2), // Vary humidity slightly
                            'unit' => '%',
                            'status' => 'normal',
                            'timestamp' => $timestamp,
                        ],
                        'kelembapan_tanah' => [
                            'value' => 60 + ($index * 3), // Vary soil moisture slightly
                            'unit' => '%',
                            'status' => 'normal',
                            'timestamp' => $timestamp,
                        ],
                    ];

                    $this->firebase->setDatabaseData(
                        "kebuns/kebun_{$kebun->id}/bloks/{$blokData['code']}/sensors",
                        $sensors
                    );

                    // Update blok with Firebase path
                    $blok->update([
                        'firebase_path' => "kebuns/kebun_{$kebun->id}/bloks/{$blokData['code']}"
                    ]);

                    $firebaseSynced++;
                    $this->info("   ✅ Firebase sync berhasil untuk Blok {$blokData['code']}");
                } catch (\Exception $e) {
                    $errorMsg = "Gagal sync Firebase untuk Blok {$blokData['code']}: " . $e->getMessage();
                    $errors[] = $errorMsg;
                    $this->error("   ❌ {$errorMsg}");
                    Log::error('Firebase sync error', [
                        'blok_code' => $blokData['code'],
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                }

                $this->newLine();
            }

            DB::commit();

            // Summary
            $this->newLine();
            $this->info('📊 Summary:');
            $this->table(
                ['Action', 'Count'],
                [
                    ['Blok Created', $created],
                    ['Blok Updated', $updated],
                    ['Firebase Synced', $firebaseSynced],
                    ['Errors', count($errors)],
                ]
            );

            if (count($errors) > 0) {
                $this->newLine();
                $this->warn('⚠️  Errors:');
                foreach ($errors as $error) {
                    $this->error("   - {$error}");
                }
            }

            if ($created > 0 || $updated > 0) {
                $this->newLine();
                $this->info('🎉 Setup selesai!');
                $this->info('Total blok: 5');
                $totalTrees = array_sum(array_column($bloksData, 'trees'));
                $this->info("Total pohon: {$totalTrees}");
                $this->info('Firebase path: kebuns/kebun_' . $kebun->id . '/bloks/');
            }

            return Command::SUCCESS;

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('❌ Fatal error: ' . $e->getMessage());
            Log::error('Setup5Bloks fatal error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return Command::FAILURE;
        }
    }
}

