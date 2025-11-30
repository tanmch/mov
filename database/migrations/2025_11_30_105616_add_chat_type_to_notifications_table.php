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
        // Modify enum to add 'chat' type
        DB::statement("ALTER TABLE notifications MODIFY COLUMN type ENUM('info', 'success', 'warning', 'error', 'panen', 'sensor', 'robot', 'chat') DEFAULT 'info'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove 'chat' from enum
        DB::statement("ALTER TABLE notifications MODIFY COLUMN type ENUM('info', 'success', 'warning', 'error', 'panen', 'sensor', 'robot') DEFAULT 'info'");
    }
};
