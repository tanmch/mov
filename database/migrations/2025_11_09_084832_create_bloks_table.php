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
        Schema::create('bloks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kebun_id')->constrained('kebuns')->onDelete('cascade');
            $table->string('name'); // e.g., "Blok A", "Blok B1"
            $table->string('code')->nullable(); // QR code or identification code
            $table->decimal('luas', 10, 2); // dalam hektar
            $table->integer('jumlah_pohon')->default(0);
            $table->enum('status', ['sehat', 'perlu_perhatian', 'maintenance'])->default('sehat');
            $table->string('firebase_path')->nullable(); // Path to Firebase realtime data
            
            // Kematangan stats (calculated from detections)
            $table->decimal('persentase_mentah', 5, 2)->default(0);
            $table->decimal('persentase_hampir_matang', 5, 2)->default(0);
            $table->decimal('persentase_matang', 5, 2)->default(0);
            $table->decimal('persentase_lewat_matang', 5, 2)->default(0);
            
            $table->date('last_detection_date')->nullable();
            $table->date('estimated_harvest_date')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('kebun_id');
            $table->index('status');
            $table->index('code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bloks');
    }
};
