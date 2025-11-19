<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkId extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'work_id',
        'role',
        'created_by',
        'used_by',
        'is_used',
        'used_at',
        'notes',
    ];

    protected $casts = [
        'is_used' => 'boolean',
        'used_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the user who created this work ID
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who used this work ID
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'used_by');
    }

    /**
     * Generate a unique work ID
     */
    public static function generateWorkId(string $role): string
    {
        $prefix = $role === 'k-petani' ? 'KP' : 'P';
        $random = strtoupper(substr(md5(uniqid(rand(), true)), 0, 8));
        $workId = $prefix . '-' . $random;
        
        // Ensure uniqueness
        while (self::where('work_id', $workId)->exists()) {
            $random = strtoupper(substr(md5(uniqid(rand(), true)), 0, 8));
            $workId = $prefix . '-' . $random;
        }
        
        return $workId;
    }

    /**
     * Mark work ID as used
     */
    public function markAsUsed(int $userId): void
    {
        $this->update([
            'is_used' => true,
            'used_by' => $userId,
            'used_at' => now(),
        ]);
    }
}
