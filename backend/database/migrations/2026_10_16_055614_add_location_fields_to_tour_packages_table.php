<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tour_packages', function (Blueprint $table) {
            $table->string('destination_name')->nullable()->after('destination');
            $table->text('destination_address')->nullable()->after('destination_name');
            $table->decimal('latitude', 10, 7)->nullable()->after('destination_address');
            $table->decimal('longitude', 11, 7)->nullable()->after('latitude');
            $table->text('location_description')->nullable()->after('longitude');
        });
    }

    public function down(): void
    {
        Schema::table('tour_packages', function (Blueprint $table) {
            $table->dropColumn([
                'destination_name',
                'destination_address',
                'latitude',
                'longitude',
                'location_description',
            ]);
        });
    }
};
