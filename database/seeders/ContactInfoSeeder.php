<?php

namespace Database\Seeders;

use App\Models\ContactInfo;
use Illuminate\Database\Seeder;

class ContactInfoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create default contact info for MOV Center
        // Check if contact info already exists
        $existingContact = ContactInfo::first();
        
        if ($existingContact) {
            $this->command->info('ℹ️  Contact info already exists. Skipping...');
            return;
        }

        $contactInfo = ContactInfo::create([
            'whatsapp' => '081234567890', // ⚠️ Ganti dengan nomor WhatsApp yang benar
            'phone' => '021-12345678',    // ⚠️ Ganti dengan nomor telepon yang benar
            'email' => 'info@mov-platform.com', // ⚠️ Ganti dengan email yang benar
            'operational_hours' => 'Senin - Jumat: 08:00 - 17:00 WIB',
        ]);

        $this->command->info("✅ Created Contact Info:");
        $this->command->info("   WhatsApp: {$contactInfo->whatsapp}");
        $this->command->info("   Phone: {$contactInfo->phone}");
        $this->command->info("   Email: {$contactInfo->email}");
        $this->command->info("   Operational Hours: {$contactInfo->operational_hours}");
        $this->command->info('✅ ContactInfoSeeder completed!');
    }
}
