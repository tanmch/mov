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
        Schema::create('sensor_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('blok_id')->nullable()->constrained('bloks')->onDelete('cascade');
            $table->string('sensor_type'); // 'suhu_udara', 'kelembapan_udara', 'kelembapan_tanah'
            $table->decimal('value', 8, 2);
            $table->string('unit'); // '°C', '%', etc.
            $table->enum('status', ['normal', 'warning', 'critical'])->default('normal');
            $table->string('firebase_path')->nullable(); // Path in Firebase
            $table->timestamp('reading_time');
            $table->json('metadata')->nullable(); // Additional sensor data
            $table->timestamps();

            $table->index('blok_id');
            $table->index('sensor_type');
            $table->index('reading_time');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sensor_readings');
    }
};
