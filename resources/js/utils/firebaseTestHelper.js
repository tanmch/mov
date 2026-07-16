/**
 * Firebase Test Helper - Generate sample sensor data for manual testing
 * 
 * Usage in browser console:
 * 1. Copy function generateSensorData() ke console
 * 2. Panggil: generateSensorData(1, 'A1', 28.5, 75, 62)
 */

export function generateSensorData(kebunId, blokCode, suhu, kelembapanUdara, kelembapanTanah) {
    const timestamp = Date.now();
    
    return {
        [`kebuns/kebun_${kebunId}/bloks/${blokCode}/sensors/suhu_udara`]: {
            value: suhu || 28.5,
            unit: '°C',
            status: suhu >= 40 ? 'critical' : suhu >= 35 ? 'warning' : 'normal',
            timestamp: timestamp
        },
        [`kebuns/kebun_${kebunId}/bloks/${blokCode}/sensors/kelembapan_udara`]: {
            value: kelembapanUdara || 75,
            unit: '%',
            status: kelembapanUdara <= 20 ? 'critical' : kelembapanUdara <= 30 ? 'warning' : 'normal',
            timestamp: timestamp
        },
        [`kebuns/kebun_${kebunId}/bloks/${blokCode}/sensors/kelembapan_tanah`]: {
            value: kelembapanTanah || 62,
            unit: '%',
            status: kelembapanTanah <= 20 ? 'critical' : kelembapanTanah <= 30 ? 'warning' : 'normal',
            timestamp: timestamp
        }
    };
}

/**
 * Generate JSON untuk copy-paste ke Firebase Console
 */
export function generateFirebaseJSON(kebunId, blokCode, suhu, kelembapanUdara, kelembapanTanah) {
    const data = generateSensorData(kebunId, blokCode, suhu, kelembapanUdara, kelembapanTanah);
    
    // Extract just the sensor data (without path)
    return {
        suhu_udara: data[`kebuns/kebun_${kebunId}/bloks/${blokCode}/sensors/suhu_udara`],
        kelembapan_udara: data[`kebuns/kebun_${kebunId}/bloks/${blokCode}/sensors/kelembapan_udara`],
        kelembapan_tanah: data[`kebuns/kebun_${kebunId}/bloks/${blokCode}/sensors/kelembapan_tanah`]
    };
}

/**
 * Helper untuk mendapatkan timestamp sekarang
 */
export function getCurrentTimestamp() {
    return Date.now();
}

