<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->decimal('required_advance_amount', 12, 2)->default(0)->after('total_amount');
            $table->decimal('advance_paid_amount', 12, 2)->default(0)->after('required_advance_amount');
            $table->decimal('remaining_balance', 12, 2)->default(0)->after('advance_paid_amount');
            $table->timestamp('payment_deadline')->nullable()->after('payment_reference');
            $table->timestamp('slots_released_at')->nullable()->after('payment_deadline');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->string('payment_type', 30)->default('advance')->after('amount');
            $table->string('received_by_name')->nullable()->after('verified_by');
        });

        Schema::table('agencies', function (Blueprint $table) {
            $table->unsignedSmallInteger('advance_payment_deadline_hours')->nullable()->after('sms_settings');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['required_advance_amount', 'advance_paid_amount', 'remaining_balance', 'payment_deadline', 'slots_released_at']);
        });
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['payment_type', 'received_by_name']);
        });
        Schema::table('agencies', function (Blueprint $table) {
            $table->dropColumn('advance_payment_deadline_hours');
        });
    }
};
