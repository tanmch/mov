# 🤖 Auto-Start Robot Schedules Setup

## 📋 Overview

Sistem akan secara otomatis mengubah status schedule dari `pending` menjadi `in_progress` ketika waktu `scheduled_at` tercapai.

## ⚙️ Cara Kerja

1. **Scheduled Task** berjalan setiap menit
2. **Command** mencari schedules dengan:
   - Status: `pending`
   - `scheduled_at` <= waktu sekarang
   - Belum memiliki `started_at`
3. **Update Status**:
   - Status di MySQL diupdate menjadi `in_progress`
   - `started_at` diisi dengan waktu sekarang
   - `progress_percentage` direset ke 0
4. **Push ke Firebase**:
   - Status terbaru di-push ke Firebase
   - Frontend akan otomatis update via Firebase listener

## 🚀 Setup

### 1. Pastikan Scheduler Berjalan

Laravel scheduler perlu berjalan di background. 

**Untuk Production (Linux/Unix):**
Tambahkan ke **crontab**:
```bash
* * * * * cd /path-to-project && php artisan schedule:run >> /dev/null 2>&1
```

**Untuk Development (Windows/Local):**
Jalankan scheduler di terminal terpisah:
```bash
php artisan schedule:work
```
Command ini akan berjalan terus dan menjalankan scheduled tasks setiap menit.

**Untuk Test Manual (Tanpa Scheduler):**
```bash
php artisan robot:auto-start-schedules
```
Command ini bisa dijalankan manual untuk test tanpa menunggu scheduler.

### 2. Test Command

Test command secara manual:
```bash
php artisan robot:auto-start-schedules
```

Output yang diharapkan:
```
Checking for schedules to auto-start...
Found 1 schedule(s) to start.
✓ Started schedule #1 - A1 (deteksi)
Completed: 1 started, 0 failed.
```

### 3. Monitor Logs

Logs tersimpan di:
- `storage/logs/laravel.log` - General logs
- `storage/logs/schedule.log` - Schedule command output

## 🔍 Flow Lengkap

```
1. User membuat schedule dengan scheduled_at = "2025-11-15 10:00:00"
   ↓
2. Status: pending (di MySQL dan Firebase)
   ↓
3. Waktu mencapai 10:00:00
   ↓
4. Scheduled task berjalan (setiap menit)
   ↓
5. Command menemukan schedule yang waktunya sudah tercapai
   ↓
6. Update MySQL:
   - status = 'in_progress'
   - started_at = now()
   - progress_percentage = 0
   ↓
7. Push ke Firebase:
   - /robot/schedules/schedule_{id}/status = 'in_progress'
   ↓
8. Frontend Firebase listener detect perubahan
   ↓
9. UI otomatis update:
   - Indikator navigasi muncul
   - Card "Misi Sedang Berjalan" muncul
   - Tombol "Jeda Misi" aktif
```

## 📝 Catatan Penting

1. **Scheduler harus berjalan**: Pastikan `php artisan schedule:run` berjalan setiap menit
2. **Timezone**: Pastikan timezone server sesuai dengan timezone aplikasi
3. **Delay maksimal**: Karena scheduler berjalan setiap menit, delay maksimal adalah 1 menit
4. **Logging**: Semua aktivitas di-log untuk debugging

## 🧪 Test Manual

Untuk test tanpa menunggu scheduler:

1. Buat schedule dengan waktu beberapa detik ke depan
2. Jalankan command manual:
   ```bash
   php artisan robot:auto-start-schedules
   ```
3. Cek di Firebase Console apakah status sudah berubah
4. Cek di website apakah UI sudah update

## 🔧 Troubleshooting

### Scheduler tidak berjalan
- Pastikan crontab sudah dikonfigurasi
- Cek `storage/logs/schedule.log`
- Test manual dengan `php artisan schedule:work`

### Schedule tidak auto-start
- Cek log: `storage/logs/laravel.log`
- Pastikan `scheduled_at` sudah tercapai
- Pastikan status masih `pending`
- Test command manual untuk melihat error

### Firebase tidak terupdate
- Cek credentials Firebase
- Cek log untuk error Firebase
- Pastikan Firebase rules mengizinkan write

