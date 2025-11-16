# 🔧 Cara Memperbaiki Error "invalid_grant" di Firebase

## ❌ Masalah
Error: `"invalid_grant"` saat push data ke Firebase

## 🔍 Penyebab
Error ini terjadi karena **Firebase service account credentials tidak valid** atau sudah expired.

## ✅ Solusi

### Opsi 1: Generate Ulang Service Account Key (Recommended)

1. **Buka Firebase Console**
   - Buka https://console.firebase.google.com/
   - Pilih project: **mov-project-6931c**

2. **Buka Project Settings**
   - Klik ikon ⚙️ (Settings) di sidebar
   - Pilih **Project settings**

3. **Buka Tab Service Accounts**
   - Klik tab **Service accounts**
   - Pastikan **Firebase Admin SDK** terpilih

4. **Generate New Private Key**
   - Klik tombol **Generate new private key**
   - Klik **Generate key** di dialog konfirmasi
   - File JSON akan terdownload

5. **Replace Credentials File**
   - Ganti file `config/firebase-credentials.json` dengan file yang baru didownload
   - Pastikan nama file tetap `firebase-credentials.json`

6. **Clear Laravel Cache**
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```

### Opsi 2: Periksa Service Account Permissions

1. **Buka Google Cloud Console**
   - Buka https://console.cloud.google.com/
   - Pilih project: **mov-project-6931c**

2. **Buka IAM & Admin > Service Accounts**
   - Pastikan service account `firebase-adminsdk-fbsvc@mov-project-6931c.iam.gserviceaccount.com` ada
   - Pastikan memiliki role: **Firebase Admin SDK Administrator Service Agent**

3. **Jika tidak ada, tambahkan role:**
   - Klik service account
   - Klik **ADD ROLE**
   - Pilih **Firebase Admin SDK Administrator Service Agent**
   - Klik **SAVE**

### Opsi 3: Verifikasi Database URL

Pastikan database URL di `config/firebase.php` benar:
```php
'database' => [
    'url' => env('FIREBASE_DATABASE_URL', 'https://mov-project-6931c-default-rtdb.asia-southeast1.firebasedatabase.app'),
],
```

Untuk mendapatkan URL yang benar:
1. Buka Firebase Console
2. Pilih **Realtime Database**
3. Copy URL dari address bar atau dari database settings

## 🧪 Test Setelah Perbaikan

Setelah memperbaiki credentials, coba buat schedule lagi. Jika masih error, periksa:
1. Log Laravel untuk error detail
2. Pastikan file credentials bisa dibaca (permission file)
3. Pastikan format JSON valid

## 📝 Catatan

- **JANGAN commit** file `firebase-credentials.json` ke Git (sudah ada di `.gitignore`)
- Simpan file credentials dengan aman
- Jika credentials ter-expose, segera generate ulang

