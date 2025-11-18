<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DetectionResult extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'blok_id',
        'robot_schedule_id',
        'image_path',
        'image_url',
        'maturity_level',
        'confidence_score',
        'mango_count',
        'bounding_boxes',
        'ai_metadata',
        'detection_source',
        'uploaded_by',
        'detected_at',
    ];

    protected $casts = [
        'confidence_score' => 'decimal:2',
        'bounding_boxes' => 'array',
        'ai_metadata' => 'array',
        'detected_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the blok this detection belongs to
     */
    public function blok(): BelongsTo
    {
        return $this->belongsTo(Blok::class);
    }

    /**
     * Get the robot schedule associated with this detection
     */
    public function robotSchedule(): BelongsTo
    {
        return $this->belongsTo(RobotSchedule::class);
    }

    /**
     * Get the user who uploaded this detection
     */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Get maturity level in human-readable format
     */
    public function getMaturityLabelAttribute(): string
    {
        $labels = [
            'mentah' => 'Mentah',
            'hampir_matang' => 'Hampir Matang',
            'matang' => 'Matang',
            'lewat_matang' => 'Lewat Matang',
        ];

        return $labels[$this->maturity_level] ?? $this->maturity_level;
    }

    /**
     * Get confidence score as percentage
     */
    public function getConfidencePercentageAttribute(): string
    {
        return number_format($this->confidence_score, 1) . '%';
    }

    /**
     * Check if detection is from robot
     */
    public function isFromRobot(): bool
    {
        return in_array($this->detection_source, ['robot_camera', 'scheduled']);
    }

    /**
     * Check if detection is manual upload
     */
    public function isManualUpload(): bool
    {
        return $this->detection_source === 'manual_upload';
    }

    /**
     * Check if detection has high confidence
     */
    public function hasHighConfidence(): bool
    {
        return $this->confidence_score >= 80;
    }

    /**
     * Check if mango is ready for harvest
     */
    public function isReadyForHarvest(): bool
    {
        return $this->maturity_level === 'matang';
    }

    /**
     * Check if mango is overripe
     */
    public function isOverripe(): bool
    {
        return $this->maturity_level === 'lewat_matang';
    }
}
