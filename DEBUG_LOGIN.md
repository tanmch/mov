# 🐛 Debug Login Network Error

## Issue
User berhasil register di Firebase, tapi saat login muncul **"Network Error"**

## Root Cause
Laravel APP_KEY encryption error yang menyebabkan server crash saat handle request.

## Solution Applied ✅

1. **Clear cache:**
   ```bash
   php artisan config:clear
   php artisan cache:clear
   ```

2. **Regenerate APP_KEY:**
   ```bash
   php artisan key:generate --force
   ```

3. **Restart Laravel server**

---

## How to Test Login Now

### Step 1: Verify Laravel Running
```bash
curl http://localhost:8000/api/v1/health
```
Should return: `{"success":true,...}`

### Step 2: Test Login in Browser
1. Open: http://localhost:5173
2. Enter credentials yang sudah register:
   ```
   Email: admin@mov.com
   Password: Admin123
   ```
3. Click **"Masuk"**

### Step 3: Check Browser Console (F12)
Should see:
```
✓ Firebase authentication successful!
✓ API call to: http://localhost:8000/api/v1/auth/login
✓ Response: {success: true, data: {...}}
✓ Welcome back, Admin MOV!
```

---

## If Still Network Error:

### Check 1: Laravel Server
```bash
# Check if running
curl http://localhost:8000/api/v1/health

# Check logs
tail -f storage/logs/laravel.log
```

### Check 2: CORS Headers
In browser Network tab (F12 → Network):
- Look for **OPTIONS** request (preflight)
- Check response headers should include:
  ```
  Access-Control-Allow-Origin: http://localhost:5173
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE
  ```

### Check 3: Firebase Token
In browser console, check:
```javascript
// Get current user token
import { auth } from './config/firebase';
const token = await auth.currentUser.getIdToken();
console.log('Token:', token.substring(0, 50) + '...');
```

### Check 4: Test Direct API Call
```bash
# Get a Firebase token from browser console, then:
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"idToken":"YOUR_FIREBASE_TOKEN_HERE"}'
```

---

## Common Errors & Solutions

### Error: "Network Error"
**Cause:** Server not responding or CORS blocked  
**Solution:** 
- Restart Laravel: `php artisan serve`
- Clear browser cache: Ctrl+Shift+Delete

### Error: "Invalid Firebase token"
**Cause:** Token expired atau Firebase credentials salah  
**Solution:**
- Check `config/firebase-credentials.json` valid
- User logout & login lagi (get fresh token)

### Error: "User not found in database"
**Cause:** Register berhasil di Firebase tapi gagal di Laravel  
**Solution:**
- Check MySQL connection
- Register ulang atau insert manual ke DB

---

## Debug Checklist

- [ ] Laravel server running (`php artisan serve`)
- [ ] Health check OK (`/api/v1/health`)
- [ ] APP_KEY generated properly
- [ ] Firebase credentials valid
- [ ] MySQL database accessible
- [ ] CORS configured (`config/cors.php`)
- [ ] Browser console shows no errors
- [ ] Network tab shows request sent

---

## Test API Directly (Bypass Frontend)

### 1. Register via Postman/curl:
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@mov.com",
    "password": "Test123",
    "name": "Test User 2",
    "role": "petani"
  }'
```

### 2. Get Firebase Token:
- Login via Firebase web in browser
- Get token from console
- Use for API calls

### 3. Test Login:
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "YOUR_FIREBASE_TOKEN"
  }'
```

---

## Success Indicators

✅ **Laravel:**
- Server running without errors
- Health check returns 200
- Logs show no exceptions

✅ **Frontend:**
- No CORS errors in console
- Network tab shows 200 responses
- Toast shows success messages

✅ **Database:**
- User exists in `users` table
- Activity logs created

---

**After fixes applied, login should work!** 🎉

