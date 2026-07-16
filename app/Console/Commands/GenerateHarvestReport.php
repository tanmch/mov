<?php

namespace App\Console\Commands;

use App\Services\HarvestPredictionService;
use Illuminate\Console\Command;

class GenerateHarvestReport extends Command
{
    protected $signature = 'report:harvest';
    protected $description = 'Generate harvest prediction report as CSV';

    public function __construct(private HarvestPredictionService $predictionService)
    {
        parent::__construct();
    }

    public function handle()
    {
        $prediction = $this->predictionService->getOverallPrediction();
        $this->generateCSV($prediction);
    }

    private function generateCSV(array $prediction)
    {
        // UTF-8 BOM untuk Excel compatibility
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

        $filename = 'prediksi-panen-' . now()->format('Y-m-d-His') . '.csv';
        file_put_contents(storage_path("app/reports/$filename"), $csv);

        $this->info("✓ Laporan CSV berhasil digenerate: storage/app/reports/$filename");
    }
}
