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
        Schema::create('chat_groups', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Nama grup (e.g., "Grup MOV Center")
            $table->text('description')->nullable(); // Deskripsi grup
            $table->string('type')->default('public'); // 'public' untuk grup umum, 'private' untuk grup khusus
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null'); // User yang membuat grup
            $table->boolean('is_active')->default(true); // Status aktif grup
            $table->timestamps();
            $table->softDeletes();

            $table->index('type');
            $table->index('is_active');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chat_groups');
    }
};

