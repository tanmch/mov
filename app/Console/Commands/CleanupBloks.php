<?php

namespace App\Console\Commands;

use App\Models\Blok;
use App\Services\FirebaseService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CleanupBloks extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'kebun:cleanup-bloks 
                            {--kebun-id=1 : ID kebun yang akan dibersihkan}
                            {--keep= : Blok codes yang akan dipertahankan (comma separated, e.g. A1,A2,B1,B2,C1)}
                            {--dry-run : Preview changes without executing}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Hapus blok yang tidak diperlukan dari Firebase dan MySQL';

    protected $firebase;

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
        $kebunId = $this->option('kebun-id');
        $keepCodes = $this->option('keep') ? explode(',', $this->option('keep')) : ['A1', 'A2', 'B1', 'B2', 'C1'];
        $dryRun = $this->option('dry-run');

        $this->info('🧹 Membersihkan blok yang tidak diperlukan...');
        $this->newLine();
        $this->info("Kebun ID: {$kebunId}");
        $this->info("Blok yang akan dipertahankan: " . implode(', ', $keepCodes));
        $this->newLine();

        // Get all bloks for this kebun
        $allBloks = Blok::where('kebun_id', $kebunId)->get();
        
        if ($allBloks->isEmpty()) {
            $this->warn('⚠️  Tidak ada blok ditemukan untuk kebun ini.');
            return Command::SUCCESS;
        }

        $this->info("📋 Blok yang ditemukan di database:");
        foreach ($allBloks as $blok) {
            $status = in_array($blok->code, $keepCodes) ? '✅ KEEP' : '❌ DELETE';
            $this->line("   {$status} - {$blok->code} ({$blok->name}) - {$blok->jumlah_pohon} pohon");
        }
        $this->newLine();

        // Find bloks to delete
        $bloksToDelete = $allBloks->filter(function($blok) use ($keepCodes) {
            return !in_array($blok->code, $keepCodes);
        });

        if ($bloksToDelete->isEmpty()) {
            $this->info('✅ Semua blok sudah sesuai. Tidak ada yang perlu dihapus.');
            return Command::SUCCESS;
        }

        $this->warn("⚠️  Blok yang akan dihapus: " . $bloksToDelete->pluck('code')->implode(', '));
        $this->newLine();

        if ($dryRun) {
            $this->info('🔍 DRY RUN MODE - Tidak ada perubahan yang dilakukan');
            return Command::SUCCESS;
        }

        if (!$this->confirm('Apakah Anda yakin ingin menghapus blok-blok ini?', true)) {
            $this->info('❌ Dibatalkan oleh user.');
            return Command::SUCCESS;
        }

        $deletedFromDB = 0;
        $deletedFromFirebase = 0;
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($bloksToDelete as $blok) {
                $this->info("🗑️  Menghapus Blok {$blok->code}...");

                // Delete from Firebase
                try {
                    $blokCode = $blok->code;
                    $firebasePath = "kebuns/kebun_{$kebunId}/bloks/{$blokCode}";
                    
                    $this->firebase->setDatabaseData($firebasePath, null);
                    $deletedFromFirebase++;
                    $this->info("   ✅ Dihapus dari Firebase: {$firebasePath}");
                } catch (\Exception $e) {
                    $errorMsg = "Gagal hapus dari Firebase: " . $e->getMessage();
                    $errors[] = $errorMsg;
                    $this->error("   ❌ {$errorMsg}");
                    Log::error('Firebase delete error', [
                        'blok_code' => $blok->code,
                        'error' => $e->getMessage()
                    ]);
                }

                // Delete from MySQL
                try {
                    $blok->delete(); // Soft delete
                    $deletedFromDB++;
                    $this->info("   ✅ Dihapus dari database MySQL");
                } catch (\Exception $e) {
                    $errorMsg = "Gagal hapus dari database: " . $e->getMessage();
                    $errors[] = $errorMsg;
                    $this->error("   ❌ {$errorMsg}");
                    Log::error('Database delete error', [
                        'blok_id' => $blok->id,
                        'error' => $e->getMessage()
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
                    ['Deleted from Database', $deletedFromDB],
                    ['Deleted from Firebase', $deletedFromFirebase],
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

            $this->newLine();
            $this->info('🎉 Cleanup selesai!');
            $this->info("Blok yang tersisa: " . implode(', ', $keepCodes));

            return Command::SUCCESS;

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('❌ Fatal error: ' . $e->getMessage());
            Log::error('CleanupBloks fatal error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return Command::FAILURE;
        }
    }
}

