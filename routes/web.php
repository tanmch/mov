<?php

use App\Http\Controllers\ProfileController;
use App\Models\Article;
use App\Models\AboutUs;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

Route::get('/', function () {
    // Get published articles for Welcome page (all articles, no limit)
    $articles = Article::where('status', 'published')
        ->with('creator')
        ->orderBy('publish_date', 'desc')
        ->orderBy('created_at', 'desc')
        ->get()
        ->map(function ($article) {
            $publishDate = $article->publish_date instanceof \Carbon\Carbon 
                ? $article->publish_date 
                : \Carbon\Carbon::parse($article->publish_date);
            
            return [
                'id' => $article->id,
                'title' => $article->title,
                'excerpt' => $article->description,
                'description' => $article->description,
                'source' => $article->source_url ? parse_url($article->source_url, PHP_URL_HOST) : null,
                'externalUrl' => $article->source_url,
                'date' => $publishDate->format('d M Y'),
                'year' => $article->year,
                'image' => '📰',
                'readTime' => '5 min',
                'views' => 0,
                'category' => $article->category ?? 'berita',
            ];
        });

    // Define categories for articles
    $categories = [
        ['id' => 'semua', 'label' => 'Semua', 'icon' => '📚'],
        ['id' => 'berita', 'label' => 'Berita Mangga', 'icon' => '📰'],
        ['id' => 'tips', 'label' => 'Tips Pertanian', 'icon' => '💡'],
        ['id' => 'teknologi', 'label' => 'Teknologi', 'icon' => '🤖'],
        ['id' => 'jenis-mangga', 'label' => 'Jenis Mangga', 'icon' => '🥭'],
        ['id' => 'perawatan', 'label' => 'Perawatan', 'icon' => '🌱'],
    ];

    // Get team members for Welcome page (load directly from database)
    $teamMembers = AboutUs::where('is_active', true)
        ->orderBy('order', 'asc')
        ->orderBy('created_at', 'asc')
        ->get()
        ->map(function ($member) {
            return [
                'id' => $member->id,
                'name' => $member->name,
                'photo_url' => $member->photo_path ? Storage::url($member->photo_path) : null,
                'jobdesc' => $member->jobdesc,
                'description' => $member->description,
                'order' => $member->order,
            ];
        });

    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'articles' => $articles,
        'categories' => $categories,
        'teamMembers' => $teamMembers,
    ]);
});

// Artikel route - accessible to all users (guest, petani, k-petani)
Route::get('/artikel', [\App\Http\Controllers\ArticleController::class, 'indexPublic'])->name('artikel');

// About Us - Public access
Route::get('/api/about-us', [\App\Http\Controllers\AboutUsController::class, 'index'])->name('about-us.index');

// Questions - Guest users can also ask questions
Route::post('/questions', [\App\Http\Controllers\QuestionController::class, 'store'])->name('questions.store');
Route::get('/api/questions/my-questions', [\App\Http\Controllers\QuestionController::class, 'myQuestions'])->name('questions.my-questions');
Route::post('/api/questions/{question}/mark-as-read', [\App\Http\Controllers\QuestionController::class, 'markAsRead'])->name('questions.mark-as-read');

// Chat routes - Guest access (Private chat with K-Petani)
Route::get('/chat/guest', [\App\Http\Controllers\ChatController::class, 'guestIndex'])->name('chat.guest');
Route::post('/api/chat/guest/private/send', [\App\Http\Controllers\ChatController::class, 'guestSendPrivateMessage'])->name('chat.guest.private.send');
Route::get('/api/chat/guest/private/{chatId}/messages', [\App\Http\Controllers\ChatController::class, 'guestGetPrivateMessages'])->name('chat.guest.private.messages');
Route::post('/api/chat/guest/private/get-or-create', [\App\Http\Controllers\ChatController::class, 'guestGetOrCreatePrivateChat'])->name('chat.guest.private.get-or-create');
Route::delete('/api/chat/guest/private/{chatId}', [\App\Http\Controllers\ChatController::class, 'deletePrivateChat'])->name('chat.guest.private.delete');

// FAQ - Public access for guest
Route::get('/api/faqs/public', [\App\Http\Controllers\FAQController::class, 'getPublicFAQs'])->name('faqs.public');

Route::get('/dashboard', [\App\Http\Controllers\DashboardController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    // Profile routes (all authenticated users) - Using our custom Profil page
    Route::get('/profile', [\App\Http\Controllers\UserController::class, 'index'])->name('profile');
    
    // Profile edit/update routes (keep for form submissions)
    Route::get('/profile/edit', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('/profile/upload-photo', [ProfileController::class, 'uploadPhoto'])->name('profile.upload-photo');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    
    // Profile API routes
    Route::post('/api/profile/toggle-sensor-simulation', [\App\Http\Controllers\Api\ProfileController::class, 'toggleSensorSimulation'])->name('profile.toggle-sensor-simulation');
    
    // Read-only routes (all authenticated users can view)
    Route::get('/sensor', [\App\Http\Controllers\SensorController::class, 'index'])->name('sensor');
    
    // Sensor Thresholds - Get (all users can view)
    Route::get('/sensor-thresholds', [\App\Http\Controllers\SensorThresholdController::class, 'getThresholds'])->name('sensor-thresholds.get');
    
    Route::get('/robot', [\App\Http\Controllers\RobotControlController::class, 'index'])->name('robot');
    
    Route::get('/prediksi', function () {
        return Inertia::render('PrediksiPanen');
    })->name('prediksi');
    
    Route::get('/laporan', [\App\Http\Controllers\ReportController::class, 'index'])->name('laporan');
    Route::match(['get', 'post'], '/laporan/generate', [\App\Http\Controllers\ReportController::class, 'generate'])->name('laporan.generate');
    Route::get('/laporan/generate-latest', [\App\Http\Controllers\ReportController::class, 'generateLatest'])->name('laporan.generate-latest');
    
    Route::get('/kebun', [\App\Http\Controllers\KebunController::class, 'index'])->name('kebun');
    
    Route::get('/penyiraman', function () {
        return Inertia::render('Penyiraman');
    })->name('penyiraman');
    
    Route::get('/deteksi', [\App\Http\Controllers\DetectionController::class, 'index'])->name('deteksi');
    Route::post('/detections', [\App\Http\Controllers\DetectionController::class, 'store'])->name('detections.store');
    Route::delete('/detections/{id}', [\App\Http\Controllers\DetectionController::class, 'destroy'])->name('detections.destroy');
    Route::delete('/detections', [\App\Http\Controllers\DetectionController::class, 'destroyAll'])->name('detections.destroyAll');
    
    // Notifications - Delete and Mark as Read routes
    Route::delete('/notifications/{id}', [\App\Http\Controllers\NotificationController::class, 'destroy'])->name('notifications.delete');
    Route::delete('/notifications', [\App\Http\Controllers\NotificationController::class, 'destroyAll'])->name('notifications.delete-all');
    Route::post('/notifications/{id}/mark-read', [\App\Http\Controllers\NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
    
    Route::get('/customer-service', [\App\Http\Controllers\ContactInfoController::class, 'index'])->name('customer-service');
    
    // Chat routes (authenticated users)
    Route::get('/chat', [\App\Http\Controllers\ChatController::class, 'index'])->name('chat.index');
    Route::get('/api/chat/groups/{groupId}/messages', [\App\Http\Controllers\ChatController::class, 'getGroupMessages'])->name('chat.group.messages');
    Route::post('/api/chat/groups/{groupId}/messages', [\App\Http\Controllers\ChatController::class, 'sendGroupMessage'])->name('chat.group.send');
           Route::get('/api/chat/private/{chatId}/messages', [\App\Http\Controllers\ChatController::class, 'getPrivateChatMessages'])->name('chat.private.messages');
           Route::post('/api/chat/private/get-or-create', [\App\Http\Controllers\ChatController::class, 'getOrCreatePrivateChat'])->name('chat.private.get-or-create');
           Route::post('/api/chat/private/{chatId}/messages', [\App\Http\Controllers\ChatController::class, 'sendPrivateMessage'])->name('chat.private.send');
           Route::delete('/api/chat/private/{chatId}', [\App\Http\Controllers\ChatController::class, 'deletePrivateChat'])->name('chat.private.delete');
           
           // K-Petani: Take guest chat
           Route::post('/api/chat/guest/{chatId}/take', [\App\Http\Controllers\ChatController::class, 'takeGuestChat'])->name('chat.guest.take');
           
           // Chat notifications
           Route::get('/api/chat/notifications', [\App\Http\Controllers\ChatController::class, 'getChatNotifications'])->name('chat.notifications');
    Route::get('/api/chat/available-users', [\App\Http\Controllers\ChatController::class, 'getAvailableUsers'])->name('chat.available-users');
    
    // K-Petani: Delete guest chat
    Route::delete('/api/chat/guest/{chatId}', [\App\Http\Controllers\ChatController::class, 'deleteGuestChat'])->name('chat.guest.delete');
    
    // Questions - All authenticated users can ask questions
    Route::post('/questions', [\App\Http\Controllers\QuestionController::class, 'store'])->name('questions.store');
    
    // FAQ Management (K-Petani only)
    Route::get('/faqs', [\App\Http\Controllers\FAQController::class, 'index'])->name('faqs.index');
    Route::post('/faqs', [\App\Http\Controllers\FAQController::class, 'store'])->name('faqs.store');
    Route::put('/faqs/{id}', [\App\Http\Controllers\FAQController::class, 'update'])->name('faqs.update');
    Route::delete('/faqs/{id}', [\App\Http\Controllers\FAQController::class, 'destroy'])->name('faqs.destroy');
    
    // About Us Management (K-Petani only)
    Route::get('/about-us', function () {
        $teamMembers = \App\Models\AboutUs::orderBy('order', 'asc')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function ($member) {
                return [
                    'id' => $member->id,
                    'name' => $member->name,
                    'photo_url' => $member->photo_path ? Storage::url($member->photo_path) : null,
                    'jobdesc' => $member->jobdesc,
                    'description' => $member->description,
                    'order' => $member->order,
                    'is_active' => $member->is_active,
                    'created_at' => $member->created_at?->toISOString(),
                ];
            });
        
        return Inertia::render('AboutUsManagement', [
            'teamMembers' => $teamMembers,
        ]);
    })->name('about-us.management');
    Route::post('/about-us', [\App\Http\Controllers\AboutUsController::class, 'store'])->name('about-us.store');
    Route::post('/about-us/{id}', [\App\Http\Controllers\AboutUsController::class, 'update'])->name('about-us.update'); // Using POST for file upload support
    Route::delete('/about-us/{id}', [\App\Http\Controllers\AboutUsController::class, 'destroy'])->name('about-us.destroy');
    
    // Contact Info CRUD (K-Petani only)
    Route::middleware('role:k-petani')->group(function () {
        Route::post('/contact-info', [\App\Http\Controllers\ContactInfoController::class, 'store'])->name('contact-info.store');
        Route::put('/contact-info/{id}', [\App\Http\Controllers\ContactInfoController::class, 'update'])->name('contact-info.update');
        Route::delete('/contact-info/{id}', [\App\Http\Controllers\ContactInfoController::class, 'destroy'])->name('contact-info.destroy');
        
        // Questions Management (K-Petani only)
        Route::get('/questions', [\App\Http\Controllers\QuestionController::class, 'index'])->name('questions.index');
        Route::get('/questions/{question}', [\App\Http\Controllers\QuestionController::class, 'show'])->name('questions.show');
        Route::put('/questions/{question}', [\App\Http\Controllers\QuestionController::class, 'update'])->name('questions.update');
        Route::delete('/questions/{question}', [\App\Http\Controllers\QuestionController::class, 'destroy'])->name('questions.destroy');
    });
    
    // Robot routes (all authenticated users can view)
    Route::prefix('api/robot')->group(function () {
        Route::get('/schedules', [\App\Http\Controllers\Api\RobotController::class, 'schedules'])->name('robot.schedules');
        Route::get('/schedules/upcoming', [\App\Http\Controllers\Api\RobotController::class, 'upcomingSchedules'])->name('robot.schedules.upcoming');
        Route::get('/schedules/{id}', [\App\Http\Controllers\Api\RobotController::class, 'showSchedule'])->name('robot.schedules.show');
    });
    
    // K-Petani only routes (CRUD operations)
    Route::middleware('role:k-petani')->group(function () {
        // Kebun Management (CRUD)
        Route::get('/kebun/create', [\App\Http\Controllers\KebunController::class, 'create'])->name('kebun.create');
        Route::post('/kebun', [\App\Http\Controllers\KebunController::class, 'store'])->name('kebun.store');
        Route::get('/kebun/{kebun}/edit', [\App\Http\Controllers\KebunController::class, 'edit'])->name('kebun.edit');
        Route::put('/kebun/{kebun}', [\App\Http\Controllers\KebunController::class, 'update'])->name('kebun.update');
        Route::delete('/kebun/{kebun}', [\App\Http\Controllers\KebunController::class, 'destroy'])->name('kebun.destroy');
        
        // Blok Management (CRUD)
        Route::get('/blok/create', [\App\Http\Controllers\BlokController::class, 'create'])->name('blok.create');
        Route::post('/blok', [\App\Http\Controllers\BlokController::class, 'store'])->name('blok.store');
        Route::get('/blok/{blok}/edit', [\App\Http\Controllers\BlokController::class, 'edit'])->name('blok.edit');
        Route::put('/blok/{blok}', [\App\Http\Controllers\BlokController::class, 'update'])->name('blok.update');
        Route::delete('/blok/{blok}', [\App\Http\Controllers\BlokController::class, 'destroy'])->name('blok.destroy');
        
        // User Management (CRUD)
        Route::get('/users', [\App\Http\Controllers\UserController::class, 'index'])->name('users.index');
        Route::post('/users', [\App\Http\Controllers\UserController::class, 'store'])->name('users.store');
        Route::put('/users/{id}', [\App\Http\Controllers\UserController::class, 'update'])->name('users.update');
        Route::delete('/users/{id}', [\App\Http\Controllers\UserController::class, 'destroy'])->name('users.destroy');
        Route::post('/users/{id}/toggle-active', [\App\Http\Controllers\UserController::class, 'toggleActive'])->name('users.toggle-active');
        
        // Sensor Thresholds - Update (K-Petani only)
        Route::put('/sensor-thresholds/{sensorType}', [\App\Http\Controllers\SensorThresholdController::class, 'update'])->name('sensor-thresholds.update');
        
        // Article Management (CRUD) - K-Petani only
        Route::post('/articles', [\App\Http\Controllers\ArticleController::class, 'store'])->name('articles.store');
        Route::put('/articles/{article}', [\App\Http\Controllers\ArticleController::class, 'update'])->name('articles.update');
        Route::delete('/articles/{article}', [\App\Http\Controllers\ArticleController::class, 'destroy'])->name('articles.destroy');
        Route::post('/articles/generate', [\App\Http\Controllers\ArticleController::class, 'generateFromUrl'])->name('articles.generate');
        
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
