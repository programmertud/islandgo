<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agency_id')->constrained('agencies')->cascadeOnDelete();
            $table->foreignId('booking_id')->nullable()->constrained('bookings')->nullOnDelete();
            $table->string('recipient_email');
            $table->string('recipient_name')->nullable();
            $table->string('event_type', 60);   // booking_confirmed, booking_rejected, etc.
            $table->string('subject')->nullable();
            $table->enum('status', ['sent', 'failed'])->default('failed');
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['agency_id', 'event_type']);
            $table->index(['agency_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_notifications');
    }
};
