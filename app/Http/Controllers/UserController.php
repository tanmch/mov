<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\ActivityLog;
use App\Models\Kebun;
use App\Models\Blok;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Display a listing of users (K-Petani only)
     */
    public function index(Request $request): Response
    {
        $search = $request->get('search', '');
        $role = $request->get('role', 'all');

        $query = User::query();

        // Filter by role
        if ($role !== 'all') {
            $query->where('role', $role);
        }

        // Search filter
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('created_at', 'desc')->get();

        $currentUser = $request->user();
        
        return Inertia::render('Profil', [
            'users' => $users,
            'filters' => [
                'search' => $search,
                'role' => $role,
            ],
            'currentUser' => $currentUser ? [
                'id' => $currentUser->id,
                'name' => $currentUser->name,
                'email' => $currentUser->email,
                'enable_sensor_simulation' => $currentUser->enable_sensor_simulation ?? false,
            ] : null,
        ]);
    }

    /**
     * Store a newly created user (K-Petani only)
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique('users', 'email')->whereNull('deleted_at'),
            ],
            'username' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('users', 'username')->whereNull('deleted_at'),
            ],
            'id_kerja' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('users', 'id_kerja')->whereNull('deleted_at'),
            ],
            'phone' => 'nullable|string|max:20',
            'role' => 'required|in:guest,petani,k-petani',
            'password' => 'required|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $currentUser = $request->user();

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'username' => $request->username,
            'id_kerja' => $request->id_kerja,
            'phone' => $request->phone,
            'role' => $request->role,
            'password' => Hash::make($request->password),
            'is_active' => true,
        ]);

        // If new user is K-Petani and current user is also K-Petani, copy kebuns and bloks
        if ($user->role === 'k-petani' && $currentUser->role === 'k-petani') {
            $this->copyKebunAndBloks($currentUser, $user);
        }

        // Log activity
        ActivityLog::logActivity(
            $currentUser->id,
            'create',
            'User',
            $user->id,
            "K-Petani {$currentUser->name} created user {$user->name}"
        );

        return back()->with('success', 'User berhasil dibuat!');
    }

    /**
     * Update the specified user (K-Petani only)
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $currentUser = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id)->whereNull('deleted_at'),
            ],
            'username' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('users', 'username')->ignore($user->id)->whereNull('deleted_at'),
            ],
            'id_kerja' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('users', 'id_kerja')->ignore($user->id)->whereNull('deleted_at'),
            ],
            'phone' => 'nullable|string|max:20',
            'role' => 'required|in:guest,petani,k-petani',
            'password' => 'nullable|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return back()->withErrors($validator)->withInput();
        }

        $oldValues = $user->only(['name', 'email', 'phone', 'role']);

        $user->update([
            'name' => $request->name,
            'email' => $request->email,
            'username' => $request->username,
            'id_kerja' => $request->id_kerja,
            'phone' => $request->phone,
            'role' => $request->role,
        ]);

        // Update password if provided
        if ($request->filled('password')) {
            $user->update([
                'password' => Hash::make($request->password),
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
            $user->only(['name', 'email', 'phone', 'role'])
        );

        return back()->with('success', 'User berhasil diupdate!');
    }

    /**
     * Remove the specified user (K-Petani only)
     */
    public function destroy(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $currentUser = $request->user();

        // Prevent deleting yourself
        if ($user->id === $currentUser->id) {
            return back()->with('error', 'Tidak dapat menghapus akun sendiri!');
        }

        // Soft delete
        $user->delete();

        // Log activity
        ActivityLog::logActivity(
            $currentUser->id,
            'delete',
            'User',
            $user->id,
            "K-Petani {$currentUser->name} deleted user {$user->name}"
        );

        return back()->with('success', 'User berhasil dihapus!');
    }

    /**
     * Toggle user active status (K-Petani only)
     */
    public function toggleActive(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $currentUser = $request->user();

        // Prevent deactivating yourself
        if ($user->id === $currentUser->id && !$user->is_active) {
            return back()->with('error', 'Tidak dapat menonaktifkan akun sendiri!');
        }

        $user->update(['is_active' => !$user->is_active]);

        $action = $user->is_active ? 'activated' : 'deactivated';

        // Log activity
        ActivityLog::logActivity(
            $currentUser->id,
            'update',
            'User',
            $user->id,
            "K-Petani {$currentUser->name} {$action} user {$user->name}"
        );

        return back()->with('success', "User berhasil di{$action}!");
    }

    /**
     * Copy kebuns and bloks from any K-Petani to new K-Petani
     * All K-Petani should have the same kebuns and bloks
     */
    private function copyKebunAndBloks(User $parentKPetani, User $newKPetani): void
    {
        // Get kebuns from any K-Petani (prefer parent, but if parent has none, get from first K-Petani)
        $sourceKebuns = Kebun::whereHas('owner', function($query) {
            $query->where('role', 'k-petani');
        })->with('owner')->get();
        
        // If parent has kebuns, use those. Otherwise, use kebuns from first K-Petani found
        $parentKebuns = Kebun::where('owner_id', $parentKPetani->id)->get();
        
        if ($parentKebuns->isEmpty() && $sourceKebuns->isNotEmpty()) {
            // Parent has no kebuns, get from first K-Petani that has kebuns
            $firstKPetaniWithKebuns = $sourceKebuns->first()->owner;
            if ($firstKPetaniWithKebuns) {
                $parentKebuns = Kebun::where('owner_id', $firstKPetaniWithKebuns->id)->get();
            }
        }

        foreach ($parentKebuns as $parentKebun) {
            // Check if kebun with same name already exists for new K-Petani
            $existingKebun = Kebun::where('owner_id', $newKPetani->id)
                ->where('name', $parentKebun->name)
                ->first();
            
            if ($existingKebun) {
                // Kebun already exists, just copy bloks
                $newKebun = $existingKebun;
            } else {
                // Create new kebun for new K-Petani
                $newKebun = Kebun::create([
                    'owner_id' => $newKPetani->id,
                    'name' => $parentKebun->name,
                    'location' => $parentKebun->location,
                    'luas' => $parentKebun->luas,
                    'description' => $parentKebun->description,
                    'jenis_mangga' => $parentKebun->jenis_mangga ?? 'Gedong', // Default to 'Gedong' if not set
                    'status' => $parentKebun->status ?? 'active',
                ]);
            }

            // Get all bloks from parent kebun
            $parentBloks = Blok::where('kebun_id', $parentKebun->id)->get();

            foreach ($parentBloks as $parentBlok) {
                // Check if blok with same code already exists in new kebun
                $existingBlok = Blok::where('kebun_id', $newKebun->id)
                    ->where('code', $parentBlok->code)
                    ->first();
                
                if (!$existingBlok) {
                    // Create new blok for new kebun
                    Blok::create([
                        'kebun_id' => $newKebun->id,
                        'code' => $parentBlok->code,
                        'name' => $parentBlok->name,
                        'luas' => $parentBlok->luas ?? 0,
                        'firebase_path' => null, // New blok doesn't have Firebase path yet
                    ]);
                }
            }
        }
    }
}

