# 🧪 Testing Guide - MOV Platform Authentication

## ✅ What We Just Built

### Backend (Laravel):
- ✅ API endpoints for auth (register, login, profile)
- ✅ Firebase SDK integration
- ✅ Multi-role system (guest, petani, k-petani)
- ✅ MySQL database with 11 tables
- ✅ Activity logging

### Frontend (React):
- ✅ Firebase authentication
- ✅ API service for Laravel communication
- ✅ Login/Register form with real Firebase integration
- ✅ Test page for authentication flow

---

## 🚀 How to Test

### Prerequisites:
1. **Get Firebase Web Config** (PENTING!)
   - Buka: https://console.firebase.google.com/
   - Project: `mov-project-6931c`
   - Settings → Project settings → Your apps
   - Copy `apiKey` dan `appId`
   - Update file: `MOV/src/config/firebase.ts`

2. **Enable Firebase Auth**
   - Firebase Console → Authentication
   - Enable **Email/Password** sign-in method

3. **Both Servers Running:**
   ```bash
   # Terminal 1 - Laravel
   cd "D:\IPB\Semester 5\RPL\Project\MOV_PROJECT"
   php artisan serve
   
   # Terminal 2 - React  
   cd "D:\IPB\Semester 5\RPL\Project\MOV"
   npm run dev
   ```

---

## 📝 Test Scenarios

### Scenario 1: Register New K-Petani

1. **Open Browser:** http://localhost:5173
2. **Click "Register" tab**
3. **Fill form:**
   ```
   Name: Admin Test
   Phone: 081234567890 (optional)
   Email: admin@mov.test
   Password: Admin123
   Role: K-Petani (🌾)
   ```
4. **Click "Daftar"**

**What Happens Behind The Scenes:**

```
Step 1: React → Firebase Authentication
  ✓ Create user in Firebase
  ✓ Get Firebase UID

Step 2: React → Laravel API (POST /auth/register)
  ✓ Send user data + Firebase UID
  ✓ Laravel sets custom claims in Firebase (role: k-petani)
  ✓ Laravel creates user in MySQL

Step 3: React → Laravel API (POST /auth/login)
  ✓ Auto login after registration
  ✓ Verify Firebase token
  ✓ Get user data from MySQL
  ✓ Redirect to dashboard
```

**Check Results:**

1. **Browser Console (F12):**
   ```
   ✓ Firebase user created!
   ✓ Registration successful! 🎉
   ✓ Welcome back, Admin Test! 🎉
   ```

2. **Firebase Console:**
   - Go to: Authentication → Users
   - Should see: `admin@mov.test`

3. **MySQL Database:**
   ```sql
   SELECT * FROM users;
   -- Should see new user with firebase_uid
   
   SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 5;
   -- Should see registration and login logs
   ```

---

### Scenario 2: Login Existing User

1. **Logout** (or refresh page)
2. **Click "Login" tab**
3. **Enter credentials:**
   ```
   Email: admin@mov.test
   Password: Admin123
   ```
4. **Click "Masuk"**

**Expected:**
- ✅ Firebase authentication
- ✅ Laravel verification
- ✅ Redirect to dashboard
- ✅ Activity log created

---

### Scenario 3: Register Petani (Read-only user)

1. **Register dengan role "Petani"**
   ```
   Name: Petani Test
   Email: petani@mov.test
   Password: Petani123
   Role: Petani (👨‍🌾)
   ```

**Result:**
- User created with `role = 'petani'`
- Will have read-only access
- Cannot create schedules or edit data

---

### Scenario 4: Forgot Password

1. **In Login form**, enter email
2. **Click "Lupa password?"**
3. **Check email** for password reset link
4. **Reset password** via Firebase link

---

## 🔍 Debugging

### Check Network Requests:

Open **Browser DevTools → Network tab**

**Registration:**
```
POST http://localhost:8000/api/v1/auth/register
Status: 201 Created
Response: {success: true, data: {...}}
```

**Login:**
```
POST http://localhost:8000/api/v1/auth/login
Status: 200 OK
Response: {success: true, data: {user: {...}, unread_notifications: 0}}
```

### Check Laravel Logs:

```bash
tail -f storage/logs/laravel.log
```

**Successful Registration:**
```
[INFO] User Admin Test registered successfully
[INFO] Firebase custom claims set for UID: abc123...
```

### Check Firebase Realtime Database:

Currently empty - will be populated by:
- Robot sensor data
- Detection results
- Robot schedules

---

## 🎯 API Endpoints Being Tested

### ✅ POST `/api/v1/auth/register`
**Request:**
```json
{
  "email": "admin@mov.test",
  "password": "Admin123",
  "name": "Admin Test",
  "phone": "081234567890",
  "role": "k-petani"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "firebase_uid": "abc123...",
      "email": "admin@mov.test",
      "name": "Admin Test",
      "role": "k-petani",
      "is_active": true
    }
  }
}
```

---

### ✅ POST `/api/v1/auth/login`
**Request:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "Admin Test",
      "email": "admin@mov.test",
      "role": "k-petani",
      "last_login_at": "2025-11-09T10:30:00Z"
    },
    "unread_notifications": 0
  }
}
```

---

## ❌ Common Errors & Solutions

### Error: "Firebase: Error (auth/invalid-api-key)"
**Cause:** API Key belum diupdate di `firebase.ts`
**Solution:** Update dengan key dari Firebase Console

### Error: "CORS policy: No 'Access-Control-Allow-Origin'"
**Cause:** Laravel CORS issue
**Solution:** Already configured in `config/cors.php`
- Check Laravel server running
- Clear browser cache

### Error: "Registration failed: User not found in database"
**Cause:** Firebase berhasil, Laravel gagal
**Solution:** 
- Check MySQL connection
- Check `firebase-credentials.json` valid
- Check Laravel logs

### Error: "auth/weak-password"
**Cause:** Password < 6 characters
**Solution:** Use minimum 6 characters

### Error: "auth/email-already-in-use"
**Cause:** Email sudah terdaftar
**Solution:** Use different email or login instead

---

## 📊 Success Metrics

After successful testing, you should have:

✅ **Firebase:**
- User created in Authentication
- Custom claims set (role)

✅ **MySQL (Laravel):**
- 1 row in `users` table
- 2 rows in `activity_logs` (register + login)

✅ **Frontend:**
- User redirected to dashboard
- User data stored in localStorage
- Firebase token available for API calls

---

## 🎉 Next Steps After Successful Testing

Once authentication works:

1. ✅ **Test Protected Endpoints:**
   - GET `/api/v1/auth/profile`
   - GET `/api/v1/robot/status`
   - GET `/api/v1/sensors/latest`

2. ✅ **Build Dashboard:**
   - Show user info
   - Display robot status
   - Show sensor readings

3. ✅ **Implement CRUD:**
   - Kebun management
   - Blok management
   - Robot scheduling

4. ✅ **ESP32 Integration:**
   - Robot reads schedules from Firebase
   - Robot writes sensor data to Firebase
   - Laravel syncs data to MySQL

---

## 🔗 Useful Links

- **React Frontend:** http://localhost:5173
- **Laravel API:** http://localhost:8000/api/v1
- **API Health:** http://localhost:8000/api/v1/health
- **Firebase Console:** https://console.firebase.google.com/project/mov-project-6931c
- **Laravel Logs:** `MOV_PROJECT/storage/logs/laravel.log`

---

**Happy Testing!** 🚀

If you encounter issues, check:
1. Browser console (F12)
2. Network tab (F12 → Network)
3. Laravel logs
4. Firebase Console → Authentication
5. MySQL database

