<?php

namespace Database\Seeders;

use App\Models\Blok;
use App\Models\DetectionResult;
use App\Models\User;
use Illuminate\Database\Seeder;

class DetectionResultSeeder extends Seeder
{
    public function run(): void
    {
        $bloks = Blok::all();
        $user = User::where('role', 'petani')->first() ?? User::first();

        // Maturity distribution: some blocks ready soon, some later
        $distributions = [
            'C2' => ['ripe' => 0.95, 'half_ripe' => 0.05],       // Siap dalam 2-3 hari
            'C3' => ['ripe' => 0.92, 'half_ripe' => 0.08],       // Siap dalam 3-4 hari
            'A1' => ['half_ripe' => 0.78, 'unripe' => 0.22],     // Siap dalam 7-10 hari
            'B2' => ['half_ripe' => 0.72, 'unripe' => 0.28],     // Siap dalam 10-12 hari
            'A2' => ['unripe' => 0.65, 'half_ripe' => 0.35],     // Siap dalam 15-18 hari
            'B1' => ['unripe' => 0.70, 'half_ripe' => 0.30],     // Siap dalam 12-15 hari
            'C1' => ['unripe' => 0.75, 'half_ripe' => 0.25],     // Siap dalam 10-14 hari
        ];

        $maturityMap = [
            'unripe' => 'mentah',
            'half_ripe' => 'hampir_matang',
            'ripe' => 'matang',
            'overripe' => 'lewat_matang',
        ];

        foreach ($bloks as $blok) {
            $dist = $distributions[$blok->code] ?? ['half_ripe' => 0.5, 'unripe' => 0.5];
            $mango_count = rand(80, 200);

            // Generate 3-5 detections per blok (simulating multiple robot scans)
            for ($i = 0; $i < rand(3, 5); $i++) {
                $maturityType = $this->pickByWeight($dist);
                $confidence = rand(75, 99) / 100;

                DetectionResult::create([
                    'blok_id' => $blok->id,
                    'maturity_level' => $maturityMap[$maturityType],
                    'confidence_score' => $confidence,
                    'mango_count' => $mango_count,
                    'bounding_boxes' => [],
                    'ai_metadata' => [
                        'model' => 'best.onnx',
                        'input_size' => 640,
                        'class' => $maturityType,
                        'detection_time_ms' => rand(200, 800),
                    ],
                    'detection_source' => 'robot_camera',
                    'uploaded_by' => $user->id,
                    'detected_at' => now()->subDays(rand(0, 3)),
                ]);
            }
        }
    }

    /**
     * Pick key from array based on weight values.
     */
    private function pickByWeight(array $weights): string
    {
        $rand = mt_rand() / mt_getrandmax();
        $sum = 0;

        foreach ($weights as $key => $weight) {
            $sum += $weight;
            if ($rand <= $sum) {
                return $key;
            }
        }

        return array_key_first($weights);
    }
}
