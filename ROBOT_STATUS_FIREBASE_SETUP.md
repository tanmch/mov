# 🤖 Robot Status & Battery - Firebase Setup

## 📋 Overview

Status robot dan persentase baterai ditampilkan secara real-time di Dashboard dan Kontrol Robot dengan membaca data dari Firebase Realtime Database.

## 🔥 Struktur Firebase

### 1. Robot Status
**Path:** `/robot/status`

**Data Structure:**
```json
{
  "current_state": "active" | "idle" | "charging" | "offline",
  "battery_level": 0-100,
  "current_location": {
    "blok_id": "A1",
    "kebun_id": "kebun_1",
    "latitude": -6.123456,
    "longitude": 106.789012
  },
  "name": "MOV Bot Alpha",
  "last_update": 1699512345000
}
```

**Field Mapping:**
- `current_state` → Status robot (active, idle, charging, offline)
- `battery_level` → Persentase baterai (0-100)
- `current_location` → Lokasi robot saat ini
- `name` → Nama robot
- `last_update` → Timestamp terakhir update

### 2. Active Mission
**Path:** `/robot/active_mission`

**Data Structure:**
```json
{
  "schedule_id": 123,
  "blok_id": "A1",
  "mission_type": "deteksi" | "penyiraman" | "pemupukan" | "kombinasi",
  "started_at": "2025-11-15T10:00:00Z",
  "progress_percentage": 0-100,
  "current_task": "capturing_images",
  "images_captured": 5,
  "total_images": 10,
  "status": "in_progress" | "in_progress_10%" | "in_progress_90%" | "completed"
}
```

## 🔄 Real-time Updates

### Dashboard (`Dashboard.jsx`)
- ✅ Listens to `/robot/status` untuk status dan baterai
- ✅ Listens to `/robot/active_mission` untuk progress misi
- ✅ Updates UI secara real-time tanpa refresh
- ✅ Menampilkan:
  - Status robot (AKTIF, IDLE, CHARGING, OFFLINE)
  - Persentase baterai dengan progress bar
  - Lokasi robot saat ini
  - Progress misi (jika ada)

### Kontrol Robot (`RobotControl.jsx`)
- ✅ Listens to `/robot/status` untuk status dan baterai
- ✅ Listens to `/robot/active_mission` untuk progress misi
- ✅ Updates UI secara real-time
- ✅ Menampilkan:
  - Status robot dengan badge
  - Level baterai dengan progress bar animasi
  - Lokasi robot
  - Progress misi aktif

## 📡 Cara Update dari ESP32 Robot

### Update Status Robot
```javascript
// ESP32 mengirim update ke Firebase
firebase.database().ref('robot/status').set({
  current_state: 'active',
  battery_level: 85,
  current_location: {
    blok_id: 'A1',
    kebun_id: 'kebun_1'
  },
  name: 'MOV Bot Alpha',
  last_update: Date.now()
});
```

### Update Active Mission
```javascript
// ESP32 mengirim progress misi
firebase.database().ref('robot/active_mission').set({
  schedule_id: 123,
  blok_id: 'A1',
  mission_type: 'deteksi',
  started_at: '2025-11-15T10:00:00Z',
  progress_percentage: 50,
  current_task: 'capturing_images',
  images_captured: 5,
  total_images: 10,
  status: 'in_progress_50%'
});
```

## 🎨 UI Display

### Status Colors
- **Active**: Green gradient
- **Idle**: Gray gradient
- **Charging**: Yellow gradient
- **Offline**: Red gradient

### Battery Colors
- **> 60%**: Green
- **30-60%**: Yellow
- **< 30%**: Red

### Battery Gradient
- **> 60%**: `from-green-400 to-emerald-500`
- **30-60%**: `from-yellow-400 to-amber-500`
- **< 30%**: `from-red-400 to-red-500`

## ✅ Checklist

- [x] Firebase listener untuk `/robot/status` di Dashboard
- [x] Firebase listener untuk `/robot/active_mission` di Dashboard
- [x] Firebase listener untuk `/robot/status` di Kontrol Robot
- [x] Firebase listener untuk `/robot/active_mission` di Kontrol Robot
- [x] UI update real-time tanpa refresh
- [x] Progress bar animasi untuk baterai
- [x] Status badge dengan warna sesuai status
- [x] Lokasi display yang user-friendly
- [x] Progress misi display (jika ada)

## 🔧 Troubleshooting

### Status tidak terupdate
1. Cek Firebase Console apakah data ada di `/robot/status`
2. Cek browser console untuk error Firebase
3. Pastikan Firebase rules mengizinkan read
4. Pastikan listener sudah terpasang (cek Network tab)

### Baterai tidak terupdate
1. Pastikan ESP32 mengirim `battery_level` ke Firebase
2. Cek format data di Firebase Console
3. Pastikan listener membaca field yang benar (`battery_level` atau `battery`)

### Lokasi tidak terupdate
1. Pastikan ESP32 mengirim `current_location` ke Firebase
2. Cek format location (string atau object)
3. Pastikan `formatLocation()` function bekerja dengan benar

## 📝 Catatan

- Data dari Firebase akan menggantikan data initial dari backend
- Update terjadi secara real-time tanpa perlu refresh halaman
- Progress bar baterai menggunakan animasi smooth
- Status badge berubah warna sesuai status robot

