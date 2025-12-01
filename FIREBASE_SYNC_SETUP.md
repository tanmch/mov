# 🔄 Firebase to MySQL Sync Setup

## 📋 Overview

Sistem ini memiliki mekanisme sinkronisasi otomatis dari Firebase Realtime Database ke MySQL untuk menyimpan data historis. Data real-time tetap di Firebase untuk monitoring, sedangkan data historis disimpan di MySQL untuk laporan dan analisis.

## ⚙️ Cara Kerja

### 1. **Sensor Readings Sync**
- **Sumber**: Firebase `/kebuns/kebun_{id}/bloks/{code}/sensors` (data current)
- **Sumber Alternatif**: Firebase `/sensor_history` (jika tersedia)
- **Tujuan**: Tabel `sensor_readings` di MySQL (sebagai data historis)
- **Frekuensi**: Setiap 5 menit
- **Command**: `firebase:sync-sensors`
- **Cara Kerja**: Setiap sync mengambil data current dari `/sensors` dan menyimpannya sebagai data historis di MySQL. Jika `/sensor_history` tersedia, data dari sana juga akan disinkronkan.

### 2. **Robot Schedules Sync**
- **Sumber**: Firebase `/robot/schedules` dan `/robot/mission_results`
- **Tujuan**: Tabel `robot_schedules` di MySQL
- **Frekuensi**: Setiap 2 menit
- **Command**: `firebase:sync-robot-schedules`

## 🚀 Setup

### 1. Pastikan Laravel Scheduler Berjalan

Laravel scheduler perlu berjalan di background untuk menjalankan scheduled commands.

**Untuk Production (Linux/Unix):**
Tambahkan ke **crontab**:
```bash
* * * * * cd /path-to-project && php artisan schedule:run >> /dev/null 2>&1
```

**Untuk Development (Windows/Local):**
Jalankan scheduler di terminal terpisah:
```bash
cd MOV_PROJECT
php artisan schedule:work
```

Command ini akan berjalan terus dan menjalankan scheduled tasks sesuai jadwal.

### 2. Test Commands Secara Manual

#### Sync Sensor Data
```bash
cd MOV_PROJECT
php artisan firebase:sync-sensors
```

Sync semua blok:
```bash
php artisan firebase:sync-sensors
```

Sync blok tertentu:
```bash
php artisan firebase:sync-sensors --blok=A1
```

#### Sync Robot Schedules
```bash
cd MOV_PROJECT
php artisan firebase:sync-robot-schedules
```

### 3. Monitor Logs

Logs tersimpan di:
- `storage/logs/laravel.log` - General logs
- `storage/logs/firebase-sync.log` - Sync command output

## 📊 Data yang Disinkronkan

### Sensor Readings
- **Sumber Utama**: Data current dari `/sensors` (disimpan sebagai historis di MySQL)
- **Sumber Alternatif**: Data dari `/sensor_history` (jika tersedia di Firebase)
- **Fields**: `suhu_udara`, `kelembapan_udara`, `kelembapan_tanah`
- **Auto-deduplication**: 
  - Mengecek duplikasi berdasarkan `blok_id`, `sensor_type`, `reading_time`, dan `value`
  - Menghindari duplikasi jika ada data dengan timestamp yang sama dalam 1 menit terakhir
  - Setiap sync akan menyimpan data baru jika timestamp atau value berbeda

### Robot Schedules
- **Status**: `pending`, `in_progress`, `completed`, `failed`
- **Timestamps**: `started_at`, `completed_at`
- **Progress**: `progress_percentage`
- **Results**: `result_data` (JSON)
- **Mission Details**: `mission_details` (JSON)

## 🔍 Verifikasi Sync

### Cek Data Sensor di MySQL
```sql
SELECT COUNT(*) as total FROM sensor_readings;
SELECT * FROM sensor_readings ORDER BY reading_time DESC LIMIT 10;
```

### Cek Robot Schedules di MySQL
```sql
SELECT COUNT(*) as total FROM robot_schedules WHERE mission_type IN ('penyiraman', 'pemupukan');
SELECT * FROM robot_schedules WHERE mission_type IN ('penyiraman', 'pemupukan') ORDER BY completed_at DESC LIMIT 10;
```

### Cek via Laravel Tinker
```bash
php artisan tinker
```

```php
// Cek total sensor readings
\App\Models\SensorReading::count()

// Cek sensor readings terbaru
\App\Models\SensorReading::orderBy('reading_time', 'desc')->limit(5)->get()

// Cek robot schedules terbaru
\App\Models\RobotSchedule::whereIn('mission_type', ['penyiraman', 'pemupukan'])
    ->whereNotNull('completed_at')
    ->orderBy('completed_at', 'desc')
    ->limit(5)
    ->get()
```

## ⚠️ Troubleshooting

### Sync tidak berjalan
1. Pastikan scheduler berjalan: `php artisan schedule:work`
2. Cek log: `storage/logs/firebase-sync.log`
3. Test manual: `php artisan firebase:sync-sensors`

### Data tidak tersinkronkan
1. Pastikan Firebase credentials valid
2. Pastikan blok memiliki `code` yang sesuai dengan Firebase
3. Cek koneksi Firebase: `php artisan test:firebase-connection`

### Duplikat data
- Sistem sudah memiliki auto-deduplication berdasarkan `blok_id`, `sensor_type`, dan `reading_time`
- Jika masih ada duplikat, cek apakah timestamp berbeda

## 📝 Notes

- Sync hanya menambahkan data baru, tidak mengupdate data lama
- Data yang sudah ada di MySQL tidak akan di-overwrite
- Sync berjalan di background, tidak memblokir request
- Jika sync gagal, akan dicatat di log dan sync berikutnya akan mencoba lagi

