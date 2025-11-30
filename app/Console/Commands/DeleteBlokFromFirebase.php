<?php

namespace App\Console\Commands;

use App\Services\FirebaseService;
use Illuminate\Console\Command;

class DeleteBlokFromFirebase extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'firebase:delete-blok 
                            {blok-code : Code blok yang akan dihapus (e.g. A4)}
                            {--kebun-id=1 : ID kebun}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Hapus blok dari Firebase secara langsung';

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
        $blokCode = $this->argument('blok-code');
        // Always use kebun_id = 1 for Firebase structure (single kebun in Firebase)
        $kebunId = 1;

        $firebasePath = "kebuns/kebun_{$kebunId}/bloks/{$blokCode}";

        $this->info("🗑️  Menghapus Blok {$blokCode} dari Firebase...");
        $this->info("Path: {$firebasePath}");

        try {
            // Delete from Firebase by setting to null
            $this->firebase->setDatabaseData($firebasePath, null);
            
            $this->info("✅ Blok {$blokCode} berhasil dihapus dari Firebase!");
            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("❌ Gagal menghapus blok: " . $e->getMessage());
            \Log::error('Firebase delete blok error', [
                'blok_code' => $blokCode,
                'path' => $firebasePath,
                'error' => $e->getMessage()
            ]);
            return Command::FAILURE;
        }
    }
}

