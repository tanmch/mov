<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Style\Font;
use PhpOffice\PhpSpreadsheet\Style\PatternFill;

class HarvestPredictionExport implements FromCollection, WithHeadings, WithStyles
{
    public function __construct(private array $prediction)
    {
    }

    public function collection()
    {
        $rows = [];

        // Overall prediction section
        $overall = $this->prediction['overall'];
        $rows[] = ['RINGKASAN PREDIKSI PANEN', '', ''];
        $rows[] = ['Tanggal Perkiraan Panen', $overall['estimated_harvest_date'], ''];
        $rows[] = ['Hari Tersisa', $overall['days_left'] . ' hari', ''];
        $rows[] = ['Total Buah', $overall['total_fruits'] . ' buah', ''];
        $rows[] = ['Skor Kualitas Rata-rata', $overall['avg_quality_score'] . '%', ''];
        $rows[] = ['Perkiraan Hasil Panen', $overall['expected_yield_ton'] . ' ton', ''];
        $rows[] = ['Blok Siap Panen', $overall['blocks_ready_soon'] . ' blok', ''];
        $rows[] = [];

        // Per-block predictions
        $rows[] = ['PREDIKSI PER BLOK', '', '', '', ''];
        $rows[] = ['Blok', 'Kesiapan', 'Buah', 'Tanggal Panen', 'Kualitas'];

        foreach ($this->prediction['blocks'] as $block) {
            if ($block['readiness'] > 0) { // Skip blocks with no data
                $rows[] = [
                    $block['block_code'],
                    $block['readiness'] . '%',
                    $block['fruits'],
                    $block['harvest_date_range'],
                    $block['quality'],
                ];
            }
        }

        return collect($rows);
    }

    public function headings(): array
    {
        return [];
    }

    public function styles($sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 14]],
            9 => ['font' => ['bold' => true, 'size' => 12]],
            10 => ['font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => PatternFill::FILL_SOLID, 'startColor' => ['rgb' => '4CAF50']]],
        ];
    }
}
