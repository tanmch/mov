# 🔄 Cara Update Status Schedule di Firebase

## 📋 Overview

Status schedule bisa diupdate dari beberapa sumber:
1. **Robot ESP32** - Update status saat misi berjalan
2. **Laravel Backend** - Update status manual atau sync dari Firebase
3. **Frontend Real-time** - Otomatis update via Firebase listener

---

## 🤖 1. Update Status dari Robot (ESP32)

Robot ESP32 akan mengupdate status di Firebase dengan struktur berikut:

### Path di Firebase:
```
/robot/schedules/schedule_{schedule_id}/status
/robot/active_mission
```

### Contoh Update dari Robot:

**Ketika misi dimulai:**
```json
{
  "robot/schedules/schedule_1": {
    "status": "in_progress",
    "progress_percentage": 0
  },
  "robot/active_mission": {
    "schedule_id": 1,
    "blok_id": "A1",
    "mission_type": "deteksi",
    "started_at": 1699512345000,
    "progress_percentage": 0,
    "current_task": "moving_to_location"
  }
}
```

**Ketika progress update:**
```json
{
  "robot/active_mission": {
    "progress_percentage": 45,
    "current_task": "capturing_images",
    "images_captured": 5,
    "total_images": 10
  }
}
```

**Ketika misi selesai:**
```json
{
  "robot/schedules/schedule_1": {
    "status": "completed",
    "progress_percentage": 100
  },
  "robot/mission_results/schedule_1": {
    "success": true,
    "completed_at": 1699512345000,
    "images_captured": 10,
    "detections": [...]
  }
}
```

---

## 🔧 2. Update Status dari Laravel Backend

### A. Update Status Manual (dari Laravel)

Tambahkan method di `RobotController` untuk update status:

```php
public function updateScheduleStatus(Request $request, $id): JsonResponse
{
    try {
        $user = Auth::user();
        
        if (!$user || $user->role !== 'k-petani') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }
        
        $schedule = RobotSchedule::findOrFail($id);
        
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,in_progress,completed,failed,cancelled',
            'progress_percentage' => 'nullable|integer|min:0|max:100',
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }
        
        // Update di MySQL
        $schedule->update([
            'status' => $request->status,
            'progress_percentage' => $request->progress_percentage ?? $schedule->progress_percentage,
        ]);
        
        // Update di Firebase juga
        $this->firebaseSync->pushRobotScheduleToFirebase($schedule);
        
        return response()->json([
            'success' => true,
            'message' => 'Schedule status updated successfully',
            'data' => $schedule->load(['blok', 'creator'])
        ]);
        
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Failed to update status: ' . $e->getMessage()
        ], 500);
    }
}
```

### B. Sync Status dari Firebase ke MySQL

Sudah ada method `updateScheduleFromFirebase()` di `FirebaseSyncService`:

```php
// Di RobotController
public function syncMissionResults(Request $request): JsonResponse
{
    $scheduleId = $request->get('schedule_id');
    
    if (!$scheduleId) {
        return response()->json([
            'success' => false,
            'message' => 'Schedule ID is required'
        ], 422);
    }
    
    $updated = $this->firebaseSync->updateScheduleFromFirebase($scheduleId);
    
    if ($updated) {
        return response()->json([
            'success' => true,
            'message' => 'Mission results synced successfully'
        ]);
    } else {
        return response()->json([
            'success' => false,
            'message' => 'No results found in Firebase'
        ], 404);
    }
}
```

**Endpoint:** `POST /api/robot/sync-mission-results?schedule_id={id}`

---

## 📱 3. Update Status Real-time di Frontend

Frontend sudah punya Firebase listener yang otomatis update status:

### Di `RobotControl.jsx`:

```javascript
// Listen to schedules in Firebase (for real-time updates)
const schedulesRef = ref(database, 'robot/schedules');
schedulesListenerRef.current = onValue(schedulesRef, (snapshot) => {
    // Refresh schedules from API when Firebase schedules change
    fetchSchedules();
});
```

**Cara kerjanya:**
1. Firebase listener mendengarkan perubahan di `/robot/schedules`
2. Ketika ada perubahan, `fetchSchedules()` dipanggil
3. Data terbaru diambil dari API dan ditampilkan di UI

---

## 🔄 4. Flow Lengkap Update Status

```
1. Robot ESP32
   └─> Update status di Firebase
       └─> /robot/schedules/schedule_{id}/status
       └─> /robot/active_mission
       └─> /robot/mission_results/schedule_{id}

2. Frontend (Real-time)
   └─> Firebase listener detect perubahan
   └─> Auto refresh dari API
   └─> UI update otomatis

3. Laravel (Sync)
   └─> Bisa dipanggil manual via API
   └─> Atau via scheduled job (cron)
   └─> Sync dari Firebase ke MySQL
```

---

## 🛠️ 5. Cara Test Update Status

### Test dari Laravel (Manual):

```bash
# Via API
curl -X PUT http://localhost:8000/api/robot/schedules/1 \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: {token}" \
  -d '{
    "status": "in_progress",
    "progress_percentage": 50
  }'
```

### Test dari Firebase Console:

1. Buka Firebase Console
2. Pilih Realtime Database
3. Navigate ke: `robot/schedules/schedule_1`
4. Edit field `status` menjadi `"in_progress"`
5. Frontend akan otomatis update!

---

## 📝 Catatan Penting

1. **Status yang valid:**
   - `pending` - Menunggu eksekusi
   - `in_progress` - Sedang berjalan
   - `completed` - Selesai
   - `failed` - Gagal
   - `cancelled` - Dibatalkan

2. **Progress Percentage:**
   - Range: 0-100
   - Update otomatis dari robot saat misi berjalan

3. **Real-time Update:**
   - Frontend sudah punya listener
   - Tidak perlu refresh manual
   - Update otomatis dalam beberapa detik

---

## 🚀 Next Steps

Untuk implementasi lengkap, Anda bisa:
1. ✅ Frontend sudah punya real-time listener (sudah ada)
2. ⏳ Tambahkan scheduled job untuk auto-sync dari Firebase ke MySQL
3. ⏳ Tambahkan endpoint untuk update status manual dari Laravel (jika diperlukan)

