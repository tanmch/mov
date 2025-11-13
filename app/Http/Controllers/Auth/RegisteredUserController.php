<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
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
        $request->validate([
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
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $userData = [
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'role' => $request->role,
            'password' => Hash::make($request->password),
            'is_active' => true,
            // firebase_uid is nullable, we don't use Firebase Auth for user registration
        ];

        // Add username if provided
        if ($request->filled('username')) {
            $userData['username'] = $request->username;
        }

        // Add id_kerja if provided (for K-Petani)
        if ($request->filled('id_kerja')) {
            $userData['id_kerja'] = $request->id_kerja;
        }

        $user = User::create($userData);

        event(new Registered($user));

        Auth::login($user);

        return redirect(route('dashboard', absolute: false));
    }
}
