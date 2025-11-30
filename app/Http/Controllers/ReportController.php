<?php

namespace App\Http\Controllers;

use App\Models\DetectionResult;
use App\Models\Blok;
use App\Models\SensorReading;
use App\Services\FirebaseService;
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
    protected $firebase;
    
    public function __construct(FirebaseService $firebase)
    {
        $this->firebase = $firebase;
    }
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
        // Group by code to avoid duplicates (same as DashboardController)
        $blokQuery = Blok::with('kebun')->orderBy('code')->orderBy('id');
        if ($user->role === 'petani') {
            $blokQuery->whereHas('kebun', function($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }
        // Get unique bloks by code (if same code exists, take the first one)
        $bloks = $blokQuery->get()->unique(function($blok) {
            return $blok->code ?? $blok->id;
        })->values();
        $blokOptions = $bloks->map(function($blok) {
            return [
                'value' => $blok->id,
                'label' => $blok->code . ' - ' . $blok->name,
            ];
        });
        
        // Get blok statistics for summary
        $blokStats = $this->getBlokStatistics($user, $bloks);
        
        return inertia('LaporanEkspor', [
            'summary' => $summary,
            'availableReports' => $availableReports,
            'blokOptions' => $blokOptions,
            'blokStats' => $blokStats,
        ]);
    }
    
    /**
     * Generate and download report
     */
    public function generate(Request $request)
    {
        // Support both GET and POST requests
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
     * Generate Sensor Report - Data from MySQL (synced from Firebase)
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
        
        // Filter by user role
        if ($user->role === 'petani') {
            $query->whereHas('blok.kebun', function($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }
        
        $readings = $query->orderBy('reading_time', 'desc')->get();
        
        // Log for debugging
        \Log::info('Sensor Report Query from MySQL', [
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
     * Generate Watering Report - Data from MySQL (synced from Firebase)
     * Includes both Penyiraman Air and Pemupukan
     */
    private function generateWateringReport($user, $format, $startDate, $endDate, $blokId = null)
    {
        // Set end date to end of day to include all data on that day
        $endDate = $endDate->copy()->endOfDay();
        $startDate = $startDate->copy()->startOfDay();
        
        // Query robot schedules with mission_type = 'penyiraman' or 'pemupukan'
        $query = \App\Models\RobotSchedule::whereIn('mission_type', ['penyiraman', 'pemupukan'])
            ->whereNotNull('completed_at')
            ->whereBetween('completed_at', [$startDate, $endDate])
            ->with(['blok.kebun', 'creator']);
        
        // Filter by user role
        if ($user->role === 'petani') {
            // Petani hanya melihat penyiraman/pemupukan di blok mereka
            $query->whereHas('blok.kebun', function($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }
        // K-petani melihat semua penyiraman/pemupukan (tidak perlu filter)
        
        if ($blokId) {
            $query->where('blok_id', $blokId);
        }
        
        $schedules = $query->orderBy('completed_at', 'desc')->get();
        
        // Log for debugging
        \Log::info('Watering Report Query from MySQL', [
            'user_id' => $user->id,
            'user_role' => $user->role,
            'start_date' => $startDate->toDateTimeString(),
            'end_date' => $endDate->toDateTimeString(),
            'blok_id' => $blokId,
            'count' => $schedules->count(),
        ]);
        
        $data = $schedules->map(function($schedule) {
            // Safely get mission_details and result_data
            $missionDetails = is_array($schedule->mission_details) ? $schedule->mission_details : [];
            $resultData = is_array($schedule->result_data) ? $schedule->result_data : [];
            
            // Get water amount from mission_details or result_data
            $waterAmount = $missionDetails['water_amount'] ?? $resultData['water_amount'] ?? 0;
            $fertilizerAmount = $missionDetails['fertilizer_amount'] ?? $resultData['fertilizer_amount'] ?? 0;
            $fertilizerType = $missionDetails['fertilizer_type'] ?? $resultData['fertilizer_type'] ?? '';
            $durationMinutes = $missionDetails['duration_minutes'] ?? $resultData['duration_minutes'] ?? 0;
            
            // Get status from schedule status
            $status = $this->mapWateringStatus($schedule->status);
            
            // Get success status from result_data
            $success = $resultData['success'] ?? ($schedule->status === 'completed');
            
            // Determine jenis (Air or Pupuk)
            $jenis = $schedule->mission_type === 'pemupukan' ? 'Pemupukan' : 'Penyiraman Air';
            
            return [
                'tanggal' => $schedule->completed_at ? $schedule->completed_at->format('d/m/Y H:i') : ($schedule->scheduled_at ? $schedule->scheduled_at->format('d/m/Y H:i') : '-'),
                'blok' => $schedule->blok->code ?? '-',
                'kebun' => $schedule->blok->kebun->name ?? '-',
                'jenis' => $jenis,
                'jumlah_air' => $schedule->mission_type === 'penyiraman' && is_numeric($waterAmount) ? number_format($waterAmount, 1) . ' L' : '-',
                'jumlah_pupuk' => $schedule->mission_type === 'pemupukan' && is_numeric($fertilizerAmount) ? number_format($fertilizerAmount, 1) . ' kg' : '-',
                'jenis_pupuk' => $schedule->mission_type === 'pemupukan' && $fertilizerType ? $fertilizerType : '-',
                'durasi' => is_numeric($durationMinutes) ? number_format($durationMinutes, 0) . ' menit' : '-',
                'status' => $status,
                'berhasil' => $success ? 'Ya' : 'Tidak',
                'dibuat_oleh' => $schedule->creator->name ?? '-',
            ];
        });
        
        // Check if data is empty
        if ($schedules->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada data penyiraman/pemupukan untuk periode yang dipilih. Pastikan tanggal yang dipilih benar dan ada data pada periode tersebut.',
                'debug' => [
                    'start_date' => $startDate->toDateTimeString(),
                    'end_date' => $endDate->toDateTimeString(),
                    'user_id' => $user->id,
                    'user_role' => $user->role,
                    'blok_id' => $blokId,
                ],
            ], 404)->header('Content-Type', 'application/json');
        }
        
        $title = 'Laporan Penyiraman & Pemupukan Otomatis';
        $filename = 'laporan_penyiraman_pemupukan_' . $startDate->format('Y-m-d') . '_' . $endDate->format('Y-m-d');
        
        return $this->exportReport($data, $title, $filename, $format, [
            'start_date' => $startDate->format('d/m/Y'),
            'end_date' => $endDate->format('d/m/Y'),
            'total' => $schedules->count(),
        ]);
    }
    
    /**
     * Map watering status to Indonesian
     */
    private function mapWateringStatus(string $status): string
    {
        $statusMap = [
            'pending' => 'Menunggu',
            'in_progress' => 'Sedang Berjalan',
            'completed' => 'Selesai',
            'failed' => 'Gagal',
            'cancelled' => 'Dibatalkan',
        ];
        
        return $statusMap[$status] ?? $status;
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
        
        // Build detection query based on user role
        $detectionQuery = DetectionResult::whereNotNull('detected_at')
            ->whereBetween('detected_at', [$startOfMonth, $endOfMonth]);
        
        if ($user->role === 'petani') {
            // Petani hanya melihat deteksi yang mereka upload
            $detectionQuery->where('uploaded_by', $user->id);
        }
        // K-petani melihat semua deteksi (tidak perlu filter)
        
        $totalDetections = $detectionQuery->count();
        
        // Calculate average maturity from confidence_score or maturity_level
        $avgMaturityQuery = clone $detectionQuery;
        $avgMaturity = $avgMaturityQuery->avg('confidence_score') ?? 0;
        
        // If no confidence_score, calculate from maturity_level
        if ($avgMaturity == 0) {
            $maturityLevels = $detectionQuery->pluck('maturity_level')->filter();
            if ($maturityLevels->isNotEmpty()) {
                $maturityMap = [
                    'matang' => 85,
                    'hampir_matang' => 50,
                    'mentah' => 20,
                    'lewat_matang' => 95,
                ];
                $maturityValues = $maturityLevels->map(function($level) use ($maturityMap) {
                    return $maturityMap[$level] ?? 0;
                })->filter();
                $avgMaturity = $maturityValues->isNotEmpty() ? $maturityValues->avg() : 0;
            }
        }
        
        // Calculate total penyiraman
        $wateringQuery = \App\Models\RobotSchedule::where('mission_type', 'penyiraman')
            ->whereNotNull('completed_at')
            ->whereBetween('completed_at', [$startOfMonth, $endOfMonth]);
        
        if ($user->role === 'petani') {
            // Petani hanya melihat penyiraman di blok mereka
            $wateringQuery->whereHas('blok.kebun', function($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }
        // K-petani melihat semua penyiraman
        
        $totalPenyiraman = $wateringQuery->count();
        
        // Get predicted harvest date from bloks
        $blokQuery = Blok::query();
        if ($user->role === 'petani') {
            $blokQuery->whereHas('kebun', function($q) use ($user) {
                $q->where('owner_id', $user->id);
            });
        }
        $nearestHarvest = $blokQuery->whereNotNull('estimated_harvest_date')
            ->where('estimated_harvest_date', '>=', now())
            ->orderBy('estimated_harvest_date', 'asc')
            ->first();
        
        $prediksiPanen = $nearestHarvest && $nearestHarvest->estimated_harvest_date 
            ? Carbon::parse($nearestHarvest->estimated_harvest_date)->format('d M Y')
            : 'Tidak ada';
        
        return [
            'totalDeteksi' => $totalDetections,
            'avgKematangan' => round($avgMaturity, 0),
            'totalPenyiraman' => $totalPenyiraman,
            'prediksiPanen' => $prediksiPanen,
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
     * Get blok statistics
     */
    private function getBlokStatistics($user, $bloks)
    {
        $startOfMonth = now()->startOfMonth();
        $endOfMonth = now()->endOfMonth();
        
        // Ensure unique bloks by code to avoid duplicates (same logic as query)
        // If multiple bloks have same code, take the first one
        $uniqueBloks = $bloks->unique(function($blok) {
            return $blok->code ?? $blok->id;
        })->values();
        
        return $uniqueBloks->map(function($blok) use ($user, $startOfMonth, $endOfMonth) {
            // Get detection count for this blok
            $detectionQuery = DetectionResult::where('blok_id', $blok->id)
                ->whereNotNull('detected_at')
                ->whereBetween('detected_at', [$startOfMonth, $endOfMonth]);
            
            if ($user->role === 'petani') {
                $detectionQuery->where('uploaded_by', $user->id);
            }
            
            $detectionCount = $detectionQuery->count();
            
            // Calculate average maturity percentage
            $maturityLevels = $detectionQuery->pluck('maturity_level')->filter();
            $maturityPercentage = 0;
            if ($maturityLevels->isNotEmpty()) {
                $matureCount = $maturityLevels->filter(function($level) {
                    return in_array($level, ['matang', 'hampir_matang']);
                })->count();
                $maturityPercentage = round(($matureCount / $maturityLevels->count()) * 100, 0);
            }
            
            // Get watering & pemupukan count from MySQL
            $wateringQuery = \App\Models\RobotSchedule::where('blok_id', $blok->id)
                ->whereIn('mission_type', ['penyiraman', 'pemupukan'])
                ->whereNotNull('completed_at')
                ->whereBetween('completed_at', [$startOfMonth, $endOfMonth]);
            
            if ($user->role === 'petani') {
                $wateringQuery->whereHas('blok.kebun', function($q) use ($user) {
                    $q->where('owner_id', $user->id);
                });
            }
            
            $wateringCount = $wateringQuery->count();
            
            // Get kebun name to differentiate bloks with same code from different kebuns
            $kebunName = $blok->kebun->name ?? '';
            
            return [
                'id' => $blok->id,
                'code' => $blok->code,
                'name' => $blok->name,
                'kebun_name' => $kebunName,
                'deteksi' => $detectionCount,
                'matang' => $maturityPercentage . '%',
                'penyiraman' => $wateringCount . 'x',
            ];
        })->values()->toArray();
    }
    
    /**
     * Generate Latest Data Report (All data from today or latest available)
     * Includes sensor readings and robot schedules (penyiraman & pemupukan)
     */
    public function generateLatest(Request $request)
    {
        \Log::info('generateLatest called', [
            'request_all' => $request->all(),
            'format' => $request->format,
        ]);
        
        $validator = Validator::make($request->all(), [
            'format' => 'required|in:pdf,csv,excel',
        ]);
        
        if ($validator->fails()) {
            \Log::warning('generateLatest validation failed', [
                'errors' => $validator->errors(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }
        
        $user = Auth::user();
        if (!$user) {
            \Log::error('generateLatest: User not authenticated');
            return response()->json([
                'success' => false,
                'message' => 'User tidak terautentikasi',
            ], 401);
        }
        
        $format = $request->format;
        
        // Get data from today (24 hours ago until now, even 1 minute ago)
        // If no data today, get latest available data (last 7 days)
        $startDate = now()->startOfDay();
        $endDate = now();
        $fallbackStartDate = now()->subDays(7)->startOfDay();
        
        try {
            // Get all sensor readings from today
            $sensorQuery = SensorReading::whereBetween('reading_time', [$startDate, $endDate])
                ->with(['blok.kebun'])
                ->orderBy('reading_time', 'desc');
            
            // Filter by user role
            if ($user->role === 'petani') {
                $sensorQuery->whereHas('blok.kebun', function($q) use ($user) {
                    $q->where('owner_id', $user->id);
                });
            }
            
            $sensorReadings = $sensorQuery->get();
            
            // If no data today, get latest available (last 7 days, limit 100)
            if ($sensorReadings->isEmpty()) {
                $sensorQueryFallback = SensorReading::whereBetween('reading_time', [$fallbackStartDate, $endDate])
                    ->with(['blok.kebun'])
                    ->orderBy('reading_time', 'desc')
                    ->limit(100);
                
                if ($user->role === 'petani') {
                    $sensorQueryFallback->whereHas('blok.kebun', function($q) use ($user) {
                        $q->where('owner_id', $user->id);
                    });
                }
                
                $sensorReadings = $sensorQueryFallback->get();
                $startDate = $sensorReadings->isNotEmpty() ? $sensorReadings->last()->reading_time->startOfDay() : $startDate;
            }
            
            // Get all robot schedules (penyiraman & pemupukan) from today
            $robotQuery = \App\Models\RobotSchedule::whereIn('mission_type', ['penyiraman', 'pemupukan'])
                ->whereBetween('completed_at', [$startDate, $endDate])
                ->whereNotNull('completed_at')
                ->with(['blok.kebun', 'creator'])
                ->orderBy('completed_at', 'desc');
            
            // Filter by user role
            if ($user->role === 'petani') {
                $robotQuery->whereHas('blok.kebun', function($q) use ($user) {
                    $q->where('owner_id', $user->id);
                });
            }
            
            $robotSchedules = $robotQuery->get();
            
            // If no robot data today, get latest available (last 7 days, limit 50)
            if ($robotSchedules->isEmpty()) {
                $robotQueryFallback = \App\Models\RobotSchedule::whereIn('mission_type', ['penyiraman', 'pemupukan'])
                    ->whereBetween('completed_at', [$fallbackStartDate, $endDate])
                    ->whereNotNull('completed_at')
                    ->with(['blok.kebun', 'creator'])
                    ->orderBy('completed_at', 'desc')
                    ->limit(50);
                
                if ($user->role === 'petani') {
                    $robotQueryFallback->whereHas('blok.kebun', function($q) use ($user) {
                        $q->where('owner_id', $user->id);
                    });
                }
                
                $robotSchedules = $robotQueryFallback->get();
                if ($robotSchedules->isNotEmpty() && $startDate > $robotSchedules->last()->completed_at->startOfDay()) {
                    $startDate = $robotSchedules->last()->completed_at->startOfDay();
                }
            }
            
            // Group sensor readings by time and blok
            $groupedSensors = $sensorReadings->groupBy(function($reading) {
                return $reading->reading_time->format('Y-m-d H:i') . '_' . ($reading->blok_id ?? 'null');
            });
            
            // Prepare sensor data
            $sensorData = $groupedSensors->map(function($group) {
                $firstReading = $group->first();
                $bySensorType = $group->keyBy('sensor_type');
                
                $suhu = $bySensorType->get('suhu_udara');
                $kelembapanUdara = $bySensorType->get('kelembapan_udara');
                $kelembapanTanah = $bySensorType->get('kelembapan_tanah');
                
                return [
                    'tanggal' => $firstReading->reading_time ? $firstReading->reading_time->format('d/m/Y H:i:s') : '-',
                    'blok' => $firstReading->blok->code ?? '-',
                    'kebun' => $firstReading->blok->kebun->name ?? '-',
                    'suhu' => $suhu ? number_format($suhu->value ?? 0, 1) . ' ' . ($suhu->unit ?? '°C') : '-',
                    'kelembapan_udara' => $kelembapanUdara ? number_format($kelembapanUdara->value ?? 0, 1) . ' ' . ($kelembapanUdara->unit ?? '%') : '-',
                    'kelembapan_tanah' => $kelembapanTanah ? number_format($kelembapanTanah->value ?? 0, 1) . ' ' . ($kelembapanTanah->unit ?? '%') : '-',
                    'status' => $this->getOverallStatus($group),
                ];
            })->values();
            
            // Prepare robot schedule data
            $robotData = $robotSchedules->map(function($schedule) {
                $missionDetails = is_array($schedule->mission_details) ? $schedule->mission_details : [];
                $resultData = is_array($schedule->result_data) ? $schedule->result_data : [];
                
                $waterAmount = $missionDetails['water_amount'] ?? $resultData['water_amount'] ?? 0;
                $fertilizerAmount = $missionDetails['fertilizer_amount'] ?? $resultData['fertilizer_amount'] ?? 0;
                $fertilizerType = $missionDetails['fertilizer_type'] ?? $resultData['fertilizer_type'] ?? '';
                $durationMinutes = $missionDetails['duration_minutes'] ?? $resultData['duration_minutes'] ?? 0;
                
                $status = $this->mapWateringStatus($schedule->status);
                $success = $resultData['success'] ?? ($schedule->status === 'completed');
                $jenis = $schedule->mission_type === 'pemupukan' ? 'Pemupukan' : 'Penyiraman Air';
                
                return [
                    'tanggal' => $schedule->completed_at ? $schedule->completed_at->format('d/m/Y H:i:s') : ($schedule->scheduled_at ? $schedule->scheduled_at->format('d/m/Y H:i:s') : '-'),
                    'blok' => $schedule->blok->code ?? '-',
                    'kebun' => $schedule->blok->kebun->name ?? '-',
                    'jenis' => $jenis,
                    'jumlah_air' => $schedule->mission_type === 'penyiraman' && is_numeric($waterAmount) ? number_format($waterAmount, 1) . ' L' : '-',
                    'jumlah_pupuk' => $schedule->mission_type === 'pemupukan' && is_numeric($fertilizerAmount) ? number_format($fertilizerAmount, 1) . ' kg' : '-',
                    'jenis_pupuk' => $schedule->mission_type === 'pemupukan' && $fertilizerType ? $fertilizerType : '-',
                    'durasi' => is_numeric($durationMinutes) ? number_format($durationMinutes, 0) . ' menit' : '-',
                    'status' => $status,
                    'berhasil' => $success ? 'Ya' : 'Tidak',
                    'dibuat_oleh' => $schedule->creator->name ?? '-',
                ];
            });
            
            // Combine all data
            $allData = collect([
                [
                    'section' => 'Data Sensor IoT',
                    'data' => $sensorData->toArray(),
                ],
                [
                    'section' => 'Data Kontrol Robot (Penyiraman & Pemupukan)',
                    'data' => $robotData->toArray(),
                ],
            ]);
            
            // Log data counts for debugging
            \Log::info('generateLatest data counts', [
                'sensor_count' => $sensorData->count(),
                'robot_count' => $robotData->count(),
                'start_date' => $startDate->toDateTimeString(),
                'end_date' => $endDate->toDateTimeString(),
            ]);
            
            // Check if data is empty
            if ($sensorData->isEmpty() && $robotData->isEmpty()) {
                \Log::warning('generateLatest: No data found', [
                    'user_id' => $user->id,
                    'user_role' => $user->role,
                    'start_date' => $startDate->toDateTimeString(),
                    'end_date' => $endDate->toDateTimeString(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada data terbaru yang tersedia. Pastikan ada data sensor atau kontrol robot yang sudah disinkronkan dari Firebase ke MySQL.',
                ], 404)->header('Content-Type', 'application/json');
            }
            
            // Determine period description
            $isToday = $startDate->isToday();
            $periodDesc = $isToday 
                ? 'Hari ini (' . $startDate->format('d/m/Y') . ' - ' . $endDate->format('d/m/Y H:i:s') . ')'
                : 'Data Terbaru (' . $startDate->format('d/m/Y') . ' - ' . $endDate->format('d/m/Y H:i:s') . ')';
            
            $title = 'Laporan Data Terbaru - ' . now()->format('d/m/Y H:i');
            $filename = 'laporan_data_terbaru_' . now()->format('Y-m-d_H-i-s');
            
            // For combined report, we'll create a special format
            return $this->exportCombinedReport($allData, $title, $filename, $format, [
                'generated_at' => now()->format('d/m/Y H:i:s'),
                'period' => $periodDesc,
                'total_sensor' => $sensorData->count(),
                'total_robot' => $robotData->count(),
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error generating latest data report', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat laporan data terbaru: ' . $e->getMessage(),
            ], 500)->header('Content-Type', 'application/json');
        }
    }
    
    /**
     * Export combined report (multiple sections)
     */
    private function exportCombinedReport($sections, $title, $filename, $format, $metadata)
    {
        switch ($format) {
            case 'pdf':
                return $this->exportCombinedPDF($sections, $title, $filename, $metadata);
            case 'csv':
                return $this->exportCombinedCSV($sections, $title, $filename, $metadata);
            case 'excel':
                return $this->exportCombinedExcel($sections, $title, $filename, $metadata);
            default:
                throw new \Exception('Format tidak didukung');
        }
    }
    
    /**
     * Export combined PDF
     */
    private function exportCombinedPDF($sections, $title, $filename, $metadata)
    {
        try {
            $pdf = Pdf::loadView('reports.combined-pdf', [
                'title' => $title,
                'sections' => $sections,
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
     * Export combined CSV
     */
    private function exportCombinedCSV($sections, $title, $filename, $metadata)
    {
        $output = fopen('php://temp', 'r+');
        
        // Write title
        fputcsv($output, [$title]);
        fputcsv($output, ['Generated at: ' . $metadata['generated_at']]);
        fputcsv($output, ['Period: ' . $metadata['period']]);
        fputcsv($output, []); // Empty line
        
        foreach ($sections as $section) {
            // Write section header
            fputcsv($output, [$section['section']]);
            fputcsv($output, []); // Empty line
            
            if (!empty($section['data'])) {
                // Write headers
                $headers = array_keys($section['data'][0]);
                fputcsv($output, $headers);
                
                // Write data
                foreach ($section['data'] as $row) {
                    fputcsv($output, array_values($row));
                }
            }
            
            fputcsv($output, []); // Empty line between sections
        }
        
        rewind($output);
        $content = stream_get_contents($output);
        fclose($output);
        
        return response($content)
            ->header('Content-Type', 'text/csv; charset=UTF-8')
            ->header('Content-Disposition', 'attachment; filename="' . $filename . '.csv"');
    }
    
    /**
     * Export combined Excel
     */
    private function exportCombinedExcel($sections, $title, $filename, $metadata)
    {
        // For Excel, we'll use CSV format (can be opened in Excel)
        return $this->exportCombinedCSV($sections, $title, $filename, $metadata);
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

