<?php
/**
 * Quick script to check kebun_id and blok_code
 * Run: php check_kebun_blok.php
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== Daftar Kebun ===\n";
$kebuns = \App\Models\Kebun::all(['id', 'name']);
foreach ($kebuns as $kebun) {
    echo "ID: {$kebun->id} | Name: {$kebun->name}\n";
}

echo "\n=== Daftar Blok ===\n";
$bloks = \App\Models\Blok::with('kebun')->get(['id', 'code', 'name', 'kebun_id']);
foreach ($bloks as $blok) {
    echo "ID: {$blok->id} | Code: {$blok->code} | Name: {$blok->name} | Kebun ID: {$blok->kebun_id}\n";
    echo "  → Firebase Path: kebuns/kebun_{$blok->kebun_id}/bloks/{$blok->code}/sensors\n\n";
}

echo "\n=== Contoh JSON untuk Firebase ===\n";
if ($bloks->count() > 0) {
    $firstBlok = $bloks->first();
    $timestamp = time() * 1000; // milliseconds
    
    $json = [
        'kebuns' => [
            "kebun_{$firstBlok->kebun_id}" => [
                'bloks' => [
                    $firstBlok->code => [
                        'sensors' => [
                            'suhu_udara' => [
                                'value' => 28.5,
                                'unit' => '°C',
                                'status' => 'normal',
                                'timestamp' => $timestamp
                            ],
                            'kelembapan_udara' => [
                                'value' => 75,
                                'unit' => '%',
                                'status' => 'normal',
                                'timestamp' => $timestamp
                            ],
                            'kelembapan_tanah' => [
                                'value' => 62,
                                'unit' => '%',
                                'status' => 'normal',
                                'timestamp' => $timestamp
                            ]
                        ]
                    ]
                ]
            ]
        ]
    ];
    
    echo json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    echo "\n\n";
    echo "Copy JSON di atas dan paste ke Firebase Console di root database!\n";
}

