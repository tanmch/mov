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
        Schema::create('chat_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_group_id')->nullable()->constrained('chat_groups')->onDelete('cascade'); // Null untuk chat pribadi
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade'); // User yang berpartisipasi
            $table->string('name')->nullable(); // Untuk guest users
            $table->string('email')->nullable(); // Untuk guest users
            $table->string('role')->nullable(); // 'admin', 'member' untuk grup
            $table->timestamp('joined_at')->nullable(); // Kapan user bergabung
            $table->timestamp('last_read_at')->nullable(); // Kapan terakhir membaca pesan
            $table->boolean('is_active')->default(true); // Status aktif partisipasi
            $table->timestamps();

            $table->index('chat_group_id');
            $table->index('user_id');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_participants');
    }
};

