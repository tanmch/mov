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
            $column = $table->string('category', 50)->default('berita');

            if (Schema::hasColumn('articles', 'description')) {
                $column->after('description');
            } elseif (Schema::hasColumn('articles', 'title')) {
                $column->after('title');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            if (Schema::hasColumn('articles', 'category')) {
                $table->dropColumn('category');
            }
        });
    }
};
