# Firebase Realtime Database Security Rules

Firebase Realtime Database **TIDAK menggunakan "tables"** seperti SQL database. Ini adalah NoSQL database yang menggunakan struktur JSON. Data bisa langsung ditulis ke path tertentu tanpa perlu membuat "table" terlebih dahulu.

## ⚠️ Masalah yang Mungkin Terjadi

Jika Anda mendapatkan error "Failed to push to Firebase", kemungkinan besar masalahnya adalah **Firebase Security Rules** yang tidak mengizinkan write operation.

## 🔧 Cara Memperbaiki

### 1. Buka Firebase Console
- Buka https://console.firebase.google.com/
- Pilih project: **mov-project-6931c**
- Klik **Realtime Database** di sidebar kiri
- Klik tab **Rules**

### 2. Update Security Rules

Ganti rules dengan yang berikut ini untuk mengizinkan write dari server (menggunakan service account):

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "robot": {
      "status": {
        ".read": true,
        ".write": true
      },
      "schedules": {
        ".read": true,
        ".write": true
      },
      "active_mission": {
        ".read": true,
        ".write": true
      },
      "mission_results": {
        ".read": true,
        ".write": true
      },
      "commands": {
        ".read": true,
        ".write": true
      }
    },
    "kebuns": {
      ".read": true,
      ".write": true,
      "$kebun_id": {
        "bloks": {
          "$blok_id": {
            "sensors": {
              ".read": true,
              ".write": true
            },
            "info": {
              ".read": true,
              ".write": true
            }
          }
        }
      }
    },
    "detections": {
      ".read": true,
      ".write": true
    },
    "notifications": {
      ".read": true,
      ".write": true
    }
  }
}
```

### 3. Klik "Publish" untuk menyimpan rules

## 🔐 Penjelasan Rules

Rules di atas mengizinkan:
- **Read & Write** untuk semua path yang diperlukan oleh aplikasi
- **Service Account** (yang digunakan Laravel) bisa menulis ke semua path
- **Client** (React frontend) bisa membaca semua data

## ⚠️ Catatan Keamanan

Rules di atas **mengizinkan semua read/write** untuk development. Untuk production, sebaiknya:
1. Gunakan Firebase Authentication
2. Implementasikan rules yang lebih ketat berdasarkan user role
3. Validasi data di server-side (Laravel)

## 🧪 Test Koneksi Firebase

Setelah update rules, coba buat schedule lagi. Jika masih error, periksa:
1. Log Laravel untuk error detail
2. Pastikan service account credentials valid
3. Pastikan database URL benar di `config/firebase.php`

