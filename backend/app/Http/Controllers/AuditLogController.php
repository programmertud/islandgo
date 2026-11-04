<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $query = AuditLog::query()
            ->when($user->role !== 'super_admin', fn($q) => $q->where('agency_id', $user->agency_id))
            ->when($request->search, fn($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('action', 'like', "%{$s}%")
                  ->orWhere('description', 'like', "%{$s}%")
                  ->orWhere('user_name', 'like', "%{$s}%");
            }))
            ->when($request->action, fn($q, $a) => $q->where('action', 'like', "%{$a}%"))
            ->when($request->entity_type, fn($q, $e) => $q->where('entity_type', $e))
            ->when($request->user_id, fn($q, $uid) => $q->where('user_id', $uid))
            ->when($request->date_from, fn($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->latest()
            ->paginate($request->per_page ?? 10);

        return response()->json($query);
    }

    public function show(Request $request, AuditLog $auditLog)
    {
        $user = $request->user();

        // Agency admins can only see their own agency's logs
        if ($user->role !== 'super_admin' && $auditLog->agency_id !== $user->agency_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($auditLog);
    }
}
