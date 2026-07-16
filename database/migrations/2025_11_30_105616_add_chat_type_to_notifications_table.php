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
        if (in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'])) {
            DB::statement("ALTER TABLE notifications MODIFY COLUMN type ENUM('info', 'success', 'warning', 'error', 'panen', 'sensor', 'robot', 'chat') DEFAULT 'info'");
        } else {
            Schema::table('notifications', function (Blueprint $table) {
                $table->enum('type', ['info', 'success', 'warning', 'error', 'panen', 'sensor', 'robot', 'chat'])->default('info')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove 'chat' from enum
        if (in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'])) {
            DB::statement("ALTER TABLE notifications MODIFY COLUMN type ENUM('info', 'success', 'warning', 'error', 'panen', 'sensor', 'robot') DEFAULT 'info'");
        } else {
            Schema::table('notifications', function (Blueprint $table) {
                $table->enum('type', ['info', 'success', 'warning', 'error', 'panen', 'sensor', 'robot'])->default('info')->change();
            });
        }
    }
};
