<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if index exists before creating
        $indexes = DB::select("SHOW INDEXES FROM detection_results WHERE Key_name = 'idx_user_detections'");
        
        if (empty($indexes)) {
            // Add composite index for user queries with sorting
            // This index will optimize queries like: WHERE uploaded_by = X AND deleted_at IS NULL ORDER BY detected_at DESC
            DB::statement('CREATE INDEX idx_user_detections ON detection_results (uploaded_by, deleted_at, detected_at)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $indexes = DB::select("SHOW INDEXES FROM detection_results WHERE Key_name = 'idx_user_detections'");
        
        if (!empty($indexes)) {
            DB::statement('DROP INDEX idx_user_detections ON detection_results');
        }
    }
};
