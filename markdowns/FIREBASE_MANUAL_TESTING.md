# 🔥 Panduan Testing Manual Firebase Realtime Database

## 📋 Cara Mengubah Data Sensor Manual di Firebase Console

### Step 1: Buka Firebase Console
1. Go to: https://console.firebase.google.com/
2. Pilih project: **mov-project-6931c**
3. Klik **Realtime Database** di sidebar kiri

### Step 2: Struktur Path Firebase

Data sensor disimpan di path berikut:
```
/kebuns/kebun_{kebun_id}/bloks/{blok_code}/sensors
```

**Contoh:**
- Jika kebun_id = 1, blok_code = "A1"
- Path: `/kebuns/kebun_1/bloks/A1/sensors`

### Step 3: Buat Struktur Path (Jika Belum Ada)

**Database masih kosong?** Ikuti langkah ini untuk membuat struktur path:

1. **Di Firebase Realtime Database, klik area kosong atau klik "+" di root**
2. **Buat node pertama: `kebuns`**
   - Klik "+" atau area kosong
   - Ketik: `kebuns`
   - Tekan Enter

3. **Buat node kedua: `kebun_1` (atau sesuaikan dengan kebun_id Anda)**
   - Klik pada `kebuns` untuk expand
   - Klik "+" di dalam `kebuns`
   - Ketik: `kebun_1` (ganti 1 dengan kebun_id yang sesuai)
   - Tekan Enter

4. **Buat node ketiga: `bloks`**
   - Klik pada `kebun_1` untuk expand
   - Klik "+" di dalam `kebun_1`
   - Ketik: `bloks`
   - Tekan Enter

5. **Buat node keempat: `A1` (atau sesuaikan dengan blok_code Anda)**
   - Klik pada `bloks` untuk expand
   - Klik "+" di dalam `bloks`
   - Ketik: `A1` (ganti dengan blok_code yang sesuai, contoh: A1, A2, B1, dll)
   - Tekan Enter

6. **Buat node kelima: `sensors`**
   - Klik pada `A1` untuk expand
   - Klik "+" di dalam `A1`
   - Ketik: `sensors`
   - Tekan Enter

**Struktur yang terbentuk:**
```
kebuns
  └── kebun_1
      └── bloks
          └── A1
              └── sensors
```

### Step 4: Tambah Data Sensor

Setelah struktur path dibuat, tambahkan 3 sensor types di dalam `sensors`:

1. **Klik pada `sensors` untuk expand**
2. **Klik "+" untuk menambah node baru**
3. **Tambah 3 sensor types:**
   - `suhu_udara`
   - `kelembapan_udara`
   - `kelembapan_tanah`

### Step 5: Format Data Sensor

Untuk setiap sensor type (`suhu_udara`, `kelembapan_udara`, `kelembapan_tanah`), masukkan data:

1. **Klik pada sensor type (misalnya `suhu_udara`)**
2. **Klik pada field kosong atau "+" untuk menambah field**
3. **Tambah 4 field:**
   - `value` → ketik nilai (contoh: 28.5)
   - `unit` → ketik unit (contoh: "°C" untuk suhu, "%" untuk kelembapan)
   - `status` → ketik status (contoh: "normal", "warning", atau "critical")
   - `timestamp` → ketik timestamp dalam milliseconds (contoh: 1734567890000)

**Atau gunakan format JSON (paste langsung):**

#### Suhu Udara (`suhu_udara`):
```json
{
  "value": 28.5,
  "unit": "°C",
  "status": "normal",
  "timestamp": 1734567890000
}
```

#### Kelembapan Udara (`kelembapan_udara`):
```json
{
  "value": 75,
  "unit": "%",
  "status": "normal",
  "timestamp": 1734567890000
}
```

#### Kelembapan Tanah (`kelembapan_tanah`):
```json
{
  "value": 62,
  "unit": "%",
  "status": "normal",
  "timestamp": 1734567890000
}
```

### Step 5: Update Timestamp

**PENTING:** `timestamp` harus dalam format **milliseconds** (Unix timestamp × 1000)

Untuk mendapatkan timestamp sekarang:
```javascript
// Di browser console:
Date.now() // Contoh: 1734567890000
```

Atau gunakan: https://www.epochconverter.com/

---

## 🧪 Contoh Data untuk Testing

### Test Case 1: Normal Values
```json
{
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
```

### Test Case 2: Warning (Suhu Tinggi)
```json
{
  "suhu_udara": {
    "value": 36,
    "unit": "°C",
    "status": "warning",
    "timestamp": 1734567890000
  },
  "kelembapan_udara": {
    "value": 70,
    "unit": "%",
    "status": "normal",
    "timestamp": 1734567890000
  },
  "kelembapan_tanah": {
    "value": 60,
    "unit": "%",
    "status": "normal",
    "timestamp": 1734567890000
  }
}
```

### Test Case 3: Critical (Kelembapan Rendah)
```json
{
  "suhu_udara": {
    "value": 30,
    "unit": "°C",
    "status": "normal",
    "timestamp": 1734567890000
  },
  "kelembapan_udara": {
    "value": 65,
    "unit": "%",
    "status": "normal",
    "timestamp": 1734567890000
  },
  "kelembapan_tanah": {
    "value": 18,
    "unit": "%",
    "status": "critical",
    "timestamp": 1734567890000
  }
}
```

---

## 🎯 Quick Test Steps

1. **Buka Firebase Console** → Realtime Database
2. **Navigate ke path:** `kebuns/kebun_1/bloks/A1/sensors`
3. **Tambah/Edit data** sesuai format di atas
4. **Update timestamp** dengan `Date.now()` (dari browser console)
5. **Save** - Data akan langsung terupdate di halaman Monitoring Sensor!

---

## 📊 Threshold Values

Sistem akan auto-detect status berdasarkan nilai:

### Suhu Udara:
- **Critical:** ≥ 40°C
- **Warning:** ≥ 35°C
- **Normal:** < 35°C

### Kelembapan Udara & Tanah:
- **Critical:** ≤ 20%
- **Warning:** ≤ 30%
- **Normal:** > 30%

---

## 💡 Tips Testing

1. **Gunakan Browser Console** untuk generate timestamp:
   ```javascript
   Date.now() // Copy hasilnya ke Firebase
   ```

2. **Test Real-time Update:**
   - Buka halaman `/sensor` di browser
   - Edit nilai di Firebase Console
   - Lihat UI update otomatis! ✨

3. **Test Multiple Bloks:**
   - Buat data untuk beberapa blok (A1, A2, B1, dll)
   - Filter di halaman sensor
   - Lihat data update per blok

4. **Test Connection Status:**
   - Jika ada data → Indicator "Live" (hijau) muncul
   - Jika tidak ada data → Indicator "Offline" (abu-abu)

---

## 🔧 Troubleshooting

### Data tidak muncul di UI?
- ✅ Cek path Firebase sudah benar: `kebuns/kebun_{id}/bloks/{code}/sensors`
- ✅ Cek `kebun_id` dan `blok_code` sesuai dengan data di database
- ✅ Cek format JSON sudah benar (value, unit, status, timestamp)
- ✅ Cek timestamp dalam format milliseconds

### Indicator tetap "Offline"?
- ✅ Pastikan ada data di Firebase path yang benar
- ✅ Cek browser console untuk error Firebase
- ✅ Pastikan Firebase config sudah benar

### Data tidak update real-time?
- ✅ Refresh halaman untuk reconnect listener
- ✅ Cek browser console untuk error
- ✅ Pastikan Firebase rules mengizinkan read

---

## 📝 Catatan

- **Timestamp:** Harus dalam milliseconds (Date.now() atau Unix timestamp × 1000)
- **Path:** Harus sesuai dengan struktur: `kebuns/kebun_{kebun_id}/bloks/{blok_code}/sensors`
- **Format:** Semua field (value, unit, status, timestamp) harus ada
- **Real-time:** Perubahan di Firebase akan langsung terlihat di UI tanpa refresh!

