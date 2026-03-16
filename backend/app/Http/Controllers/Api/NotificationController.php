<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class NotificationController extends Controller
{
    /**
     * Get notifications for the authenticated user
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        
        $notifications = Notification::where('utilisateur_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        return response()->json([
            'data' => $notifications,
        ]);
    }

    /**
     * Mark a notification as read
     */
    public function markAsRead(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        
        $notification = Notification::where('id', $id)
            ->where('utilisateur_id', $user->id)
            ->first();

        if (!$notification) {
            return response()->json([
                'message' => 'Notification non trouvée',
            ], 404);
        }

        // Marquer la notification comme lue
        if (!$notification->lu_le) {
            $notification->update(['lu_le' => now()]);
        }

        return response()->json([
            'message' => 'Notification marquée comme lue',
            'notification' => $notification,
        ]);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Marquer toutes les notifications non lues comme lues
        Notification::where('utilisateur_id', $user->id)
            ->whereNull('lu_le')
            ->update(['lu_le' => now()]);

        return response()->json([
            'message' => 'Toutes les notifications ont été marquées comme lues',
        ]);
    }

    /**
     * Get notification count
     */
    public function count(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Compter les notifications non lues
        $unreadCount = Notification::where('utilisateur_id', $user->id)
            ->whereNull('lu_le')
            ->count();

        return response()->json([
            'count' => $unreadCount,
        ]);
    }

    /**
     * Get unread notification count (alias for count)
     */
    public function unreadCount(Request $request): JsonResponse
    {
        return $this->count($request);
    }

    /**
     * Delete a notification
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        
        $notification = Notification::where('id', $id)
            ->where('utilisateur_id', $user->id)
            ->first();

        if (!$notification) {
            return response()->json([
                'message' => 'Notification non trouvée',
            ], 404);
        }

        $notification->delete();

        return response()->json([
            'message' => 'Notification supprimée avec succès',
        ]);
    }
}