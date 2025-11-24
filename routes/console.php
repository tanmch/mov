<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule: Auto-start robot schedules when scheduled time is reached
Schedule::command('robot:auto-start-schedules')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/schedule.log'));

// Schedule: Sync Firebase data to MySQL every 5 minutes
Schedule::command('firebase:sync-all')
    ->everyFiveMinutes()
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/firebase-sync.log'));

// Schedule: Full sync Firebase data to MySQL every hour (more thorough)
Schedule::command('firebase:sync-all')
    ->hourly()
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/firebase-sync.log'));
