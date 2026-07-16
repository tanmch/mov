# 🌾 Fitur Prediksi Panen

Prediksi panen dihitung dari data deteksi kematangan AI, diagregasi per blok: estimasi tanggal panen, jumlah buah, kualitas, dan hasil (ton). Export sebagai CSV.

## Komponen

- **HarvestPredictionService** (`app/Services/HarvestPredictionService.php`)
  - `getOverallPrediction()` — agregat prediksi seluruh kebun
  - `predictBlock(Blok)` — prediksi per blok dari deteksi terbaru
  - `getWeeklyTrend()` — tren kematangan 7 hari (satu query grouped)
- **PredictionController** (`app/Http/Controllers/PredictionController.php`)
- **GenerateHarvestReport** — artisan command `report:harvest`
- **PrediksiPanen.jsx** (`resources/js/Pages/PrediksiPanen.jsx`) — UI, fetch data + tombol Export CSV

## Routes

```php
GET /api/predictions/data          // JSON: overall + blocks + weekly_trend
GET /api/predictions/export/csv    // download CSV (UTF-8 BOM, Excel-compatible)
```

## Cara Pakai

```bash
# Seed data contoh
php artisan db:seed --class=BlokSeeder
php artisan db:seed --class=DetectionResultSeeder

# Generate laporan via CLI → storage/app/reports/prediksi-panen-*.csv
php artisan report:harvest
```

Via browser: login → buka `/prediksi` → klik **Export CSV**.

## Logika Prediksi

| Maturity | Skor | Estimasi Panen |
|----------|------|----------------|
| Mentah | 20% | ~15 hari |
| Hampir Matang | 65% | ~5 hari |
| Matang | 90% | 0-1 hari |
| Lewat Matang | 95% | lewat optimal |

- Growth rate: +3% maturity per hari (`GROWTH_RATE_PER_DAY`)
- Yield: 60 gram per buah → total dalam ton
- Panen keseluruhan optimal saat ≥80% blok mencapai kesiapan 80%

## Troubleshooting

- **"Belum Ada Data Prediksi"** → jalankan `DetectionResultSeeder`
- **API 401** → login dulu (route butuh auth)
