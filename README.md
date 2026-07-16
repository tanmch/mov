# MOV — Mango Orchard Vision

Sistem monitoring kebun mangga: deteksi kematangan buah berbasis AI (YOLO/ONNX di browser), monitoring sensor realtime (Firebase), kontrol robot, prediksi panen, dan laporan.

**Stack:** Laravel 12 · Inertia + React 18 · Vite · Tailwind CSS · SQLite/MySQL · Firebase Realtime Database · onnxruntime-web

## Prasyarat

- PHP ≥ 8.2
- Node.js atau Bun
- Composer (atau pakai `composer.phar` yang sudah disertakan)

## Instalasi

```bash
./install.sh          # install dependensi, .env, APP_KEY, database, migrasi, build
./install.sh --seed   # sama seperti di atas + data contoh (blok, deteksi, admin)
```

## Menjalankan

```bash
./start.sh            # mode dev: server + queue + logs + vite (http://localhost:8000)
./start.sh --prod     # build aset produksi lalu serve
```

Login default (dari seeder): `admin@example.com` / `password` — ganti setelah login pertama.

## Fitur Utama

| Fitur | Route | Keterangan |
|-------|-------|------------|
| Dashboard | `/dashboard` | Ringkasan sensor, robot, deteksi |
| Deteksi Kematangan | `/deteksi` | Upload foto → deteksi AI di browser (model di `public/ml-models/`) |
| Prediksi Panen | `/prediksi` | Estimasi panen per blok dari data deteksi, export CSV |
| Monitoring Kebun | `/kebun` | Status blok dan sensor |
| Laporan | `/laporan` | Generate laporan |

## Perintah CLI Berguna

```bash
php artisan report:harvest                          # generate laporan prediksi CSV
php artisan db:seed --class=BlokSeeder              # seed blok contoh
php artisan db:seed --class=DetectionResultSeeder   # seed data deteksi contoh
composer test                                       # jalankan test suite
```

## Konfigurasi Firebase (opsional)

Fitur realtime (sensor, chat, sinkronisasi robot) butuh Firebase:

1. Isi `FIREBASE_API_KEY` di `.env`.
2. Taruh service account JSON di `config/firebase-credentials.json` (atau set path via env `FIREBASE_CREDENTIALS`).

Detail: [FIREBASE_SYNC_SETUP.md](FIREBASE_SYNC_SETUP.md). Tanpa kredensial, aplikasi tetap jalan — hanya fitur Firebase yang nonaktif.

## Dokumentasi Lain

- [HARVEST_PREDICTION.md](HARVEST_PREDICTION.md) — cara kerja fitur prediksi panen
