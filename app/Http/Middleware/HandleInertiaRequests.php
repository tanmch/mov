<?php

namespace App\Http\Middleware;

use App\Models\Blok;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $bloks = [];
        
        // Get bloks for authenticated users (for global notifications)
        if ($user) {
            if ($user->role === 'k-petani') {
                $bloks = Blok::whereHas('kebun', function($query) use ($user) {
                    $query->where('owner_id', $user->id);
                })->with('kebun')->get();
            } else {
                // Petani sees kebuns owned by K-Petani users
                $bloks = Blok::whereHas('kebun.owner', function($query) {
                    $query->where('role', 'k-petani');
                })->with('kebun')->get();
            }
            
            // Map bloks to array format
            $bloks = $bloks->map(function($blok) {
                return [
                    'id' => $blok->id,
                    'code' => $blok->code,
                    'name' => $blok->name,
                    'kebun_id' => $blok->kebun_id,
                    'kebun' => $blok->kebun ? [
                        'id' => $blok->kebun->id,
                        'name' => $blok->kebun->name,
                    ] : null,
                ];
            })->toArray();
        }
        
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
            ],
            'csrf' => csrf_token(),
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'globalBloks' => $bloks, // Share bloks globally for notifications
        ];
    }
}
