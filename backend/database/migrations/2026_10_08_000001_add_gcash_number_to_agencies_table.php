<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agencies', function (Blueprint $table) {
            $table->string('gcash_number', 20)->nullable()->after('contact_phone');
            $table->string('gcash_account_name')->nullable()->after('gcash_number');
        });
    }

    public function down(): void
    {
        Schema::table('agencies', function (Blueprint $table) {
            $table->dropColumn(['gcash_number', 'gcash_account_name']);
        });
    }
};
