<?php

namespace Database\Seeders;

use App\Models\ChatGroup;
use App\Models\User;
use Illuminate\Database\Seeder;

class ChatGroupSeeder extends Seeder
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
            $kPetaniId = null;
        } else {
            $kPetaniId = $kPetani->id;
        }

        // Create default group "Grup MOV Center"
        $defaultGroup = ChatGroup::firstOrCreate(
            [
                'type' => 'public',
                'name' => 'Grup MOV Center',
            ],
            [
                'description' => 'Grup diskusi untuk Petani dan K-Petani',
                'created_by' => $kPetaniId,
                'is_active' => true,
            ]
        );

        $this->command->info("✅ Created/Updated Chat Group: {$defaultGroup->name}");
        $this->command->info('✅ ChatGroupSeeder completed!');
    }
}
