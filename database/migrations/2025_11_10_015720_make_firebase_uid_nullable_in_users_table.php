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
        Schema::table('users', function (Blueprint $table) {
            // Drop existing unique constraint first
            $table->dropUnique(['firebase_uid']);
            
            // Make firebase_uid nullable
            $table->string('firebase_uid')->nullable()->change();
            
            // Re-add unique constraint (nullable columns can have unique constraint)
            $table->unique('firebase_uid');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Drop unique constraint
            $table->dropUnique(['firebase_uid']);
            
            // Make firebase_uid NOT NULL again
            $table->string('firebase_uid')->nullable(false)->change();
            
            // Re-add unique constraint
            $table->unique('firebase_uid');
        });
    }
};
