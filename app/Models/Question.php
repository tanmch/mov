<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Question extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'question',
        'answer',
        'answered_by',
        'answered_at',
        'read_at',
        'status',
        'priority',
        'category',
    ];

    protected $casts = [
        'answered_at' => 'datetime',
        'read_at' => 'datetime',
    ];

    /**
     * Get the user who asked the question
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the user who answered the question
     */
    public function answeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'answered_by');
    }

    /**
     * Check if question is from guest
     */
    public function isFromGuest(): bool
    {
        return $this->user_id === null;
    }

    /**
     * Get questioner name
     */
    public function getQuestionerNameAttribute(): string
    {
        if ($this->user_id) {
            return $this->user->name ?? 'User';
        }
        return $this->name ?? 'Guest';
    }

    /**
     * Get questioner email
     */
    public function getQuestionerEmailAttribute(): string
    {
        if ($this->user_id) {
            return $this->user->email ?? '';
        }
        return $this->email ?? '';
    }
}


