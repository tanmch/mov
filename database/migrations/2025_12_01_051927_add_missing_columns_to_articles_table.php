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
        Schema::table('articles', function (Blueprint $table) {
            // Add title column if it doesn't exist
            if (!Schema::hasColumn('articles', 'title')) {
                $table->string('title')->after('id');
            }
            
            // Add description column if it doesn't exist
            if (!Schema::hasColumn('articles', 'description')) {
                $table->text('description')->nullable()->after('title');
            }
            
            // Add source_url column if it doesn't exist
            if (!Schema::hasColumn('articles', 'source_url')) {
                $table->string('source_url', 500)->nullable()->after('description');
            }
            
            // Add year column if it doesn't exist
            if (!Schema::hasColumn('articles', 'year')) {
                $table->integer('year')->nullable()->after('source_url');
            }
            
            // Add publish_date column if it doesn't exist
            if (!Schema::hasColumn('articles', 'publish_date')) {
                $table->date('publish_date')->nullable()->after('year');
            }
            
            // Add created_by column if it doesn't exist
            if (!Schema::hasColumn('articles', 'created_by')) {
                $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null')->after('publish_date');
            }
            
            // Add status column if it doesn't exist
            if (!Schema::hasColumn('articles', 'status')) {
                $table->string('status', 20)->default('published')->after('created_by');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            // Drop columns if they exist
            if (Schema::hasColumn('articles', 'status')) {
                $table->dropColumn('status');
            }
            
            if (Schema::hasColumn('articles', 'created_by')) {
                $table->dropForeign(['created_by']);
                $table->dropColumn('created_by');
            }
            
            if (Schema::hasColumn('articles', 'publish_date')) {
                $table->dropColumn('publish_date');
            }
            
            if (Schema::hasColumn('articles', 'year')) {
                $table->dropColumn('year');
            }
            
            if (Schema::hasColumn('articles', 'source_url')) {
                $table->dropColumn('source_url');
            }
            
            if (Schema::hasColumn('articles', 'description')) {
                $table->dropColumn('description');
            }
            
            if (Schema::hasColumn('articles', 'title')) {
                $table->dropColumn('title');
            }
        });
    }
};
