<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->command->info('🌱 Starting database seeding...');
        $this->command->newLine();

        // 1. AdminSeeder - Create admin user (MUST BE FIRST - other seeders depend on K-Petani user)
        $this->command->info('👤 Seeding Admin User...');
        $this->call(AdminSeeder::class);
        $this->command->newLine();

        // 2. UserSeeder - Create additional users (K-Petani & Petani)
        // Note: UserSeeder also creates a K-Petani, but AdminSeeder creates the main admin
        $this->command->info('📝 Seeding Users...');
        $this->call(UserSeeder::class);
        $this->command->newLine();

        // 3. WorkIdSeeder - Create work IDs for registration
        $this->command->info('🆔 Seeding Work IDs...');
        $this->call(WorkIdSeeder::class);
        $this->command->newLine();

        // 4. KebunBlokSeeder - Create kebun and bloks (depends on UserSeeder)
        $this->command->info('🌳 Seeding Kebun & Bloks...');
        $this->call(KebunBlokSeeder::class);
        $this->command->newLine();

        // 5. SensorThresholdSeeder - Create default sensor thresholds (depends on UserSeeder)
        $this->command->info('📊 Seeding Sensor Thresholds...');
        $this->call(SensorThresholdSeeder::class);
        $this->command->newLine();

        // 6. ChatGroupSeeder - Create default chat group (depends on UserSeeder)
        $this->command->info('💬 Seeding Chat Groups...');
        $this->call(ChatGroupSeeder::class);
        $this->command->newLine();

        // 7. ContactInfoSeeder - Create default contact info
        $this->command->info('📞 Seeding Contact Info...');
        $this->call(ContactInfoSeeder::class);
        $this->command->newLine();

        // 8. FAQSeeder - Create FAQs (depends on UserSeeder)
        $this->command->info('❓ Seeding FAQs...');
        $this->call(FAQSeeder::class);
        $this->command->newLine();

        // 9. AboutUsSeeder - Create team members (IMPORTANT: For Welcome page)
        $this->command->info('👥 Seeding About Us (Team Members)...');
        $this->call(AboutUsSeeder::class);
        $this->command->newLine();

        $this->command->info('✅ Database seeding completed successfully!');
        $this->command->newLine();
        $this->command->info('📋 Summary:');
        $this->command->info('   • Admin User (K-Petani)');
        $this->command->info('   • Users (K-Petani & Petani)');
        $this->command->info('   • Work IDs');
        $this->command->info('   • Kebun & Bloks');
        $this->command->info('   • Sensor Thresholds');
        $this->command->info('   • Chat Groups');
        $this->command->info('   • Contact Info');
        $this->command->info('   • FAQs');
        $this->command->info('   • Team Members (About Us)');
        $this->command->newLine();
        $this->command->warn('⚠️  IMPORTANT: Change default passwords in production!');
        $this->command->warn('⚠️  Update Contact Info (WhatsApp, Phone, Email) in production!');
    }
}
