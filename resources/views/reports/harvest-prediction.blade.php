<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Laporan Prediksi Panen</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #4CAF50;
            padding-bottom: 20px;
        }
        h1 {
            color: #2E7D32;
            margin: 0;
            font-size: 28px;
        }
        .subtitle {
            color: #666;
            margin: 5px 0;
            font-size: 12px;
        }
        .section {
            margin: 25px 0;
        }
        h2 {
            background-color: #4CAF50;
            color: white;
            padding: 10px 15px;
            margin: 0;
            font-size: 16px;
        }
        .content {
            padding: 15px;
            background-color: #f5f5f5;
            margin-top: 0;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 15px 0;
        }
        .summary-item {
            background: white;
            padding: 15px;
            border-left: 4px solid #4CAF50;
        }
        .summary-label {
            color: #999;
            font-size: 12px;
            margin-bottom: 5px;
        }
        .summary-value {
            color: #2E7D32;
            font-size: 22px;
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th {
            background-color: #2E7D32;
            color: white;
            padding: 10px;
            text-align: left;
            font-size: 13px;
        }
        td {
            padding: 10px;
            border-bottom: 1px solid #ddd;
            font-size: 12px;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .readiness-bar {
            width: 100%;
            height: 8px;
            background: #eee;
            border-radius: 4px;
            overflow: hidden;
            display: inline-block;
        }
        .readiness-fill {
            height: 100%;
            background: linear-gradient(to right, #4CAF50, #8BC34A);
            border-radius: 4px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #999;
            font-size: 11px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: bold;
            margin: 2px;
        }
        .badge-ready {
            background-color: #C8E6C9;
            color: #1B5E20;
        }
        .badge-good {
            background-color: #DCEDC8;
            color: #33691E;
        }
        .badge-medium {
            background-color: #FFF9C4;
            color: #F57F17;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 LAPORAN PREDIKSI PANEN MANGGA</h1>
        <div class="subtitle">Kebun Monitoring System</div>
        <div class="subtitle">Digenerate: {{ $generated_at->format('d/m/Y H:i:s') }}</div>
    </div>

    <div class="section">
        <h2>📈 Ringkasan Keseluruhan</h2>
        <div class="content">
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-label">Tanggal Perkiraan Panen</div>
                    <div class="summary-value">{{ $overall['estimated_harvest_date'] }}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Hari Tersisa</div>
                    <div class="summary-value">{{ $overall['days_left'] }} hari</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Total Buah</div>
                    <div class="summary-value">{{ number_format($overall['total_fruits']) }}</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Perkiraan Hasil</div>
                    <div class="summary-value">{{ number_format($overall['expected_yield_ton'], 2) }} ton</div>
                </div>
            </div>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-label">Skor Kualitas Rata-rata</div>
                    <div class="summary-value">{{ $overall['avg_quality_score'] }}%</div>
                </div>
                <div class="summary-item">
                    <div class="summary-label">Blok Siap Panen</div>
                    <div class="summary-value">{{ $overall['blocks_ready_soon'] }}</div>
                </div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>🌾 Prediksi Per Blok</h2>
        <div class="content">
            <table>
                <thead>
                    <tr>
                        <th>Blok</th>
                        <th>Kesiapan</th>
                        <th style="width: 120px;">Progres</th>
                        <th>Buah</th>
                        <th>Tanggal Panen</th>
                        <th>Kualitas</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($blocks as $block)
                        @if ($block['readiness'] > 0)
                            <tr>
                                <td><strong>{{ $block['block_code'] }}</strong></td>
                                <td>{{ $block['readiness'] }}%</td>
                                <td>
                                    <div class="readiness-bar">
                                        <div class="readiness-fill" style="width: {{ $block['readiness'] }}%;"></div>
                                    </div>
                                </td>
                                <td>{{ $block['fruits'] }}</td>
                                <td>{{ $block['harvest_date_range'] }}</td>
                                <td>
                                    <span class="badge badge-{{ $block['readiness'] >= 90 ? 'ready' : ($block['readiness'] >= 70 ? 'good' : 'medium') }}">
                                        {{ $block['quality'] }}
                                    </span>
                                </td>
                            </tr>
                        @endif
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>

    <div class="section">
        <h2>💡 Rekomendasi</h2>
        <div class="content">
            <ul style="margin: 0; padding: 0 20px;">
                @php
                    $readyBlocks = array_filter($blocks, fn($b) => $b['readiness'] >= 90);
                    $readyBlockCodes = array_column($readyBlocks, 'block_code');
                @endphp
                <li style="margin: 8px 0;">
                    <strong>Prioritas Panen:</strong>
                    @if (!empty($readyBlockCodes))
                        Blok {{ implode(', ', $readyBlockCodes) }} siap dipanen dalam 0-3 hari
                    @else
                        Tunggu hingga blok mencapai kesiapan 90%
                    @endif
                </li>
                <li style="margin: 8px 0;"><strong>Waktu Panen Optimal:</strong> 06:00 - 10:00 pagi</li>
                <li style="margin: 8px 0;"><strong>Jumlah Tenaga Kerja:</strong> 5-7 orang untuk hasil optimal</li>
                <li style="margin: 8px 0;"><strong>Persiapan:</strong> Siapkan alat pengangkut, kemasan, dan wadah sortir</li>
                <li style="margin: 8px 0;"><strong>Sortir:</strong> Lakukan pengelompokan berdasarkan kualitas setelah panen</li>
            </ul>
        </div>
    </div>

    <div class="footer">
        <p>Laporan ini digenerate otomatis berdasarkan data deteksi kematangan dari robot monitoring.</p>
        <p>Data valid hingga: {{ $generated_at->format('d/m/Y') }} pukul {{ $generated_at->format('H:i') }}</p>
    </div>
</body>
</html>
