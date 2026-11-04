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
        Schema::create('tour_packages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('agency_id')->constrained('agencies')->cascadeOnDelete();
            $table->string('title');
            $table->string('destination');
            $table->string('category');
            $table->decimal('price_per_person', 10, 2);
            $table->integer('duration_days');
            $table->integer('min_participants')->default(1);
            $table->integer('max_participants');
            $table->json('inclusions')->nullable();
            $table->json('exclusions')->nullable();
            $table->string('meeting_point')->nullable();
            $table->string('cover_image')->nullable();
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tour_packages');
    }
};
