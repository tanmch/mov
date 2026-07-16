<?php

namespace App\Http\Controllers;

use App\Services\HarvestPredictionService;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PredictionController extends Controller
{
    public function __construct(private HarvestPredictionService $predictionService)
    {
    }

    /**
     * Get harvest prediction data (JSON API)
     */
    public function getPredictionData()
    {
        $prediction = $this->predictionService->getOverallPrediction();
        $weeklyTrend = $this->predictionService->getWeeklyTrend();

        return response()->json([
            'overall' => $prediction['overall'],
            'blocks' => $prediction['blocks'],
            'weekly_trend' => $weeklyTrend,
            'generated_at' => $prediction['generated_at'],
        ]);
    }

    /**
     * Generate and download harvest prediction report as CSV
     */
    public function generateCSV(): StreamedResponse
    {
        $prediction = $this->predictionService->getOverallPrediction();

        // UTF-8 BOM untuk Excel
        $csv = "\xEF\xBB\xBF";
        $csv .= "RINGKASAN PREDIKSI PANEN\n";
        $csv .= "Tanggal Perkiraan Panen,{$prediction['overall']['estimated_harvest_date']}\n";
        $csv .= "Hari Tersisa,{$prediction['overall']['days_left']} hari\n";
        $csv .= "Total Buah,{$prediction['overall']['total_fruits']}\n";
        $csv .= "Skor Kualitas Rata-rata,{$prediction['overall']['avg_quality_score']}%\n";
        $csv .= "Perkiraan Hasil Panen,{$prediction['overall']['expected_yield_ton']} ton\n";
        $csv .= "Blok Siap Panen,{$prediction['overall']['blocks_ready_soon']}\n\n";

        $csv .= "PREDIKSI PER BLOK\n";
        $csv .= "Blok,Kesiapan,Buah,Tanggal Panen,Kualitas\n";

        foreach ($prediction['blocks'] as $block) {
            if ($block['readiness'] > 0) {
                $csv .= "{$block['block_code']},{$block['readiness']}%,{$block['fruits']},{$block['harvest_date_range']},{$block['quality']}\n";
            }
        }

        return response()->streamDownload(
            function () use ($csv) { echo $csv; },
            'prediksi-panen-' . now()->format('Y-m-d-His') . '.csv',
            [
                'Content-Type' => 'text/csv; charset=utf-8',
                'Content-Disposition' => 'attachment; filename="prediksi-panen-' . now()->format('Y-m-d-His') . '.csv"',
            ]
        );
    }
}
