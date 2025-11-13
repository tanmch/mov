import { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { useRole } from '@/hooks/useRole';
import { KPetaniOnly } from '@/Components/RoleGuard';
import { 
    Bot, Thermometer, Droplets, Sprout, TrendingUp, AlertCircle, 
    Battery, MapPin, Calendar, PieChart as PieChartIcon, 
    Zap, Activity, Clock, CheckCircle2, XCircle, RefreshCw, User, Shield,
    Wifi, WifiOff, AlertTriangle, Filter, ChevronDown, BarChart3
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { database } from '@/config/firebase';
import { ref, onValue, off } from 'firebase/database';

export default function Dashboard({ robotStatus, maturityData, sensorData, trendData, notifications, upcomingSchedules, bloks = [], blokOptions = [], selectedTimeRange: initialTimeRange = '24h', selectedBlokId: initialBlokId = 'average' }) {
    const { auth } = usePage().props;
    const { isKPetani, canEdit, userRole } = useRole();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Blok selection and real-time data
    const [selectedBlokId, setSelectedBlokId] = useState(initialBlokId);
    const [selectedTimeRange, setSelectedTimeRange] = useState(initialTimeRange || '24h');
    const [realtimeSensorData, setRealtimeSensorData] = useState({});
    
    // Historical trend data from Firebase (24 hours) - with localStorage persistence
    const [realtimeTrendData, setRealtimeTrendData] = useState(() => {
        // Load from localStorage on mount
        try {
            const saved = localStorage.getItem('dashboardTrendData');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Filter out old data (older than 24 hours)
                const now = Date.now();
                const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
                return parsed.filter(point => point.timestamp >= twentyFourHoursAgo);
            }
        } catch (e) {
            console.error('Error loading trend data from localStorage:', e);
        }
        return [];
    });
    
    const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
    const [isDropdownOpenKondisi, setIsDropdownOpenKondisi] = useState(false);
    const [isDropdownOpenTren, setIsDropdownOpenTren] = useState(false);
    const firebaseListenersRef = useRef([]);
    const selectedBlokIdRef = useRef(selectedBlokId); // Ref to track current selected blok
    
    // Update ref when selectedBlokId changes
    useEffect(() => {
        selectedBlokIdRef.current = selectedBlokId;
    }, [selectedBlokId]);
    
    // Time range options (24 jam terakhir dari Firebase)
    const timeRangeOptions = [
        { value: '15m', label: '15 Menit', icon: '⏱️', minutes: 15 },
        { value: '1h', label: '1 Jam', icon: '🕐', hours: 1 },
        { value: '4h', label: '4 Jam', icon: '🕓', hours: 4 },
        { value: '24h', label: '1 Hari', icon: '📅', hours: 24 },
    ];
    
    // Enhanced blok options with average option
    const enhancedBlokOptions = [
        { value: 'average', label: '📊 Rata-rata Semua Blok', icon: '📊' },
        ...blokOptions.map(opt => ({
            ...opt,
            icon: '📍'
        }))
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown-container')) {
                setIsDropdownOpenKondisi(false);
                setIsDropdownOpenTren(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Firebase Real-time Listener for selected blok or average
    useEffect(() => {
        // Cleanup previous listeners
        firebaseListenersRef.current.forEach(listener => {
            off(listener.ref, 'value', listener.callback);
        });
        firebaseListenersRef.current = [];
        
        // Don't clear trend data - we'll filter by blokId when processing

        if (bloks.length === 0) {
            setIsFirebaseConnected(false);
            return;
        }

        // Always listen to all bloks to collect data for both specific blok and average mode
        // We'll filter the data when processing/displaying
        const bloksToListen = bloks;
        
        // Store bloksToListen in a way that can be accessed in the callback
        const bloksToListenRef = { current: bloksToListen };

        if (bloksToListen.length === 0) {
            setIsFirebaseConnected(false);
            return;
        }

        const allSensorData = {}; // Store data from all bloks for average calculation
        const activeListeners = new Set();

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

                    // Store data per blok
                    allSensorData[blokCode] = {};

                    Object.keys(data).forEach(sensorType => {
                        const sensorData = data[sensorType];
                        if (sensorData && sensorData.value !== undefined) {
                            allSensorData[blokCode][sensorType] = {
                                value: sensorData.value,
                                unit: sensorData.unit || (sensorType === 'suhu_udara' ? '°C' : '%'),
                                status: sensorData.status || 'normal',
                                timestamp: sensorData.timestamp || Date.now(),
                            };
                        }
                    });

                    // Calculate sensor data based on current blok selection (real-time update)
                    // This function will be called after each blok update
                    // Use setTimeout to ensure all blok updates are processed before calculating
                    setTimeout(() => {
                        const currentSelectedBlokId = selectedBlokIdRef.current; // Use ref to get latest value
                        const isAverage = currentSelectedBlokId === 'average';
                        const sensorUpdates = {};
                        
                        if (isAverage) {
                            // Calculate average across all bloks that have data
                            const sensorTypes = ['suhu_udara', 'kelembapan_udara', 'kelembapan_tanah'];
                            sensorTypes.forEach(sensorType => {
                                const values = Object.values(allSensorData)
                                    .map(blokData => blokData[sensorType]?.value)
                                    .filter(v => v !== undefined && v !== null && v !== 0);
                                
                                if (values.length > 0) {
                                    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
                                    
                                    // Determine status based on average value
                                    let status = 'normal';
                                    if (sensorType === 'suhu_udara') {
                                        if (avgValue >= 40) status = 'critical';
                                        else if (avgValue >= 35) status = 'warning';
                                    } else if (sensorType === 'kelembapan_udara' || sensorType === 'kelembapan_tanah') {
                                        if (avgValue <= 20) status = 'critical';
                                        else if (avgValue <= 30) status = 'warning';
                                    }

                                    sensorUpdates[sensorType] = {
                                        value: avgValue,
                                        unit: sensorType === 'suhu_udara' ? '°C' : '%',
                                        status: status,
                                        timestamp: Date.now(),
                                    };
                                }
                            });
                        } else {
                            // Use single blok data - find the selected blok
                            const selectedBlok = bloksToListenRef.current.find(b => b.id.toString() === currentSelectedBlokId.toString());
                            const selectedBlokCode = selectedBlok?.code;
                            
                            if (selectedBlokCode && allSensorData[selectedBlokCode]) {
                                Object.keys(allSensorData[selectedBlokCode] || {}).forEach(sensorType => {
                                    const sensorData = allSensorData[selectedBlokCode][sensorType];
                                    if (sensorData && sensorData.value !== undefined) {
                                        let status = 'normal';
                                        if (sensorType === 'suhu_udara') {
                                            if (sensorData.value >= 40) status = 'critical';
                                            else if (sensorData.value >= 35) status = 'warning';
                                        } else if (sensorType === 'kelembapan_udara' || sensorType === 'kelembapan_tanah') {
                                            if (sensorData.value <= 20) status = 'critical';
                                            else if (sensorData.value <= 30) status = 'warning';
                                        }
                                        sensorUpdates[sensorType] = {
                                            ...sensorData,
                                            status: status,
                                        };
                                    }
                                });
                            }
                        }

                        // Update real-time sensor data for "Kondisi Lingkungan"
                        if (Object.keys(sensorUpdates).length > 0) {
                            setRealtimeSensorData(sensorUpdates);
                        }
                    }, 100); // Small delay to ensure all blok updates are processed

                    // Build trend data with timestamp (24 jam terakhir) - store per blok
                    // Always store data per blok separately, we'll calculate average when displaying
                    const now = new Date();
                    const timestamp = now.getTime();
                    
                    // Store trend data for this specific blok (not average)
                    const trendPoint = {
                        time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                        timestamp: timestamp,
                        blokId: blokCode, // Always store with blok code
                        suhu: allSensorData[blokCode]?.suhu_udara?.value ?? 0,
                        kelembapan: allSensorData[blokCode]?.kelembapan_udara?.value ?? 0,
                        kelembapanTanah: allSensorData[blokCode]?.kelembapan_tanah?.value ?? 0,
                    };
                    
                    setRealtimeTrendData(prev => {
                        // Remove old data points for this blok with same timestamp (within 5 seconds) to avoid duplicates
                        const filtered = prev.filter(point => 
                            !(point.blokId === blokCode && Math.abs(point.timestamp - timestamp) < 5000)
                        );
                        const updated = [...filtered, trendPoint];
                        // Keep only last 24 hours of data
                        const twentyFourHoursAgo = timestamp - (24 * 60 * 60 * 1000);
                        const finalData = updated
                            .filter(point => point.timestamp >= twentyFourHoursAgo)
                            .sort((a, b) => a.timestamp - b.timestamp);
                        
                        // Save to localStorage
                        try {
                            localStorage.setItem('dashboardTrendData', JSON.stringify(finalData));
                        } catch (e) {
                            console.error('Error saving trend data to localStorage:', e);
                        }
                        
                        return finalData;
                    });
                } else {
                    activeListeners.delete(blokCode);
                    if (activeListeners.size === 0) {
                        setIsFirebaseConnected(false);
                    }
                }
            };

            onValue(sensorRef, callback, (error) => {
                console.error('Firebase listener error:', error);
                activeListeners.delete(blokCode);
                if (activeListeners.size === 0) {
                    setIsFirebaseConnected(false);
                }
            });
            firebaseListenersRef.current.push({ ref: sensorRef, callback });
        });

        return () => {
            firebaseListenersRef.current.forEach(listener => {
                off(listener.ref, 'value', listener.callback);
            });
            firebaseListenersRef.current = [];
        };
    }, [selectedBlokId, bloks, selectedTimeRange]);

    // Get sensor status helper
    const getSensorStatus = (type, value) => {
        if (type === 'suhu') {
            if (value >= 40) return 'critical';
            if (value >= 35) return 'warning';
            return 'normal';
        } else if (type === 'kelembapan') {
            if (value <= 20) return 'critical';
            if (value <= 30) return 'warning';
            return 'normal';
        }
        return 'normal';
    };

    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'critical':
                return 'bg-red-500 text-white';
            case 'warning':
                return 'bg-yellow-500 text-white';
            default:
                return 'bg-green-500 text-white';
        }
    };

    // Get displayed sensor data (from Firebase or fallback to props)
    const getDisplayedSensorData = () => {
        if (Object.keys(realtimeSensorData).length > 0) {
            return {
                suhuUdara: realtimeSensorData.suhu_udara?.value ?? 0,
                kelembabanUdara: realtimeSensorData.kelembapan_udara?.value ?? 0,
                kelembabanTanah: realtimeSensorData.kelembapan_tanah?.value ?? 0,
            };
        }
        return {
            suhuUdara: sensorData.suhuUdara ?? 0,
            kelembabanUdara: sensorData.kelembabanUdara ?? 0,
            kelembabanTanah: sensorData.kelembabanTanah ?? 0,
        };
    };

    const displayedData = getDisplayedSensorData();
    
    // Process trend data from Firebase based on selected time range and blok
    const processTrendData = () => {
        if (realtimeTrendData.length === 0) {
            return [];
        }

        const now = Date.now();
        const selectedRange = timeRangeOptions.find(opt => opt.value === selectedTimeRange);
        let cutoffTime;
        if (selectedTimeRange === '15m') {
            cutoffTime = now - (15 * 60 * 1000); // 15 minutes
        } else {
            const hours = selectedRange?.hours || 24;
            cutoffTime = now - (hours * 60 * 60 * 1000);
        }

        // Filter data within selected time range
        const timeFilteredData = realtimeTrendData.filter(point => point.timestamp >= cutoffTime);

        let filteredData = [];
        
        if (selectedBlokId === 'average') {
            // For average: group by timestamp and calculate average across all bloks
            const groupedByTime = {};
            timeFilteredData.forEach(point => {
                if (!groupedByTime[point.timestamp]) {
                    groupedByTime[point.timestamp] = { suhu: [], kelembapan: [], kelembapanTanah: [], timestamp: point.timestamp, time: point.time };
                }
                groupedByTime[point.timestamp].suhu.push(point.suhu);
                groupedByTime[point.timestamp].kelembapan.push(point.kelembapan);
                groupedByTime[point.timestamp].kelembapanTanah.push(point.kelembapanTanah);
            });
            
            filteredData = Object.values(groupedByTime).map(group => ({
                time: group.time,
                timestamp: group.timestamp,
                suhu: group.suhu.length > 0 ? group.suhu.reduce((a, b) => a + b, 0) / group.suhu.length : 0,
                kelembapan: group.kelembapan.length > 0 ? group.kelembapan.reduce((a, b) => a + b, 0) / group.kelembapan.length : 0,
                kelembapanTanah: group.kelembapanTanah.length > 0 ? group.kelembapanTanah.reduce((a, b) => a + b, 0) / group.kelembapanTanah.length : 0,
            }));
        } else {
            // For specific blok: filter by blok code
            const currentBlokCode = bloks.find(b => b.id.toString() === selectedBlokId.toString())?.code || null;
            filteredData = timeFilteredData.filter(point => point.blokId === currentBlokCode);
        }

        if (filteredData.length === 0) {
            return [];
        }

        // Group data based on time range
        let groupedData = [];
        
        const groups = {};
        filteredData.forEach(point => {
            const date = new Date(point.timestamp);
            let key;
            
            if (selectedTimeRange === '15m') {
                // Group per 1 minute for 15 minutes
                key = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
            } else if (selectedTimeRange === '1h') {
                // Group by 5 minutes for 1 hour
                const minutes = date.getMinutes();
                const roundedMinutes = Math.floor(minutes / 5) * 5;
                key = `${String(date.getHours()).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
            } else if (selectedTimeRange === '4h') {
                // Group by 15 minutes for 4 hours
                const minutes = date.getMinutes();
                const roundedMinutes = Math.floor(minutes / 15) * 15;
                key = `${String(date.getHours()).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
            } else {
                // Group by hour for 24h
                key = `${String(date.getHours()).padStart(2, '0')}:00`;
            }

            if (!groups[key]) {
                groups[key] = { suhu: [], kelembapan: [], kelembapanTanah: [], time: key, timestamp: point.timestamp };
            }
            groups[key].suhu.push(point.suhu);
            groups[key].kelembapan.push(point.kelembapan);
            groups[key].kelembapanTanah.push(point.kelembapanTanah);
        });

        groupedData = Object.values(groups).map(group => ({
            time: group.time,
            suhu: group.suhu.length > 0 ? Math.round((group.suhu.reduce((a, b) => a + b, 0) / group.suhu.length) * 10) / 10 : 0,
            kelembapan: group.kelembapan.length > 0 ? Math.round((group.kelembapan.reduce((a, b) => a + b, 0) / group.kelembapan.length) * 10) / 10 : 0,
            kelembapanTanah: group.kelembapanTanah.length > 0 ? Math.round((group.kelembapanTanah.reduce((a, b) => a + b, 0) / group.kelembapanTanah.length) * 10) / 10 : 0,
        })).sort((a, b) => {
            // Sort by time (HH:MM format)
            const [aHour, aMin] = a.time.split(':').map(Number);
            const [bHour, bMin] = b.time.split(':').map(Number);
            if (aHour !== bHour) {
                return aHour - bHour;
            }
            return (aMin || 0) - (bMin || 0);
        });

        return groupedData;
    };

    const displayedTrendData = processTrendData();
    
    // Get selected blok label
    const getSelectedBlokLabel = () => {
        if (selectedBlokId === 'average') {
            return '📊 Rata-rata Semua Blok';
        }
        const selected = enhancedBlokOptions.find(opt => opt.value.toString() === selectedBlokId.toString());
        return selected?.label || 'Pilih Blok';
    };
    
    // Handle time range change (only update state, data filtered from Firebase)
    const handleTimeRangeChange = (range) => {
        setSelectedTimeRange(range);
        // No need to reload from backend, data is from Firebase
    };
    
    // Handle blok change (reload Firebase listeners)
    const handleBlokChange = (blokId) => {
        setSelectedBlokId(blokId);
        // Firebase listener will automatically update when selectedBlokId changes
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'aktif':
            case 'active':
                return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-400 shadow-lg shadow-green-500/30';
            case 'idle':
                return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-300 shadow-lg shadow-gray-400/30';
            case 'charging':
                return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-yellow-300 shadow-lg shadow-yellow-400/30';
            case 'offline':
                return 'bg-gradient-to-r from-red-400 to-red-500 text-white border-red-300 shadow-lg shadow-red-400/30';
            default:
                return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-300';
        }
    };

    const getBatteryColor = (level) => {
        if (level > 60) return 'text-green-500';
        if (level > 30) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getBatteryGradient = (level) => {
        if (level > 60) return 'from-green-400 to-emerald-500';
        if (level > 30) return 'from-yellow-400 to-amber-500';
        return 'from-red-400 to-red-500';
    };

    const getRoleLabel = (role) => {
        switch (role) {
            case 'k-petani':
                return 'K-Petani';
            case 'petani':
                return 'Petani';
            case 'guest':
                return 'Guest';
            default:
                return role;
        }
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'k-petani':
                return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-400 shadow-lg shadow-green-500/30';
            case 'petani':
                return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-400 shadow-lg shadow-blue-500/30';
            case 'guest':
                return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-300 shadow-lg shadow-gray-400/30';
            default:
                return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-300';
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
        }, 1000);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: [0.4, 0, 0.2, 1]
            }
        }
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('id-ID', { 
            weekday: 'short', 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard" />

            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-blue-50/30">
                <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
                    {/* Header dengan Gradient & Animation */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6"
                    >
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <motion.div
                                    animate={{ rotate: [0, 10, -10, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                    className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"
                                >
                                    <Activity className="w-6 h-6 text-white" />
                                </motion.div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                        Dashboard
                                    </h1>
                                    <p className="text-sm text-gray-600">Ringkasan Sistem MOV</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Info Card dengan Glassmorphism */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white/80 backdrop-blur-xl border border-green-200/50 rounded-2xl shadow-xl px-4 py-3"
                            >
                                <div className="flex items-center gap-3">
                                    {/* Role Badge */}
                                    <div className="flex flex-col items-center gap-1">
                                        <motion.div
                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                            className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"
                                        >
                                            <Shield className="w-5 h-5 text-white" />
                                        </motion.div>
                                        <motion.span
                                            initial={{ scale: 0.8 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.4 }}
                                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${getRoleBadge(userRole)} border-2`}
                                        >
                                            {getRoleLabel(userRole)}
                                        </motion.span>
                                    </div>

                                    {/* Divider */}
                                    <div className="w-px h-12 bg-gradient-to-b from-transparent via-green-200 to-transparent" />

                                    {/* Time & Date */}
                                    <div className="flex flex-col gap-1">
                                        {/* Time */}
                                        <motion.div
                                            key={formatTime(currentTime)}
                                            initial={{ scale: 1.1, opacity: 0.5 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.3 }}
                                            className="flex items-center gap-2"
                                        >
                                            <motion.div
                                                animate={{ rotate: [0, 360] }}
                                                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                                            >
                                                <Clock className="w-4 h-4 text-green-600" />
                                            </motion.div>
                                            <p className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-mono">
                                                {formatTime(currentTime)}
                                            </p>
                                        </motion.div>

                                        {/* Date */}
                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.5 }}
                                            className="flex items-center gap-1.5"
                                        >
                                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                            <p className="text-xs font-medium text-gray-600">
                                                {formatDate(currentTime)}
                                            </p>
                                        </motion.div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Refresh Button */}
                            <motion.button
                                whileHover={{ scale: 1.05, rotate: 90 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleRefresh}
                                className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg shadow-green-500/30"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </motion.button>
                        </div>
                    </motion.div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-4 md:space-y-6"
                    >
                        {/* Status Robot - Enhanced Card */}
                        <motion.div variants={itemVariants}>
                            <Card className="p-4 md:p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 border-2 border-green-200/50 shadow-xl overflow-hidden relative">
                                {/* Animated Background Pattern */}
                                <div className="absolute inset-0 opacity-5">
                                    <div className="absolute inset-0" style={{
                                        backgroundImage: `radial-gradient(circle at 2px 2px, green 1px, transparent 0)`,
                                        backgroundSize: '40px 40px'
                                    }}></div>
                                </div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <motion.div
                                                animate={{ 
                                                    scale: robotStatus.status === 'aktif' || robotStatus.status === 'active' ? [1, 1.1, 1] : 1,
                                                    rotate: robotStatus.status === 'aktif' || robotStatus.status === 'active' ? [0, 5, -5, 0] : 0
                                                }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"
                                            >
                                                <Bot className="w-6 h-6 text-white" />
                                            </motion.div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800">{robotStatus.nama}</h3>
                                                <p className="text-xs text-gray-600">Status Robot</p>
                                            </div>
                                        </div>
                                        <motion.span
                                            whileHover={{ scale: 1.05 }}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-full border-2 shadow-lg ${getStatusColor(robotStatus.status)}`}
                                        >
                                            {robotStatus.status.toUpperCase()}
                                        </motion.span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-white/50 shadow-md"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <Battery className={`w-5 h-5 ${getBatteryColor(robotStatus.battery)}`} />
                                                <span className="text-xs font-medium text-gray-600">Baterai</span>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <p className={`text-2xl font-bold ${getBatteryColor(robotStatus.battery)}`}>
                                                    {robotStatus.battery}
                                                </p>
                                                <span className="text-xs text-gray-500">%</span>
                                            </div>
                                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${robotStatus.battery}%` }}
                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                    className={`h-full bg-gradient-to-r ${getBatteryGradient(robotStatus.battery)} rounded-full`}
                                                />
                                            </div>
                                        </motion.div>
                                        <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-white/50 shadow-md"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <MapPin className="w-5 h-5 text-blue-500" />
                                                <span className="text-xs font-medium text-gray-600">Lokasi</span>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-800 leading-tight">{robotStatus.lokasi}</p>
                                        </motion.div>
                                    </div>

                                    {(robotStatus.status === 'aktif' || robotStatus.status === 'active') && robotStatus.misi && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-white/50 shadow-md"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-medium text-gray-700">{robotStatus.misi}</span>
                                                <span className="text-xs font-bold text-green-600">{robotStatus.progress}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${robotStatus.progress}%` }}
                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-sm"
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>

                        {/* Grid Layout untuk Desktop */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            {/* Persentase Kematangan - Enhanced Pie Chart */}
                            <motion.div variants={itemVariants}>
                                <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-purple-200/50 shadow-xl">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                                            <PieChartIcon className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-800">Kematangan Buah</h3>
                                            <p className="text-xs text-gray-500">Rata-rata per Blok</p>
                                        </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie
                                                data={maturityData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={80}
                                                paddingAngle={3}
                                                dataKey="value"
                                                label={(entry) => `${entry.value}%`}
                                                labelStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                            >
                                                {maturityData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ 
                                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    padding: '8px'
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        {maturityData.map((item, index) => (
                                            <motion.div
                                                key={item.name}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></div>
                                                <span className="text-xs font-medium text-gray-700">{item.name}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </Card>
                            </motion.div>

                            {/* Kondisi Lingkungan - Enhanced dengan Blok Selection */}
                            <motion.div variants={itemVariants} className="space-y-3">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-yellow-500" />
                                        Kondisi Lingkungan
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {isFirebaseConnected && (
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full border border-green-200"
                                            >
                                                <Wifi className="w-3 h-3" />
                                                <span>Online</span>
                                            </motion.div>
                                        )}
                                        {enhancedBlokOptions.length > 0 && (
                                            <div className="relative dropdown-container">
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => {
                                                        setIsDropdownOpenKondisi(!isDropdownOpenKondisi);
                                                        setIsDropdownOpenTren(false);
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-medium text-xs min-w-[180px] justify-between"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <BarChart3 className="w-4 h-4" />
                                                        <span className="truncate">{getSelectedBlokLabel()}</span>
                                                    </div>
                                                    <motion.div
                                                        animate={{ rotate: isDropdownOpenKondisi ? 180 : 0 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <ChevronDown className="w-4 h-4" />
                                                    </motion.div>
                                                </motion.button>
                                                
                                                <AnimatePresence>
                                                    {isDropdownOpenKondisi && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border-2 border-gray-100 overflow-hidden z-50"
                                                        >
                                                            <div className="max-h-60 overflow-y-auto">
                                                                {enhancedBlokOptions.map((opt, index) => (
                                                                    <motion.button
                                                                        key={opt.value}
                                                                        initial={{ opacity: 0, x: -20 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        transition={{ delay: index * 0.05 }}
                                                                        whileHover={{ backgroundColor: '#f3f4f6' }}
                                                                        onClick={() => {
                                                                            handleBlokChange(opt.value);
                                                                            setIsDropdownOpenKondisi(false);
                                                                        }}
                                                                        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
                                                                            selectedBlokId === opt.value 
                                                                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500' 
                                                                                : 'hover:bg-gray-50'
                                                                        }`}
                                                                    >
                                                                        <span className="text-lg">{opt.icon}</span>
                                                                        <span className="text-sm font-medium text-gray-700 flex-1">{opt.label}</span>
                                                                        {selectedBlokId === opt.value && (
                                                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                                        )}
                                                                    </motion.button>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {(() => {
                                        const suhuStatus = getSensorStatus('suhu', displayedData.suhuUdara);
                                        const kelembapanUdaraStatus = getSensorStatus('kelembapan', displayedData.kelembabanUdara);
                                        const kelembapanTanahStatus = getSensorStatus('kelembapan', displayedData.kelembabanTanah);
                                        
                                        return (
                                            <>
                                                <motion.div
                                                    whileHover={{ scale: 1.05, y: -5 }}
                                                    className="relative"
                                                >
                                                    <Card className={`p-4 bg-gradient-to-br from-orange-50 via-orange-100 to-amber-50 border-2 ${
                                                        suhuStatus === 'critical' ? 'border-red-300' : 
                                                        suhuStatus === 'warning' ? 'border-yellow-300' : 
                                                        'border-orange-200/50'
                                                    } shadow-lg overflow-hidden`}>
                                                        <div className="absolute top-0 right-0 w-20 h-20 bg-orange-200/20 rounded-full -mr-10 -mt-10"></div>
                                                        <div className="relative z-10 flex flex-col items-center">
                                                            <div className="flex items-center gap-1 mb-1">
                                                                <motion.div
                                                                    animate={{ rotate: [0, 10, -10, 0] }}
                                                                    transition={{ duration: 3, repeat: Infinity }}
                                                                >
                                                                    <Thermometer className="w-6 h-6 text-orange-600" />
                                                                </motion.div>
                                                                {suhuStatus !== 'normal' && (
                                                                    <AlertTriangle className={`w-4 h-4 ${
                                                                        suhuStatus === 'critical' ? 'text-red-600' : 'text-yellow-600'
                                                                    }`} />
                                                                )}
                                                            </div>
                                                            <p className="text-xs font-medium text-gray-700 text-center mb-1">Suhu</p>
                                                            <p className="text-xl font-bold text-orange-700 mb-1">
                                                                {displayedData.suhuUdara?.toFixed(1) || '0.0'}°C
                                                            </p>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusBadgeColor(suhuStatus)}`}>
                                                                {suhuStatus === 'critical' ? 'Kritis' : suhuStatus === 'warning' ? 'Peringatan' : 'Normal'}
                                                            </span>
                                                        </div>
                                                    </Card>
                                                </motion.div>

                                                <motion.div
                                                    whileHover={{ scale: 1.05, y: -5 }}
                                                    className="relative"
                                                >
                                                    <Card className={`p-4 bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-50 border-2 ${
                                                        kelembapanUdaraStatus === 'critical' ? 'border-red-300' : 
                                                        kelembapanUdaraStatus === 'warning' ? 'border-yellow-300' : 
                                                        'border-blue-200/50'
                                                    } shadow-lg overflow-hidden`}>
                                                        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/20 rounded-full -mr-10 -mt-10"></div>
                                                        <div className="relative z-10 flex flex-col items-center">
                                                            <div className="flex items-center gap-1 mb-1">
                                                                <motion.div
                                                                    animate={{ scale: [1, 1.1, 1] }}
                                                                    transition={{ duration: 2, repeat: Infinity }}
                                                                >
                                                                    <Droplets className="w-6 h-6 text-blue-600" />
                                                                </motion.div>
                                                                {kelembapanUdaraStatus !== 'normal' && (
                                                                    <AlertTriangle className={`w-4 h-4 ${
                                                                        kelembapanUdaraStatus === 'critical' ? 'text-red-600' : 'text-yellow-600'
                                                                    }`} />
                                                                )}
                                                            </div>
                                                            <p className="text-xs font-medium text-gray-700 text-center mb-1">Kelemb. Udara</p>
                                                            <p className="text-xl font-bold text-blue-700 mb-1">
                                                                {displayedData.kelembabanUdara?.toFixed(1) || '0.0'}%
                                                            </p>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusBadgeColor(kelembapanUdaraStatus)}`}>
                                                                {kelembapanUdaraStatus === 'critical' ? 'Kritis' : kelembapanUdaraStatus === 'warning' ? 'Peringatan' : 'Normal'}
                                                            </span>
                                                        </div>
                                                    </Card>
                                                </motion.div>

                                                <motion.div
                                                    whileHover={{ scale: 1.05, y: -5 }}
                                                    className="relative"
                                                >
                                                    <Card className={`p-4 bg-gradient-to-br from-green-50 via-emerald-100 to-green-50 border-2 ${
                                                        kelembapanTanahStatus === 'critical' ? 'border-red-300' : 
                                                        kelembapanTanahStatus === 'warning' ? 'border-yellow-300' : 
                                                        'border-green-200/50'
                                                    } shadow-lg overflow-hidden`}>
                                                        <div className="absolute top-0 right-0 w-20 h-20 bg-green-200/20 rounded-full -mr-10 -mt-10"></div>
                                                        <div className="relative z-10 flex flex-col items-center">
                                                            <div className="flex items-center gap-1 mb-1">
                                                                <motion.div
                                                                    animate={{ rotate: [0, -10, 10, 0] }}
                                                                    transition={{ duration: 2.5, repeat: Infinity }}
                                                                >
                                                                    <Sprout className="w-6 h-6 text-green-600" />
                                                                </motion.div>
                                                                {kelembapanTanahStatus !== 'normal' && (
                                                                    <AlertTriangle className={`w-4 h-4 ${
                                                                        kelembapanTanahStatus === 'critical' ? 'text-red-600' : 'text-yellow-600'
                                                                    }`} />
                                                                )}
                                                            </div>
                                                            <p className="text-xs font-medium text-gray-700 text-center mb-1">Kelemb. Tanah</p>
                                                            <p className="text-xl font-bold text-green-700 mb-1">
                                                                {displayedData.kelembabanTanah?.toFixed(1) || '0.0'}%
                                                            </p>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusBadgeColor(kelembapanTanahStatus)}`}>
                                                                {kelembapanTanahStatus === 'critical' ? 'Kritis' : kelembapanTanahStatus === 'warning' ? 'Peringatan' : 'Normal'}
                                                            </span>
                                                        </div>
                                                    </Card>
                                                </motion.div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </motion.div>
                        </div>

                        {/* Notifikasi Real-time - Enhanced */}
                        <motion.div variants={itemVariants}>
                            <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-blue-200/50 shadow-xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                                        <AlertCircle className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-800">Notifikasi Real-time</h3>
                                </div>
                                {notifications.length > 0 ? (
                                    <div className="space-y-2">
                                        <AnimatePresence>
                                            {notifications.map((notif, index) => (
                                                <motion.div
                                                    key={notif.id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 20 }}
                                                    transition={{ delay: index * 0.1 }}
                                                    whileHover={{ scale: 1.02, x: 5 }}
                                                    className={`p-3 rounded-xl border-2 backdrop-blur-sm ${
                                                        notif.type === 'success' 
                                                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-md' 
                                                            : notif.type === 'warning' 
                                                            ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 shadow-md'
                                                            : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200 shadow-md'
                                                    }`}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <span className="text-lg">{notif.icon}</span>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-gray-800">{notif.message}</p>
                                                            <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">Tidak ada notifikasi</p>
                                    </div>
                                )}
                            </Card>
                        </motion.div>

                        {/* Tren Sensor - Enhanced dengan Blok Selection */}
                        <motion.div variants={itemVariants}>
                            <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-green-200/50 shadow-xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                                            <TrendingUp className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-800">Tren Sensor</h3>
                                            <p className="text-xs text-gray-500">Suhu, Kelembapan Udara & Tanah</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isFirebaseConnected && (
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className="flex items-center gap-1 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full border border-green-200"
                                            >
                                                <Wifi className="w-3 h-3" />
                                                <span>Online</span>
                                            </motion.div>
                                        )}
                                        {enhancedBlokOptions.length > 0 && (
                                            <div className="relative dropdown-container">
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => {
                                                        setIsDropdownOpenTren(!isDropdownOpenTren);
                                                        setIsDropdownOpenKondisi(false);
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-medium text-xs min-w-[180px] justify-between"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <BarChart3 className="w-4 h-4" />
                                                        <span className="truncate">{getSelectedBlokLabel()}</span>
                                                    </div>
                                                    <motion.div
                                                        animate={{ rotate: isDropdownOpenTren ? 180 : 0 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <ChevronDown className="w-4 h-4" />
                                                    </motion.div>
                                                </motion.button>
                                                
                                                <AnimatePresence>
                                                    {isDropdownOpenTren && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            transition={{ duration: 0.2 }}
                                                            className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border-2 border-gray-100 overflow-hidden z-50"
                                                        >
                                                            <div className="max-h-60 overflow-y-auto">
                                                                {enhancedBlokOptions.map((opt, index) => (
                                                                    <motion.button
                                                                        key={opt.value}
                                                                        initial={{ opacity: 0, x: -20 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        transition={{ delay: index * 0.05 }}
                                                                        whileHover={{ backgroundColor: '#f3f4f6' }}
                                                                        onClick={() => {
                                                                            handleBlokChange(opt.value);
                                                                            setIsDropdownOpenTren(false);
                                                                        }}
                                                                        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
                                                                            selectedBlokId === opt.value 
                                                                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500' 
                                                                                : 'hover:bg-gray-50'
                                                                        }`}
                                                                    >
                                                                        <span className="text-lg">{opt.icon}</span>
                                                                        <span className="text-sm font-medium text-gray-700 flex-1">{opt.label}</span>
                                                                        {selectedBlokId === opt.value && (
                                                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                                        )}
                                                                    </motion.button>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Time Range Selector */}
                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                    <span className="text-xs font-medium text-gray-600 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Periode:
                                    </span>
                                    {timeRangeOptions.map((range) => (
                                        <motion.button
                                            key={range.value}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleTimeRangeChange(range.value)}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                                                selectedTimeRange === range.value
                                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            <span>{range.icon}</span>
                                            <span>{range.label}</span>
                                        </motion.button>
                                    ))}
                                </div>
                                
                                {displayedTrendData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <AreaChart data={displayedTrendData}>
                                            <defs>
                                                <linearGradient id="colorSuhu" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.1}/>
                                                </linearGradient>
                                                <linearGradient id="colorKelembapan" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                                </linearGradient>
                                                <linearGradient id="colorKelembapanTanah" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                                                </linearGradient>
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
                                            <Area 
                                                type="monotone" 
                                                dataKey="suhu" 
                                                stroke="#f97316" 
                                                fillOpacity={1}
                                                fill="url(#colorSuhu)"
                                                name="Suhu (°C)" 
                                                strokeWidth={2}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="kelembapan" 
                                                stroke="#3b82f6" 
                                                fillOpacity={1}
                                                fill="url(#colorKelembapan)"
                                                name="Kelembapan Udara (%)" 
                                                strokeWidth={2}
                                            />
                                            {displayedTrendData[0]?.kelembapanTanah !== undefined && (
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="kelembapanTanah" 
                                                    stroke="#22c55e" 
                                                    fillOpacity={1}
                                                    fill="url(#colorKelembapanTanah)"
                                                    name="Kelembapan Tanah (%)" 
                                                    strokeWidth={2}
                                                />
                                            )}
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-center py-8">
                                        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">Belum ada data sensor</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {isFirebaseConnected 
                                                ? 'Menunggu data dari Firebase...' 
                                                : 'Data akan muncul setelah sensor mengirim data'}
                                        </p>
                                    </div>
                                )}
                            </Card>
                        </motion.div>

                        {/* Jadwal Robot - Enhanced */}
                        <motion.div variants={itemVariants}>
                            <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-purple-200/50 shadow-xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                                        <Calendar className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-sm font-bold text-gray-800">Jadwal Robot Berikutnya</h3>
                                </div>
                                {upcomingSchedules.length > 0 ? (
                                    <div className="space-y-3">
                                        {upcomingSchedules.map((jadwal, index) => (
                                            <motion.div
                                                key={jadwal.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                whileHover={{ scale: 1.02, x: 5 }}
                                                className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-xl border-2 border-gray-200 flex items-center justify-between shadow-md"
                                            >
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-gray-800 mb-1">{jadwal.tipe} - {jadwal.blok}</p>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-3 h-3 text-gray-500" />
                                                        <p className="text-xs text-gray-600">{jadwal.waktu}</p>
                                                    </div>
                                                </div>
                                                <span className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold rounded-full shadow-md">
                                                    {jadwal.status}
                                                </span>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">Tidak ada jadwal robot</p>
                                        <p className="text-xs text-gray-400 mt-1">Jadwalkan misi robot untuk melihatnya di sini</p>
                                    </div>
                                )}
                            </Card>
                        </motion.div>

                        {/* Quick Actions - Enhanced */}
                        <motion.div variants={itemVariants}>
                            <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-gray-200/50 shadow-xl">
                                <h3 className="text-sm font-bold text-gray-800 mb-4">Quick Actions</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0 }}
                                        whileHover={{ scale: 1.05, y: -5 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <Link href="/sensor">
                                            <Button
                                                variant="outline"
                                                className="h-20 md:h-24 w-full flex flex-col items-center justify-center gap-2 border-2 border-blue-300 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-md hover:shadow-lg"
                                            >
                                                <span className="text-2xl">📊</span>
                                                <span className="text-xs font-bold text-gray-700">Data Sensor Lengkap</span>
                                            </Button>
                                        </Link>
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.1 }}
                                        whileHover={{ scale: 1.05, y: -5 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <Link href="/robot">
                                            <Button
                                                variant="outline"
                                                className="h-20 md:h-24 w-full flex flex-col items-center justify-center gap-2 border-2 border-green-300 hover:border-green-400 hover:bg-green-50 transition-all shadow-md hover:shadow-lg"
                                            >
                                                <span className="text-2xl">🤖</span>
                                                <span className="text-xs font-bold text-gray-700">Kontrol Robot</span>
                                            </Button>
                                        </Link>
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.2 }}
                                        whileHover={{ scale: 1.05, y: -5 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <Link href="/prediksi">
                                            <Button
                                                variant="outline"
                                                className="h-20 md:h-24 w-full flex flex-col items-center justify-center gap-2 border-2 border-yellow-300 hover:border-yellow-400 hover:bg-yellow-50 transition-all shadow-md hover:shadow-lg"
                                            >
                                                <span className="text-2xl">🌾</span>
                                                <span className="text-xs font-bold text-gray-700">Prediksi Panen</span>
                                            </Button>
                                        </Link>
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.3 }}
                                        whileHover={{ scale: 1.05, y: -5 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <Link href="/laporan">
                                            <Button
                                                variant="outline"
                                                className="h-20 md:h-24 w-full flex flex-col items-center justify-center gap-2 border-2 border-purple-300 hover:border-purple-400 hover:bg-purple-50 transition-all shadow-md hover:shadow-lg"
                                            >
                                                <span className="text-2xl">📄</span>
                                                <span className="text-xs font-bold text-gray-700">Laporan</span>
                                            </Button>
                                        </Link>
                                    </motion.div>
                    </div>
                            </Card>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
