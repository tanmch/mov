<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Blok extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'kebun_id',
        'name',
        'code',
        'luas',
        'jumlah_pohon',
        'status',
        'firebase_path',
        'persentase_mentah',
        'persentase_hampir_matang',
        'persentase_matang',
        'persentase_lewat_matang',
        'last_detection_date',
        'estimated_harvest_date',
        'metadata',
    ];

    protected $casts = [
        'luas' => 'decimal:2',
        'persentase_mentah' => 'decimal:2',
        'persentase_hampir_matang' => 'decimal:2',
        'persentase_matang' => 'decimal:2',
        'persentase_lewat_matang' => 'decimal:2',
        'last_detection_date' => 'date',
        'estimated_harvest_date' => 'date',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the kebun this blok belongs to
     */
    public function kebun(): BelongsTo
    {
        return $this->belongsTo(Kebun::class);
    }

    /**
     * Get all robot schedules for this blok
     */
    public function robotSchedules(): HasMany
    {
        return $this->hasMany(RobotSchedule::class);
    }

    /**
     * Get all sensor readings for this blok
     */
    public function sensorReadings(): HasMany
    {
        return $this->hasMany(SensorReading::class);
    }

    /**
     * Get all detection results for this blok
     */
    public function detectionResults(): HasMany
    {
        return $this->hasMany(DetectionResult::class);
    }

    /**
     * Get latest sensor readings
     */
    public function latestSensorReadings()
    {
        return $this->sensorReadings()
            ->orderBy('reading_time', 'desc')
            ->limit(10)
            ->get()
            ->groupBy('sensor_type');
    }

    /**
     * Calculate and update maturity percentages from detection results
     */
    public function updateMaturityPercentages(): void
    {
        $recentDetections = $this->detectionResults()
            ->where('detected_at', '>=', now()->subDays(7))
            ->get();

        if ($recentDetections->isEmpty()) {
            return;
        }

        $total = $recentDetections->count();
        $counts = $recentDetections->groupBy('maturity_level')->map->count();

        $this->update([
            'persentase_mentah' => ($counts['mentah'] ?? 0) / $total * 100,
            'persentase_hampir_matang' => ($counts['hampir_matang'] ?? 0) / $total * 100,
            'persentase_matang' => ($counts['matang'] ?? 0) / $total * 100,
            'persentase_lewat_matang' => ($counts['lewat_matang'] ?? 0) / $total * 100,
            'last_detection_date' => now(),
        ]);
    }

    /**
     * Check if blok needs attention (critical sensor readings or high overripe percentage)
     */
    public function needsAttention(): bool
    {
        // Check sensor readings
        $criticalSensors = $this->sensorReadings()
            ->where('status', 'critical')
            ->where('reading_time', '>=', now()->subHours(1))
            ->exists();

        // Check overripe percentage
        $highOverripe = $this->persentase_lewat_matang > 20;

        return $criticalSensors || $highOverripe;
    }
}
