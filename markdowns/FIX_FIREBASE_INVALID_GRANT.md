# 🔥 Fix Firebase "invalid_grant" Error

## 🔍 Masalah
Error: `invalid_grant` saat push schedule ke Firebase Realtime Database.

Ini berarti Firebase service account credentials tidak valid atau sudah expired.

## ✅ Solusi: Generate Credentials Baru

### Step 1: Buka Firebase Console
1. Buka: https://console.firebase.google.com/
2. Pilih project: `mov-project-6931c`

### Step 2: Generate Service Account Key Baru
1. Klik ⚙️ (Settings) di sidebar kiri
2. Pilih **Project settings**
3. Tab **Service accounts**
4. Klik **Generate new private key**
5. Konfirmasi dengan klik **Generate key**
6. File JSON akan terdownload

### Step 3: Replace Credentials File
1. Rename file yang didownload menjadi `firebase-credentials.json`
2. Copy file ke folder: `D:\IPB\Semester 5\RPL\Project\MOV_PROJECT\config\`
3. Replace file yang lama

### Step 4: Verify
```bash
php artisan firebase:test
```

Expected output:
```
✅ All Firebase tests passed!
Firebase connection is working properly.
```

---

## 🔐 Alternatif: Gunakan Firebase Admin SDK via REST API

Jika masalah masih terjadi, kita bisa menggunakan Firebase REST API sebagai fallback.

File yang perlu diedit: `app/Services/FirebaseService.php`

Tambahkan method:
```php
public function setDatabaseDataViaREST(string $path, $data)
{
    $databaseUrl = config('firebase.database.url');
    $url = "{$databaseUrl}/{$path}.json";
    
    $client = new \GuzzleHttp\Client();
    $response = $client->put($url, [
        'json' => $data,
        'headers' => [
            'Content-Type' => 'application/json',
        ],
    ]);
    
    return $response->getStatusCode() === 200;
}
```

---

## 📝 Troubleshooting Checklist

- [ ] Firebase project ID benar: `mov-project-6931c`
- [ ] Database URL benar: `https://mov-project-6931c-default-rtdb.asia-southeast1.firebasedatabase.app`
- [ ] File `firebase-credentials.json` ada di folder `config/`
- [ ] Service account memiliki permissions yang benar
- [ ] Internet connection aktif

---

## 🚀 Quick Fix (Temporary)

Untuk sementara, jadwal akan tetap tersimpan di MySQL meskipun gagal push ke Firebase. 
Robot bisa membaca jadwal via API endpoint jika diperlukan.

API endpoint yang bisa digunakan robot:
```
GET /api/robot/schedules
```

---

**Last Updated:** November 19, 2025

