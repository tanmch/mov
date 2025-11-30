import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { database } from '@/config/firebase';
import { ref, onValue, off } from 'firebase/database';
import { useHeaderOffset } from '@/hooks/useHeaderOffset';
import { X } from 'lucide-react';

export default function GlobalRealtimeNotification({ bloks = [] }) {
    const topOffset = useHeaderOffset();
    const [toastNotification, setToastNotification] = useState(null);
    const previousSensorStatusRef = useRef({});
    const notificationCooldownRef = useRef({});
    const firebaseListenersRef = useRef([]);
    const bloksToListenRef = useRef(bloks);

    // Update ref when bloks change
    useEffect(() => {
        bloksToListenRef.current = bloks;
    }, [bloks]);

    // Helper function to calculate status based on thresholds
    const calculateStatus = (sensorType, value) => {
        // Default thresholds (can be customized)
        const thresholds = {
            suhu_udara: { warning: 32, critical: 35 },
            kelembapan_udara: { warning: 50, critical: 40 },
            kelembapan_tanah: { warning: 40, critical: 30 },
        };

        const threshold = thresholds[sensorType];
        if (!threshold) return 'normal';

        if (sensorType === 'suhu_udara') {
            if (value > threshold.critical) return 'critical';
            if (value > threshold.warning) return 'warning';
        } else {
            // For kelembapan (lower is worse)
            if (value < threshold.critical) return 'critical';
            if (value < threshold.warning) return 'warning';
        }

        return 'normal';
    };

    // Firebase listener for sensor data
    useEffect(() => {
        if (!bloks || bloks.length === 0) {
            // Try to discover bloks from Firebase
            const kebunIds = [1];
            const discoveredBloks = [];

            kebunIds.forEach(kebunId => {
                const bloksRef = ref(database, `kebuns/kebun_${kebunId}/bloks`);
                
                const discoveryCallback = (snapshot) => {
                    const bloksData = snapshot.val();
                    if (bloksData && typeof bloksData === 'object') {
                        Object.keys(bloksData).forEach(blokCode => {
                            const blokData = bloksData[blokCode];
                            if (blokData !== null && blokData !== undefined) {
                                discoveredBloks.push({
                                    id: blokCode,
                                    code: blokCode,
                                    kebun_id: kebunId,
                                    name: blokCode
                                });
                            }
                        });
                        bloksToListenRef.current = discoveredBloks;
                    }
                };

                onValue(bloksRef, discoveryCallback);
                firebaseListenersRef.current.push({ ref: bloksRef, callback: discoveryCallback });
            });
        }

        const bloksToListen = bloksToListenRef.current;
        if (!bloksToListen || bloksToListen.length === 0) return;

        bloksToListen.forEach(blok => {
            // Always use kebun_id = 1 for Firebase structure (single kebun in Firebase)
            const kebunId = 1;
            const blokCode = blok.code;
            
            if (!blokCode) return;

            const firebasePath = `kebuns/kebun_${kebunId}/bloks/${blokCode}/sensors`;
            const sensorRef = ref(database, firebasePath);

            const callback = (snapshot) => {
                const data = snapshot.val();
                if (!data) return;

                Object.keys(data).forEach(sensorType => {
                    const sensorData = data[sensorType];
                    if (sensorData && sensorData.value !== undefined) {
                        const value = sensorData.value;
                        const status = calculateStatus(sensorType, value);
                        
                        // Generate notification
                        const sensorKey = `${blokCode}_${sensorType}`;
                        const previousStatus = previousSensorStatusRef.current[sensorKey];
                        
                        // Only generate notification if:
                        // 1. Status changed (not initial load)
                        // 2. Status is warning or critical
                        // 3. Previous status was not undefined
                        // 4. Previous status was normal (to avoid duplicate notifications when status changes from normal to warning/critical)
                        // 5. Or status is warning/critical and previous status was different (to catch all warning/critical changes)
                        if (previousStatus !== undefined && 
                            previousStatus !== status && 
                            (status === 'warning' || status === 'critical') &&
                            (previousStatus === 'normal' || 
                             (previousStatus === 'warning' && status === 'critical') ||
                             (status === 'warning' && previousStatus !== 'warning'))) {
                            
                            // Check cooldown to prevent spam (5 seconds cooldown for same sensor+blok)
                            const cooldownKey = sensorKey;
                            const now = Date.now();
                            const lastNotificationTime = notificationCooldownRef.current[cooldownKey] || 0;
                            const cooldownPeriod = 5000; // 5 seconds
                            
                            if (now - lastNotificationTime >= cooldownPeriod) {
                                const currentBlok = bloksToListenRef.current.find(b => b.code === blokCode);
                                const blokName = currentBlok ? `${currentBlok.code} - ${currentBlok.name}` : blokCode;
                                
                                const sensorLabel = sensorType === 'suhu_udara' ? 'Suhu Udara' 
                                    : sensorType === 'kelembapan_udara' ? 'Kelembapan Udara' 
                                    : 'Kelembapan Tanah';
                                const unit = sensorType === 'suhu_udara' ? '°C' : '%';
                                
                                let message = '';
                                let icon = '⚠️';
                                let type = 'warning';
                                
                                if (status === 'critical') {
                                    if (sensorType === 'suhu_udara') {
                                        message = `Suhu sangat tinggi di ${blokName}! Nilai: ${value}${unit} - Berbahaya untuk tanaman!`;
                                        icon = '🔥';
                                        type = 'critical';
                                    } else if (sensorType === 'kelembapan_udara') {
                                        message = `Kelembapan udara sangat rendah di ${blokName}! Nilai: ${value}${unit} - Kondisi udara terlalu kering!`;
                                        icon = '🌬️';
                                        type = 'critical';
                                    } else if (sensorType === 'kelembapan_tanah') {
                                        message = `Kelembapan tanah sangat rendah di ${blokName}! Nilai: ${value}${unit} - Tanaman membutuhkan penyiraman segera!`;
                                        icon = '💧';
                                        type = 'critical';
                                    }
                                } else {
                                    if (sensorType === 'suhu_udara') {
                                        message = `Suhu melebihi batas normal di ${blokName}. Nilai: ${value}${unit}`;
                                        icon = '🌡️';
                                    } else if (sensorType === 'kelembapan_udara') {
                                        message = `Kelembapan udara rendah di ${blokName}. Nilai: ${value}${unit} - Kondisi udara kering`;
                                        icon = '🌬️';
                                    } else if (sensorType === 'kelembapan_tanah') {
                                        message = `Kelembapan tanah rendah di ${blokName}. Nilai: ${value}${unit} - Disarankan melakukan penyiraman`;
                                        icon = '💧';
                                    }
                                }
                                
                                const notification = {
                                    id: `notif_${Date.now()}_${sensorKey}`,
                                    type: type,
                                    icon: icon,
                                    message: message,
                                    sensor: sensorLabel,
                                    blok: blokName,
                                    value: `${value}${unit}`,
                                    timestamp: now,
                                    time: new Date().toLocaleTimeString('id-ID', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    }),
                                };
                                
                                // Show toast notification (replace previous one)
                                setToastNotification(notification);
                                
                                // Update cooldown
                                notificationCooldownRef.current[cooldownKey] = now;
                                
                                // Auto-remove toast after 5 seconds
                                setTimeout(() => {
                                    setToastNotification(null);
                                }, 5000);
                            }
                            
                            // Update previous status
                            previousSensorStatusRef.current[sensorKey] = status;
                        } else {
                            // Update previous status even if no notification
                            previousSensorStatusRef.current[sensorKey] = status;
                        }
                    }
                });
            };

            onValue(sensorRef, callback, (error) => {
                console.error('Firebase listener error:', error);
            });
            firebaseListenersRef.current.push({ ref: sensorRef, callback });
        });

        // Cleanup function
        return () => {
            firebaseListenersRef.current.forEach(listener => {
                off(listener.ref, 'value', listener.callback);
            });
            firebaseListenersRef.current = [];
        };
    }, [bloks]);

    return (
        <AnimatePresence>
            {toastNotification && (
                <motion.div
                    key={toastNotification.id}
                    initial={{ opacity: 0, x: 400, scale: 0.8, y: -20 }}
                    animate={{ 
                        opacity: 1, 
                        x: 0, 
                        scale: 1, 
                        y: 0,
                    }}
                    exit={{ opacity: 0, x: 400, scale: 0.8, y: -20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    style={{
                        top: `${topOffset}px`,
                    }}
                    className="fixed right-4 z-[9999] max-w-md w-full md:w-auto"
                >
                    <motion.div
                        className={`p-4 rounded-xl border-2 backdrop-blur-xl shadow-2xl cursor-pointer ${
                            toastNotification.type === 'critical'
                                ? 'bg-gradient-to-r from-red-500 via-orange-500 to-red-500 border-red-400 text-white'
                                : toastNotification.type === 'warning'
                                ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400 border-yellow-300 text-white'
                                : 'bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500 border-blue-400 text-white'
                        }`}
                        onClick={() => {
                            setToastNotification(null);
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div className="flex items-start gap-3">
                            <motion.div
                                animate={toastNotification.type === 'critical' ? { 
                                    scale: [1, 1.2, 1],
                                    rotate: [0, 10, -10, 0]
                                } : {}}
                                transition={{ duration: 1, repeat: Infinity }}
                                className="text-2xl flex-shrink-0"
                            >
                                {toastNotification.icon || '🔔'}
                            </motion.div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold mb-1">{toastNotification.message}</p>
                                <div className="flex items-center gap-2 flex-wrap mt-2">
                                    {toastNotification.blok && (
                                        <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full font-medium">
                                            📍 {toastNotification.blok}
                                        </span>
                                    )}
                                    {toastNotification.value && (
                                        <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full font-bold">
                                            {toastNotification.value}
                                        </span>
                                    )}
                                    <span className="text-xs text-white/80 font-medium">
                                        {toastNotification.time}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setToastNotification(null);
                                }}
                                className="flex-shrink-0 hover:bg-white/20 rounded-full p-1 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

