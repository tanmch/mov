<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\JsonResponse;

class ProfileController extends Controller
{
    /**
     * Toggle sensor simulation
     */
    public function toggleSensorSimulation(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }

        $user->enable_sensor_simulation = !$user->enable_sensor_simulation;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => $user->enable_sensor_simulation 
                ? 'Simulasi sensor diaktifkan' 
                : 'Simulasi sensor dinonaktifkan',
            'enable_sensor_simulation' => $user->enable_sensor_simulation
        ]);
    }
}

