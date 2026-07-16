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
        // Drop unique constraints when they exist.
        // Note: MySQL doesn't support partial unique indexes with WHERE clause
        // So we remove the unique constraints and let Laravel validation handle uniqueness
        $uniqueIndexes = [
            'users_email_unique',
            'users_firebase_uid_unique',
            'users_username_unique',
            'users_id_kerja_unique',
        ];

        foreach ($uniqueIndexes as $indexName) {
            if ($this->indexExists('users', $indexName)) {
                Schema::table('users', function (Blueprint $table) use ($indexName) {
                    $table->dropUnique($indexName);
                });
            }
        }

        // Add regular indexes for performance (not unique, since we handle uniqueness in Laravel)
        Schema::table('users', function (Blueprint $table) {
            $self = $this;
            $tableName = 'users';

            $maybeAddIndex = function (string $column) use ($table, $tableName, $self) {
                $indexName = "{$tableName}_{$column}_index";

                if (! $self->indexExists($tableName, $indexName)) {
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
            $table->dropIndex('users_email_index');
            $table->dropIndex('users_firebase_uid_index');
            $table->dropIndex('users_username_index');
            $table->dropIndex('users_id_kerja_index');
            
            // Re-add unique constraints
            $table->unique('email');
            $table->unique('firebase_uid');
            $table->unique('username');
            $table->unique('id_kerja');
        });
    }
    private function indexExists(string $table, string $index): bool
    {
        return Schema::hasIndex($table, $index);
    }
};
