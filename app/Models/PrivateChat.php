<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PrivateChat extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_1_id',
        'user_2_id',
        'user_1_email',
        'user_2_email',
        'user_1_name',
        'user_2_name',
        'last_message_at',
        'is_active',
        'taken_by_id',
        'taken_at',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
        'is_active' => 'boolean',
        'taken_at' => 'datetime',
    ];

    /**
     * Get user 1
     */
    public function user1(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_1_id');
    }

    /**
     * Get user 2
     */
    public function user2(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_2_id');
    }

    /**
     * Get all messages in this private chat
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /**
     * Get the K-Petani who took this chat
     */
    public function takenBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'taken_by_id');
    }

    /**
     * Get the other user in this chat (for current user)
     */
    public function getOtherUser($currentUserId = null, $currentUserEmail = null)
    {
        if ($currentUserId) {
            if ($this->user_1_id == $currentUserId) {
                if ($this->user2) {
                    return $this->user2;
                }
                return (object)[
                    'id' => $this->user_2_id,
                    'name' => $this->user_2_name,
                    'email' => $this->user_2_email,
                ];
            } else {
                if ($this->user1) {
                    return $this->user1;
                }
                return (object)[
                    'id' => $this->user_1_id,
                    'name' => $this->user_1_name,
                    'email' => $this->user_1_email,
                ];
            }
        } elseif ($currentUserEmail) {
            if ($this->user_1_email == $currentUserEmail) {
                return (object)[
                    'id' => $this->user_2_id,
                    'name' => $this->user_2_name,
                    'email' => $this->user_2_email,
                ];
            } else {
                return (object)[
                    'id' => $this->user_1_id,
                    'name' => $this->user_1_name,
                    'email' => $this->user_1_email,
                ];
            }
        }
        return null;
    }
}

