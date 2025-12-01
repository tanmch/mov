# 🔐 Role-Based Access Control - Implementation Plan

## 📊 Current Status Analysis

### ✅ **Yang Sudah Ada:**
1. ✅ `CheckRole` middleware sudah ada
2. ✅ Middleware sudah terdaftar di `bootstrap/app.php` dengan alias `role`
3. ✅ User model punya method `isKPetani()`, `isPetani()`, `isGuest()`
4. ✅ Frontend bisa akses role via `usePage().props.auth.user.role`
5. ✅ Middleware sudah digunakan di API routes

### ⚠️ **Yang Perlu Diperbaiki:**
1. ⚠️ `CheckRole` middleware menggunakan `$request->user` (salah, harus `Auth::user()`)
2. ⚠️ Middleware belum support Inertia responses (untuk web routes)
3. ⚠️ Belum ada role-based routes di `web.php`
4. ⚠️ Belum ada helper function di frontend untuk role checking
5. ⚠️ Belum ada UI conditional rendering berdasarkan role

---

## 🎯 **Rekomendasi: SETUP ROLE-BASED ACCESS DULU**

### **Alasan:**
1. **Security First** - Lebih aman setup access control dari awal
2. **Sustainable** - Tidak perlu refactor nanti, semua fitur langsung protected
3. **Foundation Ready** - Infrastructure sudah ada, tinggal diperbaiki
4. **Testing** - Lebih mudah test dengan role yang berbeda

---

## 📋 Implementation Steps

### **Phase 1: Fix & Setup Backend (30 menit)**

#### 1.1 Fix CheckRole Middleware
- ✅ Fix `$request->user` → `Auth::user()`
- ✅ Support Inertia responses (redirect ke dashboard jika unauthorized)
- ✅ Support JSON responses (untuk API)

#### 1.2 Setup Role-Based Routes
- ✅ Protect K-Petani only routes (kebun CRUD, blok CRUD, user management)
- ✅ Setup read-only routes untuk Petani
- ✅ Add middleware to web routes

---

### **Phase 2: Frontend Helpers (15 menit)**

#### 2.1 Create Role Helper Hook
- ✅ `useRole()` hook untuk check role
- ✅ `isKPetani()`, `isPetani()`, `canEdit()` helpers

#### 2.2 Create Role-Based Components
- ✅ `<RoleGuard>` component untuk conditional rendering
- ✅ `<KPetaniOnly>` component wrapper

---

### **Phase 3: Apply to Existing Pages (20 menit)**

#### 3.1 Update Existing Pages
- ✅ Dashboard - Hide edit buttons untuk Petani
- ✅ KebunMonitoring - Hide edit buttons untuk Petani
- ✅ Profile - Add User Management section untuk K-Petani

---

### **Phase 4: Implement Features with Role Checking (Ongoing)**

#### 4.1 Kebun Management
- ✅ Create KebunController dengan role checking
- ✅ Create BlokController dengan role checking
- ✅ Add edit buttons hanya untuk K-Petani

#### 4.2 User Management
- ✅ Create UserController dengan role checking (K-Petani only)
- ✅ Add User Management section di Profile page

---

## 🔧 Technical Details

### **Backend Routes Structure:**

```php
// Public routes
Route::get('/', ...);

// Authenticated routes (all users)
Route::middleware('auth')->group(function () {
    Route::get('/dashboard', ...);
    Route::get('/kebun', ...); // Read-only for all
    Route::get('/sensor', ...);
    // ... other read-only routes
});

// K-Petani only routes
Route::middleware(['auth', 'role:k-petani'])->group(function () {
    // Kebun CRUD
    Route::post('/kebun', [KebunController::class, 'store']);
    Route::put('/kebun/{id}', [KebunController::class, 'update']);
    Route::delete('/kebun/{id}', [KebunController::class, 'destroy']);
    
    // Blok CRUD
    Route::post('/blok', [BlokController::class, 'store']);
    Route::put('/blok/{id}', [BlokController::class, 'update']);
    Route::delete('/blok/{id}', [BlokController::class, 'destroy']);
    
    // User Management
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);
});
```

### **Frontend Helper Structure:**

```javascript
// hooks/useRole.js
export function useRole() {
    const { auth } = usePage().props;
    const user = auth?.user;
    
    return {
        isKPetani: user?.role === 'k-petani',
        isPetani: user?.role === 'petani',
        isGuest: user?.role === 'guest',
        canEdit: user?.role === 'k-petani',
        user,
    };
}

// components/RoleGuard.jsx
export function RoleGuard({ allowedRoles, children, fallback = null }) {
    const { isKPetani, isPetani } = useRole();
    
    const hasAccess = allowedRoles.includes('k-petani') && isKPetani ||
                     allowedRoles.includes('petani') && isPetani;
    
    return hasAccess ? children : fallback;
}
```

---

## ⏱️ Estimated Time

- **Phase 1 (Backend Setup)**: 30 menit
- **Phase 2 (Frontend Helpers)**: 15 menit
- **Phase 3 (Apply to Existing)**: 20 menit
- **Total**: ~1 jam untuk setup foundation

Setelah itu, semua fitur baru langsung bisa menggunakan role checking dari awal.

---

## ✅ Decision

**Rekomendasi: SETUP ROLE-BASED ACCESS DULU**

Setelah setup selesai (~1 jam), baru implement fitur-fitur dengan role checking built-in dari awal.

