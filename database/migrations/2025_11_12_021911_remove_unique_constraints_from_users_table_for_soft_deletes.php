<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Remove unique constraints that don't account for soft deletes.
     * Laravel validation will handle uniqueness checking while ignoring soft deleted records.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Drop unique constraints
            // Note: MySQL doesn't support partial unique indexes with WHERE clause
            // So we remove the unique constraints and let Laravel validation handle uniqueness
            $table->dropUnique(['email']);
            $table->dropUnique(['firebase_uid']);
            
            // Check if username and id_kerja unique constraints exist before dropping
            // (They were added in a later migration)
            try {
                $table->dropUnique(['username']);
            } catch (\Exception $e) {
                // Constraint might not exist, ignore
            }
            
            try {
                $table->dropUnique(['id_kerja']);
            } catch (\Exception $e) {
                // Constraint might not exist, ignore
            }
        });

        // Add regular indexes for performance (not unique, since we handle uniqueness in Laravel)
        Schema::table('users', function (Blueprint $table) {
            $table->index('email');
            $table->index('firebase_uid');
            $table->index('username');
            $table->index('id_kerja');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Drop indexes first
            $table->dropIndex(['email']);
            $table->dropIndex(['firebase_uid']);
            $table->dropIndex(['username']);
            $table->dropIndex(['id_kerja']);
            
            // Re-add unique constraints
            $table->unique('email');
            $table->unique('firebase_uid');
            $table->unique('username');
            $table->unique('id_kerja');
        });
    }
};
