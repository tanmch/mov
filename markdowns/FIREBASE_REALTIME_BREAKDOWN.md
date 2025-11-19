# 🔥 Firebase Realtime Database - Breakdown Fitur

## 📊 Analisis Fitur yang Perlu Realtime Update

### ✅ 1. **ROBOT STATUS** (Sudah disebutkan user)
**Firebase Path:** `/robot/status`

**Data yang perlu realtime:**
- ✅ `current_state` - Status robot (idle, active, charging, offline)
- ✅ `battery_level` - Level baterai (0-100%)
- ✅ `current_location` - Lokasi robot saat ini
  - `kebun_id`
  - `blok_id`
  - `latitude`
  - `longitude`
- ✅ `last_update` - Timestamp terakhir update

**Update Frequency:** Real-time (setiap kali robot mengirim update)
**UI yang perlu update:** Dashboard, Robot Control Page

---

### ✅ 2. **ROBOT ACTIVE MISSION** (Sudah disebutkan user)
**Firebase Path:** `/robot/active_mission`

**Data yang perlu realtime:**
- ✅ `schedule_id` - ID jadwal yang sedang berjalan
- ✅ `blok_id` - Blok yang sedang dikunjungi
- ✅ `mission_type` - Jenis misi (deteksi, penyiraman, pemupukan)
- ✅ `started_at` - Waktu mulai misi
- ✅ `progress_percentage` - Progress misi (0-100%)
- ✅ `current_task` - Task saat ini (capturing_images, watering, etc.)
- ✅ `images_captured` - Jumlah gambar yang sudah diambil
- ✅ `total_images` - Total gambar yang perlu diambil

**Update Frequency:** Real-time (setiap progress update dari robot)
**UI yang perlu update:** Dashboard, Robot Control Page

---

### ✅ 3. **ROBOT SCHEDULES** (Sudah disebutkan user)
**Firebase Path:** `/robot/schedules/{schedule_id}`

**Data yang perlu realtime:**
- ✅ `schedule_id` - ID jadwal dari MySQL
- ✅ `blok_id` - Blok yang akan dikunjungi
- ✅ `mission_type` - Jenis misi (deteksi, penyiraman, pemupukan, kombinasi)
- ✅ `priority` - Prioritas (low, medium, high, urgent)
- ✅ `scheduled_at` - Waktu jadwal (ISO format)
- ✅ `status` - Status jadwal (pending, in_progress, completed, failed, cancelled)
- ✅ `mission_details` - Detail misi (JSON)
  - Untuk deteksi: `capture_images`, `detection_points`
  - Untuk penyiraman: `water_amount`, `duration_minutes`
  - Untuk pemupukan: `fertilizer_amount`, `fertilizer_type`
- ✅ `started_at` - Waktu mulai (jika sudah mulai)
- ✅ `completed_at` - Waktu selesai (jika sudah selesai)
- ✅ `progress_percentage` - Progress real-time
- ✅ `created_at` - Waktu dibuat

**Update Frequency:** 
- **MySQL → Firebase**: Real-time ketika K-Petani create/update schedule
- **Firebase → MySQL**: Real-time ketika robot update status/progress
- **Robot reads**: ESP32 membaca dari Firebase untuk eksekusi

**Flow:**
1. K-Petani create schedule di MySQL via Laravel
2. Laravel push schedule ke Firebase Realtime Database
3. ESP32 robot membaca dari Firebase `/robot/schedules`
4. Robot eksekusi misi dan update status di Firebase
5. Laravel sync status update dari Firebase ke MySQL

**UI yang perlu update:** Robot Control Page, Dashboard (upcoming schedules)

---

### ✅ 4. **SENSOR DATA** (Sudah disebutkan user)
**Firebase Path:** `/kebuns/{kebun_id}/bloks/{blok_code}/sensors`

**Data yang perlu realtime:**
- ✅ `suhu_udara` (temperature)
  - `value` - Nilai suhu (°C)
  - `unit` - "°C"
  - `status` - normal/warning/critical
  - `timestamp` - Waktu pembacaan
- ✅ `kelembapan_udara` (humidity)
  - `value` - Nilai kelembapan (%)
  - `unit` - "%"
  - `status` - normal/warning/critical
  - `timestamp` - Waktu pembacaan
- ✅ `kelembapan_tanah` (soil moisture)
  - `value` - Nilai kelembapan tanah (%)
  - `unit` - "%"
  - `status` - normal/warning/critical
  - `timestamp` - Waktu pembacaan

**Update Frequency:** Real-time (setiap 5 menit dari ESP32)
**UI yang perlu update:** Dashboard, Monitoring Sensor Page, Kebun Monitoring Page

---

### ✅ 5. **SENSOR ALERTS/WARNINGS** (Perlu ditambahkan)
**Firebase Path:** `/kebuns/{kebun_id}/bloks/{blok_code}/sensor_alerts`

**Data yang perlu realtime:**
- ✅ `alert_type` - Jenis alert (temperature_high, humidity_low, soil_dry, etc.)
- ✅ `severity` - Tingkat keparahan (warning, critical)
- ✅ `message` - Pesan alert
- ✅ `threshold_value` - Nilai threshold yang dilanggar
- ✅ `current_value` - Nilai saat ini
- ✅ `timestamp` - Waktu alert
- ✅ `is_resolved` - Status apakah sudah teratasi

**Update Frequency:** Real-time (ketika threshold dilanggar)
**UI yang perlu update:** Dashboard (notifications), Monitoring Sensor Page

---

### ✅ 6. **DETECTION RESULTS** (Perlu ditambahkan)
**Firebase Path:** `/detections/{blok_code}/latest`

**Data yang perlu realtime:**
- ✅ `image_url` - URL gambar hasil deteksi
- ✅ `maturity_level` - Level kematangan (mentah, hampir_matang, matang, lewat_matang)
- ✅ `confidence_score` - Skor confidence (0-100%)
- ✅ `mango_count` - Jumlah mangga terdeteksi
- ✅ `detected_at` - Waktu deteksi
- ✅ `detection_details` - Detail deteksi per mangga

**Update Frequency:** Real-time (ketika robot selesai deteksi)
**UI yang perlu update:** Dashboard (maturity data), Deteksi Kematangan Page

---

### ✅ 7. **NOTIFICATIONS** (Perlu ditambahkan)
**Firebase Path:** `/notifications/{user_id}/{notification_id}`

**Data yang perlu realtime:**
- ✅ `title` - Judul notifikasi
- ✅ `message` - Pesan notifikasi
- ✅ `type` - Jenis (robot, sensor, detection, system)
- ✅ `is_read` - Status sudah dibaca atau belum
- ✅ `created_at` - Waktu dibuat
- ✅ `action_url` - URL untuk action (optional)

**Update Frequency:** Real-time (ketika event terjadi)
**UI yang perlu update:** Dashboard (notifications card), Notification Bell Icon

---

### ✅ 8. **BLOK STATUS** (Perlu ditambahkan)
**Firebase Path:** `/kebuns/{kebun_id}/bloks/{blok_code}/info/status`

**Data yang perlu realtime:**
- ✅ `status` - Status blok (sehat, perhatian, siap-panen, maintenance)
- ✅ `last_update` - Waktu update terakhir
- ✅ `health_score` - Skor kesehatan (0-100)

**Update Frequency:** Real-time (ketika status berubah berdasarkan sensor/deteksi)
**UI yang perlu update:** Kebun Monitoring Page

---

## 📋 Summary: Fitur Realtime vs Non-Realtime

### 🔥 **FITUR REALTIME (Firebase Realtime Database)**

1. **Robot Status** ✅
   - Current state, battery, location
   
2. **Robot Active Mission** ✅
   - Progress, current task, images captured
   
3. **Robot Schedules Status** ✅
   - Status update, progress
   
4. **Sensor Readings** ✅
   - Suhu udara, kelembapan udara, kelembapan tanah
   
5. **Sensor Alerts** ✅ (Perlu ditambahkan)
   - Threshold alerts, warnings
   
6. **Detection Results (Latest)** ✅ (Perlu ditambahkan)
   - Latest detection dari robot
   
7. **Notifications** ✅ (Perlu ditambahkan)
   - Real-time notifications
   
8. **Blok Status** ✅ (Perlu ditambahkan)
   - Status kesehatan blok

---

### 💾 **FITUR NON-REALTIME (MySQL Database)**

1. **Kebun Management** 🔐 **ROLE-BASED ACCESS**
   - **K-Petani**: ✅ Full CRUD (create, read, update, delete)
   - **Petani**: ✅ Read-only (hanya melihat)
   - Data master kebun
   - Menu Edit Kebun di halaman Kebun Monitoring (hanya untuk K-Petani)
   
2. **Blok Management** 🔐 **ROLE-BASED ACCESS**
   - **K-Petani**: ✅ Full CRUD (create, read, update, delete)
   - **Petani**: ✅ Read-only (hanya melihat)
   - Data master blok
   - Menu Edit Blok di halaman Kebun Monitoring (hanya untuk K-Petani)
   
3. **Sensor History**
   - Historical data sensor (untuk chart/analytics)
   - Disimpan di MySQL setelah sync dari Firebase
   
4. **Detection History**
   - Historical detection results
   - Disimpan di MySQL setelah sync dari Firebase
   
5. **Robot Schedule Management** ⚠️ **HYBRID (MySQL + Firebase)**
   - **CRUD jadwal robot di MySQL** (data master)
   - **Push ke Firebase** setelah create/update (untuk robot eksekusi)
   - **Status update real-time di Firebase** (dari robot)
   - **Sync status dari Firebase ke MySQL** (untuk history)
   
6. **User Management** 🔐 **K-PETANI ONLY**
   - **K-Petani**: ✅ Full CRUD user/petani (create, read, update, delete, activate/deactivate)
   - **Petani**: ❌ Tidak bisa akses
   - Lokasi: Profile/Settings page
   - Fitur:
     - List semua user/petani
     - Create user baru
     - Edit user (role, status, dll)
     - Activate/Deactivate user
     - Delete user (soft delete)
   
7. **Reports & Analytics**
   - Laporan panen
   - Prediksi panen (berdasarkan historical data)
   - Export data
   
8. **Articles**
   - Artikel edukasi (konten statis/dinamis)

---

## 🔄 Sync Strategy

### Firebase → MySQL (Background Sync)
1. **Sensor Readings**: Sync setiap 5 menit ke MySQL untuk historical data
2. **Detection Results**: Sync langsung setelah robot upload hasil
3. **Mission Results**: Sync setelah mission selesai
4. **Notifications**: Sync ke MySQL untuk history

### MySQL → Firebase (On Action)
1. **Robot Schedules**: ⚠️ **CRITICAL** - Push ke Firebase ketika K-Petani create/update schedule
   - Robot membaca dari Firebase untuk eksekusi
   - Harus selalu sync antara MySQL dan Firebase
2. **Blok Info**: Update Firebase ketika blok dibuat/diupdate
   - Robot membaca info blok dari Firebase

---

## 🎯 Prioritas Implementasi Realtime

### **Phase 1: Core Realtime Features** (Sudah ada)
1. ✅ Robot Status
2. ✅ Robot Active Mission
3. ✅ Sensor Readings
4. ✅ Robot Schedules (MySQL → Firebase push sudah ada di FirebaseSyncService)

### **Phase 2: Enhanced Realtime Features** (Perlu ditambahkan)
5. ⏳ Sensor Alerts
6. ⏳ Detection Results (Latest)
7. ⏳ Notifications
8. ⏳ Blok Status

### **Phase 3: Schedule Sync Optimization** (Perlu diperkuat)
9. ⏳ Auto-sync schedule status dari Firebase ke MySQL
10. ⏳ Handle schedule conflicts (jika schedule dihapus di MySQL, hapus juga di Firebase)
11. ⏳ Schedule validation sebelum push ke Firebase

### **Phase 4: Optimization**
12. ⏳ Real-time UI updates dengan WebSocket/Polling
13. ⏳ Caching strategy untuk mengurangi Firebase reads

---

## 📝 Notes

- **Firebase Realtime Database** digunakan untuk data yang berubah cepat dan perlu real-time monitoring
- **MySQL Database** digunakan untuk data master, historical data, dan analytics
- **Sync Job** diperlukan untuk memindahkan data dari Firebase ke MySQL untuk historical purposes
- **Real-time UI** bisa menggunakan polling atau WebSocket connection ke Firebase

