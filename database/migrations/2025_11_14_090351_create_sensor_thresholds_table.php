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
        Schema::create('sensor_thresholds', function (Blueprint $table) {
            $table->id();
            $table->string('sensor_type'); // suhu_udara, kelembapan_udara, kelembapan_tanah
            $table->decimal('warning_min', 8, 2)->nullable(); // Nilai minimum untuk warning (untuk kelembapan)
            $table->decimal('warning_max', 8, 2)->nullable(); // Nilai maksimum untuk warning (untuk suhu)
            $table->decimal('critical_min', 8, 2)->nullable(); // Nilai minimum untuk critical (untuk kelembapan)
            $table->decimal('critical_max', 8, 2)->nullable(); // Nilai maksimum untuk critical (untuk suhu)
            $table->decimal('normal_min', 8, 2)->nullable(); // Batas normal minimum (untuk display)
            $table->decimal('normal_max', 8, 2)->nullable(); // Batas normal maksimum (untuk display)
            $table->text('description')->nullable(); // Deskripsi threshold
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();

            // Ensure only one threshold per sensor type (active)
            $table->unique('sensor_type');
            $table->index('sensor_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sensor_thresholds');
    }
};
