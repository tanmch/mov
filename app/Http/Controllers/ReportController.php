<?php

namespace App\Http\Controllers;

use App\Models\DetectionResult;
use App\Models\Blok;
use App\Models\SensorReading;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

class ReportController extends Controller
{
    /**
     * Display the report page
     */
    public function index()
    {
        $user = Auth::user();
        
        // Get summary data
        $summary = $this->getSummaryData($user);
        
        // Get available reports (from database or storage)
        $availableReports = $this->getAvailableReports($user);
        
        // Get blok options for filter
        $bloks = Blok::orderBy('code')->get();
        $blokOptions = $bloks->map(function($blok) {
            return [
                'value' => $blok->id,
                'label' => $blok->code . ' - ' . $blok->name,
            ];
        });
        
        return inertia('LaporanEkspor', [
            'summary' => $summary,
            'availableReports' => $availableReports,
            'blokOptions' => $blokOptions,
        ]);
    }
    
    /**
     * Generate and download report
     */
    public function generate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|in:deteksi,sensor,penyiraman,panen',
            'format' => 'required|in:pdf,csv,excel',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'blok_id' => 'nullable|exists:bloks,id',
            'status' => 'nullable|in:mentah,hampir_matang,matang,lewat_matang',
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }
        
        $user = Auth::user();
        $type = $request->type;
        $format = $request->format;
        $startDate = Carbon::parse($request->start_date);
        $endDate = Carbon::parse($request->end_date);
        
        try {
            switch ($type) {
                case 'deteksi':
                    return $this->generateDetectionReport($user, $format, $startDate, $endDate, $request->blok_id, $request->status);
                case 'sensor':
                    return $this->generateSensorReport($user, $format, $startDate, $endDate, $request->blok_id);
                case 'penyiraman':
                    return $this->generateWateringReport($user, $format, $startDate, $endDate, $request->blok_id);
                case 'panen':
                    return $this->generateHarvestReport($user, $format, $startDate, $endDate, $request->blok_id);
                default:
                    return response()->json([
                        'success' => false,
                        'message' => 'Tipe laporan tidak valid',
                    ], 400);
            }
        } catch (\Exception $e) {
            \Log::error('Error generating report:', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'request' => $request->all(),
            ]);
            
            // Return JSON error that can be parsed by frontend
            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat laporan: ' . $e->getMessage(),
                'error' => $e->getMessage(),
            ], 500)->header('Content-Type', 'application/json');
        }
    }
    
    /**
     * Generate Detection Report
     */
    private function generateDetectionReport($user, $format, $startDate, $endDate, $blokId = null, $status = null)
    {
        // Set end date to end of day to include all data on that day
        $endDate = $endDate->copy()->endOfDay();
        $startDate = $startDate->copy()->startOfDay();
        
        // Build query - include both manual uploads by user AND robot detections
        // For K-petani, show all detections. For petani, show only their uploads or detections from their bloks
        $query = DetectionResult::query()
            ->whereNotNull('detected_at')
            ->whereBetween('detected_at', [$startDate, $endDate])
            ->with(['blok.kebun']);
        
        // Filter by user role
        if ($user->role === 'petani') {
            // Petani hanya melihat deteksi yang mereka upload
            $query->where('uploaded_by', $user->id);
        }
        // K-petani melihat semua deteksi (tidak perlu filter uploaded_by)
        
        if ($blokId) {
            $query->where('blok_id', $blokId);
        }
        
        if ($status) {
            $query->where('maturity_level', $status);
        }
        
        $detections = $query->orderBy('detected_at', 'desc')->get();
        
        // Log for debugging
        \Log::info('Detection Report Query', [
            'user_id' => $user->id,
            'user_role' => $user->role,
            'start_date' => $startDate->toDateTimeString(),
            'end_date' => $endDate->toDateTimeString(),
            'blok_id' => $blokId,
            'status' => $status,
            'count' => $detections->count(),
        ]);
        
        $data = $detections->map(function($detection) {
            // Safely get ai_metadata
            $aiMetadata = is_array($detection->ai_metadata) ? $detection->ai_metadata : [];
            $bestDetection = $aiMetadata['best_detection'] ?? null;
            
            // Get maturity from best_detection or calculate from maturity_level
            $maturity = 0;
            if ($bestDetection && isset($bestDetection['maturity']) && is_numeric($bestDetection['maturity'])) {
                $maturity = $bestDetection['maturity'];
            } else {
                // Calculate maturity from maturity_level if best_detection maturity not available
                $maturityLevel = $detection->maturity_level ?? 'mentah';
                $maturityMap = [
                    'matang' => 85,
                    'hampir_matang' => 50,
                    'mentah' => 20,
                    'lewat_matang' => 95,
                ];
                $maturity = $maturityMap[$maturityLevel] ?? 0;
            }
            
            return [
                'tanggal' => $detection->detected_at ? $detection->detected_at->format('d/m/Y H:i') : '-',
                'blok' => $detection->blok->code ?? '-',
                'kebun' => $detection->blok->kebun->name ?? '-',
                'status' => $this->mapMaturityStatus($detection->maturity_level ?? 'mentah'),
                'kematangan' => is_numeric($maturity) ? number_format($maturity, 1) : '0',
                'confidence' => number_format($detection->confidence_score ?? 0, 2) . '%',
                'jumlah_mangga' => $detection->mango_count ?? 0,
            ];
        });
        
        // Check if data is empty
        if ($detections->isEmpty()) {
            // Return error message if no data found
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada data untuk periode yang dipilih. Pastikan tanggal yang dipilih benar dan ada data deteksi pada periode tersebut.',
                'debug' => [
                    'start_date' => $startDate->toDateTimeString(),
                    'end_date' => $endDate->toDateTimeString(),
                    'user_id' => $user->id,
                    'user_role' => $user->role,
                    'blok_id' => $blokId,
                    'status' => $status,
                ],
            ], 404)->header('Content-Type', 'application/json');
        }
        
        $title = 'Laporan Deteksi Kematangan';
        $filename = 'laporan_deteksi_' . $startDate->format('Y-m-d') . '_' . $endDate->format('Y-m-d');
        
        return $this->exportReport($data, $title, $filename, $format, [
            'start_date' => $startDate->format('d/m/Y'),
            'end_date' => $endDate->format('d/m/Y'),
            'total' => $detections->count(),
        ]);
    }
    
    /**
     * Generate Sensor Report
     */
    private function generateSensorReport($user, $format, $startDate, $endDate, $blokId = null)
    {
        // Set end date to end of day to include all data on that day
        $endDate = $endDate->copy()->endOfDay();
        $startDate = $startDate->copy()->startOfDay();
        
        $query = SensorReading::whereNotNull('reading_time')
            ->whereBetween('reading_time', [$startDate, $endDate])
            ->with(['blok.kebun']);
        
        if ($blokId) {
            $query->where('blok_id', $blokId);
        }
        
        $readings = $query->orderBy('reading_time', 'desc')->get();
        
        // Log for debugging
        \Log::info('Sensor Report Query', [
            'user_id' => $user->id,
            'start_date' => $startDate->toDateTimeString(),
            'end_date' => $endDate->toDateTimeString(),
            'blok_id' => $blokId,
            'count' => $readings->count(),
        ]);
        
        // Group readings by time and blok, then pivot by sensor_type
        $groupedData = $readings->groupBy(function($reading) {
            return $reading->reading_time->format('Y-m-d H:i') . '_' . ($reading->blok_id ?? 'null');
        });
        
        $data = $groupedData->map(function($group) {
            $firstReading = $group->first();
            $bySensorType = $group->keyBy('sensor_type');
            
            // Get values for each sensor type
            $suhu = $bySensorType->get('suhu_udara');
            $kelembapanUdara = $bySensorType->get('kelembapan_udara');
            $kelembapanTanah = $bySensorType->get('kelembapan_tanah');
            
            return [
                'tanggal' => $firstReading->reading_time ? $firstReading->reading_time->format('d/m/Y H:i') : '-',
                'blok' => $firstReading->blok->code ?? '-',
                'kebun' => $firstReading->blok->kebun->name ?? '-',
                'suhu' => $suhu ? number_format($suhu->value ?? 0, 1) . ' ' . ($suhu->unit ?? '°C') : '-',
                'kelembapan_udara' => $kelembapanUdara ? number_format($kelembapanUdara->value ?? 0, 1) . ' ' . ($kelembapanUdara->unit ?? '%') : '-',
                'kelembapan_tanah' => $kelembapanTanah ? number_format($kelembapanTanah->value ?? 0, 1) . ' ' . ($kelembapanTanah->unit ?? '%') : '-',
                'status' => $this->getOverallStatus($group),
            ];
        })->values();
        
        // Check if data is empty
        if ($data->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada data sensor untuk periode yang dipilih. Pastikan tanggal yang dipilih benar dan ada data sensor pada periode tersebut.',
                'debug' => [
                    'start_date' => $startDate->toDateTimeString(),
                    'end_date' => $endDate->toDateTimeString(),
                    'blok_id' => $blokId,
                ],
            ], 404)->header('Content-Type', 'application/json');
        }
        
        $title = 'Laporan Sensor IoT';
        $filename = 'laporan_sensor_' . $startDate->format('Y-m-d') . '_' . $endDate->format('Y-m-d');
        
        return $this->exportReport($data, $title, $filename, $format, [
            'start_date' => $startDate->format('d/m/Y'),
            'end_date' => $endDate->format('d/m/Y'),
            'total' => $data->count(),
        ]);
    }
    
    /**
     * Get overall status from group of sensor readings
     */
    private function getOverallStatus($readings)
    {
        $statuses = $readings->pluck('status')->toArray();
        if (in_array('critical', $statuses)) {
            return 'Kritis';
        }
        if (in_array('warning', $statuses)) {
            return 'Peringatan';
        }
        return 'Normal';
    }
    
    /**
     * Generate Watering Report
     */
    private function generateWateringReport($user, $format, $startDate, $endDate, $blokId = null)
    {
        // Placeholder - bisa diisi dengan data penyiraman jika ada
        $data = collect([]);
        
        $title = 'Laporan Penyiraman Otomatis';
        $filename = 'laporan_penyiraman_' . $startDate->format('Y-m-d') . '_' . $endDate->format('Y-m-d');
        
        return $this->exportReport($data, $title, $filename, $format, [
            'start_date' => $startDate->format('d/m/Y'),
            'end_date' => $endDate->format('d/m/Y'),
            'total' => 0,
        ]);
    }
    
    /**
     * Generate Harvest Prediction Report
     */
    private function generateHarvestReport($user, $format, $startDate, $endDate, $blokId = null)
    {
        $query = Blok::query();
        
        if ($blokId) {
            $query->where('id', $blokId);
        }
        
        $bloks = $query->with('kebun')->get();
        
        $data = $bloks->map(function($blok) {
            $latestDetection = DetectionResult::where('blok_id', $blok->id)
                ->orderBy('detected_at', 'desc')
                ->first();
            
            $avgMaturity = DetectionResult::where('blok_id', $blok->id)
                ->where('detected_at', '>=', now()->subDays(7))
                ->avg('confidence_score');
            
            return [
                'blok' => $blok->code,
                'kebun' => $blok->kebun->name ?? '-',
                'rata_kematangan' => number_format($avgMaturity ?? 0, 1) . '%',
                'prediksi_panen' => $blok->estimated_harvest_date ? Carbon::parse($blok->estimated_harvest_date)->format('d/m/Y') : '-',
                'persentase_matang' => number_format($blok->persentase_matang ?? 0, 1) . '%',
                'persentase_hampir_matang' => number_format($blok->persentase_hampir_matang ?? 0, 1) . '%',
            ];
        });
        
        $title = 'Laporan Prediksi Panen';
        $filename = 'laporan_prediksi_panen_' . $startDate->format('Y-m-d') . '_' . $endDate->format('Y-m-d');
        
        return $this->exportReport($data, $title, $filename, $format, [
            'start_date' => $startDate->format('d/m/Y'),
            'end_date' => $endDate->format('d/m/Y'),
            'total' => $bloks->count(),
        ]);
    }
    
    /**
     * Export report in different formats
     */
    private function exportReport($data, $title, $filename, $format, $metadata = [])
    {
        switch ($format) {
            case 'pdf':
                return $this->exportPDF($data, $title, $filename, $metadata);
            case 'csv':
                return $this->exportCSV($data, $title, $filename, $metadata);
            case 'excel':
                return $this->exportExcel($data, $title, $filename, $metadata);
            default:
                throw new \Exception('Format tidak didukung');
        }
    }
    
    /**
     * Export as PDF
     */
    private function exportPDF($data, $title, $filename, $metadata)
    {
        try {
            $pdf = Pdf::loadView('reports.pdf', [
                'title' => $title,
                'data' => $data,
                'metadata' => $metadata,
                'generated_at' => now()->format('d/m/Y H:i:s'),
            ]);
            
            return $pdf->download($filename . '.pdf');
        } catch (\Exception $e) {
            \Log::error('PDF Export Error:', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            throw new \Exception('Gagal membuat PDF: ' . $e->getMessage());
        }
    }
    
    /**
     * Export as CSV
     */
    private function exportCSV($data, $title, $filename, $metadata)
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '.csv"',
        ];
        
        $callback = function() use ($data, $title, $metadata) {
            $file = fopen('php://output', 'w');
            
            // BOM untuk UTF-8 (agar Excel bisa baca dengan benar)
            fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
            
            // Header metadata
            fputcsv($file, ['Laporan: ' . $title]);
            fputcsv($file, ['Periode: ' . ($metadata['start_date'] ?? '') . ' - ' . ($metadata['end_date'] ?? '')]);
            fputcsv($file, ['Total Data: ' . ($metadata['total'] ?? 0)]);
            fputcsv($file, []);
            
            // Data headers
            if ($data->isNotEmpty() && is_countable($data) && count($data) > 0) {
                $firstRow = is_array($data->first()) ? $data->first() : (array)$data->first();
                fputcsv($file, array_keys($firstRow));
                
                // Data rows
                foreach ($data as $row) {
                    $rowArray = is_array($row) ? $row : (array)$row;
                    fputcsv($file, $rowArray);
                }
            }
            
            fclose($file);
        };
        
        return response()->stream($callback, 200, $headers);
    }
    
    /**
     * Export as Excel (using CSV format as Excel can open CSV)
     */
    private function exportExcel($data, $title, $filename, $metadata)
    {
        try {
            // Use CSV format (Excel can open CSV files)
            // This is simpler and more reliable than using the old Excel library
            $csvContent = $this->generateCSVContent($data, $title, $metadata);
            
            // Return as CSV with .xlsx extension (Excel will open it)
            $headers = [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $filename . '.csv"',
            ];
            
            return response($csvContent, 200, $headers);
        } catch (\Exception $e) {
            \Log::error('Excel Export Error:', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            throw new \Exception('Gagal membuat Excel: ' . $e->getMessage());
        }
    }
    
    /**
     * Generate CSV content
     */
    private function generateCSVContent($data, $title, $metadata)
    {
        $output = fopen('php://temp', 'r+');
        
        // BOM untuk UTF-8
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
        
        // Header metadata
        fputcsv($output, ['Laporan: ' . $title]);
        fputcsv($output, ['Periode: ' . ($metadata['start_date'] ?? '') . ' - ' . ($metadata['end_date'] ?? '')]);
        fputcsv($output, ['Total Data: ' . ($metadata['total'] ?? 0)]);
        fputcsv($output, []);
        
        // Data headers
        if ($data->isNotEmpty() && is_countable($data) && count($data) > 0) {
            $firstRow = is_array($data->first()) ? $data->first() : (array)$data->first();
            fputcsv($output, array_keys($firstRow));
            
            // Data rows
            foreach ($data as $row) {
                $rowArray = is_array($row) ? $row : (array)$row;
                fputcsv($output, $rowArray);
            }
        }
        
        rewind($output);
        $content = stream_get_contents($output);
        fclose($output);
        
        return $content;
    }
    
    /**
     * Get summary data
     */
    private function getSummaryData($user)
    {
        $startOfMonth = now()->startOfMonth();
        $endOfMonth = now()->endOfMonth();
        
        $totalDetections = DetectionResult::where('uploaded_by', $user->id)
            ->whereBetween('detected_at', [$startOfMonth, $endOfMonth])
            ->count();
        
        $avgMaturity = DetectionResult::where('uploaded_by', $user->id)
            ->whereBetween('detected_at', [$startOfMonth, $endOfMonth])
            ->avg('confidence_score') ?? 0;
        
        return [
            'totalDeteksi' => $totalDetections,
            'avgKematangan' => round($avgMaturity, 0),
            'totalPenyiraman' => 0, // Placeholder
            'prediksiPanen' => now()->addDays(15)->format('d M Y'),
        ];
    }
    
    /**
     * Get available reports
     */
    private function getAvailableReports($user)
    {
        // Placeholder - bisa diisi dengan data dari storage atau database
        return [];
    }
    
    /**
     * Map maturity level to Indonesian
     */
    private function mapMaturityStatus($level)
    {
        $map = [
            'mentah' => 'Mentah',
            'hampir_matang' => 'Hampir Matang',
            'matang' => 'Matang',
            'lewat_matang' => 'Lewat Matang',
        ];
        
        return $map[$level] ?? $level;
    }
}

