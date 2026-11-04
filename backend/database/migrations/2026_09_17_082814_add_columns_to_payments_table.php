<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->string('gcash_reference', 100)->nullable()->after('payment_method');
            $table->timestamp('payment_date')->nullable()->after('gcash_reference');
            $table->unsignedBigInteger('verified_by')->nullable()->after('verified_at');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['gcash_reference', 'payment_date', 'verified_by']);
        });
    }
};
