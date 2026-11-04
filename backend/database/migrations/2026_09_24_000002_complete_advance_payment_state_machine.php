<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // A string lets the workflow represent an expired temporary hold.
            $table->string('booking_status', 30)->default('pending')->change();
            $table->timestamp('advance_reminder_sent_at')->nullable()->after('slots_released_at');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('advance_reminder_sent_at');
        });
    }
};
