# 🤖 Initialize Robot Status in Firebase

## 📋 Overview

Command ini digunakan untuk menginisialisasi data robot status dan baterai langsung di Firebase tanpa menunggu ESP32 mengirim data.

## 🚀 Cara Menggunakan

### Basic Usage
```bash
php artisan robot:init-status
```

Default values:
- Battery: 85%
- State: idle
- Location: "Tidak diketahui"

### Custom Values
```bash
# Set battery level
php artisan robot:init-status --battery=90

# Set robot state
php artisan robot:init-status --state=active

# Set location
php artisan robot:init-status --location="A1"

# Combine all options
php artisan robot:init-status --battery=75 --state=active --location="B2"
```

## 📊 Valid States

- `active` - Robot sedang aktif/berjalan
- `idle` - Robot dalam keadaan siaga
- `charging` - Robot sedang mengisi baterai
- `offline` - Robot offline/tidak terhubung

## 🔋 Battery Level

- Range: 0-100
- Default: 85

## 📍 Location

- Format: String (e.g., "A1", "B2", "Blok A1")
- Default: "Tidak diketahui"

## ✅ Output

Setelah command berhasil dijalankan, data akan tersimpan di Firebase:
- Path: `robot/status`
- Data akan langsung terlihat di Dashboard dan Kontrol Robot

## 🔄 Update Data

Untuk update data yang sudah ada:
```bash
# Update battery
php artisan robot:init-status --battery=60

# Update state
php artisan robot:init-status --state=charging

# Update location
php artisan robot:init-status --location="C3"
```

## 📝 Contoh

```bash
# Initialize dengan robot aktif di Blok A1 dengan baterai 90%
php artisan robot:init-status --battery=90 --state=active --location="A1"

# Initialize dengan robot charging di charging station
php artisan robot:init-status --battery=20 --state=charging --location="Charging Station"

# Initialize dengan robot offline
php artisan robot:init-status --battery=0 --state=offline --location="Tidak diketahui"
```

## 🎯 Hasil

Setelah command dijalankan:
1. Data tersimpan di Firebase Realtime Database
2. Dashboard otomatis menampilkan status dan baterai
3. Kontrol Robot otomatis menampilkan status dan baterai
4. Update real-time tanpa perlu refresh

