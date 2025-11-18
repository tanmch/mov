# 🚀 Start MOV Platform

## Quick Start (Single Command)

```bash
cd "D:\IPB\Semester 5\RPL\Project\MOV_PROJECT"
npm run dev
```

This will start BOTH:
- Laravel server (port 8000)
- Vite dev server (HMR)

---

## Manual Start (If needed)

### Terminal 1 - Laravel:
```bash
cd "D:\IPB\Semester 5\RPL\Project\MOV_PROJECT"
php artisan serve
```

### Terminal 2 - Vite (Same directory):
```bash
cd "D:\IPB\Semester 5\RPL\Project\MOV_PROJECT"
npm run dev
```

---

## Access Application

**Main URL:** http://localhost:8000

**Test Pages:**
- http://localhost:8000/register
- http://localhost:8000/login
- http://localhost:8000/dashboard (after login)
- http://localhost:8000/test-firebase (test connection)

---

## First User Registration

Go to: http://localhost:8000/register

**Create K-Petani (Admin):**
```
Name: Admin MOV
Email: admin@mov.test
Phone: 081234567890
Role: K-Petani
Password: Admin123
Confirm: Admin123
```

**Create Petani (Regular User):**
```
Name: Petani Test
Email: petani@mov.test
Role: Petani (Read-only)
Password: Petani123
```

**Create Guest:**
```
Name: Guest User
Email: guest@mov.test
Role: Guest (Articles only)
Password: Guest123
```

---

## Stop Servers

```bash
# Stop all PHP and Node processes
Get-Process -Name php,node -ErrorAction SilentlyContinue | Stop-Process -Force
```

---

## Troubleshooting

### Port 8000 in use:
```bash
Get-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess | Stop-Process -Force
```

### Clear cache:
```bash
cd MOV_PROJECT
php artisan config:clear
php artisan cache:clear
php artisan view:clear
```

### Rebuild assets:
```bash
cd MOV_PROJECT
npm run build
```

---

**Simple!** Just run `npm run dev` and open `localhost:8000` 🎉

