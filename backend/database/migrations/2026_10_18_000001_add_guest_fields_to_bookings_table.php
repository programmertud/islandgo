<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // Guest fields — nullable so existing authenticated bookings are unaffected.
            // customer_id is already nullable (see base migration).
            $table->string('guest_name', 255)->nullable()->after('customer_id');
            $table->string('guest_email', 255)->nullable()->after('guest_name');
            $table->string('guest_phone', 20)->nullable()->after('guest_email');
            // guest_token: used for future secure guest-only operations; never returned to clients.
            $table->uuid('guest_token')->nullable()->unique()->after('guest_phone');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropUnique(['guest_token']);
            $table->dropColumn(['guest_name', 'guest_email', 'guest_phone', 'guest_token']);
        });
    }
};
