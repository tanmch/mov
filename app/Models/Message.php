<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'chat_group_id',
        'private_chat_id',
        'chat_participant_id',
        'sender_id',
        'sender_name',
        'sender_email',
        'message',
        'message_type',
        'file_path',
        'is_read',
        'read_at',
        'is_edited',
        'edited_at',
        'is_deleted',
        'deleted_at',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'is_edited' => 'boolean',
        'edited_at' => 'datetime',
        'is_deleted' => 'boolean',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the chat group
     */
    public function chatGroup(): BelongsTo
    {
        return $this->belongsTo(ChatGroup::class);
    }

    /**
     * Get the private chat
     */
    public function privateChat(): BelongsTo
    {
        return $this->belongsTo(PrivateChat::class);
    }

    /**
     * Get the chat participant
     */
    public function chatParticipant(): BelongsTo
    {
        return $this->belongsTo(ChatParticipant::class);
    }

    /**
     * Get the sender user
     */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

}

