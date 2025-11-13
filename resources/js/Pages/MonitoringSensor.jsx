import { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Thermometer, Droplets, Sprout, AlertTriangle, TrendingUp, Calendar, Activity, Wifi, WifiOff, Clock } from 'lucide-react';

// Color palette for different bloks
const getBlokColor = (index) => {
    const colors = [
        { suhu: '#f97316', kelembapan: '#3b82f6', kelembapanTanah: '#22c55e' }, // Orange/Blue/Green
        { suhu: '#ef4444', kelembapan: '#8b5cf6', kelembapanTanah: '#10b981' }, // Red/Purple/Emerald
        { suhu: '#f59e0b', kelembapan: '#06b6d4', kelembapanTanah: '#84cc16' }, // Amber/Cyan/Lime
        { suhu: '#ec4899', kelembapan: '#6366f1', kelembapanTanah: '#14b8a6' }, // Pink/Indigo/Teal
    ];
    return colors[index % colors.length];
};
import { database } from '@/config/firebase';
import { ref, onValue, off } from 'firebase/database';

export default function MonitoringSensor({ 
    bloks = [],
    blokOptions = [], 
    selectedBlokId = 'all', 
    period = '24h',
    currentSensors = {},
    chartData = [],
    chartBlokCodes = [], // Blok codes for chart comparison
    alerts = [],
    lastUpdate = 'Tidak ada data',
    error = null
}) {
    const { auth } = usePage().props;
    const userRole = auth?.user?.role;
    const [selectedPeriod, setSelectedPeriod] = useState(period);
    const [selectedBlok, setSelectedBlok] = useState(selectedBlokId);
    
    // Real-time sensor data state
    const [realtimeSensors, setRealtimeSensors] = useState(currentSensors);
    const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
    const [realtimeLastUpdate, setRealtimeLastUpdate] = useState(lastUpdate);
    const firebaseListenersRef = useRef([]);
    
    // Historical chart data from Firebase - with localStorage persistence
    const [realtimeChartData, setRealtimeChartData] = useState(() => {
        // Load from localStorage on mount
        try {
            const saved = localStorage.getItem('monitoringSensorChartData');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Filter out old data (older than 30 days)
                const now = Date.now();
                const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
                return parsed.filter(point => point.timestamp >= thirtyDaysAgo);
            }
        } catch (e) {
            console.error('Error loading chart data from localStorage:', e);
        }
        return [];
    });

    // Update when props change
    useEffect(() => {
        setSelectedPeriod(period);
        setSelectedBlok(selectedBlokId);
    }, [period, selectedBlokId]);

    // Handle filter changes
    const handlePeriodChange = (newPeriod) => {
        setSelectedPeriod(newPeriod);
        router.get('/sensor', {
            blok_id: selectedBlok,
            period: newPeriod,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleBlokChange = (blokId) => {
        setSelectedBlok(blokId);
        router.get('/sensor', {
            blok_id: blokId,
            period: selectedPeriod,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    // Get sensor values with fallback (prioritize real-time data)
    const sensorsToUse = Object.keys(realtimeSensors).length > 0 ? realtimeSensors : currentSensors;
    const suhuUdara = sensorsToUse?.suhu_udara?.value ?? 0;
    const kelembabanUdara = sensorsToUse?.kelembapan_udara?.value ?? 0;
    const kelembabanTanah = sensorsToUse?.kelembapan_tanah?.value ?? 0;
    
    const suhuStatus = sensorsToUse?.suhu_udara?.status ?? 'normal';
    const kelembabanUdaraStatus = sensorsToUse?.kelembapan_udara?.status ?? 'normal';
    const kelembabanTanahStatus = sensorsToUse?.kelembapan_tanah?.status ?? 'normal';

    const getStatusLabel = (status) => {
        switch (status) {
            case 'critical':
                return 'Kritis';
            case 'warning':
                return 'Peringatan';
            default:
                return 'Normal';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'critical':
                return 'text-red-600';
            case 'warning':
                return 'text-yellow-600';
            default:
                return 'text-gray-600';
        }
    };

    // Update realtime sensors when props change
    useEffect(() => {
        setRealtimeSensors(currentSensors);
        setRealtimeLastUpdate(lastUpdate);
    }, [currentSensors, lastUpdate]);

    // Firebase Real-time Listener
    useEffect(() => {
        // Cleanup previous listeners
        firebaseListenersRef.current.forEach(listener => {
            off(listener.ref, 'value', listener.callback);
        });
        firebaseListenersRef.current = [];

        // If no bloks or selectedBlok is 'all', listen to all accessible bloks
        const bloksToListen = selectedBlok === 'all' 
            ? bloks 
            : bloks.filter(b => b.id.toString() === selectedBlok.toString());

        if (bloksToListen.length === 0) {
            setIsFirebaseConnected(false);
            return;
        }

        const activeListeners = new Set();

        // Setup listeners for each blok
        bloksToListen.forEach(blok => {
            const kebunId = blok.kebun_id || blok.kebun?.id;
            const blokCode = blok.code;
            
            if (!kebunId || !blokCode) return;

            const firebasePath = `kebuns/kebun_${kebunId}/bloks/${blokCode}/sensors`;
            const sensorRef = ref(database, firebasePath);

            const callback = (snapshot) => {
                const data = snapshot.val();
                
                if (data) {
                    activeListeners.add(blokCode);
                    setIsFirebaseConnected(true);

                    // Update sensor data for this blok
                    const sensorUpdates = {};
                    Object.keys(data).forEach(sensorType => {
                        const sensorData = data[sensorType];
                        if (sensorData && sensorData.value !== undefined) {
                            // Determine status based on value
                            let status = 'normal';
                            if (sensorType === 'suhu_udara') {
                                if (sensorData.value >= 40) status = 'critical';
                                else if (sensorData.value >= 35) status = 'warning';
                            } else if (sensorType === 'kelembapan_udara' || sensorType === 'kelembapan_tanah') {
                                if (sensorData.value <= 20) status = 'critical';
                                else if (sensorData.value <= 30) status = 'warning';
                            }

                            sensorUpdates[sensorType] = {
                                value: sensorData.value,
                                unit: sensorData.unit || (sensorType === 'suhu_udara' ? '°C' : '%'),
                                status: sensorData.status || status,
                                timestamp: sensorData.timestamp || Date.now(),
                                blok_id: blok.id,
                                blok_code: blokCode,
                            };
                        }
                    });

                    // Update state with latest sensor data
                    if (Object.keys(sensorUpdates).length > 0) {
                        setRealtimeSensors(prev => ({
                            ...prev,
                            ...sensorUpdates
                        }));

                        // Update last update time
                        const timestamps = Object.values(sensorUpdates)
                            .map(s => s.timestamp || 0)
                            .filter(t => t > 0);
                        
                        if (timestamps.length > 0) {
                            const latestTimestamp = Math.max(...timestamps);
                            const updateTime = new Date(latestTimestamp);
                            setRealtimeLastUpdate(updateTime.toLocaleTimeString('id-ID', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second: '2-digit'
                            }) + ' (Real-time)');
                            
                            // Add to historical chart data (24 hours)
                            const now = new Date();
                            const chartPoint = {
                                time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                                timestamp: latestTimestamp,
                                suhu: sensorUpdates.suhu_udara?.value ?? 0,
                                kelembUdara: sensorUpdates.kelembapan_udara?.value ?? 0,
                                kelembTanah: sensorUpdates.kelembapan_tanah?.value ?? 0,
                            };
                            
                            setRealtimeChartData(prev => {
                                // Remove old data points for this blok with same timestamp (within 5 seconds)
                                const filtered = prev.filter(point => 
                                    !(point.blokId === blokCode && Math.abs(point.timestamp - latestTimestamp) < 5000)
                                );
                                const updated = [...filtered, { ...chartPoint, blokId: blokCode }];
                                
                                // Keep only last 30 days (to support 7d and 30d periods)
                                const thirtyDaysAgo = latestTimestamp - (30 * 24 * 60 * 60 * 1000);
                                const finalData = updated
                                    .filter(point => point.timestamp >= thirtyDaysAgo)
                                    .sort((a, b) => a.timestamp - b.timestamp);
                                
                                // Save to localStorage
                                try {
                                    localStorage.setItem('monitoringSensorChartData', JSON.stringify(finalData));
                                } catch (e) {
                                    console.error('Error saving chart data to localStorage:', e);
                                }
                                
                                return finalData;
                            });
                        }
                    }
                } else {
                    // No data from this listener
                    activeListeners.delete(blokCode);
                    if (activeListeners.size === 0) {
                        setIsFirebaseConnected(false);
                    }
                }
            };

            onValue(sensorRef, callback, (error) => {
                console.error('Firebase listener error:', error);
                setIsFirebaseConnected(false);
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
    }, [bloks, selectedBlok]);

    return (
        <AuthenticatedLayout>
            <Head title="Monitoring Sensor IoT" />
            
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-cyan-50/20 relative overflow-hidden">
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 2px 2px, rgba(16, 185, 129, 0.15) 1px, transparent 0)`,
                        backgroundSize: '50px 50px'
                    }}></div>
                </div>
                
                <div className="relative z-10 p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
                    {/* Enhanced Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        <Card className="p-6 bg-white/90 backdrop-blur-xl border-2 border-emerald-200/50 shadow-2xl overflow-hidden relative">
                            {/* Decorative gradient overlay */}
                            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-400/20 via-cyan-400/20 to-transparent rounded-full blur-3xl -mr-48 -mt-48"></div>
                            <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-green-400/20 via-emerald-400/20 to-transparent rounded-full blur-3xl -ml-36 -mb-36"></div>
                            
                            <div className="relative z-10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <motion.div
                                        animate={{ 
                                            rotate: [0, 5, -5, 0],
                                            scale: [1, 1.05, 1]
                                        }}
                                        transition={{ duration: 4, repeat: Infinity }}
                                        className="w-14 h-14 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/30"
                                    >
                                        <Activity className="w-7 h-7 text-white" />
                                    </motion.div>
                                    <div>
                                        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent mb-1">
                                            Monitoring Sensor IoT
                                        </h1>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-gray-600 font-medium">Real-time & Historis</p>
                                            {isFirebaseConnected && (
                                                <motion.span
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
                                                >
                                                    <motion.div
                                                        animate={{ scale: [1, 1.2, 1] }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                    >
                                                        <Wifi className="w-3 h-3" />
                                                    </motion.div>
                                                    Live
                                                </motion.span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <motion.div
                                    animate={{ rotate: [0, 10, -10, 0] }}
                                    transition={{ duration: 6, repeat: Infinity }}
                                    className="hidden md:block"
                                >
                                    <Sprout className="w-12 h-12 text-emerald-500/60" />
                                </motion.div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Enhanced Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-4"
                        >
                            <Card className="p-5 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-400 shadow-2xl overflow-hidden relative">
                                {/* Animated background */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-200/30 rounded-full blur-2xl -mr-16 -mt-16"></div>
                                
                                <div className="relative z-10 flex items-center gap-4">
                                    <motion.div
                                        animate={{ scale: [1, 1.1, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg"
                                    >
                                        <AlertTriangle className="w-6 h-6 text-white" />
                                    </motion.div>
                                    <p className="text-sm font-bold text-red-700 flex-1">{error}</p>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* Enhanced Filter Blok */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="p-5 bg-white/90 backdrop-blur-xl border-2 border-emerald-200/50 shadow-xl">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                                    <Activity className="w-4 h-4 text-white" />
                                </div>
                                <label className="text-sm font-bold text-gray-800">Pilih Blok Monitoring</label>
                            </div>
                            <select
                                value={selectedBlok}
                                onChange={(e) => handleBlokChange(e.target.value)}
                                className="w-full p-3.5 text-sm border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white font-medium text-gray-700 hover:border-emerald-300"
                            >
                                {(blokOptions || []).map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </Card>
                    </motion.div>

                    {/* Enhanced Notifikasi Anomali */}
                    {alerts && alerts.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card className="p-5 bg-gradient-to-br from-red-50 via-orange-50 to-red-50 border-2 border-red-300/60 shadow-2xl overflow-hidden relative">
                                {/* Animated background */}
                                <div className="absolute top-0 right-0 w-40 h-40 bg-red-200/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <motion.div
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30"
                                        >
                                            <AlertTriangle className="w-6 h-6 text-white" />
                                        </motion.div>
                                        <div>
                                            <h3 className="text-lg font-extrabold text-red-700">Notifikasi Anomali</h3>
                                            <p className="text-xs text-red-600">Peringatan kondisi sensor tidak normal</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {alerts.map((notif, index) => (
                                            <motion.div
                                                key={notif.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                whileHover={{ scale: 1.02, x: 5 }}
                                                className={`p-4 rounded-xl border-2 shadow-lg backdrop-blur-sm ${
                                                    notif.type === 'critical' 
                                                        ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-400' 
                                                        : 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-400'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${
                                                            notif.type === 'critical' ? 'bg-red-500' : 'bg-yellow-500'
                                                        }`}></div>
                                                        <span className="text-sm font-bold text-gray-800">{notif.sensor} - {notif.blok}</span>
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-500 bg-white/80 px-2 py-1 rounded-full">{notif.waktu}</span>
                                                </div>
                                                <p className={`text-sm font-bold mb-2 ${
                                                    notif.type === 'critical' ? 'text-red-700' : 'text-yellow-700'
                                                }`}>{notif.pesan}</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-600">Nilai:</span>
                                                    <span className={`text-xs font-extrabold px-2 py-1 rounded ${
                                                        notif.type === 'critical' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                                    }`}>{notif.nilai}</span>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* Enhanced Sensor Real-time Cards */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                        {/* Suhu Udara Card */}
                        <motion.div 
                            whileHover={{ scale: 1.03, y: -8 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <Card className="p-6 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 border-2 border-orange-300/60 shadow-2xl overflow-hidden relative group hover:shadow-orange-500/20 transition-all duration-300">
                                {/* Animated background glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-300/20 rounded-full blur-2xl -mr-16 -mt-16"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-300/20 rounded-full blur-xl -ml-12 -mb-12"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <motion.div
                                            animate={{ rotate: [0, 10, -10, 0] }}
                                            transition={{ duration: 3, repeat: Infinity }}
                                            className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30"
                                        >
                                            <Thermometer className="w-6 h-6 text-white" />
                                        </motion.div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(suhuStatus)}`}>
                                            {getStatusLabel(suhuStatus)}
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-600 mb-2">Suhu Udara</p>
                                    <p className="text-3xl font-extrabold text-orange-700 mb-1">{suhuUdara.toFixed(1)}°C</p>
                                    <div className="mt-4 h-2 bg-orange-200 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((suhuUdara / 50) * 100, 100)}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"
                                        />
                                    </div>
                                </div>
                            </Card>
                        </motion.div>

                        {/* Kelembaban Udara Card */}
                        <motion.div 
                            whileHover={{ scale: 1.03, y: -8 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <Card className="p-6 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 border-2 border-blue-300/60 shadow-2xl overflow-hidden relative group hover:shadow-blue-500/20 transition-all duration-300">
                                {/* Animated background glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-300/20 rounded-full blur-2xl -mr-16 -mt-16"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-300/20 rounded-full blur-xl -ml-12 -mb-12"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <motion.div
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30"
                                        >
                                            <Droplets className="w-6 h-6 text-white" />
                                        </motion.div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(kelembabanUdaraStatus)}`}>
                                            {getStatusLabel(kelembabanUdaraStatus)}
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-600 mb-2">Kelembaban Udara</p>
                                    <p className="text-3xl font-extrabold text-blue-700 mb-1">{kelembabanUdara.toFixed(1)}%</p>
                                    <div className="mt-4 h-2 bg-blue-200 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((kelembabanUdara / 100) * 100, 100)}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                                        />
                                    </div>
                                </div>
                            </Card>
                        </motion.div>

                        {/* Kelembaban Tanah Card */}
                        <motion.div 
                            whileHover={{ scale: 1.03, y: -8 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <Card className="p-6 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 border-2 border-emerald-300/60 shadow-2xl overflow-hidden relative group hover:shadow-emerald-500/20 transition-all duration-300">
                                {/* Animated background glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-300/20 rounded-full blur-2xl -mr-16 -mt-16"></div>
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-300/20 rounded-full blur-xl -ml-12 -mb-12"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <motion.div
                                            animate={{ rotate: [0, -10, 10, 0] }}
                                            transition={{ duration: 2.5, repeat: Infinity }}
                                            className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30"
                                        >
                                            <Sprout className="w-6 h-6 text-white" />
                                        </motion.div>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(kelembabanTanahStatus)}`}>
                                            {getStatusLabel(kelembabanTanahStatus)}
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-600 mb-2">Kelembaban Tanah</p>
                                    <p className="text-3xl font-extrabold text-emerald-700 mb-1">{kelembabanTanah.toFixed(1)}%</p>
                                    <div className="mt-4 h-2 bg-emerald-200 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min((kelembabanTanah / 100) * 100, 100)}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                                        />
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    </motion.div>

                    {/* Status & Last Update */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center justify-center gap-3"
                    >
                        <Card className="px-4 py-2 bg-white/90 backdrop-blur-xl border border-emerald-200/50 shadow-lg">
                            <div className="flex items-center gap-3">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <p className="text-xs font-medium text-gray-600">
                                    Update: <span className="text-emerald-600 font-semibold">{realtimeLastUpdate || lastUpdate}</span>
                                </p>
                            </div>
                        </Card>
                        {isFirebaseConnected ? (
                            <motion.div
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border-2 border-emerald-300 rounded-xl shadow-lg"
                            >
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                    <Wifi className="w-4 h-4 text-emerald-600" />
                                </motion.div>
                                <span className="text-xs font-bold text-emerald-700">Online</span>
                            </motion.div>
                        ) : (
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border-2 border-gray-300 rounded-xl">
                                <WifiOff className="w-4 h-4 text-gray-500" />
                                <span className="text-xs font-medium text-gray-600">Offline</span>
                            </div>
                        )}
                    </motion.div>

                    {/* Period Selection & Charts */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="p-6 bg-white/90 backdrop-blur-xl border-2 border-emerald-200/50 shadow-2xl overflow-hidden relative">
                            {/* Decorative gradient */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-400/10 via-cyan-400/10 to-transparent rounded-full blur-3xl -mr-32 -mt-32"></div>
                            
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <motion.div
                                            animate={{ rotate: [0, 5, -5, 0] }}
                                            transition={{ duration: 4, repeat: Infinity }}
                                            className="w-12 h-12 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30"
                                        >
                                            <TrendingUp className="w-6 h-6 text-white" />
                                        </motion.div>
                                        <div>
                                            <h3 className="text-lg font-extrabold text-gray-800">Grafik Historis</h3>
                                            <p className="text-xs text-gray-500">Perbandingan data sensor per blok</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 mb-6">
                                    {[
                                        { value: '24h', label: '24 Jam', icon: '📅' },
                                        { value: '7d', label: '7 Hari', icon: '📆' },
                                        { value: '30d', label: '30 Hari', icon: '🗓️' }
                                    ].map((period) => (
                                        <motion.button
                                            key={period.value}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handlePeriodChange(period.value)}
                                            className={`flex-1 h-10 text-xs font-bold rounded-xl transition-all duration-300 ${
                                                selectedPeriod === period.value
                                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-200'
                                            }`}
                                        >
                                            <span className="mr-1">{period.icon}</span>
                                            {period.label}
                                        </motion.button>
                                    ))}
                                </div>

                            {/* Process and display chart data with per-blok comparison */}
                            {(() => {
                                // Get blok codes to display (from backend or from real-time data)
                                let bloksToDisplay = chartBlokCodes || [];
                                
                                // If no blok codes from backend, get from real-time data or all bloks
                                if (bloksToDisplay.length === 0) {
                                    if (realtimeChartData.length > 0) {
                                        bloksToDisplay = [...new Set(realtimeChartData.map(p => p.blokId))].filter(Boolean).sort();
                                    } else {
                                        bloksToDisplay = bloks.map(b => b.code).filter(Boolean).sort();
                                    }
                                }
                                
                                // Combine Firebase real-time data with backend historical data
                                let displayChartData = chartData || [];
                                
                                // Process real-time data from Firebase if available
                                if (realtimeChartData.length > 0 && (selectedPeriod === '24h' || selectedPeriod === '7d' || selectedPeriod === '30d')) {
                                    // Always show all bloks for comparison (ignore selectedBlok filter for chart)
                                    
                                    // Filter data based on selected period
                                    const now = Date.now();
                                    let periodMs = 24 * 60 * 60 * 1000; // Default 24 hours
                                    if (selectedPeriod === '24h') {
                                        periodMs = 24 * 60 * 60 * 1000; // 24 hours
                                    } else if (selectedPeriod === '7d') {
                                        periodMs = 7 * 24 * 60 * 60 * 1000; // 7 days
                                    } else if (selectedPeriod === '30d') {
                                        periodMs = 30 * 24 * 60 * 60 * 1000; // 30 days
                                    }
                                    
                                    const periodStart = now - periodMs;
                                    const filteredRealtimeData = realtimeChartData.filter(point => point.timestamp >= periodStart);
                                    
                                    // Determine grouping interval based on period
                                    let groupIntervalMinutes = 60; // Default: per hour
                                    let timeFormat = 'HH:00'; // Default format
                                    
                                    if (selectedPeriod === '24h') {
                                        groupIntervalMinutes = 60; // Group per hour for 24 hours
                                        timeFormat = 'HH:00';
                                    } else if (selectedPeriod === '7d') {
                                        groupIntervalMinutes = 24 * 60; // Group per day for 7 days
                                        timeFormat = 'DD MMM';
                                    } else if (selectedPeriod === '30d') {
                                        groupIntervalMinutes = 24 * 60; // Group per day for 30 days
                                        timeFormat = 'DD MMM';
                                    }
                                    
                                    // Group by time interval and blok
                                    const groupedData = {};
                                    filteredRealtimeData.forEach(point => {
                                        const date = new Date(point.timestamp);
                                        let timeKey;
                                        
                                        if (selectedPeriod === '24h') {
                                            // Group per hour
                                            timeKey = `${String(date.getHours()).padStart(2, '0')}:00`;
                                        } else {
                                            // Group per day for 7d and 30d
                                            timeKey = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
                                        }
                                        
                                        if (!groupedData[timeKey]) {
                                            groupedData[timeKey] = { time: timeKey };
                                            bloksToDisplay.forEach(code => {
                                                groupedData[timeKey][`suhu_${code}`] = [];
                                                groupedData[timeKey][`kelembUdara_${code}`] = [];
                                                groupedData[timeKey][`kelembTanah_${code}`] = [];
                                            });
                                        }
                                        
                                        if (point.blokId && groupedData[timeKey][`suhu_${point.blokId}`]) {
                                            if (point.suhu !== null && point.suhu !== undefined && point.suhu !== 0) {
                                                groupedData[timeKey][`suhu_${point.blokId}`].push(point.suhu);
                                            }
                                            if (point.kelembUdara !== null && point.kelembUdara !== undefined && point.kelembUdara !== 0) {
                                                groupedData[timeKey][`kelembUdara_${point.blokId}`].push(point.kelembUdara);
                                            }
                                            if (point.kelembTanah !== null && point.kelembTanah !== undefined && point.kelembTanah !== 0) {
                                                groupedData[timeKey][`kelembTanah_${point.blokId}`].push(point.kelembTanah);
                                            }
                                        }
                                    });
                                    
                                    // Convert to array format with averages
                                    const processedData = Object.values(groupedData).map(group => {
                                        const dataPoint = { time: group.time };
                                        bloksToDisplay.forEach(code => {
                                            const suhuValues = group[`suhu_${code}`] || [];
                                            const kelembUdaraValues = group[`kelembUdara_${code}`] || [];
                                            const kelembTanahValues = group[`kelembTanah_${code}`] || [];
                                            
                                            const suhuAvg = suhuValues.length > 0 
                                                ? Math.round((suhuValues.reduce((a, b) => a + b, 0) / suhuValues.length) * 10) / 10 
                                                : null;
                                            const kelembUdaraAvg = kelembUdaraValues.length > 0 
                                                ? Math.round((kelembUdaraValues.reduce((a, b) => a + b, 0) / kelembUdaraValues.length) * 10) / 10 
                                                : null;
                                            const kelembTanahAvg = kelembTanahValues.length > 0 
                                                ? Math.round((kelembTanahValues.reduce((a, b) => a + b, 0) / kelembTanahValues.length) * 10) / 10 
                                                : null;
                                            
                                            dataPoint[`suhu_${code}`] = suhuAvg;
                                            dataPoint[`kelembUdara_${code}`] = kelembUdaraAvg;
                                            dataPoint[`kelembTanah_${code}`] = kelembTanahAvg;
                                        });
                                        return dataPoint;
                                    }).sort((a, b) => {
                                        // Sort by time
                                        if (selectedPeriod === '24h') {
                                            const [aHour] = a.time.split(':').map(Number);
                                            const [bHour] = b.time.split(':').map(Number);
                                            return aHour - bHour;
                                        } else {
                                            // For 7d and 30d, sort by date (parse date string)
                                            try {
                                                const aDate = new Date(a.time.split(' ').reverse().join(' '));
                                                const bDate = new Date(b.time.split(' ').reverse().join(' '));
                                                return aDate - bDate;
                                            } catch (e) {
                                                // Fallback to string comparison
                                                return a.time.localeCompare(b.time);
                                            }
                                        }
                                    });
                                    
                                    // Use real-time data if available, otherwise fallback to backend data
                                    if (processedData.length > 0) {
                                        displayChartData = processedData;
                                    } else if (chartData && chartData.length > 0) {
                                        // Fallback to backend data if no real-time data
                                        displayChartData = chartData;
                                    }
                                } else if (chartData && chartData.length > 0) {
                                    // Use backend data if no real-time data available
                                    displayChartData = chartData;
                                }
                                
                                return (
                                    <>
                                        {/* Chart Suhu - Per Blok Comparison */}
                                        <div className="mb-6">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-sm font-medium text-gray-700">Suhu Udara (°C) - Perbandingan Blok</p>
                                                {isFirebaseConnected && realtimeChartData.length > 0 && (selectedPeriod === '24h' || selectedPeriod === '7d' || selectedPeriod === '30d') && (
                                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                                        <Wifi className="w-3 h-3" />
                                                        Online
                                                    </span>
                                                )}
                                            </div>
                                            {displayChartData.length > 0 && bloksToDisplay.length > 0 ? (
                                                <ResponsiveContainer width="100%" height={250}>
                                                    <LineChart data={displayChartData}>
                                                        <defs>
                                                            {bloksToDisplay.map((code, idx) => {
                                                                const colors = getBlokColor(idx);
                                                                return (
                                                                    <linearGradient key={`suhu-${code}`} id={`colorSuhu_${code}`} x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="5%" stopColor={colors.suhu} stopOpacity={0.8}/>
                                                                        <stop offset="95%" stopColor={colors.suhu} stopOpacity={0.1}/>
                                                                    </linearGradient>
                                                                );
                                                            })}
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                        <XAxis 
                                                            dataKey="time" 
                                                            tick={{ fontSize: 11, fill: '#6b7280' }}
                                                            stroke="#9ca3af"
                                                        />
                                                        <YAxis 
                                                            tick={{ fontSize: 11, fill: '#6b7280' }}
                                                            stroke="#9ca3af"
                                                        />
                                                        <Tooltip 
                                                            contentStyle={{ 
                                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                                border: '1px solid #e5e7eb',
                                                                borderRadius: '8px',
                                                                padding: '8px',
                                                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                                            }}
                                                        />
                                                        <Legend 
                                                            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                                                            iconType="line"
                                                        />
                                                        {bloksToDisplay.map((code, idx) => {
                                                            const colors = getBlokColor(idx);
                                                            const blokName = bloks.find(b => b.code === code)?.name || code;
                                                            return (
                                                                <Line 
                                                                    key={`suhu-${code}`}
                                                                    type="monotone" 
                                                                    dataKey={`suhu_${code}`} 
                                                                    stroke={colors.suhu}
                                                                    name={`Blok ${code} - Suhu`}
                                                                    strokeWidth={2.5}
                                                                    dot={{ fill: colors.suhu, r: 3 }}
                                                                    activeDot={{ r: 5 }}
                                                                    connectNulls={false}
                                                                />
                                                            );
                                                        })}
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-[250px] flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                                    <div className="text-center">
                                                        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                                        <p className="text-sm text-gray-500">Belum ada data historis</p>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {isFirebaseConnected 
                                                                ? 'Menunggu data dari Firebase...' 
                                                                : 'Data akan muncul setelah sensor mengirim data'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Chart Kelembaban Udara - Per Blok Comparison */}
                                        <div className="mb-6">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-sm font-medium text-gray-700">Kelembaban Udara (%) - Perbandingan Blok</p>
                                                {isFirebaseConnected && realtimeChartData.length > 0 && (selectedPeriod === '24h' || selectedPeriod === '7d' || selectedPeriod === '30d') && (
                                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                                        <Wifi className="w-3 h-3" />
                                                        Online
                                                    </span>
                                                )}
                                            </div>
                                            {displayChartData.length > 0 && bloksToDisplay.length > 0 ? (
                                                <ResponsiveContainer width="100%" height={250}>
                                                    <LineChart data={displayChartData}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                        <XAxis 
                                                            dataKey="time" 
                                                            tick={{ fontSize: 11, fill: '#6b7280' }}
                                                            stroke="#9ca3af"
                                                        />
                                                        <YAxis 
                                                            tick={{ fontSize: 11, fill: '#6b7280' }}
                                                            stroke="#9ca3af"
                                                        />
                                                        <Tooltip 
                                                            contentStyle={{ 
                                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                                border: '1px solid #e5e7eb',
                                                                borderRadius: '8px',
                                                                padding: '8px',
                                                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                                            }}
                                                        />
                                                        <Legend 
                                                            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                                                            iconType="line"
                                                        />
                                                        {bloksToDisplay.map((code, idx) => {
                                                            const colors = getBlokColor(idx);
                                                            const blokName = bloks.find(b => b.code === code)?.name || code;
                                                            return (
                                                                <Line 
                                                                    key={`kelembUdara-${code}`}
                                                                    type="monotone" 
                                                                    dataKey={`kelembUdara_${code}`} 
                                                                    stroke={colors.kelembapan}
                                                                    name={`Blok ${code} - Udara`}
                                                                    strokeWidth={2.5}
                                                                    dot={{ fill: colors.kelembapan, r: 3 }}
                                                                    activeDot={{ r: 5 }}
                                                                    connectNulls={false}
                                                                />
                                                            );
                                                        })}
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-[250px] flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                                    <div className="text-center">
                                                        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                                        <p className="text-sm text-gray-500">Belum ada data historis</p>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {isFirebaseConnected 
                                                                ? 'Menunggu data dari Firebase...' 
                                                                : 'Data akan muncul setelah sensor mengirim data'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Chart Kelembaban Tanah - Per Blok Comparison */}
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-sm font-medium text-gray-700">Kelembaban Tanah (%) - Perbandingan Blok</p>
                                                {isFirebaseConnected && realtimeChartData.length > 0 && (selectedPeriod === '24h' || selectedPeriod === '7d' || selectedPeriod === '30d') && (
                                                    <span className="text-xs text-green-600 flex items-center gap-1">
                                                        <Wifi className="w-3 h-3" />
                                                        Online
                                                    </span>
                                                )}
                                            </div>
                                            {displayChartData.length > 0 && bloksToDisplay.length > 0 ? (
                                                <ResponsiveContainer width="100%" height={250}>
                                                    <LineChart data={displayChartData}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                        <XAxis 
                                                            dataKey="time" 
                                                            tick={{ fontSize: 11, fill: '#6b7280' }}
                                                            stroke="#9ca3af"
                                                        />
                                                        <YAxis 
                                                            tick={{ fontSize: 11, fill: '#6b7280' }}
                                                            stroke="#9ca3af"
                                                        />
                                                        <Tooltip 
                                                            contentStyle={{ 
                                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                                border: '1px solid #e5e7eb',
                                                                borderRadius: '8px',
                                                                padding: '8px',
                                                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                                            }}
                                                        />
                                                        <Legend 
                                                            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                                                            iconType="line"
                                                        />
                                                        {bloksToDisplay.map((code, idx) => {
                                                            const colors = getBlokColor(idx);
                                                            const blokName = bloks.find(b => b.code === code)?.name || code;
                                                            return (
                                                                <Line 
                                                                    key={`kelembTanah-${code}`}
                                                                    type="monotone" 
                                                                    dataKey={`kelembTanah_${code}`} 
                                                                    stroke={colors.kelembapanTanah}
                                                                    name={`Blok ${code} - Tanah`}
                                                                    strokeWidth={2.5}
                                                                    dot={{ fill: colors.kelembapanTanah, r: 3 }}
                                                                    activeDot={{ r: 5 }}
                                                                    connectNulls={false}
                                                                />
                                                            );
                                                        })}
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-[250px] flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                                    <div className="text-center">
                                                        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                                        <p className="text-sm text-gray-500">Belum ada data historis</p>
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {isFirebaseConnected 
                                                                ? 'Menunggu data dari Firebase...' 
                                                                : 'Data akan muncul setelah sensor mengirim data'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );
                            })()}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Riwayat Penyiraman Otomatis */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <Card className="p-6 bg-white/90 backdrop-blur-xl border-2 border-blue-200/50 shadow-2xl overflow-hidden relative">
                            {/* Decorative gradient */}
                            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-400/10 via-cyan-400/10 to-transparent rounded-full blur-3xl -mr-24 -mt-24"></div>
                            
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <motion.div
                                        animate={{ rotate: [0, 5, -5, 0] }}
                                        transition={{ duration: 4, repeat: Infinity }}
                                        className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30"
                                    >
                                        <Calendar className="w-6 h-6 text-white" />
                                    </motion.div>
                                    <div>
                                        <h3 className="text-lg font-extrabold text-gray-800">Riwayat Penyiraman Otomatis</h3>
                                        <p className="text-xs text-gray-500">Log aktivitas sistem penyiraman</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {/* Riwayat Penyiraman - Akan diimplementasikan nanti */}
                                    <div className="text-center py-12 bg-gradient-to-br from-blue-50/50 to-cyan-50/50 rounded-xl border-2 border-dashed border-blue-200">
                                        <motion.div
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ duration: 3, repeat: Infinity }}
                                        >
                                            <Calendar className="w-16 h-16 mx-auto mb-4 text-blue-400" />
                                        </motion.div>
                                        <p className="text-sm font-semibold text-gray-600 mb-1">Riwayat penyiraman akan ditampilkan di sini</p>
                                        <p className="text-xs text-gray-500">Fitur ini akan segera tersedia</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Enhanced Info Batas Normal */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <Card className="p-5 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-200/60 shadow-xl overflow-hidden relative">
                            {/* Decorative elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200/20 rounded-full blur-2xl -mr-16 -mt-16"></div>
                            
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg">
                                        <Activity className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-base font-extrabold text-emerald-700">Batas Normal Sensor</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-emerald-200">
                                        <span className="text-sm font-semibold text-gray-700">Suhu Udara</span>
                                        <span className="text-sm font-bold text-emerald-600">20-32°C</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-emerald-200">
                                        <span className="text-sm font-semibold text-gray-700">Kelembaban Udara</span>
                                        <span className="text-sm font-bold text-emerald-600">60-85%</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg border border-emerald-200">
                                        <span className="text-sm font-semibold text-gray-700">Kelembaban Tanah</span>
                                        <span className="text-sm font-bold text-emerald-600">50-75%</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
