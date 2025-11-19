import { useState, useEffect, useRef, useMemo } from 'react';
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
    Wifi, WifiOff, AlertTriangle, Filter, ChevronDown, BarChart3, Bell, X
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { database } from '@/config/firebase';
import { ref, onValue, off } from 'firebase/database';
import AnimatedBackground from '@/Components/AnimatedBackground';

export default function Dashboard({ robotStatus, maturityData, sensorData, trendData, notifications, upcomingSchedules, bloks = [], blokOptions = [], selectedTimeRange: initialTimeRange = '24h', selectedBlokId: initialBlokId = 'average', thresholds = {} }) {
    const { auth } = usePage().props;
    const { isKPetani, canEdit, userRole } = useRole();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Blok selection and real-time data
    const [selectedBlokId, setSelectedBlokId] = useState(initialBlokId);
    const [selectedTimeRange, setSelectedTimeRange] = useState(initialTimeRange || '24h');
    const [realtimeSensorData, setRealtimeSensorData] = useState({});
    
    // Real-time robot status from Firebase
    const [realtimeRobotStatus, setRealtimeRobotStatus] = useState(robotStatus);
    
    // Real-time schedules from Firebase
    const [schedules, setSchedules] = useState(upcomingSchedules || []);
    const [firebaseSchedules, setFirebaseSchedules] = useState({});
    
    
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
    
    // Real-time notifications state - with localStorage persistence
    const [realtimeNotifications, setRealtimeNotifications] = useState(() => {
        // Load from localStorage on mount
        try {
            const saved = localStorage.getItem('dashboardNotifications');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Filter out old notifications (older than 7 days)
                const now = Date.now();
                const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
                return parsed.filter(notif => notif.timestamp >= sevenDaysAgo);
            }
        } catch (e) {
            console.error('Error loading notifications from localStorage:', e);
        }
        return [];
    });
    const [toastNotification, setToastNotification] = useState(null); // Only show latest toast
    const previousSensorStatusRef = useRef({}); // Track previous sensor status to detect changes
    const notificationCooldownRef = useRef({}); // Track notification cooldown to prevent spam
    
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

    // Get sensor status helper - synchronized with Monitoring Sensor IoT
    // This function uses the same logic as MonitoringSensor.jsx
    // Must be defined before Firebase listener to be accessible in callback
    const calculateStatus = (sensorType, value) => {
        if (!value || value === 0) return 'normal';
        
        const threshold = thresholds[sensorType] || {};
        
        if (sensorType === 'suhu_udara') {
            // For temperature: higher is worse
            const criticalMax = threshold.critical_max ?? 40;
            const warningMax = threshold.warning_max ?? 35;
            
            if (value >= criticalMax) return 'critical';
            if (value >= warningMax) return 'warning';
            return 'normal';
        } else if (sensorType === 'kelembapan_udara' || sensorType === 'kelembapan_tanah') {
            // For humidity: lower is worse
            const criticalMin = threshold.critical_min ?? 20;
            const warningMin = threshold.warning_min ?? 30;
            
            if (value <= criticalMin) return 'critical';
            if (value <= warningMin) return 'warning';
            return 'normal';
        }
        return 'normal';
    };

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
                            const value = sensorData.value;
                            
                            // Calculate status based on thresholds
                            const status = calculateStatus(sensorType, value);
                            
                            allSensorData[blokCode][sensorType] = {
                                value: value,
                                unit: sensorData.unit || (sensorType === 'suhu_udara' ? '°C' : '%'),
                                status: status,
                                timestamp: sensorData.timestamp || Date.now(),
                            };
                            
                            // Generate notification directly from Firebase data (not from UI changes)
                            // Create unique key for this sensor+blok combination
                            const sensorKey = `${blokCode}_${sensorType}`;
                            const previousStatus = previousSensorStatusRef.current[sensorKey];
                            
                            // Only generate notification if:
                            // 1. Status changed (not initial load)
                            // 2. Status is warning or critical
                            // 3. Previous status was not undefined (to avoid triggering on initial load or UI changes)
                            // 4. Previous status was normal (to avoid duplicate notifications when status changes from warning to critical)
                            if (previousStatus !== undefined && 
                                previousStatus !== status && 
                                (status === 'warning' || status === 'critical') &&
                                (previousStatus === 'normal' || (previousStatus === 'warning' && status === 'critical'))) {
                                // Check cooldown to prevent spam (5 seconds cooldown for same sensor+blok)
                                const cooldownKey = sensorKey;
                                const now = Date.now();
                                const lastNotificationTime = notificationCooldownRef.current[cooldownKey] || 0;
                                const cooldownPeriod = 5000; // 5 seconds
                                
                                if (now - lastNotificationTime >= cooldownPeriod) {
                                    // Get blok name correctly
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
                                    
                                    // Add to real-time notifications list
                                    setRealtimeNotifications(prev => {
                                        // Remove duplicate notifications for same sensor+blok
                                        const filtered = prev.filter(n => {
                                            const notifKey = n.id.split('_').slice(-1)[0];
                                            return notifKey !== sensorKey;
                                        });
                                        // Add new notification at the top (keep only last 50)
                                        const updated = [notification, ...filtered].slice(0, 50);
                                        
                                        // Save to localStorage
                                        try {
                                            localStorage.setItem('dashboardNotifications', JSON.stringify(updated));
                                        } catch (e) {
                                            console.error('Error saving notifications to localStorage:', e);
                                        }
                                        
                                        return updated;
                                    });
                                    
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
                        // Notifications are now generated directly from Firebase listener above
                        // This only updates the UI display
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
    }, [selectedBlokId, bloks, selectedTimeRange, thresholds]);

    // Helper function to get mission type label (must be defined before useEffect)
    const getMissionTypeLabel = (type) => {
        const labelMap = {
            'deteksi': '🔍 Deteksi Kematangan',
            'penyiraman': '💧 Penyiraman',
            'pemupukan': '🌱 Pemupukan',
            'kombinasi': '⚡ Kombinasi',
        };
        return labelMap[type] || type;
    };
    
    // Helper function to parse status and extract progress
    const parseStatusAndProgress = (statusString) => {
        if (!statusString) return { status: null, progress: null };
        
        // Check if status contains progress like "in_progress_10%", "in_progress_90%"
        const progressMatch = statusString.match(/in_progress[_-]?(\d+)%?/i);
        if (progressMatch) {
            const progress = parseInt(progressMatch[1]);
            return { status: 'in_progress', progress: progress };
        }
        
        // Check for completed/done status
        if (statusString.toLowerCase().includes('completed') || statusString.toLowerCase().includes('done')) {
            return { status: 'completed', progress: 100 };
        }
        
        // Return status as is
        return { status: statusString, progress: null };
    };
    
    // Format date time (same as RobotControl)
    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    
    // Get status color (for both robot status and schedules)
    const getStatusColor = (status) => {
        // For schedule statuses
        const scheduleStatusMap = {
            'pending': 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-400 shadow-lg shadow-blue-500/30',
            'in_progress': 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-400 shadow-lg shadow-green-500/30',
            'paused': 'bg-gradient-to-r from-orange-400 to-orange-500 text-white border-orange-300 shadow-lg shadow-orange-400/30',
            'completed': 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-400 shadow-lg shadow-green-500/30',
            'done': 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-400 shadow-lg shadow-green-500/30',
            'cancelled': 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-300',
            'failed': 'bg-gradient-to-r from-red-400 to-red-500 text-white border-red-300 shadow-lg shadow-red-400/30',
        };
        
        if (scheduleStatusMap[status]) {
            return scheduleStatusMap[status];
        }
        
        // For robot statuses
        switch (status) {
            case 'aktif':
            case 'active':
                return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-400 shadow-lg shadow-green-500/30';
            case 'idle':
                return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-400 shadow-lg shadow-blue-500/30';
            case 'charging':
                return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-yellow-300 shadow-lg shadow-yellow-400/30';
            case 'offline':
                return 'bg-gradient-to-r from-red-400 to-red-500 text-white border-red-300 shadow-lg shadow-red-400/30';
            default:
                return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-300';
        }
    };
    
    // Get status label (for both robot status and schedules)
    const getStatusLabel = (status) => {
        const labelMap = {
            'active': 'AKTIF',
            'aktif': 'AKTIF',
            'idle': 'ONLINE',
            'charging': 'CHARGING',
            'offline': 'OFFLINE',
            'in_progress': 'BERJALAN',
            'paused': 'DIJEDA',
            'pending': 'TERJADWAL',
            'completed': 'SELESAI',
            'done': 'SELESAI',
            'cancelled': 'DIBATALKAN',
            'failed': 'GAGAL',
        };
        return labelMap[status] || status.toUpperCase();
    };

    // Helper function to format location
    const formatLocation = (location) => {
        if (!location || location === 'Tidak diketahui') return 'Tidak diketahui';
        
        // If location is an object
        if (typeof location === 'object') {
            if (location.blok_id || location.blok_code) {
                return location.blok_id || location.blok_code || 'Tidak diketahui';
            }
            if (location.name) {
                return location.name;
            }
        }
        
        // If location is a string
        return location;
    };

    // Firebase Real-time Listener for Robot Status and Battery
    useEffect(() => {
        // Listen to robot status
        const robotStatusRef = ref(database, 'robot/status');
        const robotStatusCallback = (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setRealtimeRobotStatus(prev => ({
                    ...prev,
                    nama: data.name || prev.nama || 'MOV Bot Alpha',
                    status: data.current_state || data.status || 'offline',
                    battery: data.battery_level || data.battery || 0,
                    lokasi: formatLocation(data.current_location || data.location || 'Tidak diketahui'),
                }));
            }
        };
        onValue(robotStatusRef, robotStatusCallback);
        firebaseListenersRef.current.push({ ref: robotStatusRef, callback: robotStatusCallback });

        // Listen to active mission for progress
        const activeMissionRef = ref(database, 'robot/active_mission');
        const activeMissionCallback = (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setRealtimeRobotStatus(prev => ({
                    ...prev,
                    misi: data.mission_type ? getMissionTypeLabel(data.mission_type) : null,
                    progress: data.progress_percentage || 0,
                }));
            } else {
                setRealtimeRobotStatus(prev => ({
                    ...prev,
                    misi: null,
                    progress: 0,
                }));
            }
        };
        onValue(activeMissionRef, activeMissionCallback);
        firebaseListenersRef.current.push({ ref: activeMissionRef, callback: activeMissionCallback });
        
        // Listen to schedules in Firebase (for real-time status updates)
        const schedulesRef = ref(database, 'robot/schedules');
        const schedulesCallback = (snapshot) => {
            const data = snapshot.val();
            setFirebaseSchedules(data || {});
            
            // Update schedules state with Firebase data
            if (data) {
                setSchedules(prevSchedules => {
                    const updatedSchedules = prevSchedules.map(schedule => {
                        const scheduleKey = `schedule_${schedule.id}`;
                        const firebaseData = data[scheduleKey];
                        
                        if (firebaseData) {
                            // Parse status to extract progress if needed
                            const statusStr = firebaseData.status || schedule.status;
                            const { status: parsedStatus, progress: parsedProgress } = parseStatusAndProgress(statusStr);
                            
                            return {
                                ...schedule,
                                status: parsedStatus || firebaseData.status || schedule.status,
                                progress_percentage: parsedProgress !== null 
                                    ? parsedProgress 
                                    : (firebaseData.progress_percentage ?? schedule.progress_percentage),
                            };
                        }
                        return schedule;
                    });
                    
                    // Remove cancelled schedules
                    return updatedSchedules.filter(s => s.status !== 'cancelled');
                });
            }
        };
        onValue(schedulesRef, schedulesCallback);
        firebaseListenersRef.current.push({ ref: schedulesRef, callback: schedulesCallback });
        
        return () => {
            off(robotStatusRef, 'value', robotStatusCallback);
            off(activeMissionRef, 'value', activeMissionCallback);
            off(schedulesRef, 'value', schedulesCallback);
        };
    }, []);
    
    // Legacy function for backward compatibility
    const getSensorStatus = (type, value) => {
        if (type === 'suhu') {
            return calculateStatus('suhu_udara', value);
        } else if (type === 'kelembapan') {
            // For kelembapan_udara and kelembapan_tanah, use kelembapan_udara threshold as default
            return calculateStatus('kelembapan_udara', value);
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

            <div className="min-h-screen relative overflow-hidden">
                {/* Animated Background - Same as other pages */}
                <AnimatedBackground />
                
                {/* Content */}
                <div className="relative z-10 p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
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
                            {/* Info Card dengan Glassmorphism - More Transparent */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white/50 backdrop-blur-lg border border-green-200/40 rounded-2xl shadow-xl px-4 py-3"
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
                        {/* Status Robot - Premium Enhanced Card */}
                        <motion.div variants={itemVariants}>
                            <Card className="p-5 md:p-7 bg-gradient-to-br from-blue-50/60 via-cyan-50/50 to-blue-100/60 border-2 border-blue-200/50 shadow-xl overflow-hidden relative group backdrop-blur-lg">
                                {/* Animated Gradient Background - Soft */}
                                <div className="absolute inset-0 opacity-30">
                                    <motion.div
                                        animate={{
                                            backgroundPosition: ['0% 0%', '100% 100%'],
                                        }}
                                        transition={{
                                            duration: 15,
                                            repeat: Infinity,
                                            repeatType: 'reverse',
                                        }}
                                        className="absolute inset-0 bg-gradient-to-br from-blue-200/40 via-cyan-200/40 to-teal-200/40"
                                        style={{
                                            backgroundSize: '200% 200%',
                                        }}
                                    />
                                </div>
                                
                                {/* Animated Grid Pattern - Soft */}
                                <div className="absolute inset-0 opacity-5">
                                    <div className="absolute inset-0" style={{
                                        backgroundImage: `linear-gradient(rgba(59, 130, 246, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.08) 1px, transparent 1px)`,
                                        backgroundSize: '30px 30px'
                                    }}></div>
                                </div>

                                {/* Glow Effect for Online Status - Soft */}
                                {realtimeRobotStatus.status === 'idle' && (
                                    <motion.div
                                        animate={{
                                            opacity: [0.2, 0.4, 0.2],
                                            scale: [1, 1.05, 1],
                                        }}
                                        transition={{
                                            duration: 3,
                                            repeat: Infinity,
                                            ease: "easeInOut",
                                        }}
                                        className="absolute top-0 right-0 w-32 h-32 bg-blue-300/20 rounded-full blur-3xl"
                                    />
                                )}

                                {/* Shimmer Effect - Soft */}
                                <motion.div
                                    animate={{
                                        x: ['-100%', '200%'],
                                    }}
                                    transition={{
                                        duration: 4,
                                        repeat: Infinity,
                                        repeatDelay: 3,
                                        ease: "linear",
                                    }}
                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
                                />
                                
                                <div className="relative z-10">
                                    {/* Header Section */}
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <motion.div
                                                animate={{ 
                                                    scale: realtimeRobotStatus.status === 'aktif' || realtimeRobotStatus.status === 'active' 
                                                        ? [1, 1.15, 1] 
                                                        : realtimeRobotStatus.status === 'idle'
                                                        ? [1, 1.08, 1]
                                                        : 1,
                                                    rotate: realtimeRobotStatus.status === 'aktif' || realtimeRobotStatus.status === 'active' 
                                                        ? [0, 5, -5, 0] 
                                                        : 0,
                                                }}
                                                transition={{ 
                                                    duration: 2, 
                                                    repeat: Infinity,
                                                    ease: "easeInOut"
                                                }}
                                                className="relative"
                                            >
                                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-cyan-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/40 border-2 border-white/40">
                                                    <Bot className="w-8 h-8 text-white drop-shadow-lg" />
                                                </div>
                                                {/* Pulse Ring for Online Status */}
                                                {realtimeRobotStatus.status === 'idle' && (
                                                    <motion.div
                                                        animate={{
                                                            scale: [1, 1.5, 1],
                                                            opacity: [0.6, 0, 0.6],
                                                        }}
                                                        transition={{
                                                            duration: 2,
                                                            repeat: Infinity,
                                                            ease: "easeOut",
                                                        }}
                                                        className="absolute inset-0 rounded-2xl border-2 border-cyan-400/60"
                                                    />
                                                )}
                                            </motion.div>
                                            <div>
                                                <h3 className="text-xl md:text-2xl font-extrabold text-gray-800 mb-1 drop-shadow-sm">
                                                    {realtimeRobotStatus.nama || 'MOV Bot Alpha'}
                                                </h3>
                                                <p className="text-xs md:text-sm text-blue-600 font-medium">Status Robot</p>
                                            </div>
                                        </div>
                                        <motion.span
                                            whileHover={{ scale: 1.1, rotate: 2 }}
                                            whileTap={{ scale: 0.95 }}
                                            className={`px-4 py-2 text-sm font-extrabold rounded-full border-2 shadow-xl backdrop-blur-sm ${getStatusColor(realtimeRobotStatus.status)}`}
                                        >
                                            {getStatusLabel(realtimeRobotStatus.status)}
                                        </motion.span>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        {/* Battery Card */}
                                        <motion.div
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            className="relative bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-blue-100/60 shadow-lg overflow-hidden group"
                                        >
                                            {/* Glow Effect */}
                                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${getBatteryColor(realtimeRobotStatus.battery).replace('text-', 'bg-').replace('-500', '-500/15')} blur-xl`} />
                                            
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-2.5 mb-3">
                                                    <div className={`p-2 rounded-lg ${getBatteryColor(realtimeRobotStatus.battery).replace('text-', 'bg-')} bg-opacity-15`}>
                                                        <Battery className={`w-5 h-5 ${getBatteryColor(realtimeRobotStatus.battery)}`} />
                                                    </div>
                                                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Baterai</span>
                                                </div>
                                                <div className="flex items-baseline gap-1.5 mb-3">
                                                    <p className={`text-3xl md:text-4xl font-black ${getBatteryColor(realtimeRobotStatus.battery)} drop-shadow-sm`}>
                                                        {realtimeRobotStatus.battery}
                                                    </p>
                                                    <span className="text-sm text-gray-500 font-bold">%</span>
                                                </div>
                                                <div className="relative w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                                    <motion.div
                                                        key={realtimeRobotStatus.battery}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${realtimeRobotStatus.battery}%` }}
                                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                                        className={`h-full bg-gradient-to-r ${getBatteryGradient(realtimeRobotStatus.battery)} rounded-full shadow-md relative`}
                                                    >
                                                        {/* Shimmer on Battery Bar */}
                                                        <motion.div
                                                            animate={{
                                                                x: ['-100%', '100%'],
                                                            }}
                                                            transition={{
                                                                duration: 2,
                                                                repeat: Infinity,
                                                                ease: "linear",
                                                            }}
                                                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                                        />
                                                    </motion.div>
                                                </div>
                                            </div>
                                        </motion.div>

                                        {/* Location Card */}
                                        <motion.div
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            className="relative bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-blue-100/60 shadow-lg overflow-hidden group"
                                        >
                                            {/* Glow Effect */}
                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-blue-400/15 blur-xl" />
                                            
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-2.5 mb-3">
                                                    <div className="p-2 rounded-lg bg-blue-500/15">
                                                        <MapPin className="w-5 h-5 text-blue-500" />
                                                    </div>
                                                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Lokasi</span>
                                                </div>
                                                <p className="text-lg md:text-xl font-extrabold text-gray-800 leading-tight drop-shadow-sm">
                                                    {realtimeRobotStatus.lokasi || 'Tidak diketahui'}
                                                </p>
                                            </div>
                                        </motion.div>
                                    </div>

                                    {/* Active Mission Card */}
                                    {(realtimeRobotStatus.status === 'aktif' || realtimeRobotStatus.status === 'active') && realtimeRobotStatus.misi && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, y: -20 }}
                                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.5, ease: "easeOut" }}
                                            className="relative bg-gradient-to-r from-green-100/80 to-emerald-100/80 backdrop-blur-md p-4 rounded-2xl border border-green-300/50 shadow-lg overflow-hidden"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm font-bold text-green-700 uppercase tracking-wide">{realtimeRobotStatus.misi}</span>
                                                <span className="text-sm font-extrabold text-green-600 bg-green-200/50 px-3 py-1 rounded-full">
                                                    {realtimeRobotStatus.progress}%
                                                </span>
                                            </div>
                                            <div className="relative w-full bg-white/60 rounded-full h-3 overflow-hidden">
                                                <motion.div
                                                    key={realtimeRobotStatus.progress}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${realtimeRobotStatus.progress}%` }}
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                    className="h-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full shadow-md relative"
                                                >
                                                    {/* Shimmer on Progress Bar */}
                                                    <motion.div
                                                        animate={{
                                                            x: ['-100%', '100%'],
                                                        }}
                                                        transition={{
                                                            duration: 2,
                                                            repeat: Infinity,
                                                            ease: "linear",
                                                        }}
                                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                                                    />
                                                </motion.div>
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
                                <Card className="p-4 md:p-6 bg-white/50 backdrop-blur-lg border-2 border-purple-200/50 shadow-xl">
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
                                        const suhuStatus = calculateStatus('suhu_udara', displayedData.suhuUdara);
                                        const kelembapanUdaraStatus = calculateStatus('kelembapan_udara', displayedData.kelembabanUdara);
                                        const kelembapanTanahStatus = calculateStatus('kelembapan_tanah', displayedData.kelembabanTanah);
                                        
                                        return (
                                            <>
                                                <motion.div
                                                    whileHover={{ scale: 1.05, y: -5 }}
                                                    className="relative"
                                                >
                                                    <Card className={`p-4 bg-gradient-to-br from-orange-50/60 via-orange-100/50 to-amber-50/60 backdrop-blur-lg border-2 ${
                                                        suhuStatus === 'critical' ? 'border-red-300/60' : 
                                                        suhuStatus === 'warning' ? 'border-yellow-300/60' : 
                                                        'border-orange-200/40'
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
                                                    <Card className={`p-4 bg-gradient-to-br from-blue-50/60 via-blue-100/50 to-cyan-50/60 backdrop-blur-lg border-2 ${
                                                        kelembapanUdaraStatus === 'critical' ? 'border-red-300/60' : 
                                                        kelembapanUdaraStatus === 'warning' ? 'border-yellow-300/60' : 
                                                        'border-blue-200/40'
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
                                                    <Card className={`p-4 bg-gradient-to-br from-green-50/60 via-emerald-100/50 to-green-50/60 backdrop-blur-lg border-2 ${
                                                        kelembapanTanahStatus === 'critical' ? 'border-red-300/60' : 
                                                        kelembapanTanahStatus === 'warning' ? 'border-yellow-300/60' : 
                                                        'border-green-200/40'
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

                        {/* Notifikasi Real-time - Enhanced dengan Real-time Notifications */}
                        <motion.div variants={itemVariants}>
                            <Card className="p-4 md:p-6 bg-gradient-to-br from-white via-blue-50/30 to-cyan-50/30 backdrop-blur-xl border-2 border-blue-200/60 shadow-2xl overflow-hidden relative">
                                {/* Decorative background elements */}
                                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-400/20 via-cyan-400/20 to-transparent rounded-full blur-3xl -mr-20 -mt-20"></div>
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-400/20 via-cyan-400/20 to-transparent rounded-full blur-3xl -ml-16 -mb-16"></div>
                                
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <motion.div
                                                animate={{ 
                                                    rotate: [0, 5, -5, 0],
                                                    scale: [1, 1.1, 1]
                                                }}
                                                transition={{ duration: 3, repeat: Infinity }}
                                                className="w-12 h-12 bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-xl shadow-blue-500/30"
                                            >
                                                <Bell className="w-6 h-6 text-white" />
                                            </motion.div>
                                            <div>
                                                <h3 className="text-base font-extrabold text-gray-800">Notifikasi Real-time</h3>
                                                <p className="text-xs text-gray-600 font-medium">Peringatan sensor & sistem</p>
                                            </div>
                                        </div>
                                        {realtimeNotifications.length > 0 && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
                                            >
                                                <span className="text-xs font-bold text-white">{realtimeNotifications.length}</span>
                                            </motion.div>
                                        )}
                                    </div>
                                    
                                    {(() => {
                                        // Combine backend notifications with real-time notifications
                                        // Filter out duplicates by checking if backend notification already exists in realtime
                                        const backendNotifs = (notifications || []).filter(backendNotif => {
                                            // Check if this backend notification doesn't already exist in realtime notifications
                                            return !realtimeNotifications.some(realtimeNotif => 
                                                realtimeNotif.blok === backendNotif.blok && 
                                                realtimeNotif.sensor === backendNotif.sensor &&
                                                Math.abs(realtimeNotif.timestamp - (backendNotif.timestamp || 0)) < 60000 // Within 1 minute
                                            );
                                        });
                                        const allNotifications = [...realtimeNotifications, ...backendNotifs];
                                        
                                        return allNotifications.length > 0 ? (
                                        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                            <AnimatePresence mode="popLayout">
                                                {allNotifications.map((notif, index) => {
                                                    const isCritical = notif.type === 'critical';
                                                    const isWarning = notif.type === 'warning';
                                                    
                                                    return (
                                                        <motion.div
                                                            key={notif.id}
                                                            layout
                                                            initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, x: 100, scale: 0.8 }}
                                                            transition={{ 
                                                                duration: 0.3,
                                                                delay: index < 3 ? index * 0.1 : 0
                                                            }}
                                                            whileHover={{ scale: 1.02, x: 5 }}
                                                            className={`p-4 rounded-xl border-2 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all cursor-pointer ${
                                                                isCritical
                                                                    ? 'bg-gradient-to-r from-red-50 via-orange-50 to-red-50 border-red-300/70 shadow-red-200/50'
                                                                    : isWarning
                                                                    ? 'bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 border-yellow-300/70 shadow-yellow-200/50'
                                                                    : notif.type === 'success'
                                                                    ? 'bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-green-300/70 shadow-green-200/50'
                                                                    : 'bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 border-blue-300/70 shadow-blue-200/50'
                                                            }`}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <motion.div
                                                                    animate={isCritical ? { 
                                                                        scale: [1, 1.2, 1],
                                                                        rotate: [0, 10, -10, 0]
                                                                    } : {}}
                                                                    transition={{ duration: 2, repeat: Infinity }}
                                                                    className="text-2xl flex-shrink-0"
                                                                >
                                                                    {notif.icon || '🔔'}
                                                                </motion.div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                                        <p className={`text-sm font-bold ${
                                                                            isCritical ? 'text-red-800' : 
                                                                            isWarning ? 'text-yellow-800' : 
                                                                            'text-gray-800'
                                                                        }`}>
                                                                            {notif.message || notif.sensor}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                                            {isCritical && (
                                                                                <motion.div
                                                                                    animate={{ scale: [1, 1.3, 1] }}
                                                                                    transition={{ duration: 1, repeat: Infinity }}
                                                                                    className="w-2 h-2 bg-red-500 rounded-full"
                                                                                />
                                                                            )}
                                                                            {/* Only show delete button for real-time notifications */}
                                                                            {realtimeNotifications.some(n => n.id === notif.id) && (
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        // Remove notification from real-time notifications
                                                                                        setRealtimeNotifications(prev => {
                                                                                            const updated = prev.filter(n => n.id !== notif.id);
                                                                                            // Save to localStorage
                                                                                            try {
                                                                                                localStorage.setItem('dashboardNotifications', JSON.stringify(updated));
                                                                                            } catch (e) {
                                                                                                console.error('Error saving notifications to localStorage:', e);
                                                                                            }
                                                                                            return updated;
                                                                                        });
                                                                                    }}
                                                                                    className="p-1 hover:bg-red-100 rounded-full transition-colors group"
                                                                                    title="Hapus notifikasi"
                                                                                >
                                                                                    <X className="w-4 h-4 text-gray-400 group-hover:text-red-600 transition-colors" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        {notif.blok && (
                                                                            <span className="text-xs px-2 py-0.5 bg-white/60 rounded-full font-medium text-gray-700 border border-gray-200">
                                                                                📍 {notif.blok}
                                                                            </span>
                                                                        )}
                                                                        {notif.value && (
                                                                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                                                                isCritical ? 'bg-red-100 text-red-700' : 
                                                                                isWarning ? 'bg-yellow-100 text-yellow-700' : 
                                                                                'bg-blue-100 text-blue-700'
                                                                            }`}>
                                                                                {notif.value}
                                                                            </span>
                                                                        )}
                                                                        <span className="text-xs text-gray-500 font-medium">
                                                                            {notif.time || 'Baru saja'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>
                                        </div>
                                    ) : (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="text-center py-12"
                                        >
                                            <motion.div
                                                animate={{ scale: [1, 1.1, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                            >
                                                <Bell className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                                            </motion.div>
                                            <p className="text-sm font-medium text-gray-500">Tidak ada notifikasi</p>
                                            <p className="text-xs text-gray-400 mt-1">Semua sensor dalam kondisi normal</p>
                                        </motion.div>
                                        );
                                    })()}
                                </div>
                            </Card>
                        </motion.div>
                        
                        {/* Toast Notification - Fixed Position (Only Latest) */}
                        <AnimatePresence>
                            {toastNotification && (
                                <motion.div
                                    key={toastNotification.id}
                                    initial={{ opacity: 0, x: 400, scale: 0.8, y: -20 }}
                                    animate={{ opacity: 1, x: 0, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, x: 400, scale: 0.8, y: -20 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    className="fixed top-4 right-4 z-[9999] max-w-md w-full md:w-auto"
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

                        {/* Tren Sensor - Enhanced dengan Blok Selection */}
                        <motion.div variants={itemVariants}>
                            <Card className="p-4 md:p-6 bg-white/50 backdrop-blur-lg border-2 border-green-200/50 shadow-xl">
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
                            <Card className="p-4 md:p-6 bg-white/50 backdrop-blur-lg border-2 border-purple-200/50 shadow-xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                                        <Calendar className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800">Jadwal Robot</h3>
                                </div>
                                {(() => {
                                    // Get pending schedules (same logic as RobotControl)
                                    const pendingSchedules = schedules.filter(s => {
                                        const scheduleKey = `schedule_${s.id}`;
                                        const firebaseData = firebaseSchedules[scheduleKey];
                                        const statusStr = firebaseData?.status || s.status;
                                        const { status } = parseStatusAndProgress(statusStr);
                                        const finalStatus = status || statusStr;
                                        
                                        // Exclude cancelled schedules
                                        if (finalStatus === 'cancelled') return false;
                                        // Exclude completed schedules
                                        if (finalStatus === 'completed' || finalStatus === 'done') return false;
                                        
                                        return finalStatus === 'pending' || finalStatus === 'in_progress' || finalStatus === 'paused';
                                    }).map(s => {
                                        const scheduleKey = `schedule_${s.id}`;
                                        const firebaseData = firebaseSchedules[scheduleKey];
                                        if (firebaseData) {
                                            const statusStr = firebaseData.status || s.status;
                                            const { status: parsedStatus, progress: parsedProgress } = parseStatusAndProgress(statusStr);
                                            return {
                                                ...s,
                                                status: parsedStatus || firebaseData.status || s.status,
                                                progress_percentage: parsedProgress !== null 
                                                    ? parsedProgress 
                                                    : (firebaseData.progress_percentage ?? s.progress_percentage),
                                            };
                                        }
                                        return s;
                                    }).slice(0, 5); // Limit to 5 for dashboard
                                    
                                    return pendingSchedules.length > 0 ? (
                                        <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                                            {pendingSchedules.map((misi, index) => (
                                                <motion.div
                                                    key={misi.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    whileHover={{ scale: 1.02, y: -2, x: 5 }}
                                                    className={`p-5 md:p-6 rounded-2xl border-2 shadow-lg hover:shadow-xl transition-all duration-300 ${
                                                        misi.status === 'paused' 
                                                            ? 'bg-gradient-to-br from-orange-50/90 via-orange-100/80 to-amber-50/90 border-orange-300/60 shadow-orange-200/50'
                                                            : misi.status === 'in_progress'
                                                            ? 'bg-gradient-to-br from-emerald-50/90 via-green-50/80 to-teal-50/90 border-emerald-300/60 shadow-emerald-200/50'
                                                            : 'bg-gradient-to-br from-blue-50/90 via-cyan-50/80 to-sky-50/90 border-blue-300/60 shadow-blue-200/50'
                                                    }`}
                                                >
                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold text-gray-800">
                                                                {misi.blok_code || misi.blok || `Blok #${misi.blok_id}`}
                                                            </span>
                                                            {misi.blok_name && (
                                                                <span className="text-xs text-gray-500">- {misi.blok_name}</span>
                                                            )}
                                                        </div>
                                                        <span className={`text-xs px-3 py-1.5 rounded-full font-bold shadow-md ${getStatusColor(misi.status)}`}>
                                                            {getStatusLabel(misi.status)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                            misi.mission_type === 'deteksi' ? 'bg-purple-100' :
                                                            misi.mission_type === 'penyiraman' ? 'bg-blue-100' :
                                                            misi.mission_type === 'pemupukan' ? 'bg-green-100' :
                                                            'bg-gray-100'
                                                        }`}>
                                                            {misi.mission_type === 'deteksi' ? '🔍' :
                                                             misi.mission_type === 'penyiraman' ? '💧' :
                                                             misi.mission_type === 'pemupukan' ? '🌱' : '📋'}
                                                        </div>
                                                        <p className="text-base font-bold text-gray-800">
                                                            {getMissionTypeLabel(misi.mission_type)}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                                                        <span className="flex items-center gap-1 px-3 py-1.5 bg-white/80 rounded-lg shadow-sm">
                                                            <Calendar className="w-3 h-3 text-gray-500" />
                                                            <span className="text-gray-700 font-medium">{formatDateTime(misi.scheduled_at)}</span>
                                                        </span>
                                                        {misi.priority && (
                                                            <span className={`px-3 py-1.5 rounded-lg font-semibold shadow-sm ${
                                                                misi.priority === 'urgent' ? 'bg-red-100 text-red-700 border border-red-200' :
                                                                misi.priority === 'high' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                                                misi.priority === 'medium' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                                                'bg-gray-100 text-gray-700 border border-gray-200'
                                                            }`}>
                                                                {misi.priority === 'urgent' ? '🚨' : misi.priority === 'high' ? '⚡' : ''} {misi.priority.toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {(misi.progress_percentage > 0 || misi.status === 'in_progress' || misi.status === 'paused') && (
                                                        <div className="mt-3">
                                                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                                                <motion.div
                                                                    key={misi.progress_percentage || 0}
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${misi.progress_percentage || 0}%` }}
                                                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                                                    className={`h-2.5 rounded-full shadow-sm ${
                                                                        misi.status === 'paused' 
                                                                            ? 'bg-gradient-to-r from-orange-400 to-amber-500'
                                                                            : 'bg-gradient-to-r from-green-400 to-emerald-500'
                                                                    }`}
                                                                />
                                                            </div>
                                                            <p className="text-xs text-gray-600 mt-1 text-center">
                                                                {misi.status === 'paused' ? 'DIJEDA' : `Progress: ${misi.progress_percentage || 0}%`}
                                                            </p>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">Tidak ada jadwal aktif</p>
                                            <p className="text-xs text-gray-400 mt-1">Jadwalkan misi robot untuk melihatnya di sini</p>
                                        </div>
                                    );
                                })()}
                            </Card>
                        </motion.div>

                        {/* Quick Actions - Enhanced */}
                        <motion.div variants={itemVariants}>
                            <Card className="p-4 md:p-6 bg-white/50 backdrop-blur-lg border-2 border-gray-200/50 shadow-xl">
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
