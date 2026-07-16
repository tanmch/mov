<?php

namespace App\Services;

use App\Models\Blok;
use App\Models\DetectionResult;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class HarvestPredictionService
{
    private const MATURITY_MAP = [
        'mentah' => 0.20,
        'hampir_matang' => 0.65,
        'matang' => 0.90,
        'lewat_matang' => 0.95,
    ];

    private const DAYS_TO_HARVEST = [
        'mentah' => 15,
        'hampir_matang' => 5,
        'matang' => 0,
        'lewat_matang' => -1,
    ];

    private const GROWTH_RATE_PER_DAY = 0.03; // 3% per hari

    /**
     * Get harvest predictions for all bloks
     */
    public function getOverallPrediction(): array
    {
        // predictBlock() only needs the latest detection per blok, so don't
        // eager-load every detection row here.
        $bloks = Blok::all();

        $blockPredictions = $bloks->map(fn ($blok) => $this->predictBlock($blok))->toArray();

        $overallPrediction = $this->aggregateOverall($blockPredictions);

        return [
            'overall' => $overallPrediction,
            'blocks' => $blockPredictions,
            'generated_at' => now(),
        ];
    }

    /**
     * Predict harvest for single block
     */
    public function predictBlock(Blok $blok): array
    {
        $latestDetection = $blok->detectionResults()
            ->latest('detected_at')
            ->first();

        if (! $latestDetection) {
            return [
                'block_code' => $blok->code,
                'readiness' => 0,
                'fruits' => 0,
                'harvest_date_range' => 'N/A',
                'quality' => 'Tidak Ada Data',
                'days_to_harvest' => null,
                'confidence' => 0,
                'last_detection_at' => null,
            ];
        }

        $maturityLevel = $latestDetection->maturity_level;
        $baseMaturity = self::MATURITY_MAP[$maturityLevel] ?? 0.50;
        $baseDaysToHarvest = self::DAYS_TO_HARVEST[$maturityLevel] ?? 10;

        // Calculate current readiness (0-100%)
        $readiness = min(100, (int)($baseMaturity * 100));

        // Estimate days to harvest (optimal harvest at 90% maturity)
        $optimalMaturity = 0.90;
        if ($baseMaturity >= $optimalMaturity) {
            $daysToHarvest = 0;
            $harvestDateRange = '0-1 hari (Panen sekarang)';
        } else {
            $maturityGap = $optimalMaturity - $baseMaturity;
            $daysToHarvest = max(1, ceil($maturityGap / self::GROWTH_RATE_PER_DAY));
            $harvestDate = now()->addDays($daysToHarvest);
            $harvestDateRange = "{$daysToHarvest}-" . ($daysToHarvest + 1) . " hari";
        }

        $quality = $this->getQualityLabel($readiness);
        $confidence = $latestDetection->confidence_score ?? 0;
        $mangoCount = $latestDetection->mango_count ?? 0;

        return [
            'block_code' => $blok->code,
            'readiness' => $readiness,
            'fruits' => $mangoCount,
            'harvest_date_range' => $harvestDateRange,
            'quality' => $quality,
            'days_to_harvest' => $daysToHarvest,
            'confidence' => round($confidence * 100, 1),
            'last_detection_at' => $latestDetection->detected_at?->format('Y-m-d H:i:s'),
            'maturity_level' => $maturityLevel,
        ];
    }

    /**
     * Aggregate overall prediction from block predictions
     */
    private function aggregateOverall(array $blockPredictions): array
    {
        if (empty($blockPredictions)) {
            return [
                'estimated_harvest_date' => 'N/A',
                'days_left' => null,
                'total_fruits' => 0,
                'avg_quality_score' => 0,
                'expected_yield_ton' => 0,
                'blocks_ready_soon' => 0,
                'weather_optimal' => true,
            ];
        }

        $readyBlocks = array_filter($blockPredictions, fn ($b) => $b['readiness'] >= 90);
        $blocksSoonReady = array_filter($blockPredictions, fn ($b) => $b['readiness'] >= 70 && $b['readiness'] < 90);
        $avgReadiness = array_sum(array_column($blockPredictions, 'readiness')) / count($blockPredictions);
        $totalFruits = array_sum(array_column($blockPredictions, 'fruits'));

        // Estimate overall harvest date (when 80% of blocks are ready)
        $blocksReadyArray = array_filter($blockPredictions, fn ($b) => $b['readiness'] >= 80);
        $readyPercentage = count($blocksReadyArray) / count($blockPredictions);

        if ($readyPercentage >= 0.80) {
            $estimatedDate = now()->addDays(2)->format('d-m-Y');
            $daysLeft = 2;
        } else {
            $avgDaysToHarvest = array_sum(array_column(array_filter($blockPredictions, fn ($b) => $b['days_to_harvest'] !== null), 'days_to_harvest')) / count($blockPredictions) ?? 10;
            $daysLeft = max(1, ceil($avgDaysToHarvest / 2));
            $estimatedDate = now()->addDays($daysLeft)->format('d-m-Y');
        }

        // Estimate yield (simplified: assume 5-7 kg per 100 mangoes)
        $yieldPerMango = 0.06; // 60 gram per mango on average
        $expectedYieldKg = $totalFruits * $yieldPerMango;
        $expectedYieldTon = round($expectedYieldKg / 1000, 2);

        return [
            'estimated_harvest_date' => $estimatedDate,
            'days_left' => $daysLeft,
            'total_fruits' => $totalFruits,
            'avg_quality_score' => (int)$avgReadiness,
            'expected_yield_ton' => $expectedYieldTon,
            'blocks_ready_soon' => count($readyBlocks) + count($blocksSoonReady),
            'weather_optimal' => true,
            'avg_readiness' => round($avgReadiness, 1),
        ];
    }

    /**
     * Get quality label from readiness percentage
     */
    private function getQualityLabel(int $readiness): string
    {
        return match (true) {
            $readiness >= 90 => 'Sangat Baik',
            $readiness >= 75 => 'Baik',
            $readiness >= 60 => 'Sedang',
            $readiness >= 40 => 'Mulai Matang',
            default => 'Muda',
        };
    }

    /**
     * Get weekly trend (simulated from recent detections)
     */
    public function getWeeklyTrend(): array
    {
        // Single grouped query instead of one query per day.
        $averages = DetectionResult::where('detected_at', '>=', now()->subDays(6)->startOfDay())
            ->selectRaw("DATE(detected_at) as day, AVG(CASE
                WHEN maturity_level = 'mentah' THEN 20
                WHEN maturity_level = 'hampir_matang' THEN 65
                WHEN maturity_level = 'matang' THEN 90
                WHEN maturity_level = 'lewat_matang' THEN 95
                ELSE 50 END) as avg_maturity")
            ->groupBy('day')
            ->pluck('avg_maturity', 'day');

        $trend = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = now()->subDays($i)->toDateString();
            $trend[] = (int) ($averages[$day] ?? 60);
        }

        return $trend;
    }
}
