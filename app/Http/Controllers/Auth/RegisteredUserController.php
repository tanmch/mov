<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WorkId;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/LoginRegister', [
            'isRegister' => true,
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        // Validate role-specific requirements
        $role = $request->role;
        
        // ID Kerja is required for petani and k-petani
        $idKerjaRules = ['nullable', 'string', 'max:255'];
        if (in_array($role, ['petani', 'k-petani'])) {
            $idKerjaRules = [
                'required',
                'string',
                'max:255',
                Rule::unique('users', 'id_kerja')->whereNull('deleted_at'),
            ];
        }

        $validated = $request->validate([
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
            'id_kerja' => $idKerjaRules,
            'phone' => 'nullable|string|max:20',
            'role' => 'required|in:guest,petani,k-petani',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Validate work ID exists and is valid for the role
        if (in_array($role, ['petani', 'k-petani']) && $request->filled('id_kerja')) {
            $workId = WorkId::where('work_id', $request->id_kerja)
                ->where('role', $role)
                ->where('is_used', false)
                ->first();

            if (!$workId) {
                return redirect()->back()
                    ->withErrors(['id_kerja' => 'ID Kerja tidak valid atau sudah digunakan.'])
                    ->withInput();
            }
        }

        $userData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'role' => $validated['role'],
            'password' => Hash::make($validated['password']),
            'is_active' => true,
        ];

        // Add username if provided
        if ($request->filled('username')) {
            $userData['username'] = $validated['username'];
        }

        // Add id_kerja if provided (for petani and k-petani)
        if ($request->filled('id_kerja')) {
            $userData['id_kerja'] = $validated['id_kerja'];
        }

        $user = User::create($userData);

        // Mark work ID as used
        if (in_array($role, ['petani', 'k-petani']) && $request->filled('id_kerja')) {
            $workId->markAsUsed($user->id);
        }

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('dashboard', absolute: false));
    }
}
