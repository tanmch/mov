<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
    ]);
});

Route::get('/dashboard', [\App\Http\Controllers\DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    // Profile routes (all authenticated users) - Using our custom Profil page
    Route::get('/profile', [\App\Http\Controllers\UserController::class, 'index'])->name('profile');
    
    // Profile edit/update routes (keep for form submissions)
    Route::get('/profile/edit', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    
    // Read-only routes (all authenticated users can view)
    Route::get('/sensor', [\App\Http\Controllers\SensorController::class, 'index'])->name('sensor');
    
    // Sensor Thresholds - Get (all users can view)
    Route::get('/sensor-thresholds', [\App\Http\Controllers\SensorThresholdController::class, 'getThresholds'])->name('sensor-thresholds.get');
    
    Route::get('/robot', [\App\Http\Controllers\RobotControlController::class, 'index'])->name('robot');
    
    Route::get('/prediksi', function () {
        return Inertia::render('PrediksiPanen');
    })->name('prediksi');
    
    Route::get('/laporan', function () {
        return Inertia::render('LaporanEkspor');
    })->name('laporan');
    
    Route::get('/kebun', function () {
        return Inertia::render('KebunMonitoring');
    })->name('kebun');
    
    Route::get('/penyiraman', function () {
        return Inertia::render('Penyiraman');
    })->name('penyiraman');
    
    Route::get('/deteksi', function () {
        return Inertia::render('DeteksiKematangan');
    })->name('deteksi');
    
    Route::get('/artikel', function () {
        return Inertia::render('ArtikelEdukasi');
    })->name('artikel');
    
    // Robot routes (all authenticated users can view)
    Route::prefix('api/robot')->group(function () {
        Route::get('/schedules', [\App\Http\Controllers\Api\RobotController::class, 'schedules'])->name('robot.schedules');
        Route::get('/schedules/upcoming', [\App\Http\Controllers\Api\RobotController::class, 'upcomingSchedules'])->name('robot.schedules.upcoming');
        Route::get('/schedules/{id}', [\App\Http\Controllers\Api\RobotController::class, 'showSchedule'])->name('robot.schedules.show');
    });
    
    // K-Petani only routes (CRUD operations)
    Route::middleware('role:k-petani')->group(function () {
        // Kebun Management (CRUD)
        // Routes akan ditambahkan ketika KebunController dibuat
        // Route::post('/kebun', [KebunController::class, 'store'])->name('kebun.store');
        // Route::put('/kebun/{id}', [KebunController::class, 'update'])->name('kebun.update');
        // Route::delete('/kebun/{id}', [KebunController::class, 'destroy'])->name('kebun.destroy');
        
        // Blok Management (CRUD)
        // Routes akan ditambahkan ketika BlokController dibuat
        // Route::post('/blok', [BlokController::class, 'store'])->name('blok.store');
        // Route::put('/blok/{id}', [BlokController::class, 'update'])->name('blok.update');
        // Route::delete('/blok/{id}', [BlokController::class, 'destroy'])->name('blok.destroy');
        
        // User Management (CRUD)
        Route::get('/users', [\App\Http\Controllers\UserController::class, 'index'])->name('users.index');
        Route::post('/users', [\App\Http\Controllers\UserController::class, 'store'])->name('users.store');
        Route::put('/users/{id}', [\App\Http\Controllers\UserController::class, 'update'])->name('users.update');
        Route::delete('/users/{id}', [\App\Http\Controllers\UserController::class, 'destroy'])->name('users.destroy');
        Route::post('/users/{id}/toggle-active', [\App\Http\Controllers\UserController::class, 'toggleActive'])->name('users.toggle-active');
        
        // Sensor Thresholds - Update (K-Petani only)
        Route::put('/sensor-thresholds/{sensorType}', [\App\Http\Controllers\SensorThresholdController::class, 'update'])->name('sensor-thresholds.update');
        
        // Robot schedules - Create, Update, Cancel, Delete (K-Petani only)
        Route::prefix('api/robot')->group(function () {
            Route::post('/schedules', [\App\Http\Controllers\Api\RobotController::class, 'createSchedule'])->name('robot.schedules.create');
            Route::put('/schedules/{id}', [\App\Http\Controllers\Api\RobotController::class, 'updateSchedule'])->name('robot.schedules.update');
            Route::put('/schedules/{id}/cancel', [\App\Http\Controllers\Api\RobotController::class, 'cancelSchedule'])->name('robot.schedules.cancel');
            Route::delete('/schedules/{id}', [\App\Http\Controllers\Api\RobotController::class, 'deleteSchedule'])->name('robot.schedules.delete');
        });
        
        // Work ID Management (K-Petani only)
        Route::resource('work-ids', \App\Http\Controllers\WorkIdController::class);
        Route::post('/work-ids/generate-multiple', [\App\Http\Controllers\WorkIdController::class, 'generateMultiple'])->name('work-ids.generate-multiple');
    });
});

require __DIR__.'/auth.php';
