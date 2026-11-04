<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('tour_packages')->update(['category' => 'Island Hopping']);
    }

    public function down(): void
    {
    }
};
