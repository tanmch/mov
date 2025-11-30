import { useState, useEffect, useRef, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { useRole } from '@/hooks/useRole';
import { KPetaniOnly } from '@/Components/RoleGuard';
import { 
    MapPin, ThermometerSun, Droplets, Sprout, Leaf, Edit, Plus, Settings, 
    RefreshCw, Navigation, Bot, TrendingUp, AlertTriangle, CheckCircle2, Wifi, WifiOff, Activity
} from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import SkeletonLoader, { SkeletonCard } from '@/Components/ui/SkeletonLoader';
import EmptyState from '@/Components/ui/EmptyState';
import BackButton from '@/Components/BackButton';
import { database } from '@/config/firebase';
import { ref, onValue, off } from 'firebase/database';

export default function KebunMonitoring({ kebuns = [], summary = {} }) {
    const { auth } = usePage().props;
    const { isKPetani, canEdit } = useRole();
    const [selectedBlok, setSelectedBlok] = useState(null);
    const [viewMode, setViewMode] = useState('3d'); // '3d' or 'simple'
    const [isLoading, setIsLoading] = useState(false);
    const [realtimeSensorData, setRealtimeSensorData] = useState({});
    const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
    const firebaseListenersRef = useRef([]);
    
    // Real-time robot status from Firebase
    const [realtimeRobotStatus, setRealtimeRobotStatus] = useState({
        nama: 'MOV Bot Alpha',
        status: 'offline',
        battery: 0,
        lokasi: 'Tidak diketahui',
        misi: null,
        progress: 0,
    });

    // Calculate sensor status helper function
    const calculateStatus = (sensorType, value) => {
        if (!value || value === 0) return 'normal';
        
        if (sensorType === 'suhu_udara') {
            // For temperature: higher is worse
            if (value >= 40) return 'critical';
            if (value >= 35) return 'warning';
            return 'normal';
        } else if (sensorType === 'kelembapan_udara' || sensorType === 'kelembapan_tanah') {
            // For humidity: lower is worse
            if (value <= 20) return 'critical';
            if (value <= 30) return 'warning';
            return 'normal';
        }
        return 'normal';
    };

    // Calculate blok status based on sensor data from Firebase
    const calculateBlokStatus = (sensorStatus, originalStatus) => {
        // If we have sensor status from Firebase, use it to determine blok status
        if (sensorStatus) {
            const { suhu, kelembapan, kelembapanTanah } = sensorStatus;
            
            // Check for critical conditions
            if (suhu === 'critical' || kelembapan === 'critical' || kelembapanTanah === 'critical') {
                return 'perhatian';
            }
            
            // Check for warning conditions
            if (suhu === 'warning' || kelembapan === 'warning' || kelembapanTanah === 'warning') {
                return 'perhatian';
            }
            
            // If all sensors are normal, check if original status was 'siap-panen'
            // (siap-panen status might come from detection results, not sensors)
            if (originalStatus === 'siap-panen') {
                return 'siap-panen';
            }
            
            // All sensors normal
            return 'sehat';
        }
        
        // Fallback to original status if no Firebase data
        return originalStatus || 'sehat';
    };

    // Flatten all bloks from all kebuns for easier access - Reactive to realtimeSensorData changes
    const allBloks = useMemo(() => {
        return kebuns.flatMap(kebun => 
            kebun.bloks.map(blok => {
                const blokCode = blok.code;
                const realtimeData = realtimeSensorData[blokCode] || {};
                
                // Calculate sensor statuses from Firebase data
                const sensorStatus = realtimeData.sensorStatus || {
                    suhu: calculateStatus('suhu_udara', realtimeData.suhu_udara?.value ?? blok.suhu ?? 27),
                    kelembapan: calculateStatus('kelembapan_udara', realtimeData.kelembapan_udara?.value ?? blok.kelembapan ?? 70),
                    kelembapanTanah: calculateStatus('kelembapan_tanah', realtimeData.kelembapan_tanah?.value ?? blok.kelembapanTanah ?? null),
                };
                
                // Calculate blok status from Firebase sensor data
                // Always use Firebase data if available, otherwise use original status
                const calculatedStatus = calculateBlokStatus(sensorStatus, blok.status);
                
                return {
                    ...blok,
                    kebunName: kebun.name,
                    kebunId: kebun.id,
                    // Override with real-time data if available
                    suhu: realtimeData.suhu_udara?.value ?? blok.suhu ?? 27,
                    kelembapan: realtimeData.kelembapan_udara?.value ?? blok.kelembapan ?? 70,
                    kelembapanTanah: realtimeData.kelembapan_tanah?.value ?? blok.kelembapanTanah ?? null,
                    sensorStatus: sensorStatus,
                    // Always use calculated status from Firebase if sensorStatus exists, otherwise use original
                    status: realtimeData.sensorStatus ? calculatedStatus : (blok.status || 'sehat'),
                    lastUpdate: realtimeData.lastUpdate || null,
                };
            })
        );
    }, [kebuns, realtimeSensorData]);

    // Calculate summary from allBloks (using Firebase data)
    const calculatedSummary = useMemo(() => {
        const sehat = allBloks.filter(blok => blok.status === 'sehat').length;
        const siapPanen = allBloks.filter(blok => blok.status === 'siap-panen').length;
        const perhatian = allBloks.filter(blok => blok.status === 'perhatian').length;
        const total = allBloks.length;
        
        return {
            blok_sehat: sehat,
            blok_siap_panen: siapPanen,
            blok_perhatian: perhatian,
            total_blok: total,
            total_pohon: allBloks.reduce((sum, blok) => sum + (blok.jumlah_pohon || 0), 0),
        };
    }, [allBloks]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'sehat':
                return 'bg-gradient-to-br from-green-500 to-emerald-600';
            case 'perhatian':
                return 'bg-gradient-to-br from-yellow-500 to-amber-600';
            case 'siap-panen':
                return 'bg-gradient-to-br from-orange-500 to-red-600';
            default:
                return 'bg-gradient-to-br from-gray-400 to-gray-600';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'sehat':
                return 'Sehat';
            case 'perhatian':
                return 'Perlu Perhatian';
            case 'siap-panen':
                return 'Siap Panen';
            default:
                return 'Unknown';
        }
    };

    const getStatusBorderColor = (status) => {
        switch (status) {
            case 'sehat':
                return 'border-green-300';
            case 'perhatian':
                return 'border-yellow-300';
            case 'siap-panen':
                return 'border-orange-300';
            default:
                return 'border-gray-300';
        }
    };

    const selected = allBloks.find((b) => b.id === selectedBlok);

    // Component untuk pohon mangga 3D
    const MangoTree3D = ({ size = 'md', status = 'sehat' }) => {
        const sizeClasses = {
            sm: 'w-5 h-7',
            md: 'w-6 h-8',
            lg: 'w-7 h-9',
        };

        const leafColor = status === 'sehat' ? 'from-green-600 to-green-400' : 
                          status === 'siap-panen' ? 'from-orange-600 to-yellow-400' :
                          'from-yellow-600 to-yellow-300';

        return (
            <motion.div 
                className="relative inline-flex flex-col items-center justify-end"
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
            >
                {/* Crown - Mahkota */}
                <div className={`${sizeClasses[size]} relative`}>
                    <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-5/6 bg-gradient-to-br ${leafColor} rounded-full shadow-md`}></div>
                    <div className={`absolute bottom-1/4 left-1/2 -translate-x-1/2 w-4/5 h-3/5 bg-gradient-to-br ${leafColor} rounded-full opacity-90`}></div>
                    {status === 'siap-panen' && (
                        <>
                            <motion.div 
                                className="absolute top-1/2 left-1/4 w-1 h-1 bg-orange-500 rounded-full"
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                            ></motion.div>
                            <motion.div 
                                className="absolute top-2/3 right-1/4 w-1 h-1 bg-yellow-500 rounded-full"
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                            ></motion.div>
                        </>
                    )}
                </div>
                {/* Trunk - Batang */}
                <div className="w-1 h-2 bg-gradient-to-b from-amber-800 to-amber-900 rounded-sm"></div>
            </motion.div>
        );
    };

    // Component untuk rel kereta/robot MOV
    const RailwayTrack = ({ orientation = 'horizontal' }) => {
        return (
            <div className={`relative ${orientation === 'horizontal' ? 'w-full h-1.5' : 'h-full w-1.5'}`}>
                <div className={`absolute ${orientation === 'horizontal' ? 'w-full h-0.5 top-1/3' : 'h-full w-0.5 left-1/3'} bg-gray-700`}></div>
                <div className={`absolute ${orientation === 'horizontal' ? 'w-full h-0.5 bottom-1/3' : 'h-full w-0.5 right-1/3'} bg-gray-700`}></div>
            </div>
        );
    };

    // Component untuk render tree rows dengan jumlah tertentu
    const TreeRow = ({ count, status }) => {
        const trees = [];
        const sizes = ['sm', 'md', 'md', 'sm', 'md'];
        for (let i = 0; i < count; i++) {
            trees.push(
                <MangoTree3D 
                    key={i} 
                    size={sizes[i % sizes.length]} 
                    status={status} 
                />
            );
        }
        return (
            <motion.div 
                className="flex justify-around items-end"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                {trees}
            </motion.div>
        );
    };

    // Helper function to format location
    const formatLocation = (location) => {
        if (!location || location === 'Tidak diketahui') return 'Tidak diketahui';
        if (typeof location === 'string') return location;
        if (location.blok) return `Blok ${location.blok}`;
        if (location.x !== undefined && location.y !== undefined) {
            return `Posisi (${location.x}, ${location.y})`;
        }
        return 'Tidak diketahui';
    };

    // Helper function to get mission type label
    const getMissionTypeLabel = (missionType) => {
        const labels = {
            'watering': 'Penyiraman',
            'monitoring': 'Monitoring',
            'patrol': 'Patroli',
            'inspection': 'Inspeksi',
        };
        return labels[missionType] || missionType;
    };

    // Firebase Real-time Listener for Robot Status
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

        return () => {
            off(robotStatusRef, 'value', robotStatusCallback);
            off(activeMissionRef, 'value', activeMissionCallback);
        };
    }, []);

    // Firebase Real-time Listener for Sensor Data
    useEffect(() => {
        if (kebuns.length === 0) return;

        // Cleanup previous listeners (except robot listeners)
        const sensorListeners = firebaseListenersRef.current.filter(
            listener => !listener.ref.toString().includes('robot')
        );
        sensorListeners.forEach(listener => {
            off(listener.ref, 'value', listener.callback);
        });
        firebaseListenersRef.current = firebaseListenersRef.current.filter(
            listener => listener.ref.toString().includes('robot')
        );

        // Setup listeners for each blok
        kebuns.forEach(kebun => {
            kebun.bloks.forEach(blok => {
                const blokCode = blok.code;
                // Always use kebun_id = 1 for Firebase structure (single kebun in Firebase)
                const kebunId = 1;
                
                if (!blokCode) return;

                const sensorRef = ref(database, `kebuns/kebun_${kebunId}/bloks/${blokCode}/sensors`);
                
                const callback = (snapshot) => {
                    const data = snapshot.val();
                    
                    if (data) {
                        setIsFirebaseConnected(true);
                        
                        // Calculate status for each sensor
                        const suhuStatus = calculateStatus('suhu_udara', data.suhu_udara?.value);
                        const kelembapanStatus = calculateStatus('kelembapan_udara', data.kelembapan_udara?.value);
                        const kelembapanTanahStatus = calculateStatus('kelembapan_tanah', data.kelembapan_tanah?.value);
                        
                        setRealtimeSensorData(prev => ({
                            ...prev,
                            [blokCode]: {
                                suhu_udara: data.suhu_udara || null,
                                kelembapan_udara: data.kelembapan_udara || null,
                                kelembapan_tanah: data.kelembapan_tanah || null,
                                sensorStatus: {
                                    suhu: suhuStatus,
                                    kelembapan: kelembapanStatus,
                                    kelembapanTanah: kelembapanTanahStatus,
                                },
                                lastUpdate: new Date().toLocaleTimeString('id-ID', { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    second: '2-digit'
                                }),
                            }
                        }));
                    }
                };

                onValue(sensorRef, callback, (error) => {
                    if (error) {
                        console.error(`Firebase listener error for blok ${blokCode}:`, error);
                        setIsFirebaseConnected(false);
                    }
                });

                firebaseListenersRef.current.push({ ref: sensorRef, callback });
            });
        });

        // Cleanup function
        return () => {
            const sensorListeners = firebaseListenersRef.current.filter(
                listener => !listener.ref.toString().includes('robot')
            );
            sensorListeners.forEach(listener => {
                off(listener.ref, 'value', listener.callback);
            });
            firebaseListenersRef.current = firebaseListenersRef.current.filter(
                listener => listener.ref.toString().includes('robot')
            );
        };
    }, [kebuns]);

    // Helper function to get robot status label
    const getRobotStatusLabel = (status) => {
        const statusMap = {
            'aktif': 'Aktif',
            'active': 'Aktif',
            'idle': 'Siap',
            'offline': 'Offline',
            'error': 'Error',
        };
        return statusMap[status] || status;
    };

    // Helper function to get robot status color
    const getRobotStatusColor = (status) => {
        if (status === 'aktif' || status === 'active') {
            return 'from-green-600 to-emerald-600';
        } else if (status === 'idle') {
            return 'from-blue-600 to-cyan-600';
        } else if (status === 'offline') {
            return 'from-gray-600 to-gray-700';
        } else {
            return 'from-red-600 to-red-700';
        }
    };

    // Group bloks by kebun
    const kebunsWithBloks = kebuns.map(kebun => ({
        ...kebun,
        bloks: kebun.bloks || [],
    }));

    return (
        <AuthenticatedLayout>
            <Head title="Monitoring Kebun" />
            
            <div className="min-h-screen relative overflow-hidden">
                <AnimatedBackground />
                <div className="relative z-10 p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
                    {/* Back Button */}
                    <div className="mb-4">
                        <BackButton href="/dashboard" />
                    </div>
                    
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
                    >
                        <div className="flex items-center gap-3">
                            <motion.div
                                animate={{ rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"
                            >
                                <Leaf className="w-6 h-6 text-white" />
                            </motion.div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                    Monitoring Kebun 🌳
                                </h1>
                                <p className="text-sm text-gray-600">Peta 3D interaktif area kebun mangga Anda</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewMode(viewMode === '3d' ? 'simple' : '3d')}
                                className="flex items-center gap-2"
                            >
                                <Navigation className="w-4 h-4" />
                                {viewMode === '3d' ? 'Simple View' : '3D View'}
                            </Button>
                            
                            <Button
                                onClick={() => window.location.reload()}
                                variant="outline"
                                size="sm"
                                disabled={isLoading}
                                className="flex items-center gap-2"
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                            
                            {/* K-Petani Only: Management Buttons */}
                            <KPetaniOnly>
                                <div className="flex items-center gap-2">
                                    <Link href={route('kebun.create')}>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            className="border-green-500 text-green-600 hover:bg-green-50"
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Tambah Kebun
                                        </Button>
                                    </Link>
                                    <Link href={route('blok.create')}>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Tambah Blok
                                        </Button>
                                    </Link>
                                </div>
                            </KPetaniOnly>
                        </div>
                    </motion.div>

                    {/* 3D Map View */}
                    {viewMode === '3d' ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <Card className="p-4 md:p-6 bg-gradient-to-br from-amber-50 via-green-50 to-emerald-50 border-2 border-green-200/50 shadow-2xl overflow-hidden">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-1">Peta 3D Kebun</h3>
                                        <p className="text-sm text-gray-600">Visualisasi interaktif blok kebun dengan pohon mangga</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-green-600" />
                                        <span className="text-sm font-medium text-gray-700">
                                            Total: {calculatedSummary.total_pohon || 0} Pohon
                                        </span>
                                    </div>
                                </div>

                                {/* 3D Map Container */}
                                {kebunsWithBloks.length === 0 ? (
                                    <EmptyState
                                        icon={Leaf}
                                        title="Belum Ada Kebun"
                                        message="Tambahkan kebun untuk memulai monitoring."
                                        actionLabel="Tambah Kebun"
                                        onAction={() => {
                                            window.location.href = route('kebun.create');
                                        }}
                                    />
                                ) : (
                                    <div className="relative bg-gradient-to-br from-green-100 to-green-50 rounded-xl p-4 md:p-6 min-h-[500px] overflow-x-auto">
                                        {/* Grid pattern untuk tanah */}
                                        <div className="absolute inset-0 opacity-10 rounded-xl">
                                            <div className="w-full h-full" style={{
                                                backgroundImage: 'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
                                                backgroundSize: '20px 20px'
                                            }}></div>
                                        </div>

                                        <div className="relative space-y-6">
                                            {kebunsWithBloks.map((kebun, kebunIndex) => (
                                                <motion.div
                                                    key={kebun.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: kebunIndex * 0.1 }}
                                                    className="bg-white/40 backdrop-blur-sm rounded-xl p-4 border-2 border-green-300/60 shadow-lg"
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="text-lg font-bold text-gray-800">{kebun.name}</h4>
                                                        <div className="flex items-center gap-2">
                                                            <Badge className="bg-green-500 text-white text-xs">
                                                                {kebun.bloks.length} Blok
                                                            </Badge>
                                                            <KPetaniOnly>
                                                                <Link href={route('kebun.edit', kebun.id)}>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 w-7 p-0"
                                                                    >
                                                                        <Edit className="w-4 h-4 text-green-600" />
                                                                    </Button>
                                                                </Link>
                                                            </KPetaniOnly>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {kebun.bloks.map((blok, blokIndex) => {
                                                            // Find the corresponding blok from allBloks to get real-time status
                                                            const realtimeBlok = allBloks.find(b => b.id === blok.id) || blok;
                                                            const currentStatus = realtimeBlok.status;
                                                            
                                                            return (
                                                            <motion.div
                                                                key={blok.id}
                                                                initial={{ opacity: 0, scale: 0.9 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: (kebunIndex * 0.1) + (blokIndex * 0.05) }}
                                                                whileHover={{ scale: 1.02 }}
                                                                className={`relative bg-white/70 backdrop-blur-sm rounded-lg p-3 border-2 transition-all duration-300 cursor-pointer ${
                                                                    selectedBlok === blok.id 
                                                                        ? `${getStatusBorderColor(currentStatus)} shadow-xl scale-105` 
                                                                        : `${getStatusBorderColor(currentStatus)} hover:border-green-300`
                                                                }`}
                                                                onClick={() => setSelectedBlok(blok.id)}
                                                            >
                                                                <div className="absolute top-2 right-2">
                                                                    <motion.div
                                                                        key={currentStatus} // Force re-render when status changes
                                                                        initial={{ scale: 0.8, opacity: 0 }}
                                                                        animate={{ scale: 1, opacity: 1 }}
                                                                        transition={{ duration: 0.3 }}
                                                                    >
                                                                        <Badge className={`${getStatusColor(currentStatus)} text-white text-xs shadow-md`}>
                                                                            {blok.code}
                                                                        </Badge>
                                                                    </motion.div>
                                                                </div>
                                                                
                                                                <div className="text-xs text-gray-600 mb-2 font-medium">
                                                                    {blok.name || `Blok ${blok.code}`} ({blok.trees} pohon)
                                                                </div>
                                                                
                                                                <div className="space-y-1.5">
                                                                    <TreeRow count={5} status={currentStatus} />
                                                                    <div className="my-1"><RailwayTrack orientation="horizontal" /></div>
                                                                    <TreeRow count={5} status={currentStatus} />
                                                                    <TreeRow count={5} status={currentStatus} />
                                                                    <div className="my-1"><RailwayTrack orientation="horizontal" /></div>
                                                                    <TreeRow count={Math.min(5, blok.trees - 15)} status={currentStatus} />
                                                                </div>
                                                                
                                                                <div className="mt-2 flex items-center justify-between text-xs">
                                                                    <span className="text-gray-600">🌳 {blok.trees} pohon</span>
                                                                    <motion.span 
                                                                        key={currentStatus} // Force re-render when status changes
                                                                        initial={{ scale: 0.9 }}
                                                                        animate={{ scale: 1 }}
                                                                        transition={{ duration: 0.3 }}
                                                                        className={`font-semibold ${
                                                                            currentStatus === 'sehat' ? 'text-green-600' :
                                                                            currentStatus === 'siap-panen' ? 'text-orange-600' :
                                                                            'text-yellow-600'
                                                                        }`}
                                                                    >
                                                                        ● {getStatusLabel(currentStatus)}
                                                                    </motion.span>
                                                                </div>
                                                            </motion.div>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>

                                        {/* Robot MOV Indicator - Real-time from Firebase */}
                                        {(realtimeRobotStatus.status === 'aktif' || realtimeRobotStatus.status === 'active' || realtimeRobotStatus.status === 'idle') && (
                                            <motion.div
                                                animate={{ 
                                                    scale: realtimeRobotStatus.status === 'aktif' || realtimeRobotStatus.status === 'active' 
                                                        ? [1, 1.1, 1] 
                                                        : [1, 1.05, 1],
                                                    opacity: [0.9, 1, 0.9]
                                                }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className={`absolute bottom-4 left-4 bg-gradient-to-r ${getRobotStatusColor(realtimeRobotStatus.status)} text-white px-4 py-2 rounded-full text-xs flex items-center gap-2 shadow-xl backdrop-blur-sm border-2 border-white/30`}
                                            >
                                                <motion.div
                                                    animate={realtimeRobotStatus.status === 'aktif' || realtimeRobotStatus.status === 'active' 
                                                        ? { rotate: [0, 360] }
                                                        : {}}
                                                    transition={realtimeRobotStatus.status === 'aktif' || realtimeRobotStatus.status === 'active' 
                                                        ? { duration: 2, repeat: Infinity, ease: "linear" }
                                                        : {}}
                                                >
                                                    <Bot className="w-4 h-4" />
                                                </motion.div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{realtimeRobotStatus.nama || 'MOViBOT'}</span>
                                                    <span className="text-[10px] opacity-90">{getRobotStatusLabel(realtimeRobotStatus.status)}</span>
                                                </div>
                                                {realtimeRobotStatus.status === 'aktif' || realtimeRobotStatus.status === 'active' ? (
                                                    <motion.div
                                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                                                        transition={{ duration: 1.5, repeat: Infinity }}
                                                        className="absolute -inset-1 bg-white/30 rounded-full blur-sm"
                                                    />
                                                ) : null}
                                            </motion.div>
                                        )}
                                    </div>
                                )}

                                {/* Legend */}
                                <div className="flex flex-wrap gap-4 text-sm mt-4 pt-4 border-t border-green-200">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-green-500 rounded shadow-sm"></div>
                                        <span className="text-gray-700 font-medium">Sehat</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-yellow-500 rounded shadow-sm"></div>
                                        <span className="text-gray-700 font-medium">Perlu Perhatian</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-orange-500 rounded shadow-sm"></div>
                                        <span className="text-gray-700 font-medium">Siap Panen</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-gray-700 rounded"></div>
                                        <span className="text-gray-700 font-medium">Rel MOViBOT</span>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ) : (
                        /* Simple Grid View */
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <Card className="p-4 md:p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200/50 shadow-xl">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-1">Peta Blok Kebun</h3>
                                        <p className="text-sm text-gray-600">Tampilan grid sederhana</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-green-600" />
                                        <span className="text-sm font-medium text-gray-700">
                                            {summary.total_blok || 0} Blok
                                        </span>
                                    </div>
                                </div>

                                {kebunsWithBloks.length === 0 ? (
                                    <EmptyState
                                        icon={Leaf}
                                        title="Belum Ada Kebun"
                                        message="Tambahkan kebun untuk memulai monitoring."
                                    />
                                ) : (
                                    <div className="space-y-4">
                                        {kebunsWithBloks.map((kebun, kebunIndex) => (
                                            <motion.div
                                                key={kebun.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: kebunIndex * 0.1 }}
                                                className="border-2 border-green-300 rounded-xl p-4 bg-white/50 backdrop-blur-sm"
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="text-base font-bold text-gray-800 flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-green-600" />
                                                        {kebun.name}
                                                    </h4>
                                                    <KPetaniOnly>
                                                        <Link href={route('kebun.edit', kebun.id)}>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-7 w-7 p-0"
                                                            >
                                                                <Edit className="w-4 h-4 text-green-600" />
                                                            </Button>
                                                        </Link>
                                                    </KPetaniOnly>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                    {kebun.bloks.map((blok, blokIndex) => {
                                                        // Find the corresponding blok from allBloks to get real-time status
                                                        const realtimeBlok = allBloks.find(b => b.id === blok.id) || blok;
                                                        const currentStatus = realtimeBlok.status;
                                                        
                                                        return (
                                                        <motion.button
                                                            key={blok.id}
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ 
                                                                opacity: 1, 
                                                                scale: 1,
                                                            }}
                                                            transition={{ delay: (kebunIndex * 0.1) + (blokIndex * 0.05) }}
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            onClick={() => setSelectedBlok(blok.id)}
                                                            className={`aspect-square rounded-xl ${getStatusColor(
                                                                currentStatus
                                                            )} hover:opacity-90 transition-all duration-300 flex flex-col items-center justify-center text-white shadow-lg ${
                                                                selectedBlok === blok.id ? 'ring-4 ring-green-600 scale-105 shadow-2xl' : ''
                                                            }`}
                                                        >
                                                            <span className="text-xs opacity-90 font-medium">Blok</span>
                                                            <span className="font-bold text-lg">{blok.code}</span>
                                                            <span className="text-xs mt-1">{blok.trees} 🌳</span>
                                                        </motion.button>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {/* Legend */}
                                <div className="flex flex-wrap gap-4 text-sm mt-4 pt-4 border-t border-green-200">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-green-500 rounded shadow-sm"></div>
                                        <span className="text-gray-700 font-medium">Sehat</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-yellow-500 rounded shadow-sm"></div>
                                        <span className="text-gray-700 font-medium">Perlu Perhatian</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-orange-500 rounded shadow-sm"></div>
                                        <span className="text-gray-700 font-medium">Siap Panen</span>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* Selected Block Details */}
                    <AnimatePresence>
                        {selected && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card className="p-4 md:p-6 border-2 border-green-500 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 shadow-2xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">
                                                {selected.name || `Blok ${selected.code}`}
                                            </h3>
                                            <p className="text-sm text-gray-600">{selected.kebunName}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className={`${getStatusColor(selected.status)} text-white border-0 shadow-md text-sm px-3 py-1`}>
                                                {getStatusLabel(selected.status)}
                                            </Badge>
                                            <KPetaniOnly>
                                                <Link href={route('blok.edit', selected.id)}>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        <Edit className="w-4 h-4 text-green-600" />
                                                    </Button>
                                                </Link>
                                            </KPetaniOnly>
                                        </div>
                                    </div>

                                    {/* Sensor Data Section */}
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-green-600" />
                                                Data Sensor Real-time
                                            </h4>
                                            {isFirebaseConnected && selected.lastUpdate && (
                                                <div className="flex items-center gap-1 text-xs text-green-600">
                                                    <motion.div
                                                        animate={{ scale: [1, 1.2, 1] }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                    >
                                                        <Wifi className="w-3 h-3" />
                                                    </motion.div>
                                                    <span className="font-medium">Live - {selected.lastUpdate}</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <motion.div
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                className={`bg-white/80 backdrop-blur-sm p-4 rounded-xl text-center border-2 shadow-md ${
                                                    selected.sensorStatus?.suhu === 'critical' ? 'border-red-300 bg-red-50/80' :
                                                    selected.sensorStatus?.suhu === 'warning' ? 'border-yellow-300 bg-yellow-50/80' :
                                                    'border-white/50'
                                                }`}
                                            >
                                                <ThermometerSun className={`w-6 h-6 mx-auto mb-2 ${
                                                    selected.sensorStatus?.suhu === 'critical' ? 'text-red-600' :
                                                    selected.sensorStatus?.suhu === 'warning' ? 'text-yellow-600' :
                                                    'text-orange-600'
                                                }`} />
                                                <p className="text-xs text-gray-600 mb-1 font-medium">Suhu Udara</p>
                                                <p className="text-xl font-bold text-gray-900">{selected.suhu}°C</p>
                                                {selected.sensorStatus?.suhu && selected.sensorStatus.suhu !== 'normal' && (
                                                    <Badge className={`mt-1 text-xs ${
                                                        selected.sensorStatus.suhu === 'critical' ? 'bg-red-500' :
                                                        'bg-yellow-500'
                                                    } text-white`}>
                                                        {selected.sensorStatus.suhu === 'critical' ? 'Kritis' : 'Peringatan'}
                                                    </Badge>
                                                )}
                                            </motion.div>
                                            
                                            <motion.div
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                className={`bg-white/80 backdrop-blur-sm p-4 rounded-xl text-center border-2 shadow-md ${
                                                    selected.sensorStatus?.kelembapan === 'critical' ? 'border-red-300 bg-red-50/80' :
                                                    selected.sensorStatus?.kelembapan === 'warning' ? 'border-yellow-300 bg-yellow-50/80' :
                                                    'border-white/50'
                                                }`}
                                            >
                                                <Droplets className={`w-6 h-6 mx-auto mb-2 ${
                                                    selected.sensorStatus?.kelembapan === 'critical' ? 'text-red-600' :
                                                    selected.sensorStatus?.kelembapan === 'warning' ? 'text-yellow-600' :
                                                    'text-blue-600'
                                                }`} />
                                                <p className="text-xs text-gray-600 mb-1 font-medium">Kelembapan Udara</p>
                                                <p className="text-xl font-bold text-gray-900">{selected.kelembapan}%</p>
                                                {selected.sensorStatus?.kelembapan && selected.sensorStatus.kelembapan !== 'normal' && (
                                                    <Badge className={`mt-1 text-xs ${
                                                        selected.sensorStatus.kelembapan === 'critical' ? 'bg-red-500' :
                                                        'bg-yellow-500'
                                                    } text-white`}>
                                                        {selected.sensorStatus.kelembapan === 'critical' ? 'Kritis' : 'Peringatan'}
                                                    </Badge>
                                                )}
                                            </motion.div>
                                            
                                            {selected.kelembapanTanah !== null && (
                                                <motion.div
                                                    whileHover={{ scale: 1.05, y: -2 }}
                                                    className={`bg-white/80 backdrop-blur-sm p-4 rounded-xl text-center border-2 shadow-md ${
                                                        selected.sensorStatus?.kelembapanTanah === 'critical' ? 'border-red-300 bg-red-50/80' :
                                                        selected.sensorStatus?.kelembapanTanah === 'warning' ? 'border-yellow-300 bg-yellow-50/80' :
                                                        'border-white/50'
                                                    }`}
                                                >
                                                    <Sprout className={`w-6 h-6 mx-auto mb-2 ${
                                                        selected.sensorStatus?.kelembapanTanah === 'critical' ? 'text-red-600' :
                                                        selected.sensorStatus?.kelembapanTanah === 'warning' ? 'text-yellow-600' :
                                                        'text-green-600'
                                                    }`} />
                                                    <p className="text-xs text-gray-600 mb-1 font-medium">Kelembapan Tanah</p>
                                                    <p className="text-xl font-bold text-gray-900">{selected.kelembapanTanah}%</p>
                                                    {selected.sensorStatus?.kelembapanTanah && selected.sensorStatus.kelembapanTanah !== 'normal' && (
                                                        <Badge className={`mt-1 text-xs ${
                                                            selected.sensorStatus.kelembapanTanah === 'critical' ? 'bg-red-500' :
                                                            'bg-yellow-500'
                                                        } text-white`}>
                                                            {selected.sensorStatus.kelembapanTanah === 'critical' ? 'Kritis' : 'Peringatan'}
                                                        </Badge>
                                                    )}
                                                </motion.div>
                                            )}
                                            
                                            <motion.div
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                className="bg-white/80 backdrop-blur-sm p-4 rounded-xl text-center border border-white/50 shadow-md"
                                            >
                                                <Sprout className="w-6 h-6 text-green-600 mx-auto mb-2" />
                                                <p className="text-xs text-gray-600 mb-1 font-medium">Jumlah Pohon</p>
                                                <p className="text-xl font-bold text-gray-900">{selected.trees}</p>
                                            </motion.div>
                                        </div>
                                    </div>

                                    {selected.status === 'perhatian' && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="bg-yellow-100 border-2 border-yellow-400 rounded-xl p-4 mb-3 shadow-md"
                                        >
                                            <div className="flex items-start gap-2">
                                                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                                                <p className="text-sm text-yellow-800 font-medium">
                                                    Kelembapan rendah terdeteksi. Disarankan melakukan penyiraman segera.
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {selected.status === 'siap-panen' && (
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="bg-orange-100 border-2 border-orange-400 rounded-xl p-4 mb-3 shadow-md"
                                        >
                                            <div className="flex items-start gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                                <p className="text-sm text-orange-800 font-medium">
                                                    Buah di blok ini sudah mencapai kematangan optimal. Siap untuk dipanen!
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-gray-200/50 shadow-xl">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                                Aksi Kebun
                            </h3>
                            <div className="space-y-3">
                                <Link href="/robot">
                                    <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 flex items-center justify-center gap-2 shadow-lg">
                                        <Bot className="w-5 h-5" />
                                        Kontrol Robot MOV
                                    </Button>
                                </Link>
                                <Link href="/deteksi">
                                    <Button className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 flex items-center justify-center gap-2 shadow-lg">
                                        <Sprout className="w-5 h-5" />
                                        Deteksi Kematangan Buah
                                    </Button>
                                </Link>
                                <Link href="/prediksi">
                                    <Button
                                        variant="outline"
                                        className="w-full border-2 border-green-500 text-green-600 hover:bg-green-50 font-medium"
                                    >
                                        📊 Lihat Prediksi Panen
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Summary Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="p-4 md:p-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border-2 border-emerald-200/50 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Ringkasan Kebun</h3>
                                {isFirebaseConnected && (
                                    <div className="flex items-center gap-2 text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full border border-green-200">
                                        <Wifi className="w-3 h-3" />
                                        <span>Data Real-time</span>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <motion.div
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/50 shadow-md"
                                >
                                    <p className="text-3xl font-bold text-green-600 mb-1">
                                        {calculatedSummary.blok_sehat || 0}
                                    </p>
                                    <p className="text-sm text-gray-700 font-medium">Blok Sehat</p>
                                </motion.div>
                                <motion.div
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/50 shadow-md"
                                >
                                    <p className="text-3xl font-bold text-orange-600 mb-1">
                                        {calculatedSummary.blok_siap_panen || 0}
                                    </p>
                                    <p className="text-sm text-gray-700 font-medium">Siap Panen</p>
                                </motion.div>
                                <motion.div
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/50 shadow-md"
                                >
                                    <p className="text-3xl font-bold text-yellow-600 mb-1">
                                        {calculatedSummary.blok_perhatian || 0}
                                    </p>
                                    <p className="text-sm text-gray-700 font-medium">Perlu Perhatian</p>
                                </motion.div>
                                <motion.div
                                    whileHover={{ scale: 1.05, y: -2 }}
                                    className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/50 shadow-md"
                                >
                                    <p className="text-3xl font-bold text-gray-700 mb-1">
                                        {calculatedSummary.total_pohon || 0}
                                    </p>
                                    <p className="text-sm text-gray-700 font-medium">Total Pohon</p>
                                </motion.div>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
