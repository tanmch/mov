<?php

namespace Database\Seeders;

use App\Models\SensorThreshold;
use App\Models\User;
use Illuminate\Database\Seeder;

class SensorThresholdSeeder extends Seeder
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

        // Default thresholds berdasarkan SensorThreshold::getDefaults()
        $thresholds = [
            [
                'sensor_type' => 'suhu_udara',
                'warning_max' => 35.0,
                'critical_max' => 40.0,
                'normal_min' => 20.0,
                'normal_max' => 32.0,
                'description' => 'Threshold untuk suhu udara (°C). Warning jika > 35°C, Critical jika > 40°C',
                'created_by' => $kPetaniId,
                'updated_by' => $kPetaniId,
            ],
            [
                'sensor_type' => 'kelembapan_udara',
                'warning_min' => 30.0,
                'critical_min' => 20.0,
                'normal_min' => 60.0,
                'normal_max' => 85.0,
                'description' => 'Threshold untuk kelembapan udara (%). Warning jika < 30%, Critical jika < 20%',
                'created_by' => $kPetaniId,
                'updated_by' => $kPetaniId,
            ],
            [
                'sensor_type' => 'kelembapan_tanah',
                'warning_min' => 30.0,
                'critical_min' => 20.0,
                'normal_min' => 50.0,
                'normal_max' => 75.0,
                'description' => 'Threshold untuk kelembapan tanah (%). Warning jika < 30%, Critical jika < 20%',
                'created_by' => $kPetaniId,
                'updated_by' => $kPetaniId,
            ],
        ];

        foreach ($thresholds as $threshold) {
            $sensorThreshold = SensorThreshold::updateOrCreate(
                ['sensor_type' => $threshold['sensor_type']],
                $threshold
            );
            $this->command->info("✅ Created/Updated Sensor Threshold: {$sensorThreshold->sensor_type}");
        }

        $this->command->info('✅ SensorThresholdSeeder completed!');
    }
}
