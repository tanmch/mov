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
        Schema::create('robot_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blok_id')->constrained('bloks')->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->string('mission_type'); // 'deteksi', 'penyiraman', 'pemupukan', 'kombinasi'
            $table->text('description')->nullable();
            $table->dateTime('scheduled_at');
            $table->dateTime('started_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'completed', 'failed', 'cancelled'])->default('pending');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            
            // Mission details
            $table->json('mission_details')->nullable(); // e.g., amount of water/fertilizer
            $table->integer('progress_percentage')->default(0); // 0-100
            $table->string('firebase_status_path')->nullable(); // Real-time robot status from Firebase
            
            // Results
            $table->text('result_notes')->nullable();
            $table->json('result_data')->nullable(); // Detailed results from mission
            $table->string('error_message')->nullable();
            
            $table->timestamps();
            $table->softDeletes();

            $table->index('blok_id');
            $table->index('created_by');
            $table->index('status');
            $table->index('scheduled_at');
            $table->index('mission_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('robot_schedules');
    }
};
