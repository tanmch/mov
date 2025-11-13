# MOV Platform - Backend API

**MOV (Mango as an Object Vision)** - Smart Mango Farming Platform with AI-powered Detection & IoT Integration

## 🚀 Technology Stack

- **Backend**: Laravel 12
- **Database**: MySQL (Laragon) + Firebase Realtime Database
- **Authentication**: Firebase Authentication
- **AI Detection**: YOLO (Integration ready)
- **IoT**: Sensor data from Firebase

## 📋 Prerequisites

- PHP >= 8.2
- Composer
- MySQL (Laragon)
- Firebase Project with credentials

## 🛠️ Installation & Setup

### 1. Clone & Install Dependencies

```bash
cd MOV_PROJECT
composer install
```

### 2. Environment Configuration

The `.env` file is already configured with:

```env
APP_NAME="MOV Platform"
DB_CONNECTION=mysql
DB_DATABASE=mov_platform
DB_USERNAME=root
DB_PASSWORD=

FIREBASE_CREDENTIALS=config/firebase-credentials.json
FIREBASE_PROJECT_ID=mov-project-6931c
FIREBASE_DATABASE_URL=https://mov-project-6931c-default-rtdb.asia-southeast1.firebasedatabase.app
```

### 3. Create Database

```bash
# In Laragon, create database named: mov_platform
# Or via MySQL command:
mysql -u root -e "CREATE DATABASE mov_platform"
```

### 4. Run Migrations

```bash
php artisan migrate
```

### 5. Start Development Server

```bash
php artisan serve
```

API will be available at: `http://localhost:8000/api/v1`

---

## 📚 API Documentation

### Base URL
```
http://localhost:8000/api/v1
```

### Authentication
All protected endpoints require Firebase ID Token in Authorization header:
```
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

---

## 🔐 Authentication Endpoints

### 1. Register User
**POST** `/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "081234567890",
  "role": "petani"
}
```

**Roles:**
- `guest` - Can only view articles
- `petani` - Read-only access to dashboard & data
- `k-petani` - Full admin access (CRUD everything)

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "firebase_uid": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "petani"
    }
  }
}
```

### 2. Login (Verify Firebase Token)
**POST** `/auth/login`

**Request Body:**
```json
{
  "idToken": "<FIREBASE_ID_TOKEN>"
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
      "name": "John Doe",
      "email": "user@example.com",
      "role": "petani",
      "last_login_at": "2025-11-09T10:30:00Z"
    },
    "unread_notifications": 5
  }
}
```

### 3. Get Profile
**GET** `/auth/profile` 🔒

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "user@example.com",
      "role": "petani"
    },
    "unread_notifications": 5,
    "kebuns_count": 2
  }
}
```

### 4. Update Profile
**PUT** `/auth/profile` 🔒

**Request Body:**
```json
{
  "name": "John Updated",
  "phone": "081234567890",
  "photo_url": "https://example.com/photo.jpg"
}
```

### 5. Change Password
**PUT** `/auth/change-password` 🔒

**Request Body:**
```json
{
  "new_password": "newpassword123"
}
```

### 6. Logout
**POST** `/auth/logout` 🔒

---

## 👥 User Management (K-Petani Only)

### 1. List All Users
**GET** `/users` 🔒 (K-Petani only)

**Query Parameters:**
- `per_page` (default: 15)
- `role` (filter by role)
- `search` (search by name, email, phone)

### 2. Get User Details
**GET** `/users/{id}` 🔒 (K-Petani only)

### 3. Update User
**PUT** `/users/{id}` 🔒 (K-Petani only)

### 4. Delete User
**DELETE** `/users/{id}` 🔒 (K-Petani only)

### 5. Activate User
**PUT** `/users/{id}/activate` 🔒 (K-Petani only)

### 6. Deactivate User
**PUT** `/users/{id}/deactivate` 🔒 (K-Petani only)

---

## 🔄 Future Endpoints (Phase 2+)

The following endpoints are ready for implementation:

### Dashboard
- `GET /dashboard` - Get dashboard overview

### Kebun Management
- `GET /kebuns` - List all kebuns
- `POST /kebuns` - Create kebun (K-Petani)
- `PUT /kebuns/{id}` - Update kebun (K-Petani)
- `DELETE /kebuns/{id}` - Delete kebun (K-Petani)

### Blok Management
- `GET /bloks` - List all bloks
- `GET /kebuns/{kebun_id}/bloks` - List bloks in kebun

### Sensor Monitoring
- `GET /sensors` - Get sensor readings
- `GET /sensors/latest` - Get latest readings
- `GET /bloks/{id}/sensors` - Get sensors for specific blok

### Detection Results
- `GET /detections` - List detection results
- `POST /detections` - Upload & detect image
- `GET /bloks/{id}/detections` - Detections for specific blok

### Robot Schedules
- `GET /robot-schedules` - List schedules
- `POST /robot-schedules` - Create schedule (K-Petani)
- `PUT /robot-schedules/{id}` - Update schedule (K-Petani)

### Notifications
- `GET /notifications` - Get user notifications
- `PUT /notifications/{id}/read` - Mark as read

### Reports
- `GET /reports/harvest` - Harvest predictions
- `GET /reports/export` - Export data (PDF/Excel)

### Articles (Public)
- `GET /articles` - List articles (accessible to guest)

---

## 🗃️ Database Schema

### Core Tables
1. **users** - User accounts with Firebase UID
2. **kebuns** - Mango farms/gardens
3. **bloks** - Sections within kebuns
4. **robot_schedules** - Robot mission scheduling
5. **sensor_readings** - IoT sensor data
6. **detection_results** - AI detection results
7. **notifications** - User notifications
8. **activity_logs** - Audit trail
9. **system_settings** - System configuration

---

## 🔑 Role-Based Access Control

### Guest
- ✅ View articles
- ❌ All other features

### Petani (Regular User)
- ✅ View dashboard
- ✅ View kebun data
- ✅ View sensor readings
- ✅ View detection results
- ✅ Receive notifications
- ❌ Cannot create/edit/delete

### K-Petani (Admin)
- ✅ **Full access to everything**
- ✅ User management
- ✅ Create/edit/delete kebuns
- ✅ Schedule robot missions
- ✅ System settings
- ✅ Generate reports

---

## 🔄 Data Flow

```
Robot → Firebase Realtime DB → Laravel API → React Frontend
   ↓           ↓                      ↓
Sensors    IoT Data            MySQL (Users, Logs, etc.)
```

---

## 🧪 Testing

### Health Check
```bash
curl http://localhost:8000/api/v1/health
```

### Test Authentication Flow

1. **Register via Firebase** (Frontend)
2. **Get ID Token from Firebase**
3. **Call Login API** with token
4. **Use returned user data** for subsequent requests

---

## 📝 Notes

- All timestamps are in ISO 8601 format
- All API responses follow consistent format:
  ```json
  {
    "success": true/false,
    "message": "...",
    "data": {},
    "errors": {}
  }
  ```
- Pagination uses Laravel's standard format
- Soft deletes are enabled for most models
- Activity logging is automatic for important actions

---

## 🚧 Development Roadmap

### ✅ Phase 1 (Completed)
- Laravel project setup
- Firebase integration
- Authentication system
- Database migrations
- Role-based middleware
- API structure

### 📝 Phase 2 (Next)
- Dashboard endpoints
- Kebun & Blok CRUD
- Sensor monitoring
- Real-time Firebase sync

### 📝 Phase 3
- AI Detection integration
- Robot scheduling
- Notification system

### 📝 Phase 4
- Harvest predictions
- Reports & exports
- Advanced analytics

---

## 🤝 Contributing

This is a university project (IPB - RPL Semester 5)

## 📄 License

Private Educational Project

---

## 📞 Support

For issues or questions, contact the development team.

**Last Updated:** November 9, 2025
**Version:** 1.0.0 (Authentication Phase)
