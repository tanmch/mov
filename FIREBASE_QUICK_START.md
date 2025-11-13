# 🚀 Firebase Quick Start - Buat Struktur Path untuk Testing

## 📍 Step-by-Step: Buat Path dari Awal

### 1️⃣ Buka Firebase Console
- Go to: https://console.firebase.google.com/
- Project: **mov-project-6931c**
- Klik **Realtime Database** → Tab **Data**

### 2️⃣ Cek Kebun ID & Blok Code Anda

**Jika database masih kosong, gunakan contoh:**
- `kebun_id = 1`
- `blok_code = "A1"`

**Jika sudah ada data, cek dengan cara:**

**Cara 1: Dari Database MySQL**
```sql
SELECT id, name FROM kebuns;
SELECT id, code, name, kebun_id FROM bloks;
```

**Cara 2: Dari Halaman Monitoring Sensor**
- Buka: http://localhost:8000/sensor
- Lihat di browser console: `MonitoringSensor Props`
- Cek `bloks` array untuk melihat `kebun_id` dan `code`

**Cara 3: Dari Laravel Tinker**
```bash
php artisan tinker
>>> \App\Models\Kebun::all(['id', 'name']);
>>> \App\Models\Blok::all(['id', 'code', 'kebun_id']);
```

### 3️⃣ Buat Struktur Path di Firebase

**Contoh: Jika kebun_id = 1, blok_code = "A1"**

1. **Klik area kosong di root database** (atau klik "+" di root)
2. **Ketik: `kebuns`** → Enter
3. **Klik pada `kebuns`** untuk expand
4. **Klik "+" di dalam `kebuns`**
5. **Ketik: `kebun_1`** (ganti 1 dengan kebun_id Anda) → Enter
6. **Klik pada `kebun_1`** untuk expand
7. **Klik "+" di dalam `kebun_1`**
8. **Ketik: `bloks`** → Enter
9. **Klik pada `bloks`** untuk expand
10. **Klik "+" di dalam `bloks`**
11. **Ketik: `A1`** (ganti dengan blok_code Anda, contoh: A1, A2, B1) → Enter
12. **Klik pada `A1`** untuk expand
13. **Klik "+" di dalam `A1`**
14. **Ketik: `sensors`** → Enter

**Struktur yang terbentuk:**
```
kebuns
  └── kebun_1
      └── bloks
          └── A1
              └── sensors
```

### 4️⃣ Tambah Data Sensor

**Di dalam `sensors`, tambahkan 3 node:**

#### A. Tambah `suhu_udara`:
1. Klik "+" di dalam `sensors`
2. Ketik: `suhu_udara` → Enter
3. Klik pada `suhu_udara` untuk expand
4. Tambah 4 field:
   - Klik "+" → ketik: `value` → Enter → ketik: `28.5`
   - Klik "+" → ketik: `unit` → Enter → ketik: `°C`
   - Klik "+" → ketik: `status` → Enter → ketik: `normal`
   - Klik "+" → ketik: `timestamp` → Enter → ketik: `1734567890000` (gunakan `Date.now()` dari browser console)

#### B. Tambah `kelembapan_udara`:
1. Klik "+" di dalam `sensors`
2. Ketik: `kelembapan_udara` → Enter
3. Tambah 4 field (sama seperti di atas):
   - `value`: `75`
   - `unit`: `%`
   - `status`: `normal`
   - `timestamp`: `1734567890000`

#### C. Tambah `kelembapan_tanah`:
1. Klik "+" di dalam `sensors`
2. Ketik: `kelembapan_tanah` → Enter
3. Tambah 4 field:
   - `value`: `62`
   - `unit`: `%`
   - `status`: `normal`
   - `timestamp`: `1734567890000`

### 5️⃣ Generate Timestamp

**Cara cepat:**
1. Buka browser console (F12)
2. Ketik: `Date.now()`
3. Copy hasilnya (contoh: `1734567890000`)
4. Paste ke field `timestamp` di Firebase

### 6️⃣ Test Real-time Update

1. **Buka halaman:** http://localhost:8000/sensor
2. **Edit nilai di Firebase Console** (misalnya ubah `value` dari 28.5 ke 35)
3. **Lihat UI update otomatis!** ✨

---

## 🎯 Quick Copy-Paste Method (Lebih Cepat!)

### Option 1: Copy-Paste JSON Langsung (RECOMMENDED!)

**Cara termudah:** Copy JSON berikut dan paste langsung di Firebase Console!

1. **Buka Firebase Console** → Realtime Database → Tab **Data**
2. **Klik area kosong di root** (atau klik "+" di root)
3. **Klik ikon "..." (three dots)** di kanan atas → Pilih **"Import JSON"** (jika ada)
4. **ATAU langsung paste JSON berikut di root:**

```json
{
  "kebuns": {
    "kebun_1": {
      "bloks": {
        "A1": {
          "sensors": {
            "suhu_udara": {
              "value": 28.5,
              "unit": "°C",
              "status": "normal",
              "timestamp": 1734567890000
            },
            "kelembapan_udara": {
              "value": 75,
              "unit": "%",
              "status": "normal",
              "timestamp": 1734567890000
            },
            "kelembapan_tanah": {
              "value": 62,
              "unit": "%",
              "status": "normal",
              "timestamp": 1734567890000
            }
          }
        }
      }
    }
  }
}
```

**PENTING:** 
- Ganti `timestamp` dengan `Date.now()` dari browser console
- Ganti `kebun_1` dengan kebun_id yang sesuai (jika ada)
- Ganti `A1` dengan blok_code yang sesuai (jika ada)

### Option 2: Import JSON via Firebase Console

1. Di Firebase Console, cari tombol **"Import JSON"** atau **"..."** menu
2. Copy JSON berikut (sesuaikan kebun_id dan blok_code):

```json
{
  "kebuns": {
    "kebun_1": {
      "bloks": {
        "A1": {
          "sensors": {
            "suhu_udara": {
              "value": 28.5,
              "unit": "°C",
              "status": "normal",
              "timestamp": 1734567890000
            },
            "kelembapan_udara": {
              "value": 75,
              "unit": "%",
              "status": "normal",
              "timestamp": 1734567890000
            },
            "kelembapan_tanah": {
              "value": 62,
              "unit": "%",
              "status": "normal",
              "timestamp": 1734567890000
            }
          }
        }
      }
    }
  }
}
```

3. **Ganti `timestamp` dengan `Date.now()`** dari browser console
4. Paste ke Firebase Console

### Option 2: Manual Step-by-Step (Lebih Aman)

Ikuti Step 3-4 di atas untuk membuat struktur secara manual.

---

## 📝 Catatan Penting

1. **Path harus EXACT:**
   - `kebuns` (bukan `kebun`)
   - `kebun_1` (bukan `kebun1` atau `kebun-1`)
   - `bloks` (bukan `blok`)
   - `sensors` (bukan `sensor`)

2. **Blok Code harus sesuai:**
   - Cek di database MySQL: `SELECT code FROM bloks;`
   - Atau lihat di halaman Monitoring Sensor

3. **Timestamp harus milliseconds:**
   - Gunakan `Date.now()` dari browser console
   - Atau: Unix timestamp × 1000

4. **Format Value:**
   - Suhu: angka desimal (contoh: 28.5)
   - Kelembapan: angka bulat atau desimal (contoh: 75 atau 75.5)

---

## 🔍 Troubleshooting

### Path tidak muncul di UI?
- ✅ Cek path sudah benar: `kebuns/kebun_{id}/bloks/{code}/sensors`
- ✅ Cek `kebun_id` dan `blok_code` sesuai dengan database
- ✅ Refresh halaman `/sensor`
- ✅ Cek browser console untuk error Firebase

### Data tidak update real-time?
- ✅ Pastikan semua field ada: value, unit, status, timestamp
- ✅ Pastikan timestamp dalam format milliseconds
- ✅ Cek koneksi Firebase (lihat indicator "Live" / "Offline")

### Struktur path tidak bisa dibuat?
- ✅ Pastikan Anda punya permission write di Firebase
- ✅ Cek Firebase Rules (harus allow read/write)
- ✅ Coba buat satu node per satu (jangan langsung semua)

