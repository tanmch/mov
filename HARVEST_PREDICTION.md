# 🌾 Fitur Prediksi Panen - Dokumentasi

Sistem prediksi panen otomatis berdasarkan AI detection kematangan buah. Mengagregasi data deteksi untuk estimasi tanggal panen, yield, dan rekomendasi per blok.

## 📦 Komponen Baru

### Seeder
- **BlokSeeder** — membuat 7 blok test (A1, A2, B1, B2, C1, C2, C3) + 1 kebun parent
- **DetectionResultSeeder** — generate 28 detection records dengan distribusi maturity realistis

### Backend
- **HarvestPredictionService** (`app/Services/HarvestPredictionService.php`)
  - `getOverallPrediction()` — aggregate prediksi keseluruhan kebun
  - `predictBlock(Blok)` — hitung prediksi per blok
  - `getWeeklyTrend()` — trend maturity 7 hari terakhir

- **PredictionController** (`app/Http/Controllers/PredictionController.php`)
  - `GET /api/predictions/data` — JSON: overall + blocks + weekly_trend
  - `GET /api/predictions/export/pdf` — download PDF report
  - `GET /api/predictions/export/excel` — download CSV (Excel-compatible)

- **GenerateHarvestReport** (artisan command)
  - `php artisan report:harvest pdf` — CLI generate PDF
  - `php artisan report:harvest csv` — CLI generate CSV

### Frontend
- **PrediksiPanen.jsx** (`resources/js/Pages/PrediksiPanen.jsx`)
  - Fetch real data dari `/api/predictions/data`
  - Export buttons untuk PDF dan CSV (benar-benar download file)
  - Tampil weekly trend, per-blok readiness, rekomendasi panen

### Templates
- **reports/harvest-prediction.blade.php** — Blade template untuk PDF report
  - Summary keseluruhan (tanggal panen, hasil, kualitas)
  - Table prediksi per blok dengan progress bar
  - Rekomendasi dan faktor cuaca

## 🚀 Cara Setup

### 1. Seed Data
```bash
# Seed bloks + kebun
php artisan db:seed --class=BlokSeeder

# Seed detection results (28 records)
php artisan db:seed --class=DetectionResultSeeder

# Atau via install script
./install.sh --seed
```

### 2. Test Service (Tinker)
```bash
php artisan tinker
> $service = app(App\Services\HarvestPredictionService::class);
> $pred = $service->getOverallPrediction();
> dd($pred['overall']);
```

### 3. Generate Laporan (CLI)
```bash
# PDF → storage/app/reports/prediksi-panen-*.pdf
php artisan report:harvest pdf

# CSV → storage/app/reports/prediksi-panen-*.csv
php artisan report:harvest csv
```

### 4. Akses via UI
```
1. Login ke http://localhost:8000
   Email: admin@example.com
   Password: password

2. Buka: http://localhost:8000/prediksi

3. Klik "Export PDF" atau "Export Excel" untuk download
```

## 📊 Logika Prediksi

### Maturity Score → Days to Harvest
| Maturity | Level | Days to Harvest |
|----------|-------|-----------------|
| Mentah (20%) | Unripe | ~15 hari |
| Hampir Matang (65%) | Half-Ripe | ~5 hari |
| Matang (90%) | Ripe | 0-1 hari (panen sekarang) |
| Lewat Matang (95%) | OverRipe | -1 (sudah overripe) |

### Estimasi Panen Keseluruhan
- Optimal harvest = when 80% of blocks ≥ 80% readiness
- Jika belum: calculate avg days to harvest dari all blocks
- Growth rate: +3% maturity per hari (configurable)

### Yield Calculation
- 60 gram per buah (Mangga Harum Manis average)
- Total = (sum of mango_count across blocks) × 60g / 1000
- Result dalam ton

## 📈 Data Flow

```
Detection Results (tabel)
  ↓ (latest per blok)
HarvestPredictionService
  ↓
Overall + Per-Block Predictions
  ↓
┌─────────────────┬──────────────────┬─────────────┐
│ API JSON        │ PDF Report       │ CSV Export  │
└─────────────────┴──────────────────┴─────────────┘
```

## 🔧 Customization

### Update Growth Rate
Edit `HarvestPredictionService::GROWTH_RATE_PER_DAY` (default 0.03 = 3%/hari)

### Update Yield Per Mango
Edit `HarvestPredictionService::generateCSV()` line ~63 (default 0.06 kg = 60g)

### Update Quality Labels
Edit `HarvestPredictionService::getQualityLabel()` thresholds

## 🐛 Troubleshooting

**"Belum Ada Data Prediksi"** — Run seeder:
```bash
php artisan db:seed --class=DetectionResultSeeder
```

**PDF tidak generate** — Check `storage/app/reports/` writable:
```bash
chmod 755 storage/app/reports/
```

**API returns 401** — Login dulu via `/login` (auth required)

**Weekly trend semua 0** — Seed detection results dengan `detected_at` recent:
```bash
php artisan db:seed --class=DetectionResultSeeder
```

## 📝 Routes

```php
Route::prefix('/api/predictions')->name('predictions.')->group(function () {
    Route::get('/data', [PredictionController::class, 'getPredictionData'])->name('data');
    Route::get('/export/pdf', [PredictionController::class, 'generatePDF'])->name('export.pdf');
    Route::get('/export/excel', [PredictionController::class, 'generateExcel'])->name('export.excel');
});
```

## 🎯 Next Steps

- [ ] Real-time prediction update saat ada detection baru
- [ ] Whatsapp/email notification saat blok siap panen
- [ ] Historical data tracking (trend per bulan)
- [ ] Weather API integration untuk lebih akurat
- [ ] ML model retrain dengan local data
