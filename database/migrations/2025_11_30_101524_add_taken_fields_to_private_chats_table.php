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
        // On a fresh database the private_chats table is created later
        // (2025_12_20_000004_create_private_chats_table, which already includes
        // the taken fields), so skip when the table doesn't exist yet.
        if (! Schema::hasTable('private_chats') || Schema::hasColumn('private_chats', 'taken_by_id')) {
            return;
        }

        Schema::table('private_chats', function (Blueprint $table) {
            $table->foreignId('taken_by_id')->nullable()->after('is_active')->constrained('users')->onDelete('set null');
            $table->timestamp('taken_at')->nullable()->after('taken_by_id');
            $table->index('taken_by_id');
            $table->index('taken_at');
        });
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
