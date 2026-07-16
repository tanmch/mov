<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatParticipant extends Model
{
    use HasFactory;

    protected $fillable = [
        'chat_group_id',
        'user_id',
        'name',
        'email',
        'role',
        'joined_at',
        'last_read_at',
        'is_active',
    ];

    protected $casts = [
        'joined_at' => 'datetime',
        'last_read_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    /**
     * Get the chat group
     */
    public function chatGroup(): BelongsTo
    {
        return $this->belongsTo(ChatGroup::class);
    }

    /**
     * Get the user
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all messages from this participant
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /**
     * Get participant name
     */
    public function getParticipantNameAttribute(): string
    {
        if ($this->user_id) {
            return $this->user->name ?? 'User';
        }
        return $this->name ?? 'Guest';
    }

    /**
     * Get participant email
     */
    public function getParticipantEmailAttribute(): string
    {
        if ($this->user_id) {
            return $this->user->email ?? '';
        }
        return $this->email ?? '';
    }
}

