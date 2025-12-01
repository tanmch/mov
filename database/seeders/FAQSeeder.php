<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\FAQ;
use App\Models\User;

class FAQSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get first K-Petani user or create a default one
        $kPetani = User::where('role', 'k-petani')->first();
        
        if (!$kPetani) {
            // If no K-Petani exists, create a placeholder (created_by will be null)
            $kPetaniId = null;
        } else {
            $kPetaniId = $kPetani->id;
        }

        $faqs = [
            [
                'question' => 'Bagaimana cara menggunakan fitur deteksi kematangan Buah berdasarkan analisis AI?',
                'answer' => 'Upload foto buah mangga melalui menu Deteksi. Sistem AI akan menganalisis tingkat kematangan secara otomatis dalam hitungan detik. Pastikan foto jelas dan pencahayaan cukup untuk hasil akurat.',
                'category' => 'detection',
                'order' => 1,
                'is_active' => true,
            ],
            [
                'question' => 'Apakah MOV Platform gratis?',
                'answer' => 'Versi dasar MOV Platform gratis untuk petani umum dengan fitur deteksi AI, artikel edukasi, dan prediksi panen. Upgrade ke K-Petani untuk akses IoT sensor dan kontrol otomatis.',
                'category' => 'getting-started',
                'order' => 2,
                'is_active' => true,
            ],
            [
                'question' => 'Bagaimana cara membaca hasil prediksi panen?',
                'answer' => 'Hasil prediksi menampilkan persentase kematangan, estimasi hari panen, dan rekomendasi. Warna hijau = siap panen, kuning = tunggu, merah = belum matang.',
                'category' => 'detection',
                'order' => 3,
                'is_active' => true,
            ],
            [
                'question' => 'Bagaimana cara menghubungi mitra eksportir?',
                'answer' => 'Informasi mitra PT. Sindang Sukses tersedia di menu Artikel. Klik "Info Mitra" untuk detail kontak dan cara bermitra.',
                'category' => 'account',
                'order' => 4,
                'is_active' => true,
            ],
        ];

        foreach ($faqs as $faq) {
            FAQ::updateOrCreate(
                [
                    'question' => $faq['question'],
                ],
                [
                    'answer' => $faq['answer'],
                    'category' => $faq['category'],
                    'order' => $faq['order'],
                    'is_active' => $faq['is_active'],
                    'created_by' => $kPetaniId,
                    'updated_by' => $kPetaniId,
                ]
            );
        }

        $this->command->info('FAQ berhasil di-seed!');
    }
}
