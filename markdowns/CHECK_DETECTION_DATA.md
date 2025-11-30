# Pemeriksaan Data Deteksi Kematangan

## 1. Dimana Data Disimpan?

### Tabel Database: `detection_results`

**Lokasi penyimpanan:**
- **Database:** MySQL table `detection_results`
- **Storage:** Gambar disimpan di `storage/app/public/detections/`
- **Controller:** `app/Http/Controllers/DetectionController.php` method `store()`

### Field yang Disimpan:

1. **blok_id** - ID blok tempat deteksi dilakukan
2. **image_path** - Path relatif ke gambar (contoh: `detections/abc123.jpg`)
3. **image_url** - URL lengkap ke gambar (contoh: `/storage/detections/abc123.jpg`)
4. **maturity_level** - Enum: `'mentah'`, `'hampir_matang'`, `'matang'`, `'lewat_matang'`
5. **confidence_score** - Decimal 0-100 (rata-rata confidence dari semua detections * 100)
6. **mango_count** - Integer (jumlah mangga yang terdeteksi)
7. **bounding_boxes** - JSON array (semua detections dengan koordinat)
8. **ai_metadata** - JSON object berisi:
   - `detections`: Array semua detections
   - `best_detection`: Detection dengan confidence tertinggi (berisi: x, y, w, h, className, maturity, status, confidence)
9. **detection_source** - Enum: `'manual_upload'`, `'robot_camera'`, `'scheduled'`
10. **uploaded_by** - ID user yang upload (nullable untuk robot)
11. **detected_at** - Timestamp kapan deteksi dilakukan

## 2. Apakah Data di Laporan Sudah Sesuai?

### Data yang Disimpan vs Data yang Dilaporkan:

| Field Database | Nilai Disimpan | Nilai di Laporan | Status |
|----------------|----------------|------------------|--------|
| **tanggal** | `detected_at` | `detected_at->format('d/m/Y H:i')` | ✅ Sesuai |
| **blok** | `blok->code` | `blok->code` | ✅ Sesuai |
| **kebun** | `blok->kebun->name` | `blok->kebun->name` | ✅ Sesuai |
| **status** | `maturity_level` | `mapMaturityStatus(maturity_level)` | ✅ Sesuai |
| **kematangan** | `ai_metadata['best_detection']['maturity']` | `best_detection['maturity']` atau fallback `confidence_score` | ⚠️ **MASALAH** |
| **confidence** | `confidence_score` (0-100) | `confidence_score` dengan format `%` | ✅ Sesuai (tapi perlu dicek) |
| **jumlah_mangga** | `mango_count` | `mango_count` | ✅ Sesuai |

### ⚠️ Masalah yang Ditemukan:

1. **Field `kematangan` di laporan:**
   - **Saat ini:** Menggunakan `best_detection['maturity']` atau fallback ke `confidence_score`
   - **Masalah:** `confidence_score` adalah confidence (0-100), bukan maturity (0-100)
   - **Solusi:** Jika `best_detection['maturity']` tidak ada, gunakan nilai default atau hitung dari `maturity_level`

2. **Field `confidence` di laporan:**
   - **Saat ini:** `confidence_score` sudah dalam bentuk 0-100, lalu ditambahkan `%`
   - **Status:** ✅ Sudah benar (0-100 dengan format percentage)

## 3. Rekomendasi Perbaikan:

1. **Perbaiki logika `kematangan` di laporan:**
   - Jika `best_detection['maturity']` ada, gunakan itu
   - Jika tidak ada, hitung dari `maturity_level`:
     - `matang` → 85
     - `hampir_matang` → 50
     - `mentah` → 20
     - `lewat_matang` → 95
   - Jangan gunakan `confidence_score` sebagai fallback untuk maturity

2. **Pastikan data `maturity` selalu disimpan di `ai_metadata['best_detection']`:**
   - Saat menyimpan, pastikan `best_detection` selalu memiliki field `maturity`

