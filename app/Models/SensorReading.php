<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SensorReading extends Model
{
    use HasFactory;

    protected $fillable = [
        'blok_id',
        'sensor_type',
        'value',
        'unit',
        'status',
        'firebase_path',
        'reading_time',
        'metadata',
    ];

    protected $casts = [
        'value' => 'decimal:2',
        'reading_time' => 'datetime',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the blok this sensor reading belongs to
     */
    public function blok(): BelongsTo
    {
        return $this->belongsTo(Blok::class);
    }

    /**
     * Determine status based on sensor type and value
     */
    public static function determineStatus(string $sensorType, float $value): string
    {
        $thresholds = config('sensors.thresholds', [
            'suhu_udara' => ['warning' => 35, 'critical' => 40],
            'kelembapan_udara' => ['warning' => 30, 'critical' => 20],
            'kelembapan_tanah' => ['warning' => 30, 'critical' => 20],
        ]);

        if (!isset($thresholds[$sensorType])) {
            return 'normal';
        }

        $threshold = $thresholds[$sensorType];

        // Temperature checks (too high)
        if ($sensorType === 'suhu_udara') {
            if ($value >= $threshold['critical']) {
                return 'critical';
            }
            if ($value >= $threshold['warning']) {
                return 'warning';
            }
        }

        // Humidity checks (too low)
        if (in_array($sensorType, ['kelembapan_udara', 'kelembapan_tanah'])) {
            if ($value <= $threshold['critical']) {
                return 'critical';
            }
            if ($value <= $threshold['warning']) {
                return 'warning';
            }
        }

        return 'normal';
    }

    /**
     * Check if this reading is critical
     */
    public function isCritical(): bool
    {
        return $this->status === 'critical';
    }

    /**
     * Check if this reading needs warning
     */
    public function isWarning(): bool
    {
        return $this->status === 'warning';
    }

    /**
     * Get formatted value with unit
     */
    public function getFormattedValueAttribute(): string
    {
        return $this->value . ' ' . $this->unit;
    }
}
