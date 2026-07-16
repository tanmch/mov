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

// Schedule: Sync sensor readings from Firebase to MySQL (every 5 minutes)
Schedule::command('firebase:sync-sensors')
    ->everyFiveMinutes()
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/firebase-sync.log'));

// Schedule: Sync robot schedules status from Firebase to MySQL (every 2 minutes)
Schedule::command('firebase:sync-robot-schedules')
    ->everyTwoMinutes()
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/firebase-sync.log'));
