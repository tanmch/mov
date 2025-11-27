import { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import AnimatedBackground from '@/Components/AnimatedBackground';
import { useHeaderOffset } from '@/hooks/useHeaderOffset';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Thermometer, Droplets, Sprout, AlertTriangle, TrendingUp, Calendar, Activity, Wifi, WifiOff, Clock, Edit2, Save, X, CheckCircle2, XCircle, MapPin, ChevronDown, Filter } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import BackButton from '@/Components/BackButton';

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
    error = null,
    thresholds = {} // Sensor thresholds from backend
}) {
    const page = usePage();
    const { auth } = page.props;
    const { isKPetani } = useRole();
    const topOffset = useHeaderOffset();
    
    // Get CSRF token from page props or meta tag
    const getCsrfToken = () => {
        return page.props.csrf || 
               document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || 
               '';
    };
    const [selectedPeriod, setSelectedPeriod] = useState(period);
    const [selectedBlok, setSelectedBlok] = useState(selectedBlokId);
    
    // Real-time sensor data state
    const [realtimeSensors, setRealtimeSensors] = useState(currentSensors);
    const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
    const [realtimeLastUpdate, setRealtimeLastUpdate] = useState(lastUpdate);
    const firebaseListenersRef = useRef([]);
    const [isBlokDropdownOpen, setIsBlokDropdownOpen] = useState(false);
    const blokDropdownRef = useRef(null);
    
    // Threshold editing state
    const [editingThreshold, setEditingThreshold] = useState(null);
    const [thresholdForm, setThresholdForm] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [savingSensorType, setSavingSensorType] = useState(null); // Track which sensor is being saved
    
    // Notification state
    const [notification, setNotification] = useState(null);
    
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
                const filtered = parsed.filter(point => point.timestamp >= thirtyDaysAgo);
                
                // Normalize data structure: ensure kelembapan and kelembapanTanah keys exist
                // (for backward compatibility with old data that might only have kelembUdara/kelembTanah)
                return filtered.map(point => ({
                    ...point,
                    kelembapan: point.kelembapan ?? point.kelembUdara ?? 0,
                    kelembapanTanah: point.kelembapanTanah ?? point.kelembTanah ?? 0,
                    // Keep old keys for compatibility
                    kelembUdara: point.kelembUdara ?? point.kelembapan ?? 0,
                    kelembTanah: point.kelembTanah ?? point.kelembapanTanah ?? 0,
                }));
            }
        } catch (e) {
            console.error('Error loading chart data from localStorage:', e);
        }
        return [];
    });

    // Initialize threshold form with defaults
    useEffect(() => {
        const defaultThresholds = {
            suhu_udara: {
                warning_max: 35,
                critical_max: 40,
                normal_min: 20,
                normal_max: 32,
            },
            kelembapan_udara: {
                warning_min: 30,
                critical_min: 20,
                normal_min: 60,
                normal_max: 85,
            },
            kelembapan_tanah: {
                warning_min: 30,
                critical_min: 20,
                normal_min: 50,
                normal_max: 75,
            },
        };
        
        // Merge with thresholds from props
        const mergedThresholds = {};
        ['suhu_udara', 'kelembapan_udara', 'kelembapan_tanah'].forEach(type => {
            mergedThresholds[type] = {
                ...defaultThresholds[type],
                ...(thresholds[type] || {})
            };
        });
        setThresholdForm(mergedThresholds);
    }, [thresholds]);

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

    // Handle threshold editing
    const handleEditThreshold = (sensorType) => {
        setEditingThreshold(sensorType);
    };

    const handleCancelEdit = () => {
        setEditingThreshold(null);
        // Reset form to original values
        const defaultThresholds = {
            suhu_udara: {
                warning_max: 35,
                critical_max: 40,
                normal_min: 20,
                normal_max: 32,
            },
            kelembapan_udara: {
                warning_min: 30,
                critical_min: 20,
                normal_min: 60,
                normal_max: 85,
            },
            kelembapan_tanah: {
                warning_min: 30,
                critical_min: 20,
                normal_min: 50,
                normal_max: 75,
            },
        };
        const mergedThresholds = {};
        ['suhu_udara', 'kelembapan_udara', 'kelembapan_tanah'].forEach(type => {
            mergedThresholds[type] = {
                ...defaultThresholds[type],
                ...(thresholds[type] || {})
            };
        });
        setThresholdForm(mergedThresholds);
    };

    const handleSaveThreshold = async (sensorType) => {
        setIsSaving(true);
        setSavingSensorType(sensorType); // Set which sensor is being saved
        try {
            const formData = thresholdForm[sensorType];
            
            // Clean and validate form data - convert empty strings to null
            const cleanedData = {};
            Object.keys(formData).forEach(key => {
                const value = formData[key];
                // Convert empty string or undefined to null, but keep 0 as 0
                if (value === '' || value === undefined || value === null) {
                    cleanedData[key] = null;
                } else {
                    const numValue = parseFloat(value);
                    cleanedData[key] = isNaN(numValue) ? null : numValue;
                }
            });
            
            // Get CSRF token
            const csrfToken = getCsrfToken();
            
            // Use fetch directly since endpoint returns JSON
            const response = await fetch(`/sensor-thresholds/${sensorType}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify(cleanedData),
            });

            // Parse response
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                // If response is not JSON, create error object
                data = {
                    success: false,
                    message: `Server error: ${response.status} ${response.statusText}`
                };
            }

            if (!response.ok) {
                // Handle validation errors from Laravel
                let errorMessage = 'Gagal menyimpan batas normal sensor';
                
                if (data.message) {
                    errorMessage = data.message;
                } else if (data.errors) {
                    // Laravel validation errors
                    const errorMessages = Object.values(data.errors).flat();
                    errorMessage = errorMessages.join(', ') || errorMessage;
                } else if (data.error) {
                    errorMessage = data.error;
                }
                
                setNotification({
                    type: 'error',
                    message: errorMessage,
                });
                
                // Auto close notification after 5 seconds for errors
                setTimeout(() => {
                    setNotification(null);
                }, 5000);
                
                return; // Exit early on error
            }

            if (data.success) {
                // Show success notification
                setNotification({
                    type: 'success',
                    message: data.message || 'Batas normal sensor berhasil diperbarui',
                    sensorType: sensorType,
                });
                
                // Reload thresholds from backend
                router.reload({ only: ['thresholds'], preserveScroll: true });
                
                // Auto close notification after 3 seconds
                setTimeout(() => {
                    setNotification(null);
                }, 3000);
            } else {
                // Show error notification
                setNotification({
                    type: 'error',
                    message: data.message || 'Gagal menyimpan batas normal sensor',
                });
                
                // Auto close notification after 4 seconds
                setTimeout(() => {
                    setNotification(null);
                }, 4000);
            }
        } catch (error) {
            console.error('Error saving threshold:', error);
            setNotification({
                type: 'error',
                message: error.message || 'Terjadi kesalahan saat menyimpan batas normal sensor. Pastikan semua nilai valid.',
            });
            
            // Auto close notification after 5 seconds
            setTimeout(() => {
                setNotification(null);
            }, 5000);
        } finally {
            setIsSaving(false);
            setSavingSensorType(null); // Reset saving sensor type
        }
    };

    const handleSaveAllThresholds = async () => {
        setIsSaving(true);
        setSavingSensorType('all'); // Set to 'all' to show loading on all cards
        try {
            // Get CSRF token
            const csrfToken = getCsrfToken();
            
            const sensorTypes = ['suhu_udara', 'kelembapan_udara', 'kelembapan_tanah'];
            const results = [];
            
            // Save all sensors sequentially
            for (const sensorType of sensorTypes) {
                const formData = thresholdForm[sensorType];
                if (!formData) continue;
                
                // Clean and validate form data - convert empty strings to null
                const cleanedData = {};
                Object.keys(formData).forEach(key => {
                    const value = formData[key];
                    // Convert empty string or undefined to null, but keep 0 as 0
                    if (value === '' || value === undefined || value === null) {
                        cleanedData[key] = null;
                    } else {
                        const numValue = parseFloat(value);
                        cleanedData[key] = isNaN(numValue) ? null : numValue;
                    }
                });
                
                try {
                    const response = await fetch(`/sensor-thresholds/${sensorType}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': csrfToken,
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify(cleanedData),
                    });

                    // Parse response
                    let data;
                    try {
                        data = await response.json();
                    } catch (jsonError) {
                        data = {
                            success: false,
                            message: `Server error: ${response.status} ${response.statusText}`
                        };
                    }

                    if (!response.ok) {
                        // Handle validation errors from Laravel
                        let errorMessage = 'Gagal menyimpan';
                        
                        if (data.message) {
                            errorMessage = data.message;
                        } else if (data.errors) {
                            // Laravel validation errors
                            const errorMessages = Object.values(data.errors).flat();
                            errorMessage = errorMessages.join(', ') || errorMessage;
                        } else if (data.error) {
                            errorMessage = data.error;
                        }
                        
                        results.push({
                            sensorType,
                            success: false,
                            message: errorMessage,
                        });
                    } else {
                        results.push({
                            sensorType,
                            success: data.success || true,
                            message: data.message || 'Berhasil disimpan',
                        });
                    }
                } catch (error) {
                    results.push({
                        sensorType,
                        success: false,
                        message: error.message || 'Gagal menyimpan',
                    });
                }
            }
            
            // Check results
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;
            
            if (failCount === 0) {
                // All successful
                setNotification({
                    type: 'success',
                    message: `Semua batas normal sensor (${successCount}) berhasil diperbarui`,
                });
                
                // Reload thresholds from backend
                router.reload({ only: ['thresholds'], preserveScroll: true });
                
                // Auto close notification after 3 seconds
                setTimeout(() => {
                    setNotification(null);
                }, 3000);
            } else if (successCount > 0) {
                // Partial success
                setNotification({
                    type: 'error',
                    message: `${successCount} sensor berhasil, ${failCount} sensor gagal diperbarui`,
                });
                
                setTimeout(() => {
                    setNotification(null);
                }, 4000);
            } else {
                // All failed
                setNotification({
                    type: 'error',
                    message: 'Gagal menyimpan semua batas normal sensor',
                });
                
                setTimeout(() => {
                    setNotification(null);
                }, 4000);
            }
        } catch (error) {
            console.error('Error saving all thresholds:', error);
            setNotification({
                type: 'error',
                message: 'Terjadi kesalahan saat menyimpan batas normal sensor',
            });
            
            setTimeout(() => {
                setNotification(null);
            }, 4000);
        } finally {
            setIsSaving(false);
            setSavingSensorType(null); // Reset saving sensor type
        }
    };

    const handleThresholdChange = (sensorType, field, value) => {
        setThresholdForm(prev => ({
            ...prev,
            [sensorType]: {
                ...prev[sensorType],
                [field]: parseFloat(value) || 0,
            },
        }));
    };

    // Store sensor data per blok for average calculation
    const [allBlokSensorData, setAllBlokSensorData] = useState({});
    
    // State for Firebase-discovered bloks
    const [firebaseBloks, setFirebaseBloks] = useState([]);
    
    // Calculate status based on thresholds (use configurable thresholds)
    // Define this function BEFORE using it in useEffect
    const calculateStatus = (sensorType, value) => {
        if (!value || value === 0) return 'normal';
        
        const threshold = thresholdForm[sensorType] || thresholds[sensorType] || {};
        
        if (sensorType === 'suhu_udara') {
            // For temperature: higher is worse
            const criticalMax = threshold.critical_max ?? 40;
            const warningMax = threshold.warning_max ?? 35;
            
            if (value >= criticalMax) return 'critical';
            if (value >= warningMax) return 'warning';
            return 'normal';
        } else {
            // For humidity: lower is worse
            const criticalMin = threshold.critical_min ?? 20;
            const warningMin = threshold.warning_min ?? 30;
            
            if (value <= criticalMin) return 'critical';
            if (value <= warningMin) return 'warning';
            return 'normal';
        }
    };
    
    // Calculate average and update realtimeSensors when allBlokSensorData changes and selectedBlok is 'all'
    useEffect(() => {
        if (selectedBlok === 'all') {
            const allBlokCodes = Object.keys(allBlokSensorData);
            if (allBlokCodes.length > 0) {
                // Calculate average for each sensor type
                const suhuValues = allBlokCodes
                    .map(blokCode => allBlokSensorData[blokCode]?.suhu_udara)
                    .filter(v => v !== undefined && v !== null && v !== 0);
                const kelembUdaraValues = allBlokCodes
                    .map(blokCode => allBlokSensorData[blokCode]?.kelembapan_udara)
                    .filter(v => v !== undefined && v !== null && v !== 0);
                const kelembTanahValues = allBlokCodes
                    .map(blokCode => allBlokSensorData[blokCode]?.kelembapan_tanah)
                    .filter(v => v !== undefined && v !== null && v !== 0);
                
                const avgSuhu = suhuValues.length > 0 
                    ? Math.round((suhuValues.reduce((a, b) => a + b, 0) / suhuValues.length) * 10) / 10 
                    : 0;
                const avgKelembUdara = kelembUdaraValues.length > 0 
                    ? Math.round((kelembUdaraValues.reduce((a, b) => a + b, 0) / kelembUdaraValues.length) * 10) / 10 
                    : 0;
                const avgKelembTanah = kelembTanahValues.length > 0 
                    ? Math.round((kelembTanahValues.reduce((a, b) => a + b, 0) / kelembTanahValues.length) * 10) / 10 
                    : 0;
                
                // Update realtimeSensors with average values
                setRealtimeSensors({
                    suhu_udara: {
                        value: avgSuhu,
                        unit: '°C',
                        status: calculateStatus('suhu_udara', avgSuhu),
                        timestamp: Date.now(),
                    },
                    kelembapan_udara: {
                        value: avgKelembUdara,
                        unit: '%',
                        status: calculateStatus('kelembapan_udara', avgKelembUdara),
                        timestamp: Date.now(),
                    },
                    kelembapan_tanah: {
                        value: avgKelembTanah,
                        unit: '%',
                        status: calculateStatus('kelembapan_tanah', avgKelembTanah),
                        timestamp: Date.now(),
                    },
                });
            } else {
                // Fallback to MySQL data (currentSensors prop) if Firebase doesn't have data
                if (currentSensors && Object.keys(currentSensors).length > 0) {
                    const sensorUpdates = {};
                    if (currentSensors.suhu_udara?.value !== undefined) {
                        sensorUpdates.suhu_udara = {
                            value: currentSensors.suhu_udara.value,
                            unit: '°C',
                            status: calculateStatus('suhu_udara', currentSensors.suhu_udara.value),
                            timestamp: Date.now(),
                        };
                    }
                    if (currentSensors.kelembapan_udara?.value !== undefined) {
                        sensorUpdates.kelembapan_udara = {
                            value: currentSensors.kelembapan_udara.value,
                            unit: '%',
                            status: calculateStatus('kelembapan_udara', currentSensors.kelembapan_udara.value),
                            timestamp: Date.now(),
                        };
                    }
                    if (currentSensors.kelembapan_tanah?.value !== undefined) {
                        sensorUpdates.kelembapan_tanah = {
                            value: currentSensors.kelembapan_tanah.value,
                            unit: '%',
                            status: calculateStatus('kelembapan_tanah', currentSensors.kelembapan_tanah.value),
                            timestamp: Date.now(),
                        };
                    }
                    if (Object.keys(sensorUpdates).length > 0) {
                        console.log('[MonitoringSensor] Using MySQL fallback data for average:', sensorUpdates);
                        setRealtimeSensors(sensorUpdates);
                    }
                }
            }
        }
        // Don't clear allBlokSensorData when not in 'all' mode - we need it for single blok selection
    }, [allBlokSensorData, selectedBlok, currentSensors, thresholds]);
    
    // Get sensor values from Firebase, with fallback to MySQL (currentSensors prop)
    // Define this function BEFORE using it
    const getDisplayedSensorValue = (sensorType) => {
        // Priority: Firebase realtimeSensors > MySQL currentSensors
        if (realtimeSensors?.[sensorType]?.value !== undefined && realtimeSensors?.[sensorType]?.value !== null && realtimeSensors?.[sensorType]?.value !== 0) {
            return realtimeSensors[sensorType].value;
        }
        // Fallback to MySQL data
        const mysqlSensor = currentSensors?.[sensorType];
        if (mysqlSensor && mysqlSensor.value !== undefined && mysqlSensor.value !== null) {
            return mysqlSensor.value;
        }
        return 0; // Default to 0 if no data
    };
    
    // Get sensor values with fallback (prioritize real-time data)
    const suhuUdara = getDisplayedSensorValue('suhu_udara');
    const kelembabanUdara = getDisplayedSensorValue('kelembapan_udara');
    const kelembabanTanah = getDisplayedSensorValue('kelembapan_tanah');
    
    // Calculate status for each sensor
    const suhuStatus = calculateStatus('suhu_udara', suhuUdara);
    const kelembabanUdaraStatus = calculateStatus('kelembapan_udara', kelembabanUdara);
    const kelembabanTanahStatus = calculateStatus('kelembapan_tanah', kelembabanTanah);

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
                return 'bg-red-100 text-red-700 border-red-300';
            case 'warning':
                return 'bg-yellow-100 text-yellow-700 border-yellow-300';
            default:
                return 'bg-green-100 text-green-700 border-green-300';
        }
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

    // Update realtime sensors when props change
    useEffect(() => {
        setRealtimeSensors(currentSensors);
        setRealtimeLastUpdate(lastUpdate);
    }, [currentSensors, lastUpdate]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (blokDropdownRef.current && !blokDropdownRef.current.contains(event.target)) {
                setIsBlokDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get selected blok label
    const getSelectedBlokLabel = () => {
        if (selectedBlok === 'all') {
            return 'Semua Blok';
        }
        // Prioritize firebaseBloks if available
        const bloksToUse = (firebaseBloks && firebaseBloks.length > 0 && firebaseBloks.length >= bloks.length) ? firebaseBloks : bloks;
        const selected = blokOptions.find(opt => opt.value.toString() === selectedBlok.toString());
        
        if (selected) {
            // Extract blok code from label (e.g., "A1 - Blok A1" -> "A1")
            const label = selected.label;
            // If label contains " - ", take the part before it (the code)
            if (label.includes(' - ')) {
                return label.split(' - ')[0];
            }
            // If label is just the code, return it
            return label;
        }
        
        // Fallback: try to find blok from bloks array
        const blokObj = bloksToUse.find(b => {
            const bId = b.id?.toString();
            const bCode = b.code?.toString();
            const selected = selectedBlok.toString();
            return bId === selected || bCode === selected;
        });
        
        if (blokObj && blokObj.code) {
            return blokObj.code;
        }
        
        // Last fallback: return selectedBlok value itself (should be the code)
        return selectedBlok.toString();
    };
    
    // Discover bloks from Firebase first
    useEffect(() => {
        console.log('[MonitoringSensor] Discovering bloks from Firebase...');
        
        const kebunIds = [1]; // Can be extended to check multiple kebuns
        const discoveredBloksMap = new Map(); // Use Map to avoid duplicates
        
        kebunIds.forEach(kebunId => {
            const bloksRef = ref(database, `kebuns/kebun_${kebunId}/bloks`);
            
            const discoveryCallback = (snapshot) => {
                const bloksData = snapshot.val();
                console.log(`[MonitoringSensor] Discovered bloks from kebun_${kebunId}:`, bloksData);
                
                if (bloksData && typeof bloksData === 'object') {
                    Object.keys(bloksData).forEach(blokCode => {
                        // Accept ALL bloks that exist in Firebase structure
                        const blokData = bloksData[blokCode];
                        if (blokData !== null && blokData !== undefined) {
                            const key = `${kebunId}_${blokCode}`;
                            if (!discoveredBloksMap.has(key)) {
                                discoveredBloksMap.set(key, {
                                    id: blokCode, // Use code as ID for Firebase-discovered bloks
                                    code: blokCode,
                                    kebun_id: kebunId,
                                    name: blokCode // Default name
                                });
                                console.log(`[MonitoringSensor] Added blok ${blokCode} from kebun_${kebunId} to discovered list`);
                            }
                        }
                    });
                    
                    // Convert Map to Array
                    const discoveredBloks = Array.from(discoveredBloksMap.values());
                    
                    // Update state with discovered bloks
                    setFirebaseBloks(discoveredBloks);
                    
                    console.log('[MonitoringSensor] Discovered bloks:', discoveredBloks);
                }
            };
            
            onValue(bloksRef, discoveryCallback, (error) => {
                if (error) {
                    console.error(`[MonitoringSensor] Error discovering bloks from kebun_${kebunId}:`, error);
                } else {
                    console.log(`[MonitoringSensor] Discovery listener connected for kebun_${kebunId}`);
                }
            });
            
            firebaseListenersRef.current.push({ ref: bloksRef, callback: discoveryCallback, isDiscoveryListener: true });
        });
        
        // Cleanup function
        return () => {
            const discoveryListeners = firebaseListenersRef.current.filter(l => l.isDiscoveryListener);
            discoveryListeners.forEach(listener => {
                off(listener.ref, 'value', listener.callback);
            });
            firebaseListenersRef.current = firebaseListenersRef.current.filter(l => !l.isDiscoveryListener);
        };
    }, []);

    // Firebase Real-time Listener
    useEffect(() => {
        console.log('[MonitoringSensor] Firebase listener effect triggered', {
            bloksCount: bloks.length,
            firebaseBloksCount: firebaseBloks.length,
            selectedBlok
        });

        // Cleanup previous sensor listeners (but keep discovery listener)
        const sensorListeners = firebaseListenersRef.current.filter(l => l.isSensorListener);
        sensorListeners.forEach(listener => {
            off(listener.ref, 'value', listener.callback);
        });
        firebaseListenersRef.current = firebaseListenersRef.current.filter(l => !l.isSensorListener);

        // Prioritize firebaseBloks if it has more bloks than MySQL bloks
        let bloksToUse = firebaseBloks && firebaseBloks.length > 0 ? firebaseBloks : bloks;
        if (firebaseBloks && firebaseBloks.length > 0 && firebaseBloks.length >= bloks.length) {
            bloksToUse = firebaseBloks;
        } else if (bloks && bloks.length > 0) {
            bloksToUse = bloks;
        }
        
        // If no bloks or selectedBlok is 'all', listen to all accessible bloks
        // Always listen to ALL bloks to ensure allBlokSensorData is populated
        const bloksToListen = selectedBlok === 'all' 
            ? bloksToUse 
            : bloksToUse.filter(b => {
                const bId = b.id?.toString();
                const bCode = b.code?.toString();
                const selected = selectedBlok.toString();
                return bId === selected || bCode === selected;
            });

        if (bloksToListen.length === 0) {
            console.warn('[MonitoringSensor] No bloks to listen to after filtering', { selectedBlok, bloksCount: bloksToUse.length });
            setIsFirebaseConnected(false);
            return;
        }
        
        // If selectedBlok is not 'all', also listen to all bloks to populate allBlokSensorData
        // This ensures that when user switches between bloks, data is already available
        const allBloksToListen = selectedBlok === 'all' 
            ? bloksToListen 
            : bloksToUse; // Always listen to all bloks

        const activeListeners = new Set();

        // Setup listeners for each blok (listen to all bloks to populate allBlokSensorData)
        allBloksToListen.forEach(blok => {
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
                    // Store data per blok for average calculation when selectedBlok is 'all'
                    // Store data per blok (always, even if empty)
                    setAllBlokSensorData(prev => ({
                        ...prev,
                        [blokCode]: {
                            suhu_udara: sensorUpdates.suhu_udara?.value,
                            kelembapan_udara: sensorUpdates.kelembapan_udara?.value,
                            kelembapan_tanah: sensorUpdates.kelembapan_tanah?.value,
                        }
                    }));
                    
                    // If selectedBlok is not 'all', update realtimeSensors directly ONLY if this is the selected blok
                    // Check if this blok matches the selected blok
                    const isSelectedBlok = selectedBlok !== 'all' && (
                        blok.id?.toString() === selectedBlok.toString() || 
                        blokCode === selectedBlok.toString()
                    );
                    
                    if (isSelectedBlok && Object.keys(sensorUpdates).length > 0) {
                        console.log(`[MonitoringSensor] Updating realtimeSensors for selected blok ${blokCode}:`, sensorUpdates);
                        setRealtimeSensors(sensorUpdates); // Replace, don't merge
                    } else if (selectedBlok === 'all') {
                        // If 'all', calculate average and update realtimeSensors
                        // This will be done in useEffect that watches allBlokSensorData
                    }

                    // Always add to historical chart data (same as Dashboard)
                    // Always store data even if sensorUpdates is empty (will use 0 values)
                    // Use same structure as Dashboard: suhu, kelembapan, kelembapanTanah
                    const now = new Date();
                    const timestamp = now.getTime();
                    
                    // Get latest timestamp from sensor updates or use current time
                    const timestamps = Object.values(sensorUpdates)
                        .map(s => s.timestamp || 0)
                        .filter(t => t > 0);
                    const latestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : timestamp;
                    
                    // Update last update time
                    const updateTime = new Date(latestTimestamp);
                    setRealtimeLastUpdate(updateTime.toLocaleTimeString('id-ID', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                    }) + ' (Real-time)');
                    
                    // Store trend data for this specific blok (same as Dashboard)
                    // Always store data even if some sensors are missing (use 0 like Dashboard)
                    const chartPoint = {
                        time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                        timestamp: timestamp,
                        blokId: blokCode, // Store blok code for filtering
                        suhu: sensorUpdates.suhu_udara?.value ?? 0, // Use 0 like Dashboard
                        kelembapan: sensorUpdates.kelembapan_udara?.value ?? 0, // Use same key as Dashboard
                        kelembapanTanah: sensorUpdates.kelembapan_tanah?.value ?? 0, // Use same key as Dashboard
                        // Also keep old keys for backward compatibility
                        kelembUdara: sensorUpdates.kelembapan_udara?.value ?? 0,
                        kelembTanah: sensorUpdates.kelembapan_tanah?.value ?? 0,
                    };
                    
                    setRealtimeChartData(prev => {
                        // Remove old data points for this blok with same timestamp (within 5 seconds) to avoid duplicates
                        const filtered = prev.filter(point => 
                            !(point.blokId === blokCode && Math.abs(point.timestamp - timestamp) < 5000)
                        );
                        const updated = [...filtered, chartPoint];
                        
                        // Keep only last 30 days (to support 7d and 30d periods)
                        const thirtyDaysAgo = timestamp - (30 * 24 * 60 * 60 * 1000);
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

            firebaseListenersRef.current.push({ ref: sensorRef, callback, isSensorListener: true });
        });

        // Cleanup function - only cleanup sensor listeners
        return () => {
            const sensorListeners = firebaseListenersRef.current.filter(l => l.isSensorListener);
            sensorListeners.forEach(listener => {
                off(listener.ref, 'value', listener.callback);
            });
            firebaseListenersRef.current = firebaseListenersRef.current.filter(l => !l.isSensorListener);
        };
    }, [bloks, firebaseBloks, selectedBlok]);
    
    // Update sensor display when selectedBlok changes (for single blok selection)
    useEffect(() => {
        if (selectedBlok === 'all') {
            // Average calculation is handled in the useEffect below
            return;
        }
        
        // Find the selected blok
        const bloksToUse = (firebaseBloks && firebaseBloks.length > 0 && firebaseBloks.length >= bloks.length) ? firebaseBloks : bloks;
        const selectedBlokObj = bloksToUse.find(b => {
            const bId = b.id?.toString();
            const bCode = b.code?.toString();
            const selected = selectedBlok.toString();
            return bId === selected || bCode === selected;
        });
        
        const selectedBlokCode = selectedBlokObj?.code || selectedBlok.toString();
        
        console.log('[MonitoringSensor] Updating sensor display for selected blok:', { selectedBlok, selectedBlokCode, availableBloks: bloksToUse.map(b => b.code), availableData: Object.keys(allBlokSensorData) });
        
        const blokData = allBlokSensorData[selectedBlokCode];
        if (blokData) {
            const sensorUpdates = {};
            
            if (blokData.suhu_udara !== undefined && blokData.suhu_udara !== null) {
                let status = 'normal';
                if (blokData.suhu_udara >= 40) status = 'critical';
                else if (blokData.suhu_udara >= 35) status = 'warning';
                
                sensorUpdates.suhu_udara = {
                    value: blokData.suhu_udara,
                    unit: '°C',
                    status: status,
                    timestamp: Date.now(),
                };
            }
            
            if (blokData.kelembapan_udara !== undefined && blokData.kelembapan_udara !== null) {
                let status = 'normal';
                if (blokData.kelembapan_udara <= 20) status = 'critical';
                else if (blokData.kelembapan_udara <= 30) status = 'warning';
                
                sensorUpdates.kelembapan_udara = {
                    value: blokData.kelembapan_udara,
                    unit: '%',
                    status: status,
                    timestamp: Date.now(),
                };
            }
            
            if (blokData.kelembapan_tanah !== undefined && blokData.kelembapan_tanah !== null) {
                let status = 'normal';
                if (blokData.kelembapan_tanah <= 20) status = 'critical';
                else if (blokData.kelembapan_tanah <= 30) status = 'warning';
                
                sensorUpdates.kelembapan_tanah = {
                    value: blokData.kelembapan_tanah,
                    unit: '%',
                    status: status,
                    timestamp: Date.now(),
                };
            }
            
            if (Object.keys(sensorUpdates).length > 0) {
                console.log(`[MonitoringSensor] Setting realtimeSensors for blok ${selectedBlokCode}:`, sensorUpdates);
                setRealtimeSensors(sensorUpdates);
            } else {
                console.warn(`[MonitoringSensor] No sensor data available for blok ${selectedBlokCode}`);
            }
        } else {
            console.warn(`[MonitoringSensor] Blok ${selectedBlokCode} not found in allBlokSensorData`);
            // Fallback to MySQL data (currentSensors prop) if Firebase doesn't have data
            // Note: currentSensors from MySQL may not be filtered by blok, so we use it as general fallback
            if (currentSensors && Object.keys(currentSensors).length > 0) {
                const sensorUpdates = {};
                if (currentSensors.suhu_udara?.value !== undefined) {
                    sensorUpdates.suhu_udara = {
                        value: currentSensors.suhu_udara.value,
                        unit: '°C',
                        status: calculateStatus('suhu_udara', currentSensors.suhu_udara.value),
                        timestamp: Date.now(),
                    };
                }
                if (currentSensors.kelembapan_udara?.value !== undefined) {
                    sensorUpdates.kelembapan_udara = {
                        value: currentSensors.kelembapan_udara.value,
                        unit: '%',
                        status: calculateStatus('kelembapan_udara', currentSensors.kelembapan_udara.value),
                        timestamp: Date.now(),
                    };
                }
                if (currentSensors.kelembapan_tanah?.value !== undefined) {
                    sensorUpdates.kelembapan_tanah = {
                        value: currentSensors.kelembapan_tanah.value,
                        unit: '%',
                        status: calculateStatus('kelembapan_tanah', currentSensors.kelembapan_tanah.value),
                        timestamp: Date.now(),
                    };
                }
                if (Object.keys(sensorUpdates).length > 0) {
                    console.log(`[MonitoringSensor] Using MySQL fallback data for blok ${selectedBlokCode}:`, sensorUpdates);
                    setRealtimeSensors(sensorUpdates);
                }
            }
        }
    }, [selectedBlok, bloks, firebaseBloks, allBlokSensorData, currentSensors, thresholds]);

    // Get sensor type label
    const getSensorTypeLabel = (sensorType) => {
        const labels = {
            'suhu_udara': 'Suhu Udara',
            'kelembapan_udara': 'Kelembaban Udara',
            'kelembapan_tanah': 'Kelembaban Tanah',
        };
        return labels[sensorType] || sensorType;
    };

    return (
        <AuthenticatedLayout>
            <Head title="Monitoring Sensor IoT" />
            
            {/* Success/Error Notification Popup */}
            {notification && (
                <motion.div
                    initial={{ opacity: 0, y: -50, scale: 0.9 }}
                    animate={{ 
                        opacity: 1, 
                        y: 0, 
                        scale: 1,
                        top: `${topOffset}px`,
                    }}
                    exit={{ opacity: 0, y: -50, scale: 0.9 }}
                    style={{
                        top: `${topOffset}px`,
                    }}
                    className="fixed right-4 z-[9999] max-w-md"
                >
                    <div className={`relative p-5 rounded-2xl shadow-2xl border-2 overflow-hidden ${
                        notification.type === 'success' 
                            ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 border-green-300' 
                            : 'bg-gradient-to-br from-red-50 via-rose-50 to-red-100 border-red-300'
                    }`}>
                        {/* Animated background glow */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${
                            notification.type === 'success' 
                                ? 'from-green-400/20 to-emerald-400/20' 
                                : 'from-red-400/20 to-rose-400/20'
                        } opacity-0 animate-pulse`}></div>
                        
                        {/* Decorative circles */}
                        <div className={`absolute top-0 right-0 w-32 h-32 ${
                            notification.type === 'success' 
                                ? 'bg-green-300/20' 
                                : 'bg-red-300/20'
                        } rounded-full blur-2xl -mr-16 -mt-16`}></div>
                        
                        <div className="relative z-10 flex items-start gap-4">
                            {/* Icon */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                                className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                                    notification.type === 'success' 
                                        ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                                        : 'bg-gradient-to-br from-red-500 to-rose-600'
                                }`}
                            >
                                {notification.type === 'success' ? (
                                    <CheckCircle2 className="w-6 h-6 text-white" />
                                ) : (
                                    <XCircle className="w-6 h-6 text-white" />
                                )}
                            </motion.div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-extrabold mb-1 ${
                                    notification.type === 'success' 
                                        ? 'text-green-800' 
                                        : 'text-red-800'
                                }`}>
                                    {notification.type === 'success' ? 'Berhasil!' : 'Gagal!'}
                                </h4>
                                <p className={`text-sm font-semibold ${
                                    notification.type === 'success' 
                                        ? 'text-green-700' 
                                        : 'text-red-700'
                                }`}>
                                    {notification.message}
                                </p>
                                {notification.sensorType && (
                                    <p className="text-xs text-gray-600 mt-1">
                                        Sensor: {getSensorTypeLabel(notification.sensorType)}
                                    </p>
                                )}
                            </div>
                            
                            {/* Close button */}
                            <button
                                onClick={() => setNotification(null)}
                                className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/50 transition-colors ${
                                    notification.type === 'success' 
                                        ? 'text-green-700' 
                                        : 'text-red-700'
                                }`}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        {/* Progress bar */}
                        <motion.div
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{ duration: 3, ease: "linear" }}
                            className={`absolute bottom-0 left-0 h-1 ${
                                notification.type === 'success' 
                                    ? 'bg-green-500' 
                                    : 'bg-red-500'
                            }`}
                        ></motion.div>
                    </div>
                </motion.div>
            )}
            
            <div className="min-h-screen relative overflow-hidden">
                {/* Animated Background - Same as Dashboard */}
                <AnimatedBackground />
                
                <div className="relative z-10 p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
                    {/* Back Button */}
                    <div className="mb-4">
                        <BackButton href="/dashboard" />
                    </div>
                    
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

                    {/* Enhanced Filter Blok - Premium Custom Dropdown */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        ref={blokDropdownRef}
                        className="relative z-[100]"
                    >
                        <Card className="p-4 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/40 backdrop-blur-xl border-2 border-emerald-200/60 shadow-xl overflow-visible relative">
                            {/* Decorative background elements */}
                            <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-br from-emerald-400/15 via-cyan-400/15 to-transparent rounded-full blur-3xl -mr-28 -mt-28"></div>
                            <div className="absolute bottom-0 left-0 w-44 h-44 bg-gradient-to-tr from-green-400/15 via-emerald-400/15 to-transparent rounded-full blur-3xl -ml-22 -mb-22"></div>
                            
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-3">
                                    <motion.div
                                        animate={{ 
                                            rotate: [0, 5, -5, 0],
                                            scale: [1, 1.05, 1]
                                        }}
                                        transition={{ duration: 3, repeat: Infinity }}
                                        className="w-11 h-11 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30"
                                    >
                                        <Filter className="w-5 h-5 text-white" />
                                    </motion.div>
                                    <div>
                                        <label className="text-base font-extrabold text-gray-800 block">Pilih Blok Monitoring</label>
                                        <p className="text-xs text-gray-600 mt-0.5 font-medium">Pilih blok untuk melihat data sensor real-time</p>
                                    </div>
                                </div>
                                
                                <div className="relative z-[101]">
                                    <motion.button
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => setIsBlokDropdownOpen(!isBlokDropdownOpen)}
                                        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white/95 backdrop-blur-sm border-2 border-emerald-300/70 rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold text-sm text-gray-800 hover:border-emerald-400 group"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
                                                <MapPin className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="text-left flex-1 min-w-0">
                                                <span className="block truncate font-bold text-gray-800 text-sm">{getSelectedBlokLabel()}</span>
                                                <span className="block text-xs text-gray-500 mt-0.5">
                                                    {selectedBlok === 'all' ? 'Rata-rata semua blok' : 'Data sensor blok ini'}
                                                </span>
                                            </div>
                                        </div>
                                        <motion.div
                                            animate={{ rotate: isBlokDropdownOpen ? 180 : 0 }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                            className="flex-shrink-0"
                                        >
                                            <ChevronDown className="w-5 h-5 text-emerald-600 group-hover:text-emerald-700 transition-colors" />
                                        </motion.div>
                                    </motion.button>
                                    
                                    <AnimatePresence>
                                        {isBlokDropdownOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                transition={{ duration: 0.25, ease: "easeOut" }}
                                                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border-2 border-emerald-200/60 overflow-hidden z-[9999] max-h-80"
                                            >
                                                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                                    {/* All Bloks Option */}
                                                    <motion.button
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.05 }}
                                                        whileHover={{ backgroundColor: '#f0fdf4', scale: 1.01 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => {
                                                            handleBlokChange('all');
                                                            setIsBlokDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all border-b border-gray-100 ${
                                                            selectedBlok === 'all' 
                                                                ? 'bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 border-l-4 border-emerald-500 shadow-sm' 
                                                                : 'hover:bg-emerald-50/50'
                                                        }`}
                                                    >
                                                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
                                                            <span className="text-xl">📊</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-gray-800">Semua Blok</p>
                                                            <p className="text-xs text-gray-600 mt-0.5 font-medium">Rata-rata semua blok</p>
                                                        </div>
                                                        {selectedBlok === 'all' && (
                                                            <motion.div
                                                                initial={{ scale: 0 }}
                                                                animate={{ scale: 1 }}
                                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                                className="flex-shrink-0"
                                                            >
                                                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                                            </motion.div>
                                                        )}
                                                    </motion.button>
                                                    
                                                    {/* Individual Blok Options */}
                                                    {/* Prioritize firebaseBloks if available and more complete */}
                                                    {(() => {
                                                        // Generate blok options from firebaseBloks if available and more complete
                                                        let bloksToDisplay = blokOptions || [];
                                                        if (firebaseBloks && firebaseBloks.length > 0 && firebaseBloks.length >= bloks.length) {
                                                            // Use firebaseBloks to generate options
                                                            bloksToDisplay = firebaseBloks.map(blok => ({
                                                                value: blok.code, // Use code as value for Firebase bloks
                                                                label: blok.code
                                                            }));
                                                        }
                                                        return bloksToDisplay.filter(opt => opt.value !== 'all');
                                                    })().map((opt, index) => {
                                                        const allBlokOptions = (() => {
                                                            let bloksToDisplay = blokOptions || [];
                                                            if (firebaseBloks && firebaseBloks.length > 0 && firebaseBloks.length >= bloks.length) {
                                                                bloksToDisplay = firebaseBloks.map(blok => ({
                                                                    value: blok.code,
                                                                    label: blok.code
                                                                }));
                                                            }
                                                            return bloksToDisplay.filter(opt => opt.value !== 'all');
                                                        })();
                                                        return (
                                                        <motion.button
                                                            key={opt.value}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: 0.05 + (index + 1) * 0.03 }}
                                                            whileHover={{ backgroundColor: '#f0fdf4', scale: 1.01 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            onClick={() => {
                                                                handleBlokChange(opt.value);
                                                                setIsBlokDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all ${
                                                                index < allBlokOptions.length - 1 ? 'border-b border-gray-100' : ''
                                                            } ${
                                                                selectedBlok.toString() === opt.value.toString() 
                                                                    ? 'bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 border-l-4 border-emerald-500 shadow-sm' 
                                                                    : 'hover:bg-emerald-50/50'
                                                            }`}
                                                        >
                                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20">
                                                                <span className="text-xl">📍</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-gray-800">{opt.label}</p>
                                                                <p className="text-xs text-gray-600 mt-0.5 font-medium">Data sensor blok ini</p>
                                                            </div>
                                                            {selectedBlok.toString() === opt.value.toString() && (
                                                                <motion.div
                                                                    initial={{ scale: 0 }}
                                                                    animate={{ scale: 1 }}
                                                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                                    className="flex-shrink-0"
                                                                >
                                                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                                                </motion.div>
                                                            )}
                                                        </motion.button>
                                                        );
                                                    })}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
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
                                        <motion.div
                                            initial={{ scale: 0.9 }}
                                            animate={{ scale: 1 }}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${getStatusColor(suhuStatus)} shadow-sm`}
                                        >
                                            {getStatusLabel(suhuStatus)}
                                        </motion.div>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-600 mb-2">Suhu Udara</p>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <p className="text-3xl font-extrabold text-orange-700">{suhuUdara.toFixed(1)}°C</p>
                                        {suhuStatus !== 'normal' && (
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className={`w-2 h-2 rounded-full ${suhuStatus === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}`}
                                            />
                                        )}
                                    </div>
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
                                        <motion.div
                                            initial={{ scale: 0.9 }}
                                            animate={{ scale: 1 }}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${getStatusColor(kelembabanUdaraStatus)} shadow-sm`}
                                        >
                                            {getStatusLabel(kelembabanUdaraStatus)}
                                        </motion.div>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-600 mb-2">Kelembaban Udara</p>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <p className="text-3xl font-extrabold text-blue-700">{kelembabanUdara.toFixed(1)}%</p>
                                        {kelembabanUdaraStatus !== 'normal' && (
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className={`w-2 h-2 rounded-full ${kelembabanUdaraStatus === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}`}
                                            />
                                        )}
                                    </div>
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
                                        <motion.div
                                            initial={{ scale: 0.9 }}
                                            animate={{ scale: 1 }}
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${getStatusColor(kelembabanTanahStatus)} shadow-sm`}
                                        >
                                            {getStatusLabel(kelembabanTanahStatus)}
                                        </motion.div>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-600 mb-2">Kelembaban Tanah</p>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <p className="text-3xl font-extrabold text-emerald-700">{kelembabanTanah.toFixed(1)}%</p>
                                        {kelembabanTanahStatus !== 'normal' && (
                                            <motion.div
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ duration: 2, repeat: Infinity }}
                                                className={`w-2 h-2 rounded-full ${kelembabanTanahStatus === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}`}
                                            />
                                        )}
                                    </div>
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
                                // For 24h, use same logic as Dashboard
                                if (realtimeChartData.length > 0) {
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
                                    
                                    // Only process if we have filtered data
                                    if (filteredRealtimeData.length > 0) {
                                        if (selectedPeriod === '24h') {
                                            // For 24h: Use same logic as Dashboard - group by hour, show all bloks
                                            const groups = {};
                                            
                                            filteredRealtimeData.forEach(point => {
                                                const date = new Date(point.timestamp);
                                                // Group by hour for 24h (same as Dashboard)
                                                const key = `${String(date.getHours()).padStart(2, '0')}:00`;
                                                
                                                if (!groups[key]) {
                                                    groups[key] = { 
                                                        time: key,
                                                        suhu: {},
                                                        kelembUdara: {},
                                                        kelembTanah: {}
                                                    };
                                                    // Initialize arrays for each blok
                                                    bloksToDisplay.forEach(code => {
                                                        groups[key].suhu[code] = [];
                                                        groups[key].kelembUdara[code] = [];
                                                        groups[key].kelembTanah[code] = [];
                                                    });
                                                }
                                                
                                                // Add data for this blok (same as Dashboard - use kelembapan and kelembapanTanah keys)
                                                if (point.blokId && groups[key].suhu[point.blokId]) {
                                                    // Use kelembapan and kelembapanTanah (Dashboard keys) or fallback to kelembUdara/kelembTanah
                                                    const kelembapan = point.kelembapan ?? point.kelembUdara ?? 0;
                                                    const kelembapanTanah = point.kelembapanTanah ?? point.kelembTanah ?? 0;
                                                    
                                                    if (point.suhu !== null && point.suhu !== undefined) {
                                                        groups[key].suhu[point.blokId].push(point.suhu);
                                                    }
                                                    if (kelembapan !== null && kelembapan !== undefined) {
                                                        groups[key].kelembUdara[point.blokId].push(kelembapan);
                                                    }
                                                    if (kelembapanTanah !== null && kelembapanTanah !== undefined) {
                                                        groups[key].kelembTanah[point.blokId].push(kelembapanTanah);
                                                    }
                                                }
                                            });
                                            
                                            // Convert to array format with averages per blok
                                            const processedData = Object.values(groups).map(group => {
                                                const dataPoint = { time: group.time };
                                                bloksToDisplay.forEach(code => {
                                                    const suhuValues = group.suhu[code] || [];
                                                    const kelembUdaraValues = group.kelembUdara[code] || [];
                                                    const kelembTanahValues = group.kelembTanah[code] || [];
                                                    
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
                                                // Sort by hour (same as Dashboard)
                                                const [aHour] = a.time.split(':').map(Number);
                                                const [bHour] = b.time.split(':').map(Number);
                                                return aHour - bHour;
                                            });
                                            
                                            if (processedData.length > 0) {
                                                displayChartData = processedData;
                                            } else if (chartData && chartData.length > 0) {
                                                displayChartData = chartData;
                                            }
                                        } else {
                                            // For 7d and 30d: Use existing logic with per-blok comparison
                                            const groupedData = {};
                                            filteredRealtimeData.forEach(point => {
                                                const date = new Date(point.timestamp);
                                                // Group per day for 7d and 30d
                                                const timeKey = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
                                                
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
                                                // For 7d and 30d, sort by date
                                                try {
                                                    const aDate = new Date(a.time.split(' ').reverse().join(' '));
                                                    const bDate = new Date(b.time.split(' ').reverse().join(' '));
                                                    return aDate - bDate;
                                                } catch (e) {
                                                    return a.time.localeCompare(b.time);
                                                }
                                            });
                                            
                                            if (processedData.length > 0) {
                                                displayChartData = processedData;
                                            } else if (chartData && chartData.length > 0) {
                                                displayChartData = chartData;
                                            }
                                        }
                                    } else if (chartData && chartData.length > 0) {
                                        // No real-time data in period, use backend data
                                        displayChartData = chartData;
                                    }
                                } else if (chartData && chartData.length > 0) {
                                    // No real-time data available, use backend data
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

                    {/* Ultra Enhanced Info Batas Normal */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <Card className="p-6 md:p-8 bg-white/95 backdrop-blur-2xl border-2 border-emerald-300/60 shadow-2xl overflow-hidden relative">
                            {/* Animated gradient backgrounds */}
                            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-400/20 via-teal-400/20 to-cyan-400/20 rounded-full blur-3xl -mr-48 -mt-48 animate-pulse"></div>
                            <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-green-400/15 via-emerald-400/15 to-teal-400/15 rounded-full blur-3xl -ml-40 -mb-40 animate-pulse" style={{ animationDelay: '1s' }}></div>
                            
                            <div className="relative z-10">
                                {/* Header Section */}
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        <motion.div
                                            animate={{ 
                                                rotate: [0, 5, -5, 0],
                                                scale: [1, 1.05, 1]
                                            }}
                                            transition={{ duration: 4, repeat: Infinity }}
                                            className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/40"
                                        >
                                            <Activity className="w-7 h-7 md:w-8 md:h-8 text-white" />
                                        </motion.div>
                                        <div>
                                            <h3 className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                                                Batas Normal Sensor
                                            </h3>
                                            <p className="text-xs md:text-sm text-gray-500 mt-1">
                                                Ambang batas untuk notifikasi dan peringatan
                                            </p>
                                        </div>
                                    </div>
                                    {isKPetani && !editingThreshold && (
                                        <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <Button
                                                size="sm"
                                                onClick={() => setEditingThreshold('all')}
                                                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30 px-4 py-2"
                                            >
                                                <Edit2 className="w-4 h-4 mr-2" />
                                                Edit Threshold
                                            </Button>
                                        </motion.div>
                                    )}
                                </div>
                                
                                {/* Sensor Thresholds Grid - Responsive */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                                    {/* Suhu Udara Card */}
                                    {editingThreshold === 'suhu_udara' || editingThreshold === 'all' ? (
                                        <motion.div
                                            initial={{ scale: 0.95 }}
                                            animate={{ scale: 1 }}
                                            className="p-5 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 rounded-2xl border-2 border-orange-300 shadow-xl overflow-hidden relative"
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-200/30 rounded-full blur-2xl -mr-12 -mt-12"></div>
                                            <div className="relative z-10">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                                                            <Thermometer className="w-5 h-5 text-white" />
                                                        </div>
                                                        <span className="text-sm font-bold text-gray-800">Suhu Udara</span>
                                                    </div>
                                                    {editingThreshold === 'all' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleSaveThreshold('suhu_udara')}
                                                            disabled={isSaving && (savingSensorType === 'suhu_udara' || savingSensorType === 'all')}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2"
                                                        >
                                                            {(isSaving && (savingSensorType === 'suhu_udara' || savingSensorType === 'all')) ? (
                                                                <Activity className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <Save className="w-3 h-3" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mb-3">
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-gray-600 mb-1 block">Normal Min</label>
                                                        <input
                                                            type="number"
                                                            value={thresholdForm.suhu_udara?.normal_min || ''}
                                                            onChange={(e) => handleThresholdChange('suhu_udara', 'normal_min', e.target.value)}
                                                            className="w-full p-2 text-xs border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                                            step="0.1"
                                                            placeholder="20"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-gray-600 mb-1 block">Normal Max</label>
                                                        <input
                                                            type="number"
                                                            value={thresholdForm.suhu_udara?.normal_max || ''}
                                                            onChange={(e) => handleThresholdChange('suhu_udara', 'normal_max', e.target.value)}
                                                            className="w-full p-2 text-xs border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                                            step="0.1"
                                                            placeholder="32"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-yellow-600 mb-1 block">⚠️ Warning</label>
                                                        <input
                                                            type="number"
                                                            value={thresholdForm.suhu_udara?.warning_max || ''}
                                                            onChange={(e) => handleThresholdChange('suhu_udara', 'warning_max', e.target.value)}
                                                            className="w-full p-2 text-xs border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all bg-yellow-50/50"
                                                            step="0.1"
                                                            placeholder="35"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-red-600 mb-1 block">🚨 Critical</label>
                                                        <input
                                                            type="number"
                                                            value={thresholdForm.suhu_udara?.critical_max || ''}
                                                            onChange={(e) => handleThresholdChange('suhu_udara', 'critical_max', e.target.value)}
                                                            className="w-full p-2 text-xs border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all bg-red-50/50"
                                                            step="0.1"
                                                            placeholder="40"
                                                        />
                                                    </div>
                                                </div>
                                                {editingThreshold === 'all' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSaveThreshold('suhu_udara')}
                                                        disabled={isSaving && (savingSensorType === 'suhu_udara' || savingSensorType === 'all')}
                                                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs py-2 shadow-lg"
                                                    >
                                                        {(isSaving && (savingSensorType === 'suhu_udara' || savingSensorType === 'all')) ? 'Menyimpan...' : '💾 Simpan Suhu Udara'}
                                                    </Button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            whileHover={{ scale: 1.02, y: -2 }}
                                            className="p-5 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 rounded-2xl border-2 border-orange-300/60 shadow-lg overflow-hidden relative group cursor-pointer"
                                        >
                                            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-200/20 rounded-full blur-xl -mr-10 -mt-10"></div>
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                                                        <Thermometer className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-gray-800">Suhu Udara</p>
                                                        <p className="text-xs text-gray-600">Batas Normal</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white/80 rounded-xl p-3 border border-orange-200">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-gray-600">Range:</span>
                                                        <span className="text-base font-extrabold text-orange-700">
                                                            {thresholdForm.suhu_udara?.normal_min || thresholds.suhu_udara?.normal_min || 20} - {thresholdForm.suhu_udara?.normal_max || thresholds.suhu_udara?.normal_max || 32}°C
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Kelembaban Udara Card */}
                                    {editingThreshold === 'kelembapan_udara' || editingThreshold === 'all' ? (
                                        <motion.div
                                            initial={{ scale: 0.95 }}
                                            animate={{ scale: 1 }}
                                            className="p-5 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 rounded-2xl border-2 border-blue-300 shadow-xl overflow-hidden relative"
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-200/30 rounded-full blur-2xl -mr-12 -mt-12"></div>
                                            <div className="relative z-10">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                                                            <Droplets className="w-5 h-5 text-white" />
                                                        </div>
                                                        <span className="text-sm font-bold text-gray-800">Kelembaban Udara</span>
                                                    </div>
                                                    {editingThreshold === 'all' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleSaveThreshold('kelembapan_udara')}
                                                            disabled={isSaving && (savingSensorType === 'kelembapan_udara' || savingSensorType === 'all')}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2"
                                                        >
                                                            {(isSaving && (savingSensorType === 'kelembapan_udara' || savingSensorType === 'all')) ? (
                                                                <Activity className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <Save className="w-3 h-3" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mb-3">
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-gray-600 mb-1 block">Normal Min</label>
                                                        <input
                                                            type="number"
                                                            value={thresholdForm.kelembapan_udara?.normal_min || ''}
                                                            onChange={(e) => handleThresholdChange('kelembapan_udara', 'normal_min', e.target.value)}
                                                            className="w-full p-2 text-xs border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                            step="0.1"
                                                            placeholder="60"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-gray-600 mb-1 block">Normal Max</label>
                                                        <input
                                                            type="number"
                                                            value={thresholdForm.kelembapan_udara?.normal_max || ''}
                                                            onChange={(e) => handleThresholdChange('kelembapan_udara', 'normal_max', e.target.value)}
                                                            className="w-full p-2 text-xs border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                            step="0.1"
                                                            placeholder="85"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-yellow-600 mb-1 block">⚠️ Warning</label>
                                                        <input
                                                            type="number"
                                                            value={thresholdForm.kelembapan_udara?.warning_min || ''}
                                                            onChange={(e) => handleThresholdChange('kelembapan_udara', 'warning_min', e.target.value)}
                                                            className="w-full p-2 text-xs border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all bg-yellow-50/50"
                                                            step="0.1"
                                                            placeholder="30"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-red-600 mb-1 block">🚨 Critical</label>
                                                        <input
                                                            type="number"
                                                            value={thresholdForm.kelembapan_udara?.critical_min || ''}
                                                            onChange={(e) => handleThresholdChange('kelembapan_udara', 'critical_min', e.target.value)}
                                                            className="w-full p-2 text-xs border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all bg-red-50/50"
                                                            step="0.1"
                                                            placeholder="20"
                                                        />
                                                    </div>
                                                </div>
                                                {editingThreshold === 'all' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSaveThreshold('kelembapan_udara')}
                                                        disabled={isSaving && (savingSensorType === 'kelembapan_udara' || savingSensorType === 'all')}
                                                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs py-2 shadow-lg"
                                                    >
                                                        {(isSaving && (savingSensorType === 'kelembapan_udara' || savingSensorType === 'all')) ? 'Menyimpan...' : '💾 Simpan Kelembaban Udara'}
                                                    </Button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            whileHover={{ scale: 1.02, y: -2 }}
                                            className="p-5 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 rounded-2xl border-2 border-blue-300/60 shadow-lg overflow-hidden relative group cursor-pointer"
                                        >
                                            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/20 rounded-full blur-xl -mr-10 -mt-10"></div>
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                                                        <Droplets className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-gray-800">Kelembaban Udara</p>
                                                        <p className="text-xs text-gray-600">Batas Normal</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white/80 rounded-xl p-3 border border-blue-200">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-gray-600">Range:</span>
                                                        <span className="text-base font-extrabold text-blue-700">
                                                            {thresholdForm.kelembapan_udara?.normal_min || thresholds.kelembapan_udara?.normal_min || 60} - {thresholdForm.kelembapan_udara?.normal_max || thresholds.kelembapan_udara?.normal_max || 85}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Kelembaban Tanah Card */}
                                    {editingThreshold === 'kelembapan_tanah' || editingThreshold === 'all' ? (
                                        <motion.div
                                            initial={{ scale: 0.95 }}
                                            animate={{ scale: 1 }}
                                            className="p-5 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 rounded-2xl border-2 border-emerald-300 shadow-xl overflow-hidden relative"
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/30 rounded-full blur-2xl -mr-12 -mt-12"></div>
                                            <div className="relative z-10">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                                                            <Sprout className="w-5 h-5 text-white" />
                                                        </div>
                                                        <span className="text-sm font-bold text-gray-800">Kelembaban Tanah</span>
                                                    </div>
                                                    {editingThreshold === 'all' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleSaveThreshold('kelembapan_tanah')}
                                                            disabled={isSaving && (savingSensorType === 'kelembapan_tanah' || savingSensorType === 'all')}
                                                            className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2"
                                                        >
                                                            {(isSaving && (savingSensorType === 'kelembapan_tanah' || savingSensorType === 'all')) ? (
                                                                <Activity className="w-3 h-3 animate-spin" />
                                                            ) : (
                                                                <Save className="w-3 h-3" />
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 mb-3">
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-gray-600 mb-1 block">Normal Min</label>
                                                        <input
                                                            type="number"
                                                            value={thresholdForm.kelembapan_tanah?.normal_min || ''}
                                                            onChange={(e) => handleThresholdChange('kelembapan_tanah', 'normal_min', e.target.value)}
                                                            className="w-full p-2 text-xs border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                                            step="0.1"
                                                            placeholder="50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-gray-600 mb-1 block">Normal Max</label>
                                                        <input
                                                            type="number"
                                                            value={thresholdForm.kelembapan_tanah?.normal_max || ''}
                                                            onChange={(e) => handleThresholdChange('kelembapan_tanah', 'normal_max', e.target.value)}
                                                            className="w-full p-2 text-xs border-2 border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                                            step="0.1"
                                                            placeholder="75"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-yellow-600 mb-1 block">⚠️ Warning</label>
                                                        <input
                                                            type="number"
                                                            value={thresholdForm.kelembapan_tanah?.warning_min || ''}
                                                            onChange={(e) => handleThresholdChange('kelembapan_tanah', 'warning_min', e.target.value)}
                                                            className="w-full p-2 text-xs border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all bg-yellow-50/50"
                                                            step="0.1"
                                                            placeholder="30"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-semibold text-red-600 mb-1 block">🚨 Critical</label>
                                                        <input
                                                            type="number"
                                                            value={thresholdForm.kelembapan_tanah?.critical_min || ''}
                                                            onChange={(e) => handleThresholdChange('kelembapan_tanah', 'critical_min', e.target.value)}
                                                            className="w-full p-2 text-xs border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all bg-red-50/50"
                                                            step="0.1"
                                                            placeholder="20"
                                                        />
                                                    </div>
                                                </div>
                                                {editingThreshold === 'all' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSaveThreshold('kelembapan_tanah')}
                                                        disabled={isSaving && (savingSensorType === 'kelembapan_tanah' || savingSensorType === 'all')}
                                                        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs py-2 shadow-lg"
                                                    >
                                                        {(isSaving && (savingSensorType === 'kelembapan_tanah' || savingSensorType === 'all')) ? 'Menyimpan...' : '💾 Simpan Kelembaban Tanah'}
                                                    </Button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            whileHover={{ scale: 1.02, y: -2 }}
                                            className="p-5 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 rounded-2xl border-2 border-emerald-300/60 shadow-lg overflow-hidden relative group cursor-pointer"
                                        >
                                            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-200/20 rounded-full blur-xl -mr-10 -mt-10"></div>
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                                                        <Sprout className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm font-bold text-gray-800">Kelembaban Tanah</p>
                                                        <p className="text-xs text-gray-600">Batas Normal</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white/80 rounded-xl p-3 border border-emerald-200">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-gray-600">Range:</span>
                                                        <span className="text-base font-extrabold text-emerald-700">
                                                            {thresholdForm.kelembapan_tanah?.normal_min || thresholds.kelembapan_tanah?.normal_min || 50} - {thresholdForm.kelembapan_tanah?.normal_max || thresholds.kelembapan_tanah?.normal_max || 75}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                                
                                {/* Action Buttons */}
                                {editingThreshold === 'all' && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-6 space-y-3"
                                    >
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <Button
                                                size="sm"
                                                onClick={handleSaveAllThresholds}
                                                disabled={isSaving}
                                                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-2.5 shadow-lg"
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <Activity className="w-4 h-4 mr-2 animate-spin" />
                                                        Menyimpan...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4 mr-2" />
                                                        Simpan Semua Sensor
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={handleCancelEdit}
                                                disabled={isSaving}
                                                variant="outline"
                                                className="flex-1 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-2.5"
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Batal Edit
                                            </Button>
                                        </div>
                                        <div className="text-xs text-gray-500 text-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                            💡 Anda dapat menyimpan semua sensor sekaligus atau menyimpan setiap sensor secara terpisah
                                        </div>
                                    </motion.div>
                                )}
                                
                                {/* Info Box */}
                                {!editingThreshold && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200/50"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Activity className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-emerald-700 mb-1">Info Threshold</p>
                                                <p className="text-xs text-gray-600 leading-relaxed">
                                                    Threshold ini digunakan untuk menentukan status sensor (Normal, Peringatan, Kritis) dan akan memicu notifikasi otomatis ketika nilai sensor melebihi ambang batas yang ditentukan.
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
