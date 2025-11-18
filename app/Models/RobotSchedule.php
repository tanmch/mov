<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RobotSchedule extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'blok_id',
        'created_by',
        'mission_type',
        'description',
        'scheduled_at',
        'started_at',
        'completed_at',
        'status',
        'priority',
        'mission_details',
        'progress_percentage',
        'firebase_status_path',
        'result_notes',
        'result_data',
        'error_message',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'mission_details' => 'array',
        'result_data' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the blok this schedule is for
     */
    public function blok(): BelongsTo
    {
        return $this->belongsTo(Blok::class);
    }

    /**
     * Get the user who created this schedule
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get all detection results from this robot schedule
     */
    public function detectionResults(): HasMany
    {
        return $this->hasMany(DetectionResult::class);
    }

    /**
     * Check if schedule is overdue
     */
    public function isOverdue(): bool
    {
        return $this->status === 'pending' && $this->scheduled_at < now();
    }

    /**
     * Check if schedule is in progress
     */
    public function isInProgress(): bool
    {
        return $this->status === 'in_progress';
    }

    /**
     * Check if schedule is completed
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Start the mission
     */
    public function start(): void
    {
        $this->update([
            'status' => 'in_progress',
            'started_at' => now(),
        ]);
    }

    /**
     * Complete the mission
     */
    public function complete(array $resultData = []): void
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
            'progress_percentage' => 100,
            'result_data' => $resultData,
        ]);
    }

    /**
     * Mark mission as failed
     */
    public function fail(string $errorMessage): void
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $errorMessage,
            'completed_at' => now(),
        ]);
    }

    /**
     * Update progress
     */
    public function updateProgress(int $percentage): void
    {
        $this->update([
            'progress_percentage' => min(100, max(0, $percentage)),
        ]);
    }
}
