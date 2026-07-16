<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Check if admin already exists
        $adminEmail = 'admin@example.com';
        
        if (User::where('email', $adminEmail)->exists()) {
            $this->command->info('Admin user already exists. Skipping...');
            return;
        }

        // Create admin user with k-petani role
        User::create([
            'firebase_uid' => 'admin-' . Str::uuid()->toString(),
            'email' => $adminEmail,
            'name' => 'Administrator',
            'username' => 'admin',
            'id_kerja' => 'ADMIN-001',
            'phone' => null,
            'role' => 'k-petani',
            'photo_url' => null,
            'is_active' => true,
            'password' => Hash::make('password'), // Default password, should be changed
            'preferences' => null,
        ]);

        $this->command->info('Admin user created successfully!');
        $this->command->info('Email: ' . $adminEmail);
        $this->command->info('Password: password (please change this after first login)');
    }
}

