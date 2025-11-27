<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            margin: 0;
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #10b981;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #10b981;
            margin: 0;
            font-size: 24px;
        }
        .header p {
            color: #6b7280;
            margin: 5px 0;
        }
        .metadata {
            background-color: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .metadata table {
            width: 100%;
        }
        .metadata td {
            padding: 5px;
        }
        .metadata td:first-child {
            font-weight: bold;
            width: 150px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th {
            background-color: #10b981;
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: bold;
        }
        td {
            padding: 8px;
            border-bottom: 1px solid #e5e7eb;
        }
        tr:nth-child(even) {
            background-color: #f9fafb;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            color: #6b7280;
            font-size: 10px;
            border-top: 1px solid #e5e7eb;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ $title }}</h1>
        <p>MOV Platform - Smart Mango Farming</p>
    </div>
    
    <div class="metadata">
        <table>
            <tr>
                <td>Periode:</td>
                <td>{{ $metadata['start_date'] }} - {{ $metadata['end_date'] }}</td>
            </tr>
            <tr>
                <td>Total Data:</td>
                <td>{{ $metadata['total'] }} record</td>
            </tr>
            <tr>
                <td>Dibuat pada:</td>
                <td>{{ $generated_at }}</td>
            </tr>
        </table>
    </div>
    
    @if($data->isNotEmpty())
        <table>
            <thead>
                <tr>
                    @foreach(array_keys($data->first()) as $header)
                        <th>{{ ucwords(str_replace('_', ' ', $header)) }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody>
                @foreach($data as $row)
                    <tr>
                        @foreach($row as $value)
                            <td>{{ $value }}</td>
                        @endforeach
                    </tr>
                @endforeach
            </tbody>
        </table>
    @else
        <p style="text-align: center; color: #6b7280; padding: 40px;">
            Tidak ada data untuk periode yang dipilih.
        </p>
    @endif
    
    <div class="footer">
        <p>Dokumen ini dibuat secara otomatis oleh MOV Platform</p>
        <p>© {{ date('Y') }} MOV Platform. All rights reserved.</p>
    </div>
</body>
</html>
