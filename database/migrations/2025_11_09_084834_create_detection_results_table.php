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
        Schema::create('detection_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blok_id')->constrained('bloks')->onDelete('cascade');
            $table->foreignId('robot_schedule_id')->nullable()->constrained('robot_schedules')->onDelete('set null');
            $table->string('image_path')->nullable(); // Path to uploaded/captured image
            $table->string('image_url')->nullable(); // URL to image (Firebase Storage)
            
            // Detection results from YOLO AI
            $table->enum('maturity_level', ['mentah', 'hampir_matang', 'matang', 'lewat_matang']);
            $table->decimal('confidence_score', 5, 2); // 0-100
            $table->integer('mango_count')->default(1);
            
            // Bounding box coordinates (if needed)
            $table->json('bounding_boxes')->nullable();
            
            // Additional AI results
            $table->json('ai_metadata')->nullable(); // Full AI response
            $table->enum('detection_source', ['manual_upload', 'robot_camera', 'scheduled'])->default('robot_camera');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamp('detected_at');
            $table->timestamps();
            $table->softDeletes();

            $table->index('blok_id');
            $table->index('robot_schedule_id');
            $table->index('maturity_level');
            $table->index('detected_at');
            $table->index('detection_source');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('detection_results');
    }
};
