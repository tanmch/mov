<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\WorkId;
use App\Models\User;

class WorkIdSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create default K-Petani work ID if it doesn't exist
        $defaultWorkId = 'K-PETANI-DEFAULT';
        
        if (!WorkId::where('work_id', $defaultWorkId)->exists()) {
            WorkId::create([
                'work_id' => $defaultWorkId,
                'role' => 'k-petani',
                'created_by' => null, // System generated
                'is_used' => false,
                'notes' => 'Default work ID for initial K-Petani registration',
            ]);
        }

        // Create a few sample work IDs for testing (optional)
        // You can remove this if not needed
        if (WorkId::count() <= 1) {
            // Create 5 sample Petani work IDs
            for ($i = 1; $i <= 5; $i++) {
                WorkId::create([
                    'work_id' => WorkId::generateWorkId('petani'),
                    'role' => 'petani',
                    'created_by' => null,
                    'is_used' => false,
                    'notes' => 'Sample Petani work ID #' . $i,
                ]);
            }

            // Create 2 sample K-Petani work IDs
            for ($i = 1; $i <= 2; $i++) {
                WorkId::create([
                    'work_id' => WorkId::generateWorkId('k-petani'),
                    'role' => 'k-petani',
                    'created_by' => null,
                    'is_used' => false,
                    'notes' => 'Sample K-Petani work ID #' . $i,
                ]);
            }
        }
    }
}
