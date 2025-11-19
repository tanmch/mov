# Firebase Realtime Database Structure

## 📊 Database Tree Structure

```json
{
  "kebuns": {
    "kebun_1": {
      "bloks": {
        "blok_A": {
          "info": {
            "name": "Blok A",
            "luas": 2.5,
            "jumlah_pohon": 50,
            "status": "sehat"
          },
          "sensors": {
            "suhu_udara": {
              "value": 32.5,
              "unit": "°C",
              "status": "normal",
              "timestamp": 1699512345000
            },
            "kelembapan_udara": {
              "value": 65.0,
              "unit": "%",
              "status": "normal",
              "timestamp": 1699512345000
            },
            "kelembapan_tanah": {
              "value": 45.0,
              "unit": "%",
              "status": "normal",
              "timestamp": 1699512345000
            }
          },
          "sensor_history": {
            "1699512345000": {
              "suhu_udara": 32.5,
              "kelembapan_udara": 65.0,
              "kelembapan_tanah": 45.0
            }
          }
        }
      }
    }
  },
  
  "robot": {
    "status": {
      "current_state": "idle",
      "battery_level": 85,
      "current_location": {
        "kebun_id": "kebun_1",
        "blok_id": "blok_A",
        "latitude": -6.123456,
        "longitude": 106.123456
      },
      "last_update": 1699512345000
    },
    
    "schedules": {
      "schedule_1": {
        "schedule_id": 1,
        "blok_id": "blok_A",
        "mission_type": "deteksi",
        "priority": "high",
        "scheduled_at": "2025-11-09T10:00:00Z",
        "status": "pending",
        "mission_details": {
          "capture_images": true,
          "detection_points": 10
        },
        "created_at": 1699512345000
      },
      "schedule_2": {
        "schedule_id": 2,
        "blok_id": "blok_A",
        "mission_type": "penyiraman",
        "priority": "medium",
        "scheduled_at": "2025-11-09T14:00:00Z",
        "status": "pending",
        "mission_details": {
          "water_amount": 50,
          "duration_minutes": 15
        },
        "created_at": 1699512345000
      }
    },
    
    "active_mission": {
      "schedule_id": 1,
      "blok_id": "blok_A",
      "mission_type": "deteksi",
      "started_at": 1699512345000,
      "progress_percentage": 45,
      "current_task": "capturing_images",
      "images_captured": 5,
      "total_images": 10
    },
    
    "mission_results": {
      "schedule_1": {
        "completed_at": 1699512345000,
        "success": true,
        "images_captured": 10,
        "detections": [
          {
            "image_url": "https://storage.googleapis.com/...",
            "maturity_level": "matang",
            "confidence": 95.5,
            "timestamp": 1699512345000
          }
        ]
      }
    }
  },
  
  "detections": {
    "blok_A": {
      "latest": {
        "image_url": "https://storage.googleapis.com/...",
        "maturity_level": "matang",
        "confidence_score": 95.5,
        "mango_count": 3,
        "detected_at": 1699512345000
      },
      "history": {
        "1699512345000": {
          "maturity_level": "matang",
          "confidence_score": 95.5,
          "mango_count": 3
        }
      }
    }
  },
  
  "notifications": {
    "user_1": {
      "notif_1": {
        "title": "Robot Mission Completed",
        "message": "Detection completed at Blok A",
        "type": "robot",
        "is_read": false,
        "created_at": 1699512345000
      },
      "notif_2": {
        "title": "Critical Sensor Alert",
        "message": "Temperature too high at Blok A",
        "type": "sensor",
        "is_read": false,
        "created_at": 1699512345000
      }
    }
  }
}
```

---

## 🤖 ESP32 Robot Integration

### Robot Reads From Firebase:
1. **`/robot/schedules`** - Check for new missions
2. **`/robot/active_mission`** - Get current mission details
3. **`/kebuns/{kebun_id}/bloks/{blok_id}/info`** - Get blok information

### Robot Writes To Firebase:
1. **`/robot/status`** - Update robot status (battery, location, state)
2. **`/robot/active_mission`** - Update mission progress
3. **`/kebuns/{kebun_id}/bloks/{blok_id}/sensors`** - Push sensor readings
4. **`/robot/mission_results`** - Upload mission results
5. **`/detections/{blok_id}`** - Upload detection results with images

---

## 📡 Laravel Integration

### Laravel Reads From Firebase:
1. **Sensor data** - Real-time monitoring
2. **Robot status** - Dashboard updates
3. **Mission progress** - Track robot execution
4. **Detection results** - AI results from robot

### Laravel Writes To Firebase:
1. **Robot schedules** - When K-Petani creates schedule
2. **Mission commands** - Start/stop/cancel missions
3. **Configuration updates** - Sensor thresholds, settings

### Laravel Syncs To MySQL:
- Sensor history (for analytics & charts)
- Mission logs (for audit trail)
- Detection results (for reports)
- Activity logs

---

## 🔒 Firebase Security Rules (to be implemented)

```json
{
  "rules": {
    "kebuns": {
      ".read": "auth != null",
      ".write": "auth != null && auth.token.role == 'k-petani'"
    },
    "robot": {
      "status": {
        ".read": "auth != null",
        ".write": "auth != null"
      },
      "schedules": {
        ".read": "auth != null",
        ".write": "auth != null && auth.token.role == 'k-petani'"
      }
    },
    "notifications": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null"
      }
    }
  }
}
```

---

## 🔄 Real-time Sync Strategy

### Sensor Data (Every 5 minutes):
1. ESP32 writes to Firebase `/kebuns/.../sensors`
2. Laravel listens to changes (webhook or scheduled job)
3. Laravel stores in MySQL `sensor_readings` table
4. Laravel checks thresholds and creates notifications if needed

### Robot Schedules:
1. K-Petani creates schedule via React → Laravel API
2. Laravel stores in MySQL `robot_schedules` table
3. Laravel pushes to Firebase `/robot/schedules`
4. ESP32 reads and executes mission
5. ESP32 updates progress in Firebase
6. Laravel syncs results back to MySQL

### Detection Results:
1. Robot captures image and runs YOLO
2. Robot uploads image to Firebase Storage
3. Robot writes results to Firebase `/detections`
4. Laravel reads and stores in MySQL `detection_results`
5. Laravel updates blok maturity percentages
6. Laravel creates notifications for ready harvest

---

## 📊 Performance Considerations

- **Firebase**: Real-time data, current status (last 24 hours)
- **MySQL**: Historical data, analytics, reporting (all time)
- **Cleanup Job**: Move old Firebase data to MySQL archive weekly
- **Indexing**: Timestamp-based queries for efficient retrieval

---

## 🚀 Next Steps

1. ✅ Structure defined
2. ⏳ Implement Firebase sync service
3. ⏳ Create sensor reading controller
4. ⏳ Create robot schedule controller
5. ⏳ Setup scheduled jobs for sync
6. ⏳ Create webhooks for real-time updates

