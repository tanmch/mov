# 🎨 Panduan Visual: Setup Firebase Realtime Database

## 📸 Step-by-Step dengan Visual Guide

### Step 1: Buka Firebase Console
1. Go to: https://console.firebase.google.com/
2. Pilih project: **mov-project-6931c**
3. Klik **Realtime Database** di sidebar kiri
4. Pastikan Anda di tab **Data** (bukan Rules)

---

### Step 2: Buat Node Pertama - `kebuns`

**Di Firebase Console, Anda akan melihat area kosong dengan teks "null"**

1. **Klik area kosong** atau **klik "+"** di root database
2. **Ketik:** `kebuns` (tanpa tanda kutip)
3. **Tekan Enter** atau klik di luar

**Hasil:**
```
kebuns: null
```

---

### Step 3: Buat Node Kedua - `kebun_1`

1. **Klik pada `kebuns`** untuk expand (akan muncul tanda panah ke bawah)
2. **Klik "+"** yang muncul di dalam `kebuns` (atau klik area kosong di dalam `kebuns`)
3. **Ketik:** `kebun_1` (ganti 1 dengan kebun_id Anda, atau gunakan 1 untuk testing)
4. **Tekan Enter**

**Hasil:**
```
kebuns
  └── kebun_1: null
```

---

### Step 4: Buat Node Ketiga - `bloks`

1. **Klik pada `kebun_1`** untuk expand
2. **Klik "+"** di dalam `kebun_1`
3. **Ketik:** `bloks`
4. **Tekan Enter**

**Hasil:**
```
kebuns
  └── kebun_1
      └── bloks: null
```

---

### Step 5: Buat Node Keempat - `A1` (blok_code)

1. **Klik pada `bloks`** untuk expand
2. **Klik "+"** di dalam `bloks`
3. **Ketik:** `A1` (ganti dengan blok_code Anda, atau gunakan A1 untuk testing)
4. **Tekan Enter**

**Hasil:**
```
kebuns
  └── kebun_1
      └── bloks
          └── A1: null
```

---

### Step 6: Buat Node Kelima - `sensors`

1. **Klik pada `A1`** untuk expand
2. **Klik "+"** di dalam `A1`
3. **Ketik:** `sensors`
4. **Tekan Enter**

**Hasil:**
```
kebuns
  └── kebun_1
      └── bloks
          └── A1
              └── sensors: null
```

---

### Step 7: Tambah Sensor - `suhu_udara`

1. **Klik pada `sensors`** untuk expand
2. **Klik "+"** di dalam `sensors`
3. **Ketik:** `suhu_udara`
4. **Tekan Enter**
5. **Klik pada `suhu_udara`** untuk expand
6. **Tambah 4 field:**
   - Klik "+" → ketik: `value` → Enter → ketik: `28.5`
   - Klik "+" → ketik: `unit` → Enter → ketik: `°C`
   - Klik "+" → ketik: `status` → Enter → ketik: `normal`
   - Klik "+" → ketik: `timestamp` → Enter → ketik: `1734567890000` (gunakan `Date.now()` dari browser console)

**Hasil:**
```
kebuns
  └── kebun_1
      └── bloks
          └── A1
              └── sensors
                  └── suhu_udara
                      ├── value: 28.5
                      ├── unit: "°C"
                      ├── status: "normal"
                      └── timestamp: 1734567890000
```

---

### Step 8: Tambah Sensor - `kelembapan_udara`

1. **Masih di dalam `sensors`**, klik "+" lagi
2. **Ketik:** `kelembapan_udara`
3. **Tekan Enter**
4. **Tambah 4 field** (sama seperti Step 7):
   - `value`: `75`
   - `unit`: `%`
   - `status`: `normal`
   - `timestamp`: `1734567890000`

---

### Step 9: Tambah Sensor - `kelembapan_tanah`

1. **Masih di dalam `sensors`**, klik "+" lagi
2. **Ketik:** `kelembapan_tanah`
3. **Tekan Enter**
4. **Tambah 4 field**:
   - `value`: `62`
   - `unit`: `%`
   - `status`: `normal`
   - `timestamp`: `1734567890000`

---

### Step 10: Generate Timestamp

**Cara cepat:**
1. Buka browser console (F12)
2. Ketik: `Date.now()`
3. Copy hasilnya (contoh: `1734567890000`)
4. Paste ke semua field `timestamp` di Firebase

**Atau gunakan online converter:**
- https://www.epochconverter.com/
- Pilih "Timestamp in milliseconds"
- Copy hasilnya

---

## ✅ Final Structure

Setelah selesai, struktur Anda akan terlihat seperti ini:

```
kebuns
  └── kebun_1
      └── bloks
          └── A1
              └── sensors
                  ├── suhu_udara
                  │   ├── value: 28.5
                  │   ├── unit: "°C"
                  │   ├── status: "normal"
                  │   └── timestamp: 1734567890000
                  ├── kelembapan_udara
                  │   ├── value: 75
                  │   ├── unit: "%"
                  │   ├── status: "normal"
                  │   └── timestamp: 1734567890000
                  └── kelembapan_tanah
                      ├── value: 62
                      ├── unit: "%"
                      ├── status: "normal"
                      └── timestamp: 1734567890000
```

---

## 🧪 Test Real-time Update

1. **Buka halaman:** http://localhost:8000/sensor
2. **Lihat indicator "Live"** muncul (hijau) jika koneksi berhasil
3. **Edit nilai di Firebase Console:**
   - Klik pada `value` di `suhu_udara`
   - Ubah dari `28.5` ke `35`
   - Tekan Enter
4. **Lihat UI update otomatis!** ✨

---

## 💡 Tips

1. **Expand/Collapse:** Klik pada node untuk expand/collapse
2. **Edit Value:** Double-click pada value untuk edit
3. **Delete Node:** Klik pada node → klik "X" atau delete key
4. **Copy Path:** Klik kanan pada node → Copy path (jika ada)

---

## 🔧 Troubleshooting

### Node tidak bisa dibuat?
- ✅ Pastikan Anda klik di area yang benar (di dalam parent node)
- ✅ Pastikan tidak ada karakter khusus di nama node
- ✅ Coba refresh halaman Firebase Console

### Data tidak muncul di UI?
- ✅ Cek path sudah benar: `kebuns/kebun_1/bloks/A1/sensors`
- ✅ Cek semua field ada: value, unit, status, timestamp
- ✅ Cek timestamp dalam format milliseconds
- ✅ Refresh halaman `/sensor`

### Indicator tetap "Offline"?
- ✅ Pastikan ada data di path yang benar
- ✅ Cek browser console untuk error Firebase
- ✅ Pastikan Firebase config sudah benar

