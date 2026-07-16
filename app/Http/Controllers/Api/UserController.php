<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ActivityLog;
use App\Services\FirebaseService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    protected $firebase;

    public function __construct(FirebaseService $firebase)
    {
        $this->firebase = $firebase;
    }

    /**
     * Get all users (K-Petani only)
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $perPage = $request->get('per_page', 15);
            $role = $request->get('role');
            $search = $request->get('search');

            $query = User::query();

            if ($role) {
                $query->where('role', $role);
            }

            if ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%");
                });
            }

            $users = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $users
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch users: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get single user
     */
    public function show($id): JsonResponse
    {
        try {
            $user = User::with(['kebuns', 'robotSchedules'])->findOrFail($id);

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => $user,
                    'kebuns_count' => $user->kebuns()->count(),
                    'schedules_count' => $user->robotSchedules()->count(),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found'
            ], 404);
        }
    }

    /**
     * Update user (K-Petani only)
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $user = User::findOrFail($id);
            $currentUser = $request->user;

            $validator = Validator::make($request->all(), [
                'name' => 'sometimes|string|max:255',
                'phone' => 'sometimes|nullable|string|max:20',
                'role' => 'sometimes|in:guest,petani,k-petani',
                'photo_url' => 'sometimes|nullable|url',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $oldValues = $user->only(['name', 'phone', 'role', 'photo_url']);
            
            $user->update($request->only(['name', 'phone', 'role', 'photo_url']));

            // Update Firebase if role changed
            if ($request->has('role')) {
                $this->firebase->setCustomClaims($user->firebase_uid, [
                    'role' => $request->role,
                ]);
            }

            // Log activity
            ActivityLog::logActivity(
                $currentUser->id,
                'update',
                'User',
                $user->id,
                "K-Petani {$currentUser->name} updated user {$user->name}",
                $oldValues,
                $user->only(['name', 'phone', 'role', 'photo_url'])
            );

            return response()->json([
                'success' => true,
                'message' => 'User updated successfully',
                'data' => ['user' => $user]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete user (K-Petani only)
     */
    public function destroy(Request $request, $id): JsonResponse
    {
        try {
            $user = User::findOrFail($id);
            $currentUser = $request->user;

            // Prevent deleting yourself
            if ($user->id === $currentUser->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete your own account through this endpoint'
                ], 400);
            }

            // Delete from Firebase
            $this->firebase->deleteUser($user->firebase_uid);

            // Soft delete from database
            $user->delete();

            // Log activity
            ActivityLog::logActivity(
                $currentUser->id,
                'delete',
                'User',
                $user->id,
                "K-Petani {$currentUser->name} deleted user {$user->name}"
            );

            return response()->json([
                'success' => true,
                'message' => 'User deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Activate user account
     */
    public function activate(Request $request, $id): JsonResponse
    {
        try {
            $user = User::findOrFail($id);
            $currentUser = $request->user;

            $user->update(['is_active' => true]);

            // Log activity
            ActivityLog::logActivity(
                $currentUser->id,
                'update',
                'User',
                $user->id,
                "K-Petani {$currentUser->name} activated user {$user->name}"
            );

            return response()->json([
                'success' => true,
                'message' => 'User activated successfully',
                'data' => ['user' => $user]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to activate user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Deactivate user account
     */
    public function deactivate(Request $request, $id): JsonResponse
    {
        try {
            $user = User::findOrFail($id);
            $currentUser = $request->user;

            // Prevent deactivating yourself
            if ($user->id === $currentUser->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot deactivate your own account'
                ], 400);
            }

            $user->update(['is_active' => false]);

            // Log activity
            ActivityLog::logActivity(
                $currentUser->id,
                'update',
                'User',
                $user->id,
                "K-Petani {$currentUser->name} deactivated user {$user->name}"
            );

            return response()->json([
                'success' => true,
                'message' => 'User deactivated successfully',
                'data' => ['user' => $user]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to deactivate user: ' . $e->getMessage()
            ], 500);
        }
    }
}
