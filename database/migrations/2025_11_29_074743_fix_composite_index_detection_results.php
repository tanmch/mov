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
        // Add composite index for user queries with sorting
        // This index will optimize queries like: WHERE uploaded_by = X AND deleted_at IS NULL ORDER BY detected_at DESC
        if (! Schema::hasIndex('detection_results', 'idx_user_detections')) {
            Schema::table('detection_results', function (Blueprint $table) {
                $table->index(['uploaded_by', 'deleted_at', 'detected_at'], 'idx_user_detections');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasIndex('detection_results', 'idx_user_detections')) {
            Schema::table('detection_results', function (Blueprint $table) {
                $table->dropIndex('idx_user_detections');
            });
        }
    }
};
