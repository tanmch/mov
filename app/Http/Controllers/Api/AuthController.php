<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ActivityLog;
use App\Services\FirebaseService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    protected $firebase;

    public function __construct(FirebaseService $firebase)
    {
        $this->firebase = $firebase;
    }

    /**
     * Register new user
     */
    public function register(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'email' => [
                    'required',
                    'email',
                    Rule::unique('users', 'email')->whereNull('deleted_at'),
                ],
                'password' => 'required|min:6',
                'name' => 'required|string|max:255',
                'phone' => 'nullable|string|max:20',
                'role' => 'nullable|in:guest,petani,k-petani',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Create user in Firebase Authentication
            $firebaseUser = $this->firebase->createUser([
                'email' => $request->email,
                'password' => $request->password,
                'displayName' => $request->name,
            ]);

            // Set custom claims for role-based access
            $role = $request->role ?? 'petani';
            $this->firebase->setCustomClaims($firebaseUser->uid, [
                'role' => $role,
            ]);

            // Create user in MySQL database
            $user = User::create([
                'firebase_uid' => $firebaseUser->uid,
                'email' => $request->email,
                'name' => $request->name,
                'phone' => $request->phone,
                'role' => $role,
                'is_active' => true,
            ]);

            // Log activity
            ActivityLog::logActivity(
                $user->id,
                'register',
                'User',
                $user->id,
                "User {$user->name} registered successfully"
            );

            return response()->json([
                'success' => true,
                'message' => 'User registered successfully',
                'data' => [
                    'user' => $user,
                    'firebase_uid' => $firebaseUser->uid,
                ]
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Registration failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Login user (verify Firebase token and get user data)
     */
    public function login(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'idToken' => 'required|string',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Verify Firebase ID token
            $verifiedIdToken = $this->firebase->verifyIdToken($request->idToken);
            $firebaseUid = $verifiedIdToken->claims()->get('sub');

            // Get user from database
            $user = User::where('firebase_uid', $firebaseUid)->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found in database'
                ], 404);
            }

            if (!$user->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'User account is inactive'
                ], 403);
            }

            // Update last login
            $user->updateLastLogin();

            // Log activity
            ActivityLog::logActivity(
                $user->id,
                'login',
                'User',
                $user->id,
                "User {$user->name} logged in"
            );

            return response()->json([
                'success' => true,
                'message' => 'Login successful',
                'data' => [
                    'user' => $user,
                    'unread_notifications' => $user->unreadNotificationsCount(),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Login failed: ' . $e->getMessage()
            ], 401);
        }
    }

    /**
     * Logout user
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            $user = $request->user;

            if ($user) {
                ActivityLog::logActivity(
                    $user->id,
                    'logout',
                    'User',
                    $user->id,
                    "User {$user->name} logged out"
                );
            }

            return response()->json([
                'success' => true,
                'message' => 'Logout successful'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Logout failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get current user profile
     */
    public function profile(Request $request): JsonResponse
    {
        try {
            $user = $request->user;

            return response()->json([
                'success' => true,
                'data' => [
                    'user' => $user,
                    'unread_notifications' => $user->unreadNotificationsCount(),
                    'kebuns_count' => $user->kebuns()->count(),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch profile: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update user profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        try {
            $user = $request->user;

            $validator = Validator::make($request->all(), [
                'name' => 'sometimes|string|max:255',
                'phone' => 'sometimes|nullable|string|max:20',
                'photo_url' => 'sometimes|nullable|url',
                'preferences' => 'sometimes|nullable|array',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            $oldValues = $user->only(['name', 'phone', 'photo_url', 'preferences']);
            
            $user->update($request->only(['name', 'phone', 'photo_url', 'preferences']));

            // Update Firebase user if name changed
            if ($request->has('name')) {
                $this->firebase->updateUser($user->firebase_uid, [
                    'displayName' => $request->name,
                ]);
            }

            // Log activity
            ActivityLog::logActivity(
                $user->id,
                'update',
                'User',
                $user->id,
                "User {$user->name} updated their profile",
                $oldValues,
                $user->only(['name', 'phone', 'photo_url', 'preferences'])
            );

            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully',
                'data' => ['user' => $user]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update profile: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Change password
     */
    public function changePassword(Request $request): JsonResponse
    {
        try {
            $user = $request->user;

            $validator = Validator::make($request->all(), [
                'new_password' => 'required|min:6',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Update password in Firebase
            $this->firebase->updateUser($user->firebase_uid, [
                'password' => $request->new_password,
            ]);

            // Log activity
            ActivityLog::logActivity(
                $user->id,
                'update',
                'User',
                $user->id,
                "User {$user->name} changed their password"
            );

            return response()->json([
                'success' => true,
                'message' => 'Password changed successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to change password: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete user account
     */
    public function deleteAccount(Request $request): JsonResponse
    {
        try {
            $user = $request->user;

            // Only K-Petani can delete other accounts, users can delete their own
            if ($request->has('user_id') && $request->user_id != $user->id) {
                if (!$user->isKPetani()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized to delete other user accounts'
                    ], 403);
                }
                $targetUser = User::findOrFail($request->user_id);
            } else {
                $targetUser = $user;
            }

            // Delete from Firebase
            $this->firebase->deleteUser($targetUser->firebase_uid);

            // Soft delete from database
            $targetUser->delete();

            // Log activity
            ActivityLog::logActivity(
                $user->id,
                'delete',
                'User',
                $targetUser->id,
                "User {$user->name} deleted account for {$targetUser->name}"
            );

            return response()->json([
                'success' => true,
                'message' => 'Account deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete account: ' . $e->getMessage()
            ], 500);
        }
    }
}
