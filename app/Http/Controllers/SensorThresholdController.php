<?php

namespace App\Http\Controllers;

use App\Models\SensorThreshold;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class SensorThresholdController extends Controller
{
    /**
     * Display all sensor thresholds
     */
    public function index(): Response
    {
        $thresholds = SensorThreshold::orderBy('sensor_type')->get();
        
        // Get defaults for sensors that don't have thresholds set
        $defaults = SensorThreshold::getDefaults();
        $allSensorTypes = ['suhu_udara', 'kelembapan_udara', 'kelembapan_tanah'];
        
        $thresholdsData = [];
        foreach ($allSensorTypes as $sensorType) {
            $threshold = $thresholds->where('sensor_type', $sensorType)->first();
            if ($threshold) {
                $thresholdsData[] = [
                    'id' => $threshold->id,
                    'sensor_type' => $threshold->sensor_type,
                    'sensor_type_label' => $threshold->sensor_type_label,
                    'sensor_unit' => $threshold->sensor_unit,
                    'warning_min' => $threshold->warning_min,
                    'warning_max' => $threshold->warning_max,
                    'critical_min' => $threshold->critical_min,
                    'critical_max' => $threshold->critical_max,
                    'normal_min' => $threshold->normal_min,
                    'normal_max' => $threshold->normal_max,
                    'description' => $threshold->description,
                ];
            } else {
                // Use defaults
                $default = $defaults[$sensorType];
                $thresholdsData[] = [
                    'id' => null,
                    'sensor_type' => $sensorType,
                    'sensor_type_label' => match($sensorType) {
                        'suhu_udara' => 'Suhu Udara',
                        'kelembapan_udara' => 'Kelembaban Udara',
                        'kelembapan_tanah' => 'Kelembaban Tanah',
                        default => $sensorType,
                    },
                    'sensor_unit' => match($sensorType) {
                        'suhu_udara' => '°C',
                        'kelembapan_udara' => '%',
                        'kelembapan_tanah' => '%',
                        default => '',
                    },
                    'warning_min' => $default['warning_min'] ?? null,
                    'warning_max' => $default['warning_max'] ?? null,
                    'critical_min' => $default['critical_min'] ?? null,
                    'critical_max' => $default['critical_max'] ?? null,
                    'normal_min' => $default['normal_min'] ?? null,
                    'normal_max' => $default['normal_max'] ?? null,
                    'description' => null,
                ];
            }
        }

        return Inertia::render('SensorThresholds/Index', [
            'thresholds' => $thresholdsData,
        ]);
    }

    /**
     * Get thresholds for API/JSON response
     */
    public function getThresholds()
    {
        $thresholds = SensorThreshold::orderBy('sensor_type')->get();
        $defaults = SensorThreshold::getDefaults();
        
        $result = [];
        foreach (['suhu_udara', 'kelembapan_udara', 'kelembapan_tanah'] as $sensorType) {
            $threshold = $thresholds->where('sensor_type', $sensorType)->first();
            if ($threshold) {
                $result[$sensorType] = [
                    'warning_min' => $threshold->warning_min,
                    'warning_max' => $threshold->warning_max,
                    'critical_min' => $threshold->critical_min,
                    'critical_max' => $threshold->critical_max,
                    'normal_min' => $threshold->normal_min,
                    'normal_max' => $threshold->normal_max,
                ];
            } else {
                $result[$sensorType] = $defaults[$sensorType];
            }
        }

        return response()->json($result);
    }

    /**
     * Update or create sensor threshold (K-Petani only)
     */
    public function update(Request $request, string $sensorType)
    {
        $user = Auth::user();
        
        // Only K-Petani can update thresholds
        if ($user->role !== 'k-petani') {
            return response()->json([
                'success' => false,
                'message' => 'Hanya K-Petani yang dapat mengatur batas normal sensor'
            ], 403);
        }

        $validated = $request->validate([
            'warning_min' => 'nullable|numeric|min:0',
            'warning_max' => 'nullable|numeric|min:0',
            'critical_min' => 'nullable|numeric|min:0',
            'critical_max' => 'nullable|numeric|min:0',
            'normal_min' => 'nullable|numeric|min:0',
            'normal_max' => 'nullable|numeric|min:0',
            'description' => 'nullable|string|max:500',
        ]);

        // Validate sensor type
        if (!in_array($sensorType, ['suhu_udara', 'kelembapan_udara', 'kelembapan_tanah'])) {
            return response()->json([
                'success' => false,
                'message' => 'Jenis sensor tidak valid'
            ], 400);
        }

        // Validate thresholds based on sensor type
        if ($sensorType === 'suhu_udara') {
            // For temperature: warning_max < critical_max, normal_min < normal_max
            if (isset($validated['warning_max']) && isset($validated['critical_max']) && 
                $validated['warning_max'] !== null && $validated['critical_max'] !== null) {
                if ($validated['warning_max'] >= $validated['critical_max']) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Nilai warning harus lebih kecil dari critical untuk suhu'
                    ], 400);
                }
            }
            // Validate normal range
            if (isset($validated['normal_min']) && isset($validated['normal_max']) && 
                $validated['normal_min'] !== null && $validated['normal_max'] !== null) {
                if ($validated['normal_min'] >= $validated['normal_max']) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Nilai normal min harus lebih kecil dari normal max'
                    ], 400);
                }
            }
        } else {
            // For humidity: warning_min > critical_min, normal_min < normal_max
            if (isset($validated['warning_min']) && isset($validated['critical_min']) && 
                $validated['warning_min'] !== null && $validated['critical_min'] !== null) {
                if ($validated['warning_min'] <= $validated['critical_min']) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Nilai warning harus lebih besar dari critical untuk kelembapan'
                    ], 400);
                }
            }
            // Validate normal range
            if (isset($validated['normal_min']) && isset($validated['normal_max']) && 
                $validated['normal_min'] !== null && $validated['normal_max'] !== null) {
                if ($validated['normal_min'] >= $validated['normal_max']) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Nilai normal min harus lebih kecil dari normal max'
                    ], 400);
                }
            }
        }

        $threshold = SensorThreshold::updateOrCreate(
            ['sensor_type' => $sensorType],
            array_merge($validated, [
                'updated_by' => $user->id,
                'created_by' => $user->id,
            ])
        );

        return response()->json([
            'success' => true,
            'message' => 'Batas normal sensor berhasil diperbarui',
            'threshold' => [
                'id' => $threshold->id,
                'sensor_type' => $threshold->sensor_type,
                'sensor_type_label' => $threshold->sensor_type_label,
                'sensor_unit' => $threshold->sensor_unit,
                'warning_min' => $threshold->warning_min,
                'warning_max' => $threshold->warning_max,
                'critical_min' => $threshold->critical_min,
                'critical_max' => $threshold->critical_max,
                'normal_min' => $threshold->normal_min,
                'normal_max' => $threshold->normal_max,
                'description' => $threshold->description,
            ],
        ]);
    }
}
