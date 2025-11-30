<?php

namespace App\Console\Commands;

use App\Models\Blok;
use App\Services\FirebaseService;
use Illuminate\Console\Command;

class VerifyBloks extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'kebun:verify-bloks {--kebun-id=1 : ID kebun}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verifikasi blok di database dan Firebase';

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

        $this->info("🔍 Verifikasi Blok untuk Kebun ID: {$kebunId}");
        $this->newLine();

        // Get bloks from database
        $dbBloks = Blok::where('kebun_id', $kebunId)->get();
        
        $this->info("📊 Blok di Database MySQL:");
        if ($dbBloks->isEmpty()) {
            $this->warn("   Tidak ada blok ditemukan");
        } else {
            $this->table(
                ['Code', 'Name', 'Jumlah Pohon', 'Status'],
                $dbBloks->map(function($b) {
                    return [
                        $b->code,
                        $b->name,
                        $b->jumlah_pohon,
                        $b->status,
                    ];
                })->toArray()
            );
        }

        $this->newLine();

        // Get bloks from Firebase
        $this->info("🔥 Blok di Firebase:");
        try {
            // Always use kebun_id = 1 for Firebase structure (single kebun in Firebase)
            $firebaseBloks = $this->firebase->getDatabaseData("kebuns/kebun_1/bloks");
            
            if (!$firebaseBloks || empty($firebaseBloks)) {
                $this->warn("   Tidak ada blok ditemukan di Firebase");
            } else {
                $firebaseData = [];
                foreach ($firebaseBloks as $code => $data) {
                    $info = $data['info'] ?? [];
                    $firebaseData[] = [
                        $code,
                        $info['name'] ?? 'N/A',
                        $info['jumlah_pohon'] ?? 'N/A',
                        $info['status'] ?? 'N/A',
                    ];
                }
                
                $this->table(
                    ['Code', 'Name', 'Jumlah Pohon', 'Status'],
                    $firebaseData
                );
            }
        } catch (\Exception $e) {
            $this->error("   ❌ Error membaca Firebase: " . $e->getMessage());
        }

        $this->newLine();
        $this->info("✅ Verifikasi selesai!");
        $this->info("Total blok di database: " . $dbBloks->count());
        
        return Command::SUCCESS;
    }
}

