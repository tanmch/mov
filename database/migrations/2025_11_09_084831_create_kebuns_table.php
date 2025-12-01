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
        Schema::create('kebuns', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('location'); // Format: "Lat, Long" or address
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->decimal('luas', 10, 2); // dalam hektar
            $table->string('jenis_mangga'); // e.g., Gedong, Harumanis, Manalagi
            $table->enum('status', ['active', 'inactive', 'maintenance'])->default('active');
            $table->foreignId('owner_id')->constrained('users')->onDelete('cascade');
            $table->json('metadata')->nullable(); // Additional custom data
            $table->timestamps();
            $table->softDeletes();

            $table->index('owner_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kebuns');
    }
};
