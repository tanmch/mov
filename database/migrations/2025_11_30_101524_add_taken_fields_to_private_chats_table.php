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
        // Only add columns if table exists and columns don't exist yet
        if (Schema::hasTable('private_chats')) {
            if (!Schema::hasColumn('private_chats', 'taken_by_id')) {
                Schema::table('private_chats', function (Blueprint $table) {
                    $table->foreignId('taken_by_id')->nullable()->after('is_active')->constrained('users')->onDelete('set null');
                    $table->index('taken_by_id');
                });
            }
            
            if (!Schema::hasColumn('private_chats', 'taken_at')) {
                Schema::table('private_chats', function (Blueprint $table) {
                    $table->timestamp('taken_at')->nullable()->after('taken_by_id');
                    $table->index('taken_at');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('private_chats', function (Blueprint $table) {
            $table->dropForeign(['taken_by_id']);
            $table->dropIndex(['taken_by_id']);
            $table->dropIndex(['taken_at']);
            $table->dropColumn(['taken_by_id', 'taken_at']);
        });
    }
};
