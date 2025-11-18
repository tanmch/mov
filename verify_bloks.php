<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Verifikasi Blok Kebun ===\n\n";

$kebun = \App\Models\Kebun::with('bloks')->first();

if (!$kebun) {
    echo "❌ Tidak ada kebun ditemukan.\n";
    exit(1);
}

echo "Kebun: {$kebun->name} (ID: {$kebun->id})\n";
echo "Total Blok: " . $kebun->bloks->count() . "\n\n";

echo "Daftar Blok:\n";
echo str_repeat("-", 50) . "\n";
$totalPohon = 0;

foreach ($kebun->bloks as $blok) {
    echo sprintf(
        "  %s | %s | %d pohon | Luas: %.1f ha | Status: %s\n",
        $blok->code,
        $blok->name,
        $blok->jumlah_pohon,
        $blok->luas,
        $blok->status
    );
    $totalPohon += $blok->jumlah_pohon;
}

echo str_repeat("-", 50) . "\n";
echo "Total Pohon: {$totalPohon} pohon\n";
echo "Rata-rata per Blok: " . ($kebun->bloks->count() > 0 ? round($totalPohon / $kebun->bloks->count()) : 0) . " pohon\n\n";

if ($kebun->bloks->count() === 4 && $totalPohon === 280) {
    echo "✅ SUCCESS: 4 blok dengan 70 pohon per blok (total 280 pohon)\n";
} else {
    echo "⚠️  WARNING: Jumlah blok atau pohon tidak sesuai\n";
}

