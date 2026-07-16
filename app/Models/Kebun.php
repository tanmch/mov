<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Kebun extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'location',
        'latitude',
        'longitude',
        'luas',
        'jenis_mangga',
        'status',
        'owner_id',
        'metadata',
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'luas' => 'decimal:2',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Get the owner of this kebun
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Get all bloks in this kebun
     */
    public function bloks(): HasMany
    {
        return $this->hasMany(Blok::class);
    }

    /**
     * Get active bloks only
     */
    public function activeBloks(): HasMany
    {
        return $this->hasMany(Blok::class)->where('status', 'sehat');
    }

    /**
     * Calculate total number of trees in this kebun
     */
    public function getTotalPohonAttribute(): int
    {
        return $this->bloks()->sum('jumlah_pohon');
    }

    /**
     * Get average maturity percentage across all bloks
     */
    public function getAverageMaturityAttribute(): array
    {
        $bloks = $this->bloks()->get();
        
        if ($bloks->isEmpty()) {
            return [
                'mentah' => 0,
                'hampir_matang' => 0,
                'matang' => 0,
                'lewat_matang' => 0,
            ];
        }

        return [
            'mentah' => $bloks->avg('persentase_mentah'),
            'hampir_matang' => $bloks->avg('persentase_hampir_matang'),
            'matang' => $bloks->avg('persentase_matang'),
            'lewat_matang' => $bloks->avg('persentase_lewat_matang'),
        ];
    }
}
