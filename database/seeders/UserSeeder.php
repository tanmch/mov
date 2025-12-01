<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create default K-Petani (Admin)
        $kPetani = User::firstOrCreate(
            ['email' => 'admin@mov-platform.com'],
            [
                'name' => 'Admin K-Petani',
                'email' => 'admin@mov-platform.com',
                'password' => Hash::make('password123'), // ⚠️ Ganti dengan password yang aman di production
                'role' => 'k-petani',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );

        $this->command->info("✅ Created/Updated K-Petani: {$kPetani->email}");

        // Create sample Petani users
        $petanis = [
            [
                'name' => 'Petani 1',
                'email' => 'petani1@mov-platform.com',
                'password' => Hash::make('password123'),
                'role' => 'petani',
                'is_active' => true,
                'email_verified_at' => now(),
            ],
            [
                'name' => 'Petani 2',
                'email' => 'petani2@mov-platform.com',
                'password' => Hash::make('password123'),
                'role' => 'petani',
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        ];

        foreach ($petanis as $petani) {
            $user = User::firstOrCreate(
                ['email' => $petani['email']],
                $petani
            );
            $this->command->info("✅ Created/Updated Petani: {$user->email}");
        }

        $this->command->info('✅ UserSeeder completed!');
    }
}
