<?php

namespace Database\Seeders;

use App\Models\Kebun;
use App\Models\Blok;
use App\Models\User;
use Illuminate\Database\Seeder;

class KebunBlokSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get first K-Petani user
        $kPetani = User::where('role', 'k-petani')->first();
        
        if (!$kPetani) {
            $this->command->warn('⚠️  No K-Petani found. Please run UserSeeder first.');
            return;
        }

        // Create kebun utama
        $kebun = Kebun::firstOrCreate(
            ['name' => 'Kebun Utama'],
            [
                'owner_id' => $kPetani->id,
                'location' => 'Cirebon, Jawa Barat',
                'latitude' => -6.7058,
                'longitude' => 108.5570,
                'luas' => 10.00,
                'description' => 'Kebun utama untuk monitoring dan pengelolaan mangga',
                'jenis_mangga' => 'Gedong',
                'status' => 'active',
            ]
        );

        $this->command->info("✅ Created/Updated Kebun: {$kebun->name}");

        // Create bloks dengan jumlah pohon yang bervariasi
        $bloks = [
            ['code' => 'A1', 'name' => 'Blok A1', 'luas' => 2.5, 'jumlah_pohon' => 23, 'status' => 'sehat'],
            ['code' => 'A2', 'name' => 'Blok A2', 'luas' => 2.5, 'jumlah_pohon' => 24, 'status' => 'sehat'],
            ['code' => 'B1', 'name' => 'Blok B1', 'luas' => 2.5, 'jumlah_pohon' => 23, 'status' => 'sehat'],
            ['code' => 'B2', 'name' => 'Blok B2', 'luas' => 2.5, 'jumlah_pohon' => 24, 'status' => 'sehat'],
            ['code' => 'C1', 'name' => 'Blok C1', 'luas' => 2.5, 'jumlah_pohon' => 23, 'status' => 'sehat'],
        ];

        foreach ($bloks as $blokData) {
            $blok = Blok::firstOrCreate(
                [
                    'kebun_id' => $kebun->id,
                    'code' => $blokData['code'],
                ],
                [
                    'name' => $blokData['name'],
                    'luas' => $blokData['luas'],
                    'jumlah_pohon' => $blokData['jumlah_pohon'],
                    'status' => $blokData['status'],
                ]
            );
            $this->command->info("  ✅ Created/Updated Blok: {$blok->code} ({$blok->jumlah_pohon} pohon)");
        }

        $totalPohon = array_sum(array_column($bloks, 'jumlah_pohon'));
        $this->command->info("✅ KebunBlokSeeder completed! Total: {$kebun->name} dengan " . count($bloks) . " blok ({$totalPohon} pohon)");
    }
}
