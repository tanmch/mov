<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    /**
     * Delete a specific notification
     */
    public function destroy($id)
    {
        $user = Auth::user();
        
        $notification = Notification::where('user_id', $user->id)
            ->findOrFail($id);
        
        $notification->delete();
        
        return back()->with('success', 'Notifikasi berhasil dihapus');
    }

    /**
     * Delete all notifications for the authenticated user
     */
    public function destroyAll()
    {
        $user = Auth::user();
        
        $deletedCount = Notification::where('user_id', $user->id)
            ->delete();
        
        return back()->with('success', "Semua notifikasi ({$deletedCount}) berhasil dihapus");
    }

    /**
     * Mark notification as read
     */
    public function markAsRead($id)
    {
        $user = Auth::user();
        
        $notification = Notification::where('user_id', $user->id)
            ->findOrFail($id);
        
        $notification->markAsRead();
        
        return response()->json([
            'success' => true,
            'message' => 'Notifikasi ditandai sebagai sudah dibaca',
        ]);
    }
}

