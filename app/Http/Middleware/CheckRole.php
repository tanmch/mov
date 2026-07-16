<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;
use Inertia\Inertia;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles  Allowed roles (e.g., 'k-petani', 'petani')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        // Get authenticated user (fix: use Auth::user() instead of $request->user)
        $user = Auth::user();

        if (!$user) {
            // Check if this is an API request or web request
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }
            
            // For web requests, redirect to login
            return redirect()->route('login');
        }

        // Check if user has one of the required roles
        if (!in_array($user->role, $roles)) {
            // Check if this is an API request or web request
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Access denied. Insufficient permissions.',
                    'required_roles' => $roles,
                    'user_role' => $user->role
                ], 403);
            }
            
            // For web requests (Inertia), redirect to dashboard with error message
            return redirect()->route('dashboard')->with('error', 'Anda tidak memiliki akses untuk halaman ini.');
        }

        return $next($request);
    }
}
