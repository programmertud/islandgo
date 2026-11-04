<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuditLogService
{
    /**
     * Record an auditable action.
     *
     * @param string $action   e.g. 'booking.approved'
     * @param string|null $entityType  e.g. 'Booking'
     * @param int|null $entityId
     * @param string|null $description  human-readable summary
     * @param array|null $oldValues  previous state snapshot
     * @param array|null $newValues  new state snapshot
     */
    public static function log(
        string $action,
        ?string $entityType = null,
        ?int $entityId = null,
        ?string $description = null,
        ?array $oldValues = null,
        ?array $newValues = null,
    ): void {
        $user = Auth::user();
        $request = request();

        AuditLog::create([
            'user_id'     => $user?->id,
            'user_name'   => $user?->name,
            'agency_id'   => $user?->agency_id,
            'action'      => $action,
            'entity_type' => $entityType,
            'entity_id'   => $entityId,
            'description' => $description,
            'old_values'  => $oldValues,
            'new_values'  => $newValues,
            'ip_address'  => $request?->ip(),
            'user_agent'  => $request?->userAgent(),
        ]);
    }
}
