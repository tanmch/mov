<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\UserController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application.
| Routes are loaded by the RouteServiceProvider and assigned the "api"
| middleware group. All routes are prefixed with /api automatically.
|
*/

// Public routes (no authentication required)
Route::prefix('v1')->group(function () {
    
    // Authentication routes
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
    });

    // Health check
    Route::get('/health', function () {
        return response()->json([
            'success' => true,
            'message' => 'MOV API is running',
            'version' => '1.0.0',
            'timestamp' => now()->toIso8601String(),
        ]);
    });
});

// Protected routes (authentication required)
Route::prefix('v1')->middleware(['firebase.auth'])->group(function () {
    
    // Authentication routes (authenticated)
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/profile', [AuthController::class, 'profile']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::put('/change-password', [AuthController::class, 'changePassword']);
        Route::delete('/delete-account', [AuthController::class, 'deleteAccount']);
    });

    // User management routes (K-Petani only)
    Route::prefix('users')->middleware(['role:k-petani'])->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::get('/{id}', [UserController::class, 'show']);
        Route::put('/{id}', [UserController::class, 'update']);
        Route::delete('/{id}', [UserController::class, 'destroy']);
        Route::put('/{id}/activate', [UserController::class, 'activate']);
        Route::put('/{id}/deactivate', [UserController::class, 'deactivate']);
    });

    // Kebun routes
    Route::prefix('kebuns')->group(function () {
        Route::get('/', function () {
            return response()->json([
                'success' => true,
                'message' => 'Kebun list endpoint - To be implemented',
                'data' => []
            ]);
        });
        // CRUD operations will be implemented in next phase
    });

    // Dashboard routes
    Route::prefix('dashboard')->group(function () {
        Route::get('/', function () {
            return response()->json([
                'success' => true,
                'message' => 'Dashboard endpoint - To be implemented',
                'data' => [
                    'robot_status' => 'idle',
                    'average_maturity' => [],
                    'sensor_readings' => [],
                    'notifications' => [],
                ]
            ]);
        });
    });

    // Sensor routes
    Route::prefix('sensors')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\SensorController::class, 'index']);
        Route::get('/latest', [\App\Http\Controllers\Api\SensorController::class, 'latest']);
        Route::get('/alerts', [\App\Http\Controllers\Api\SensorController::class, 'alerts']);
        Route::get('/blok/{blokId}', [\App\Http\Controllers\Api\SensorController::class, 'blokReadings']);
        Route::get('/blok/{blokId}/statistics', [\App\Http\Controllers\Api\SensorController::class, 'statistics']);
        Route::post('/sync-from-firebase', [\App\Http\Controllers\Api\SensorController::class, 'syncFromFirebase']);
    });

    // Robot routes
    Route::prefix('robot')->group(function () {
        Route::get('/status', [\App\Http\Controllers\Api\RobotController::class, 'status']);
        Route::get('/active-mission', [\App\Http\Controllers\Api\RobotController::class, 'activeMission']);
        Route::get('/schedules', [\App\Http\Controllers\Api\RobotController::class, 'schedules']);
        Route::get('/schedules/upcoming', [\App\Http\Controllers\Api\RobotController::class, 'upcomingSchedules']);
        Route::get('/schedules/statistics', [\App\Http\Controllers\Api\RobotController::class, 'statistics']);
        Route::get('/schedules/{id}', [\App\Http\Controllers\Api\RobotController::class, 'showSchedule']);
        
        // K-Petani only routes
        Route::middleware(['role:k-petani'])->group(function () {
            Route::post('/schedules', [\App\Http\Controllers\Api\RobotController::class, 'createSchedule']);
            Route::put('/schedules/{id}', [\App\Http\Controllers\Api\RobotController::class, 'updateSchedule']);
            Route::put('/schedules/{id}/cancel', [\App\Http\Controllers\Api\RobotController::class, 'cancelSchedule']);
        });
        
        // Sync endpoints (can be called by webhooks)
        Route::post('/sync-mission-results', [\App\Http\Controllers\Api\RobotController::class, 'syncMissionResults']);
    });

    // Detection results routes
    Route::prefix('detections')->group(function () {
        Route::get('/', function () {
            return response()->json([
                'success' => true,
                'message' => 'Detection results endpoint - To be implemented',
                'data' => []
            ]);
        });
    });

    // Notifications routes
    Route::prefix('notifications')->group(function () {
        Route::get('/', function () {
            return response()->json([
                'success' => true,
                'message' => 'Notifications endpoint - To be implemented',
                'data' => []
            ]);
        });
    });

    // Reports & Export routes
    Route::prefix('reports')->group(function () {
        Route::get('/', function () {
            return response()->json([
                'success' => true,
                'message' => 'Reports endpoint - To be implemented',
                'data' => []
            ]);
        });
    });
});

// Guest accessible routes (articles)
Route::prefix('v1/articles')->group(function () {
    Route::get('/', function () {
        return response()->json([
            'success' => true,
            'message' => 'Articles endpoint - To be implemented',
            'data' => []
        ]);
    });
    
    // Get preview image from URL (Open Graph image)
    Route::get('/preview-image', [\App\Http\Controllers\ArticleController::class, 'getPreviewImage']);
});

