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
        // Only create if it doesn't exist (might be created in messages migration)
        if (!Schema::hasTable('private_chats')) {
            Schema::create('private_chats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_1_id')->nullable()->constrained('users')->onDelete('cascade'); // User pertama
            $table->foreignId('user_2_id')->nullable()->constrained('users')->onDelete('cascade'); // User kedua
            $table->string('user_1_email')->nullable(); // Email untuk guest user 1
            $table->string('user_2_email')->nullable(); // Email untuk guest user 2
            $table->string('user_1_name')->nullable(); // Nama untuk guest user 1
            $table->string('user_2_name')->nullable(); // Nama untuk guest user 2
            $table->timestamp('last_message_at')->nullable(); // Waktu pesan terakhir
            $table->boolean('is_active')->default(true); // Status aktif chat
            $table->foreignId('taken_by_id')->nullable()->constrained('users')->onDelete('set null'); // Petugas yang mengambil chat
            $table->timestamp('taken_at')->nullable();
            $table->timestamps();

            // Index untuk mencari chat antara 2 user
            $table->index(['user_1_id', 'user_2_id']);
            $table->index(['user_1_email', 'user_2_email']);
            $table->index('last_message_at');
            $table->index('is_active');
            $table->index('taken_by_id');
            $table->index('taken_at');
        });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('private_chats');
    }
};

