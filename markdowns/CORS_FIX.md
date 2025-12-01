# 🔧 CORS Error Fix

## Problem
```
Access to XMLHttpRequest at 'http://localhost:8000/api/v1/auth/login' 
from origin 'http://localhost:3001' has been blocked by CORS policy
```

## Root Cause
React app running di port **3001**, tapi Laravel CORS config hanya allow port **5173**.

## Solution Applied ✅

### 1. Updated CORS Config
File: `config/cors.php`

Added port **3001** to allowed origins:
```php
'allowed_origins' => [
    'http://localhost:3000',
    'http://localhost:3001',  // ← ADDED
    'http://localhost:5173',
    'http://localhost:8000',
    'http://127.0.0.1:3001',  // ← ADDED
    // ... other origins
],
```

### 2. Cleared Cache
```bash
php artisan config:clear
php artisan cache:clear
```

### 3. Restarted Laravel Server
```bash
php artisan serve
```

---

## Test Now

### Step 1: Refresh Browser
Go to: **http://localhost:3001** (your React app)

**Hard refresh:** Ctrl + Shift + R

### Step 2: Try Login Again
```
Email: admin@mov.com
Password: Admin123
```

### Step 3: Check Browser Console
Should see:
```
✓ OPTIONS http://localhost:8000/api/v1/auth/login (CORS preflight)
✓ POST http://localhost:8000/api/v1/auth/login
✓ Status: 200 OK
✓ No CORS errors!
```

---

## Verify CORS Headers

Open Browser DevTools (F12) → Network tab:

1. Click on the **OPTIONS** request (preflight)
2. Check **Response Headers:**

Should include:
```
Access-Control-Allow-Origin: http://localhost:3001
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, ...
Access-Control-Allow-Credentials: true
```

---

## If Still CORS Error

### Quick Fix: Use Wildcard (Development Only!)

Edit `config/cors.php`:

```php
'allowed_origins' => ['*'],  // Allow ALL origins (dev only!)
```

Then:
```bash
php artisan config:clear
# Restart server
```

⚠️ **Warning:** Only for development! Use specific origins in production.

---

## Alternative: Change React Port to 5173

If you prefer to use port 5173:

```bash
# Stop current React server
# Edit vite.config.ts or package.json to use port 5173
# Restart: npm run dev
```

---

## Debug CORS Issues

### Test with curl (No CORS):
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"idToken":"test-token"}'
```

If this works → CORS issue  
If this fails → Server/API issue

### Check CORS Middleware Loaded:
```bash
php artisan route:list | grep "api/v1/auth/login"
```

Should show `web,api` middleware groups.

### Test CORS Headers:
```bash
curl -X OPTIONS http://localhost:8000/api/v1/auth/login \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Should return CORS headers in response.

---

## CORS Configuration Explained

```php
// config/cors.php

'paths' => ['api/*'],  // Apply CORS to all /api/* routes

'allowed_methods' => ['*'],  // Allow all HTTP methods

'allowed_origins' => [
    'http://localhost:3001',  // Your React app
],

'allowed_headers' => ['*'],  // Allow all headers

'supports_credentials' => true,  // Allow cookies/auth
```

---

## Common CORS Errors

### 1. "No 'Access-Control-Allow-Origin' header"
**Solution:** Add origin to `allowed_origins`

### 2. "Method not allowed by CORS"
**Solution:** Check `allowed_methods` includes your HTTP method

### 3. "Header not allowed by CORS"
**Solution:** Add header to `allowed_headers` or use `['*']`

### 4. "Credentials flag is true, but Access-Control-Allow-Credentials is not"
**Solution:** Set `supports_credentials` to `true`

---

## Production Checklist

Before deploying:

- [ ] Remove wildcard (`*`) from allowed origins
- [ ] Only allow specific production domains
- [ ] Enable HTTPS
- [ ] Test CORS with production URL
- [ ] Set proper `allowed_headers`
- [ ] Configure `max_age` for preflight caching

Example production config:
```php
'allowed_origins' => [
    'https://mov-platform.com',
    'https://app.mov-platform.com',
],
```

---

## Success! ✅

After applying fix:
- ✅ CORS preflight passes
- ✅ POST request succeeds
- ✅ No "blocked by CORS" errors
- ✅ Login works!

---

**Now try login again!** 🚀

If still issues, check:
1. Browser console for exact error
2. Network tab → Headers
3. Laravel logs: `storage/logs/laravel.log`

