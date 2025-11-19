# 🚀 MOV Platform - Setup & Installation Guide

## 📋 Ringkasan Project

**MOV (Mango as an Object Vision)** adalah platform smart farming untuk kebun mangga dengan integrasi:
- 🤖 Robot otomatis dengan ESP32
- 📡 IoT sensors (suhu, kelembapan)
- 🎯 AI Detection (YOLO) untuk deteksi kematangan
- 📊 Dashboard monitoring real-time
- 🔥 Firebase Realtime Database untuk komunikasi robot

---

## 🛠️ Requirements

### Software yang Dibutuhkan:
1. **Laragon** (sudah termasuk Apache, MySQL, PHP)
   - Download: https://laragon.org/
2. **Composer** (PHP dependency manager)
3. **Node.js & npm** (untuk React frontend)
4. **Firebase Project** (sudah ada: mov-project-6931c)

### Yang Sudah Tersedia:
✅ Firebase credentials (`firebase-credentials.json`)
✅ Laravel project setup di `MOV_PROJECT/`
✅ React frontend di `MOV/`
✅ Database migrations
✅ API endpoints

---

## 📦 Installation Steps

### 1️⃣ Setup Backend (Laravel)

```bash
# Masuk ke folder project Laravel
cd "D:\IPB\Semester 5\RPL\Project\MOV_PROJECT"

# Install dependencies (jika belum)
composer install

# Copy .env file (sudah di-setup otomatis)
# Cek .env pastikan konfigurasi sudah benar:
# - DB_DATABASE=mov_platform
# - FIREBASE_CREDENTIALS=config/firebase-credentials.json
```

### 2️⃣ Setup Database MySQL

**Via Laragon MySQL:**

1. Buka Laragon
2. Klik "Database" atau buka HeidiSQL/phpMyAdmin
3. Create database:

```sql
CREATE DATABASE mov_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Atau via Command Line:**

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS mov_platform"
```

### 3️⃣ Jalankan Migrations

```bash
cd "D:\IPB\Semester 5\RPL\Project\MOV_PROJECT"
php artisan migrate
```

Output yang diharapkan:
```
✓ Migration table created successfully.
✓ 2025_11_09_084757_create_users_table ................ DONE
✓ 2025_11_09_084831_create_kebuns_table ............... DONE
✓ 2025_11_09_084832_create_bloks_table ................ DONE
✓ 2025_11_09_084832_create_robot_schedules_table ...... DONE
✓ 2025_11_09_084832_create_sensor_readings_table ...... DONE
✓ 2025_11_09_084832_create_detection_results_table .... DONE
✓ 2025_11_09_085006_create_notifications_table ........ DONE
✓ 2025_11_09_085006_create_activity_logs_table ........ DONE
✓ 2025_11_09_085006_create_system_settings_table ...... DONE
```

### 4️⃣ Start Laravel Server

```bash
php artisan serve
```

Backend akan jalan di: **http://localhost:8000**

Test API health check:
```bash
curl http://localhost:8000/api/v1/health
```

---

## 🎨 Setup Frontend (React)

### 1️⃣ Install Dependencies

```bash
cd "D:\IPB\Semester 5\RPL\Project\MOV"
npm install
```

### 2️⃣ Konfigurasi Firebase di Frontend

Buat file `MOV/src/firebase-config.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "mov-project-6931c.firebaseapp.com",
  databaseURL: "https://mov-project-6931c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mov-project-6931c",
  storageBucket: "mov-project-6931c.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
```

### 3️⃣ Start React Dev Server

```bash
npm run dev
```

Frontend akan jalan di: **http://localhost:5173**

---

## 🔥 Firebase Realtime Database Structure

Lihat file `FIREBASE_STRUCTURE.md` untuk detail lengkap struktur database.

### Setup Firebase Rules (di Firebase Console)

1. Buka: https://console.firebase.google.com/
2. Pilih project: `mov-project-6931c`
3. Go to: **Realtime Database → Rules**
4. Paste rules dari `FIREBASE_STRUCTURE.md`

---

## 🧪 Testing & Verification

### 1. Test Backend API

```bash
# Health check
curl http://localhost:8000/api/v1/health

# Expected response:
# {"success":true,"message":"MOV API is running","version":"1.0.0"}
```

### 2. Test Database Connection

```bash
cd "D:\IPB\Semester 5\RPL\Project\MOV_PROJECT"
php artisan tinker

# Di tinker console:
DB::connection()->getPdo();
# Jika tidak error, database connection OK!
```

### 3. Test Firebase Connection

```bash
php artisan tinker

# Di tinker console:
$firebase = app(\App\Services\FirebaseService::class);
$firebase->database()->getReference('test')->set(['status' => 'ok']);
# Check Firebase console, should see new "test" node
```

---

## 🚀 Next Steps - Menggunakan Sistem

### Untuk K-Petani (Admin):

1. **Register via Frontend**
   - Buka http://localhost:5173
   - Register dengan role "k-petani"

2. **Create Kebun & Blok**
   - Login ke dashboard
   - Tambah kebun baru
   - Tambah blok-blok di dalam kebun

3. **Schedule Robot Mission**
   - Pilih blok yang ingin di-monitor
   - Create schedule (deteksi/penyiraman/pemupukan)
   - Robot akan membaca dari Firebase

4. **Monitor Sensor**
   - Data sensor otomatis muncul di dashboard
   - Alert otomatis jika ada anomali

### Untuk ESP32/Robot:

Robot akan:
1. **Read schedules** dari: `/robot/schedules`
2. **Write sensor data** ke: `/kebuns/{kebun_id}/bloks/{blok_id}/sensors`
3. **Update status** ke: `/robot/status`
4. **Upload detection results** ke: `/detections/{blok_id}`

---

## 📊 Data Flow

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐      ┌──────────────┐
│   ESP32     │ ←──→ │   Firebase   │ ←──→ │   Laravel   │ ←──→ │    React     │
│   Robot     │      │   Realtime   │      │     API     │      │   Frontend   │
└─────────────┘      │   Database   │      └─────────────┘      └──────────────┘
                     └──────────────┘              │
                                                   ↓
                                          ┌─────────────┐
                                          │    MySQL    │
                                          │  (History)  │
                                          └─────────────┘
```

**Penjelasan:**
1. **Robot** mengirim data sensor & deteksi ke **Firebase**
2. **Laravel** membaca data dari **Firebase** dan simpan history ke **MySQL**
3. **Laravel** membuat schedule dan push ke **Firebase**
4. **Robot** membaca schedule dari **Firebase**
5. **React** menampilkan data dari **Laravel API**

---

## 🔐 User Roles & Permissions

### Guest
- ✅ Lihat artikel tentang mangga
- ❌ Tidak bisa akses fitur lain

### Petani (User Biasa)
- ✅ Lihat dashboard
- ✅ Lihat data sensor
- ✅ Lihat hasil deteksi
- ✅ Menerima notifikasi
- ❌ **TIDAK BISA** edit/delete apapun

### K-Petani (Admin)
- ✅ **SEMUA akses Petani**
- ✅ Create/edit/delete kebun & blok
- ✅ Schedule robot missions
- ✅ User management
- ✅ System settings
- ✅ Generate reports

---

## 📝 API Endpoints Summary

### Public:
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login (verify Firebase token)
- `GET /api/v1/health` - Health check

### Authenticated:
- `GET /api/v1/auth/profile` - Get user profile
- `GET /api/v1/sensors/latest` - Latest sensor readings
- `GET /api/v1/robot/status` - Robot status
- `GET /api/v1/robot/schedules` - List schedules

### K-Petani Only:
- `POST /api/v1/robot/schedules` - Create schedule
- `POST /api/v1/users` - Create user
- `PUT /api/v1/users/{id}` - Update user

Lihat `README.md` untuk dokumentasi lengkap semua endpoints.

---

## 🐛 Troubleshooting

### Problem: Migration Error
**Solution:**
```bash
php artisan migrate:fresh
```

### Problem: Firebase Connection Error
**Solution:**
- Pastikan `firebase-credentials.json` ada di `config/`
- Check file permissions
- Verify Firebase project ID di `.env`

### Problem: CORS Error di Frontend
**Solution:**
- Sudah di-handle di `config/cors.php`
- Pastikan Laravel server jalan di port 8000
- Pastikan React di port 5173

### Problem: Composer Install Error
**Solution:**
```bash
composer install --ignore-platform-reqs
```

---

## 📞 Support & Documentation

- **API Docs**: `README.md`
- **Firebase Structure**: `FIREBASE_STRUCTURE.md`
- **This Guide**: `SETUP_GUIDE.md`

---

## ✅ Checklist - Apakah Sudah Siap?

Pastikan semua ini sudah OK sebelum mulai development:

- [ ] Laragon installed & running
- [ ] MySQL database `mov_platform` created
- [ ] Laravel migrations berhasil
- [ ] Laravel server running (`php artisan serve`)
- [ ] React dependencies installed (`npm install`)
- [ ] React dev server running (`npm run dev`)
- [ ] Firebase credentials configured
- [ ] API health check returns success
- [ ] Test registration/login works

Jika semua ✅, **READY TO GO!** 🚀

---

**Last Updated:** November 9, 2025
**Project:** MOV Platform - Smart Mango Farming
**Team:** IPB Semester 5 - RPL

