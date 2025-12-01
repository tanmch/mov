<?php

namespace App\Console\Commands;

use App\Services\FirebaseService;
use Illuminate\Console\Command;

class TestFirebaseConnection extends Command
{
    protected $signature = 'firebase:test';
    protected $description = 'Test Firebase Realtime Database connection';

    public function handle()
    {
        $this->info('Testing Firebase connection...');
        
        try {
            $firebase = app(FirebaseService::class);
            
            // Test 1: Write simple data
            $this->info('Test 1: Writing test data...');
            $firebase->setDatabaseData('test/connection', [
                'status' => 'ok',
                'timestamp' => time(),
                'message' => 'Connection test successful'
            ]);
            $this->info('✓ Write successful');
            
            // Test 2: Read data back
            $this->info('Test 2: Reading test data...');
            $data = $firebase->getDatabaseData('test/connection');
            if ($data) {
                $this->info('✓ Read successful: ' . json_encode($data));
            } else {
                $this->warn('⚠ Read returned null');
            }
            
            // Test 3: Write to robot/schedules path
            $this->info('Test 3: Writing to robot/schedules...');
            $firebase->setDatabaseData('robot/schedules/test_schedule', [
                'schedule_id' => 999,
                'blok_id' => 'TEST',
                'mission_type' => 'test',
                'status' => 'test',
            ]);
            $this->info('✓ Write to robot/schedules successful');
            
            // Test 4: Delete test data
            $this->info('Test 4: Cleaning up...');
            $firebase->deleteDatabaseData('test/connection');
            $firebase->deleteDatabaseData('robot/schedules/test_schedule');
            $this->info('✓ Cleanup successful');
            
            $this->info('');
            $this->info('✅ All Firebase tests passed!');
            $this->info('Firebase connection is working properly.');
            
            return 0;
            
        } catch (\Exception $e) {
            $this->error('');
            $this->error('❌ Firebase connection test failed!');
            $this->error('Error: ' . $e->getMessage());
            $this->error('');
            $this->error('Possible causes:');
            $this->error('1. Firebase credentials file not found or invalid');
            $this->error('2. Firebase Database URL incorrect');
            $this->error('3. Service account permissions issue');
            $this->error('4. Network connection problem');
            $this->error('');
            $this->error('Check storage/logs/laravel.log for detailed error trace.');
            
            return 1;
        }
    }
}

