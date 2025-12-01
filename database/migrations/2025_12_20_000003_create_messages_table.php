<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Create private_chats table first if it doesn't exist
        if (!Schema::hasTable('private_chats')) {
            Schema::create('private_chats', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_1_id')->nullable()->constrained('users')->onDelete('cascade');
                $table->foreignId('user_2_id')->nullable()->constrained('users')->onDelete('cascade');
                $table->string('user_1_email')->nullable();
                $table->string('user_2_email')->nullable();
                $table->string('user_1_name')->nullable();
                $table->string('user_2_name')->nullable();
                $table->timestamp('last_message_at')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->index(['user_1_id', 'user_2_id']);
                $table->index(['user_1_email', 'user_2_email']);
                $table->index('last_message_at');
                $table->index('is_active');
            });
        }

        // Only create messages table if it doesn't exist
        if (!Schema::hasTable('messages')) {
            Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_group_id')->nullable()->constrained('chat_groups')->onDelete('cascade'); // Untuk grup chat
            $table->foreignId('private_chat_id')->nullable()->constrained('private_chats')->onDelete('cascade'); // Untuk chat pribadi
            $table->foreignId('chat_participant_id')->nullable()->constrained('chat_participants')->onDelete('cascade'); // Participant yang mengirim (untuk grup)
            $table->foreignId('sender_id')->nullable()->constrained('users')->onDelete('set null'); // User yang mengirim (untuk tracking)
            $table->string('sender_name')->nullable(); // Nama pengirim (untuk guest)
            $table->string('sender_email')->nullable(); // Email pengirim (untuk guest)
            $table->text('message'); // Isi pesan
            $table->string('message_type')->default('text'); // 'text', 'image', 'file', 'system'
            $table->string('file_path')->nullable(); // Path file jika ada
            $table->boolean('is_read')->default(false); // Status dibaca
            $table->timestamp('read_at')->nullable(); // Kapan dibaca
            $table->boolean('is_edited')->default(false); // Apakah pesan sudah diedit
            $table->timestamp('edited_at')->nullable(); // Kapan diedit
            $table->boolean('is_deleted')->default(false); // Apakah pesan sudah dihapus
            $table->timestamp('deleted_at')->nullable(); // Kapan dihapus
            $table->timestamps();

            $table->index('chat_group_id');
            $table->index('private_chat_id');
            $table->index('chat_participant_id');
            $table->index('sender_id');
            $table->index('created_at');
            $table->index('is_read');
        });
        } else {
            // If table exists, check if private_chat_id column exists, if not add it
            if (!Schema::hasColumn('messages', 'private_chat_id')) {
                Schema::table('messages', function (Blueprint $table) {
                    $table->foreignId('private_chat_id')->nullable()->after('chat_group_id')->constrained('private_chats')->onDelete('cascade');
                    $table->index('private_chat_id');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};

