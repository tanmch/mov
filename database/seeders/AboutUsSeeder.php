<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AboutUs;

class AboutUsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $teamMembers = [
            [
                'name' => 'Laras Desfyanti',
                'jobdesc' => 'Front-End, Robotik',
                'description' => 'Bertanggung jawab dalam pengembangan front-end website menggunakan teknologi modern seperti React.js dan Inertia.js. Mengimplementasikan desain UI/UX yang responsif dan menarik. Juga terlibat dalam pengembangan sistem robotik dengan fokus pada GameTek dan desain 3D untuk interface robot. Front-end yang digunakan pada website ini adalah React.js dengan Inertia.js untuk integrasi dengan backend Laravel, serta Framer Motion untuk animasi yang menarik.',
                'order' => 1,
                'is_active' => true,
            ],
            [
                'name' => 'Nabil Rifqi Wijaya',
                'jobdesc' => 'Robotik, Back-End',
                'description' => 'Mengembangkan sistem robotik dengan desain 3D, skema rangkaian elektronik, dan animasi robot. Bertanggung jawab dalam pengembangan backend menggunakan Laravel untuk mengelola API, database, dan integrasi dengan sistem robotik. Membuat sistem kontrol robot yang efisien dan terintegrasi. Backend yang digunakan adalah Laravel dengan MySQL untuk database, serta integrasi dengan Firebase untuk real-time data.',
                'order' => 2,
                'is_active' => true,
            ],
            [
                'name' => 'M. Qyblat Ilmy Mahdi',
                'jobdesc' => 'Stakeholder, Real-time database',
                'description' => 'Mengelola komunikasi dengan stakeholder dan mengembangkan sistem database real-time menggunakan Firebase Realtime Database. Memastikan sinkronisasi data antara Firebase dan MySQL berjalan dengan baik. Bertanggung jawab dalam manajemen data sensor, robot schedules, dan historical data. Database yang digunakan adalah Firebase Realtime Database untuk data real-time dan MySQL untuk data historis, dengan sinkronisasi otomatis antara keduanya.',
                'order' => 3,
                'is_active' => true,
            ],
            [
                'name' => 'Michael Christian Handoko',
                'jobdesc' => 'Machine Learning',
                'description' => 'Mengembangkan model machine learning untuk deteksi kematangan buah mangga menggunakan teknologi ONNX. Melakukan training model dengan dataset buah mangga, optimasi model untuk akurasi deteksi, dan implementasi model ke dalam aplikasi web untuk deteksi real-time menggunakan TensorFlow.js. Machine learning yang digunakan adalah model ONNX yang dioptimasi untuk deteksi kematangan buah mangga, dengan implementasi menggunakan TensorFlow.js untuk deteksi real-time di browser.',
                'order' => 4,
                'is_active' => true,
            ],
        ];

        foreach ($teamMembers as $member) {
            $teamMember = AboutUs::updateOrCreate(
                ['name' => $member['name']],
                $member
            );
            $this->command->info("  ✅ Created/Updated Team Member: {$teamMember->name} ({$teamMember->jobdesc})");
        }

        $this->command->info("✅ AboutUsSeeder completed! Total: " . count($teamMembers) . " team members");
    }
}
