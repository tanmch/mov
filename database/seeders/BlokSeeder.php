<?php

namespace Database\Seeders;

use App\Models\Blok;
use App\Models\Kebun;
use Illuminate\Database\Seeder;

class BlokSeeder extends Seeder
{
    public function run(): void
    {
        // Get first user (must exist from previous seeders)
        $user = \App\Models\User::first();
        if (!$user) {
            echo "❌ No user found. Run admin/user seeder first.\n";
            return;
        }

        // Create or get kebun
        $kebun = Kebun::firstOrCreate(
            ['name' => 'Kebun Utama'],
            [
                'location' => 'Bandung',
                'luas' => 5.0,
                'jenis_mangga' => 'Harum Manis',
                'owner_id' => $user->id,
            ]
        );

        $bloks = [
            ['code' => 'A1', 'luas' => 0.5],
            ['code' => 'A2', 'luas' => 0.5],
            ['code' => 'B1', 'luas' => 0.75],
            ['code' => 'B2', 'luas' => 0.75],
            ['code' => 'C1', 'luas' => 1.0],
            ['code' => 'C2', 'luas' => 1.0],
            ['code' => 'C3', 'luas' => 1.0],
        ];

        foreach ($bloks as $blok) {
            Blok::firstOrCreate(
                ['code' => $blok['code'], 'kebun_id' => $kebun->id],
                array_merge($blok, [
                    'name' => 'Blok ' . $blok['code'],
                    'kebun_id' => $kebun->id,
                    'jumlah_pohon' => rand(30, 60),
                    'status' => 'sehat',
                ])
            );
        }
    }
}
