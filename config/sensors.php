<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Sensor Thresholds
    |--------------------------------------------------------------------------
    |
    | Define warning and critical thresholds for each sensor type
    |
    */
    'thresholds' => [
        'suhu_udara' => [
            'warning' => 35,   // °C
            'critical' => 40,  // °C
            'min' => 0,
            'max' => 50,
        ],
        'kelembapan_udara' => [
            'warning' => 30,   // %
            'critical' => 20,  // %
            'min' => 0,
            'max' => 100,
        ],
        'kelembapan_tanah' => [
            'warning' => 30,   // %
            'critical' => 20,  // %
            'min' => 0,
            'max' => 100,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Sensor Units
    |--------------------------------------------------------------------------
    */
    'units' => [
        'suhu_udara' => '°C',
        'kelembapan_udara' => '%',
        'kelembapan_tanah' => '%',
    ],

    /*
    |--------------------------------------------------------------------------
    | Reading Interval (in seconds)
    |--------------------------------------------------------------------------
    */
    'reading_interval' => env('SENSOR_READING_INTERVAL', 300), // 5 minutes

    /*
    |--------------------------------------------------------------------------
    | Data Retention (in days)
    |--------------------------------------------------------------------------
    */
    'data_retention_days' => env('SENSOR_DATA_RETENTION_DAYS', 90),
];

