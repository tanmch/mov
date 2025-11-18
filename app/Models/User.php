<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, SoftDeletes, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'firebase_uid',
        'email',
        'name',
        'username',
        'id_kerja',
        'phone',
        'role',
        'photo_url',
        'is_active',
        'last_login_at',
        'preferences',
        'password', // Add password for Laravel auth
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_active' => 'boolean',
        'last_login_at' => 'datetime',
        'preferences' => 'array',
        'password' => 'hashed',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Check if user is K-Petani (admin)
     */
    public function isKPetani(): bool
    {
        return $this->role === 'k-petani';
    }

    /**
     * Check if user is Petani (regular user)
     */
    public function isPetani(): bool
    {
        return $this->role === 'petani';
    }

    /**
     * Check if user is Guest
     */
    public function isGuest(): bool
    {
        return $this->role === 'guest';
    }

    /**
     * Check if user has permission (K-Petani can do everything)
     */
    public function hasPermission(string $action): bool
    {
        if ($this->isKPetani()) {
            return true;
        }

        // Petani has read-only access
        if ($this->isPetani()) {
            return in_array($action, ['view', 'read']);
        }

        // Guest has very limited access
        if ($this->isGuest()) {
            return $action === 'view-articles';
        }

        return false;
    }

    /**
     * Get all kebuns owned by this user
     */
    public function kebuns(): HasMany
    {
        return $this->hasMany(Kebun::class, 'owner_id');
    }

    /**
     * Get all robot schedules created by this user
     */
    public function robotSchedules(): HasMany
    {
        return $this->hasMany(RobotSchedule::class, 'created_by');
    }

    /**
     * Get all notifications for this user
     */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * Get unread notifications count
     */
    public function unreadNotificationsCount(): int
    {
        return $this->notifications()->where('is_read', false)->count();
    }

    /**
     * Get all activity logs for this user
     */
    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    /**
     * Get all detection results uploaded by this user
     */
    public function detectionResults(): HasMany
    {
        return $this->hasMany(DetectionResult::class, 'uploaded_by');
    }

    /**
     * Update last login timestamp
     */
    public function updateLastLogin(): void
    {
        $this->update(['last_login_at' => now()]);
    }
}
