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
        // Use raw SQL to safely drop unique constraints
        // Check if constraints exist before dropping to avoid errors
        
        // Drop unique constraint on email
        try {
            DB::statement('ALTER TABLE `users` DROP INDEX `users_email_unique`');
        } catch (\Exception $e) {
            // Constraint might not exist or have different name, try alternative
            try {
                DB::statement('ALTER TABLE `users` DROP INDEX `users_email_unique`');
            } catch (\Exception $e2) {
                // Ignore if doesn't exist
            }
        }
        
        // Drop unique constraint on firebase_uid
        try {
            DB::statement('ALTER TABLE `users` DROP INDEX `users_firebase_uid_unique`');
        } catch (\Exception $e) {
            // Ignore if doesn't exist
        }
        
        // Drop unique constraint on username
        try {
            DB::statement('ALTER TABLE `users` DROP INDEX `users_username_unique`');
        } catch (\Exception $e) {
            // Ignore if doesn't exist
        }
        
        // Drop unique constraint on id_kerja
        try {
            DB::statement('ALTER TABLE `users` DROP INDEX `users_id_kerja_unique`');
        } catch (\Exception $e) {
            // Ignore if doesn't exist
        }

        // Add regular indexes for performance (not unique, since we handle uniqueness in Laravel)
        Schema::table('users', function (Blueprint $table) {
            // Only add index if it doesn't exist
            $maybeAddIndex = function (string $column) use ($table) {
                $indexName = "users_{$column}_index";

                if (! $this->indexExists('users', $indexName)) {
                    $table->index($column, $indexName);
                }
            };

            $maybeAddIndex('email');
            $maybeAddIndex('firebase_uid');
            $maybeAddIndex('username');
            $maybeAddIndex('id_kerja');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Drop indexes first
            $this->maybeDropIndex($table, 'users_email_index');
            $this->maybeDropIndex($table, 'users_firebase_uid_index');
            $this->maybeDropIndex($table, 'users_username_index');
            $this->maybeDropIndex($table, 'users_id_kerja_index');
            
            // Re-add unique constraints
            $table->unique('email');
            $table->unique('firebase_uid');
            $table->unique('username');
            $table->unique('id_kerja');
        });
    }

    /**
     * Check if an index exists on a table
     */
    private function indexExists(string $table, string $index): bool
    {
        return Schema::hasIndex($table, $index);
    }

    private function maybeDropIndex(Blueprint $table, string $indexName): void
    {
        if ($this->indexExists('users', $indexName)) {
            $table->dropIndex($indexName);
        }
    }
};
