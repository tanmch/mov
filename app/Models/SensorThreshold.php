<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SensorThreshold extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'sensor_type',
        'warning_min',
        'warning_max',
        'critical_min',
        'critical_max',
        'normal_min',
        'normal_max',
        'description',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'warning_min' => 'decimal:2',
        'warning_max' => 'decimal:2',
        'critical_min' => 'decimal:2',
        'critical_max' => 'decimal:2',
        'normal_min' => 'decimal:2',
        'normal_max' => 'decimal:2',
    ];

    /**
     * Get the user who created this threshold
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who last updated this threshold
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Get sensor type label
     */
    public function getSensorTypeLabelAttribute(): string
    {
        return match($this->sensor_type) {
            'suhu_udara' => 'Suhu Udara',
            'kelembapan_udara' => 'Kelembaban Udara',
            'kelembapan_tanah' => 'Kelembaban Tanah',
            default => $this->sensor_type,
        };
    }

    /**
     * Get sensor unit
     */
    public function getSensorUnitAttribute(): string
    {
        return match($this->sensor_type) {
            'suhu_udara' => '°C',
            'kelembapan_udara' => '%',
            'kelembapan_tanah' => '%',
            default => '',
        };
    }

    /**
     * Check if value triggers warning
     */
    public function isWarning(float $value): bool
    {
        if ($this->sensor_type === 'suhu_udara') {
            return $value >= ($this->warning_max ?? 35);
        } else {
            return $value <= ($this->warning_min ?? 30);
        }
    }

    /**
     * Check if value triggers critical
     */
    public function isCritical(float $value): bool
    {
        if ($this->sensor_type === 'suhu_udara') {
            return $value >= ($this->critical_max ?? 40);
        } else {
            return $value <= ($this->critical_min ?? 20);
        }
    }

    /**
     * Get status for a value
     */
    public function getStatus(float $value): string
    {
        if ($this->isCritical($value)) {
            return 'critical';
        }
        if ($this->isWarning($value)) {
            return 'warning';
        }
        return 'normal';
    }

    /**
     * Get default thresholds (fallback if not set in database)
     */
    public static function getDefaults(): array
    {
        return [
            'suhu_udara' => [
                'warning_max' => 35,
                'critical_max' => 40,
                'normal_min' => 20,
                'normal_max' => 32,
            ],
            'kelembapan_udara' => [
                'warning_min' => 30,
                'critical_min' => 20,
                'normal_min' => 60,
                'normal_max' => 85,
            ],
            'kelembapan_tanah' => [
                'warning_min' => 30,
                'critical_min' => 20,
                'normal_min' => 50,
                'normal_max' => 75,
            ],
        ];
    }
}
