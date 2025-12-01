# 🔬 Sensor Simulation Guide

## 📋 Overview

Fitur simulasi data sensor memungkinkan data sensor di Firebase berubah secara otomatis setiap 5 detik. Fitur ini berguna untuk testing dan demonstrasi tanpa perlu sensor fisik.

## 🚀 Cara Menggunakan

### 1. Aktifkan Fitur di Profile

1. Buka halaman **Profile** (`/profile`)
2. Scroll ke bagian **"Simulasi Data Sensor"**
3. Toggle switch untuk mengaktifkan/nonaktifkan fitur
4. Status akan tersimpan di database

### 2. Jalankan Command Simulasi

Setelah fitur diaktifkan di profile, jalankan command berikut di terminal:

```bash
php artisan sensor:simulate
```

Command ini akan:
- ✅ Check apakah ada user yang mengaktifkan simulasi
- ✅ Update data sensor di Firebase setiap 5 detik
- ✅ Berjalan terus sampai dihentikan (Ctrl+C)

### 3. Opsi Command

```bash
# Default: Update setiap 5 detik
php artisan sensor:simulate

# Custom interval (misalnya 10 detik)
php artisan sensor:simulate --interval=10

# Run sekali saja (tidak loop)
php artisan sensor:simulate --once
```

## 📊 Data yang Diupdate

Command akan mengupdate data sensor **satu sensor per blok setiap 5 detik** secara bergantian:

### Rotasi Sensor & Blok (setiap 5 detik):
Setiap 5 detik, hanya **1 sensor dari 1 blok** yang diupdate. **Blok dan sensor dipilih secara RANDOM** setiap interval:

**Contoh urutan update (random):**
1. **Detik 0**: Blok B2 - **Kelembapan Tanah** (random)
2. **Detik 5**: Blok A1 - **Suhu Udara** (random)
3. **Detik 10**: Blok C1 - **Kelembapan Udara** (random)
4. **Detik 15**: Blok A2 - **Kelembapan Tanah** (random)
5. **Detik 20**: Blok B1 - **Suhu Udara** (random)
6. **Detik 25**: Blok A1 - **Kelembapan Tanah** (random)
7. ... dan seterusnya (selalu random)

**Pola random:**
- Setiap 5 detik, sistem akan memilih **1 blok secara random** dari semua blok yang ada
- Sistem juga akan memilih **1 jenis sensor secara random** (Suhu Udara, Kelembapan Udara, atau Kelembapan Tanah)
- Tidak ada pola berurutan, semua random untuk simulasi yang lebih realistis

### Range Nilai:
- **Suhu Udara**: 25.0 - 35.0°C (random)
- **Kelembapan Udara**: 50.0 - 80.0% (random)
- **Kelembapan Tanah**: 40.0 - 80.0% (random)

### Status Sensor:
Status sensor akan ditentukan berdasarkan nilai:
- **Normal**: Nilai dalam range normal
- **Warning**: Nilai mendekati batas
- **Critical**: Nilai di luar batas aman

**Catatan**: Hanya 1 sensor dari 1 blok yang diupdate setiap 5 detik. Sensor lainnya di blok yang sama tetap mempertahankan nilai sebelumnya.

## 🔧 Technical Details

### Database
- Field baru: `enable_sensor_simulation` (boolean) di tabel `users`
- Default: `false`

### Command Location
- `app/Console/Commands/SimulateSensorData.php`

### API Endpoint
- `POST /api/profile/toggle-sensor-simulation`
- Requires authentication
- Toggle status simulasi untuk user yang sedang login

### Firebase Path
- Data sensor diupdate di: `kebuns/kebun_{id}/bloks/{code}/sensors`

## ⚠️ Catatan Penting

1. **Command harus berjalan**: Command `sensor:simulate` harus berjalan di terminal untuk simulasi bekerja
2. **Multiple users**: Jika beberapa user mengaktifkan simulasi, command akan tetap berjalan (tidak ada duplikasi)
3. **Windows compatibility**: Command kompatibel dengan Windows (signal handling di-skip)
4. **Performance**: Command menggunakan sleep() untuk interval, tidak memakan banyak resource

## 🛑 Menghentikan Simulasi

Untuk menghentikan simulasi:
1. Tekan **Ctrl+C** di terminal tempat command berjalan
2. Atau nonaktifkan toggle di halaman Profile

## 🧪 Testing

1. Aktifkan toggle di Profile
2. Jalankan command: `php artisan sensor:simulate`
3. Buka halaman **Monitoring Sensor** (`/sensor`)
4. Data sensor akan berubah setiap 5 detik
5. Cek juga di Firebase Console untuk melihat perubahan real-time

## 📝 Logs

Command akan menampilkan output di terminal:
```
🔬 Sensor Simulation Mode
Interval: 5 detik
Tekan Ctrl+C untuk stop

🔄 Updating Kelembapan Tanah di Blok B2 (Blok B2)...
✅ Updated Kelembapan Tanah di Blok B2: 55.7 % (normal) - 14:30:15

🔄 Updating Suhu Udara di Blok A1 (Blok A1)...
✅ Updated Suhu Udara di Blok A1: 28.5 °C (normal) - 14:30:20

🔄 Updating Kelembapan Udara di Blok C1 (Blok C1)...
✅ Updated Kelembapan Udara di Blok C1: 65.3 % (normal) - 14:30:25

🔄 Updating Suhu Udara di Blok A2 (Blok A2)...
✅ Updated Suhu Udara di Blok A2: 29.2 °C (normal) - 14:30:30

🔄 Updating Kelembapan Tanah di Blok B1 (Blok B1)...
✅ Updated Kelembapan Tanah di Blok B1: 58.1 % (normal) - 14:30:35
...
```

**Catatan**: Urutan blok dan sensor selalu random setiap interval, tidak ada pola berurutan.

Jika tidak ada user yang mengaktifkan simulasi:
```
⏸️  Tidak ada user yang mengaktifkan simulasi sensor. Menunggu...
```

