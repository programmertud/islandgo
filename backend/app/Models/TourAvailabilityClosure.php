<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TourAvailabilityClosure extends Model
{
    protected $fillable = ['tour_package_id', 'start_date', 'end_date', 'reason', 'created_by'];

    protected $casts = [
        'start_date' => 'date:Y-m-d',
        'end_date' => 'date:Y-m-d',
    ];

    public function package()
    {
        return $this->belongsTo(TourPackage::class, 'tour_package_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
