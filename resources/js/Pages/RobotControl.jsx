import { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import AnimatedBackground from '@/Components/AnimatedBackground';
import { useHeaderOffset } from '@/hooks/useHeaderOffset';
import DeleteMissionModal from '@/Components/MissionHistory/DeleteMissionModal';
import { 
    Bot, Play, Pause, Battery, MapPin, Calendar, Clock, CheckCircle, 
    XCircle, Loader, RefreshCw, AlertCircle, AlertTriangle, Zap, Activity, 
    Wifi, WifiOff, X, Trash2, Edit, Power, Camera, Navigation, 
    Radio, Signal, Gauge
} from 'lucide-react';
import { database } from '@/config/firebase';
import { ref, onValue, off, set } from 'firebase/database';
import BackButton from '@/Components/BackButton';

export default function RobotControl({ 
    bloks = [], 
    initialRobotStatus = {}, 
    initialActiveMission = null,
    recentSchedules = []
}) {
    const page = usePage();
    const { auth } = page.props;
    const userRole = auth?.user?.role;
    const isKPetani = userRole === 'k-petani';
    const topOffset = useHeaderOffset();
    
    // States
    const [robotStatus, setRobotStatus] = useState({
        current_state: initialRobotStatus?.current_state || 'offline',
        battery_level: initialRobotStatus?.battery_level || 0,
        current_location: initialRobotStatus?.current_location || null,
        last_update: initialRobotStatus?.last_update || null,
    });
    
    const [activeMission, setActiveMission] = useState(initialActiveMission);
    const [schedules, setSchedules] = useState(recentSchedules);
    const [firebaseSchedules, setFirebaseSchedules] = useState({}); // Store Firebase schedule data
    const [completedManualMissions, setCompletedManualMissions] = useState([]); // Store completed manual missions from Firebase
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [showManualControl, setShowManualControl] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [missionToDelete, setMissionToDelete] = useState(null);
    
    // Form states
    const [selectedMisiType, setSelectedMisiType] = useState('deteksi');
    const [selectedBlokFrom, setSelectedBlokFrom] = useState('');
    const [selectedBlokTo, setSelectedBlokTo] = useState('');
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [scheduleDescription, setScheduleDescription] = useState('');
    const [schedulePriority, setSchedulePriority] = useState('medium');
    
    // Manual control states
    const [manualMissionType, setManualMissionType] = useState('deteksi');
    const [manualBlokFrom, setManualBlokFrom] = useState('');
    const [manualBlokTo, setManualBlokTo] = useState('');
    
    // Firebase listeners ref
    const statusListenerRef = useRef(null);
    const missionListenerRef = useRef(null);
    const schedulesListenerRef = useRef(null);
    const completedMissionsListenerRef = useRef(null);
    const firebaseListenersRef = useRef([]);
    
    // State for Firebase-discovered bloks
    const [firebaseBloks, setFirebaseBloks] = useState([]);
    
    // Get CSRF token
    const getCsrfToken = () => {
        return page.props.csrf || document.querySelector('meta[name="csrf-token"]')?.content || '';
    };
    
    // Show notification
    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };
    
    // Fetch schedules from API
    const fetchSchedules = async () => {
        try {
            const response = await fetch('/api/robot/schedules?per_page=20', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data?.data) {
                    // Filter out cancelled schedules
                    const filteredSchedules = data.data.data
                        .filter(schedule => schedule.status !== 'cancelled')
                        .map(schedule => ({
                            id: schedule.id,
                            blok_id: schedule.blok_id,
                            blok_code: schedule.blok?.code || null,
                            blok_name: schedule.blok?.name || null,
                            mission_type: schedule.mission_type,
                            description: schedule.description,
                            scheduled_at: schedule.scheduled_at,
                            started_at: schedule.started_at,
                            completed_at: schedule.completed_at,
                            status: schedule.status,
                            priority: schedule.priority,
                            progress_percentage: schedule.progress_percentage || 0,
                            mission_details: schedule.mission_details,
                            created_by: schedule.creator?.name || null,
                        }));
                    
                    setSchedules(filteredSchedules);
                }
            }
        } catch (error) {
            console.error('Error fetching schedules:', error);
        }
    };
    
    // Create schedule
    const handleCreateSchedule = async (e) => {
        e.preventDefault();
        if (!isKPetani) return;
        
        setIsLoading(true);
        try {
            if (!selectedBlokFrom) {
                showNotification('Pilih blok terlebih dahulu', 'error');
                setIsLoading(false);
                return;
            }
            
            const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
            if (scheduledDateTime <= new Date()) {
                showNotification('Waktu jadwal harus di masa depan!', 'error');
                setIsLoading(false);
                return;
            }
            
            // Get selected blok codes (single or range)
            const selectedBlokCodes = getSelectedBlokCodes(selectedBlokFrom, selectedBlokTo);
            
            if (selectedBlokCodes.length === 0) {
                showNotification('Tidak ada blok yang valid dipilih', 'error');
                setIsLoading(false);
                return;
            }
            
            // Use first blok as primary for API compatibility
            const primaryBlokCode = selectedBlokCodes[0];
            const selectedBlok = bloksToUse.find(b => 
                (b.code || b.id?.toString()) === primaryBlokCode
            );
            
            const blokDbId = selectedBlok?.id || (isNaN(primaryBlokCode) ? null : parseInt(primaryBlokCode));
            
            // Format blok range display
            const blokRangeDisplay = selectedBlokCodes.length > 1 
                ? `${selectedBlokFrom}-${selectedBlokTo}` 
                : primaryBlokCode;
            
            const response = await fetch('/api/robot/schedules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    blok_id: primaryBlokCode, // Primary blok code for API compatibility
                    blok_range: blokRangeDisplay, // Display format (e.g., "A1-B2")
                    blok_ids: selectedBlokCodes, // Array of all blok codes in range
                    kebun_id: 1, // Default to kebun_1 to match Firebase structure
                    mission_type: selectedMisiType,
                    description: scheduleDescription || (selectedBlokCodes.length > 1 ? `Misi untuk ${selectedBlokCodes.length} blok (${blokRangeDisplay})` : ''),
                    scheduled_at: scheduledDateTime.toISOString(),
                    priority: schedulePriority,
                    mission_details: {
                        blok_count: selectedBlokCodes.length,
                        blok_range: blokRangeDisplay,
                    },
                }),
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    showNotification(errorData.message || `HTTP error! status: ${response.status}`, 'error');
                } catch (e) {
                    showNotification(`HTTP error! status: ${response.status}`, 'error');
                }
                setIsLoading(false);
                return;
            }
            
            const data = await response.json();
            
            if (data.success) {
                const blokCount = selectedBlokCodes.length > 1 
                    ? `${selectedBlokCodes.length} blok (${blokRangeDisplay})`
                    : primaryBlokCode;
                
                if (data.warning) {
                    // Show success notification first
                    showNotification(`Jadwal berhasil dibuat untuk ${blokCount}!`, 'success');
                    // Then show warning after a short delay
                    setTimeout(() => {
                        showNotification(data.warning, 'warning');
                    }, 500);
                } else {
                    showNotification(`Jadwal misi berhasil dibuat untuk ${blokCount}!`, 'success');
                }
                setShowScheduleForm(false);
                // Reset form
                setSelectedBlokFrom('');
                setSelectedBlokTo('');
                setScheduleDate('');
                setScheduleTime('');
                setScheduleDescription('');
                setSchedulePriority('medium');
                // Refresh schedules
                await fetchSchedules();
            } else {
                showNotification(data.message || 'Gagal membuat jadwal', 'error');
            }
        } catch (error) {
            console.error('Error creating schedule:', error);
            showNotification('Terjadi kesalahan saat membuat jadwal', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Pause/Resume mission (send command to Firebase and update status)
    const handlePauseMission = async () => {
        if (!isKPetani) return;
        
        // Check if there's an active mission (scheduled or manual)
        const hasActive = activeMission && (activeMission.schedule_id || activeMission.mission_type);
        if (!hasActive && !inProgressScheduleWithFirebase) {
            showNotification('Tidak ada misi yang sedang berjalan', 'warning');
            return;
        }
        
        setIsLoading(true);
        
        try {
            // Determine if this is a scheduled mission or manual mission
            const isScheduledMission = activeMission?.schedule_id || inProgressScheduleWithFirebase?.id;
            const isManualMission = activeMission && !activeMission.schedule_id && activeMission.mission_type;
            
            // Get current status
            let currentStatus = null;
            let isCurrentlyPaused = false;
            
            if (isScheduledMission) {
                const scheduleId = activeMission?.schedule_id || inProgressScheduleWithFirebase?.id;
                const scheduleKey = `schedule_${scheduleId}`;
                const statusStr = firebaseSchedules[scheduleKey]?.status || inProgressScheduleWithFirebase?.status || activeMission?.status;
                const { status } = parseStatusAndProgress(statusStr);
                currentStatus = status || statusStr;
                isCurrentlyPaused = currentStatus === 'paused';
            } else if (isManualMission) {
                // For manual missions, check active_mission status
                const statusStr = activeMission?.status;
                const { status } = parseStatusAndProgress(statusStr);
                currentStatus = status || statusStr;
                isCurrentlyPaused = currentStatus === 'paused';
            }
            
            if (isCurrentlyPaused) {
                // Resume mission
                if (isScheduledMission) {
                    const scheduleId = activeMission?.schedule_id || inProgressScheduleWithFirebase?.id;
                    const scheduleKey = `schedule_${scheduleId}`;
                    await set(ref(database, `robot/schedules/${scheduleKey}/status`), 'in_progress');
                } else {
                    // Resume manual mission
                    await set(ref(database, 'robot/active_mission/status'), 'in_progress');
                }
                
                // Send resume command to robot
                await set(ref(database, 'robot/commands/resume'), {
                    schedule_id: isScheduledMission ? (activeMission?.schedule_id || inProgressScheduleWithFirebase?.id) : null,
                    mission_type: isManualMission ? activeMission.mission_type : null,
                    timestamp: Date.now(),
                    command: 'resume',
                });
                
                showNotification('Misi dilanjutkan', 'success');
            } else {
                // Pause mission
                if (isScheduledMission) {
                    const scheduleId = activeMission?.schedule_id || inProgressScheduleWithFirebase?.id;
                    const scheduleKey = `schedule_${scheduleId}`;
                    await set(ref(database, `robot/schedules/${scheduleKey}/status`), 'paused');
                } else {
                    // Pause manual mission
                    await set(ref(database, 'robot/active_mission/status'), 'paused');
                }
                
                // Send pause command to robot
                await set(ref(database, 'robot/commands/pause'), {
                    schedule_id: isScheduledMission ? (activeMission?.schedule_id || inProgressScheduleWithFirebase?.id) : null,
                    mission_type: isManualMission ? activeMission.mission_type : null,
                    timestamp: Date.now(),
                    command: 'pause',
                });
                
                showNotification('Misi dijedakan', 'success');
            }
        } catch (error) {
            console.error('Error pausing/resuming mission:', error);
            showNotification('Gagal mengirim perintah: ' + error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Cancel schedule
    const handleCancelSchedule = async (scheduleId) => {
        if (!isKPetani) return;
        
        if (!confirm('Yakin ingin membatalkan jadwal ini?')) return;
        
        try {
            const response = await fetch(`/api/robot/schedules/${scheduleId}/cancel`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                credentials: 'same-origin',
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotification('Jadwal berhasil dibatalkan', 'success');
                
                // Update schedule status in local state immediately
                setSchedules(prevSchedules => 
                    prevSchedules.map(s => 
                        s.id === parseInt(scheduleId) || s.id === scheduleId
                            ? { ...s, status: 'cancelled' }
                            : s
                    ).filter(s => s.status !== 'cancelled') // Remove cancelled from list immediately
                );
                
                // Also refresh from API to ensure consistency
                await fetchSchedules();
            } else {
                showNotification(data.message || 'Gagal membatalkan jadwal', 'error');
            }
        } catch (error) {
            console.error('Error canceling schedule:', error);
            showNotification('Terjadi kesalahan saat membatalkan jadwal', 'error');
        }
    };

    // Start robot manually (direct command)
    const handleStartRobotManually = async () => {
        if (!isKPetani) return;
        
        if (!manualBlokFrom) {
            showNotification('Pilih blok terlebih dahulu', 'error');
            return;
        }
        
        if (robotStatus.current_state === 'offline') {
            showNotification('Robot sedang offline, tidak dapat diaktifkan', 'error');
            return;
        }
        
        setIsLoading(true);
        
        try {
            // Get selected blok codes (single or range)
            const selectedBlokCodes = getSelectedBlokCodes(manualBlokFrom, manualBlokTo);
            
            if (selectedBlokCodes.length === 0) {
                showNotification('Tidak ada blok yang valid dipilih', 'error');
                setIsLoading(false);
                return;
            }
            
            // For now, use the first blok as primary, but store all bloks in the command
            const primaryBlokCode = selectedBlokCodes[0];
            const selectedBlok = bloksToUse.find(b => 
                (b.code || b.id?.toString()) === primaryBlokCode
            );
            
            const blokDbId = selectedBlok?.id || (isNaN(primaryBlokCode) ? null : parseInt(primaryBlokCode));
            const timestamp = Date.now();
            
            // Format blok range display
            const blokRangeDisplay = selectedBlokCodes.length > 1 
                ? `${manualBlokFrom}-${manualBlokTo}` 
                : primaryBlokCode;
            
            // Send start command to Firebase with blok range
            await set(ref(database, 'robot/commands/start'), {
                mission_type: manualMissionType,
                blok_id: primaryBlokCode, // Primary blok code
                blok_ids: selectedBlokCodes, // Array of all blok codes in range
                blok_range: blokRangeDisplay, // Display format (e.g., "A1-B2")
                blok_db_id: blokDbId, // MySQL blok ID (if available)
                command: 'start',
                mode: 'manual',
                timestamp: timestamp,
                priority: 'high', // Manual commands are high priority
            });
            
            // Update active_mission in Firebase directly (since ESP32 is not available yet)
            await set(ref(database, 'robot/active_mission'), {
                mission_type: manualMissionType,
                blok_id: primaryBlokCode, // Primary blok code
                blok_ids: selectedBlokCodes, // Array of all blok codes
                blok_range: blokRangeDisplay, // Display format
                blok_db_id: blokDbId, // MySQL blok ID (if available)
                status: 'in_progress',
                progress_percentage: 0,
                started_at: timestamp,
                current_task: null,
                images_captured: 0,
                total_images: 0,
                mode: 'manual',
                schedule_id: null, // Manual missions don't have schedule_id
            });
            
            const blokCount = selectedBlokCodes.length > 1 
                ? `${selectedBlokCodes.length} blok (${blokRangeDisplay})`
                : primaryBlokCode;
            
            showNotification(`Robot diaktifkan untuk ${getMissionTypeLabel(manualMissionType)} di ${blokCount}`, 'success');
            
            // Reset form
            setManualBlokFrom('');
            setManualBlokTo('');
            setShowManualControl(false);
            
        } catch (error) {
            console.error('Error starting robot manually:', error);
            showNotification('Gagal mengaktifkan robot', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Open delete confirmation modal
    const handleDeleteHistoryClick = (mission, isManual = false) => {
        if (!isKPetani) return;
        setMissionToDelete({ ...mission, isManual });
        setShowDeleteModal(true);
    };

    // Delete history schedule or manual mission
    const handleDeleteHistory = async () => {
        if (!missionToDelete) return;

        try {
            if (missionToDelete.isManual) {
                // Delete from Firebase completed_missions
                await set(ref(database, `robot/completed_missions/${missionToDelete.id}`), null);
                showNotification('Riwayat misi manual berhasil dihapus', 'success');
                
                // Remove from local state
                setCompletedManualMissions(prev => 
                    prev.filter(m => m.id !== missionToDelete.id)
                );
            } else {
                // Delete scheduled mission from API
                const response = await fetch(`/api/robot/schedules/${missionToDelete.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': getCsrfToken(),
                    },
                    credentials: 'same-origin',
                });

                const data = await response.json();

                if (data.success) {
                    showNotification('Riwayat misi berhasil dihapus', 'success');

                    // Remove from local state immediately
                    setSchedules(prevSchedules =>
                        prevSchedules.filter(s => 
                            s.id !== parseInt(missionToDelete.id) && s.id !== missionToDelete.id
                        )
                    );

                    // Also refresh from API to ensure consistency
                    await fetchSchedules();
                } else {
                    showNotification(data.message || 'Gagal menghapus riwayat misi', 'error');
                }
            }
            
            // Close modal and reset
            setShowDeleteModal(false);
            setMissionToDelete(null);
        } catch (error) {
            console.error('Error deleting history:', error);
            showNotification('Terjadi kesalahan saat menghapus riwayat misi', 'error');
            setShowDeleteModal(false);
            setMissionToDelete(null);
        }
    };
    
    // Discover bloks from Firebase first (same as Dashboard and MonitoringSensor)
    useEffect(() => {
        console.log('[RobotControl] Discovering bloks from Firebase...');
        
        const kebunIds = [1]; // Can be extended to check multiple kebuns
        const discoveredBloksMap = new Map(); // Use Map to avoid duplicates
        
        kebunIds.forEach(kebunId => {
            const bloksRef = ref(database, `kebuns/kebun_${kebunId}/bloks`);
            
            const discoveryCallback = (snapshot) => {
                const bloksData = snapshot.val();
                console.log(`[RobotControl] Discovered bloks from kebun_${kebunId}:`, bloksData);
                
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
                                    name: blokData.name || blokCode // Default name
                                });
                                console.log(`[RobotControl] Added blok ${blokCode} from kebun_${kebunId} to discovered list`);
                            }
                        }
                    });
                    
                    // Convert Map to Array
                    const discoveredBloks = Array.from(discoveredBloksMap.values());
                    
                    // Update state with discovered bloks
                    setFirebaseBloks(discoveredBloks);
                    
                    console.log('[RobotControl] Discovered bloks:', discoveredBloks);
                }
            };
            
            onValue(bloksRef, discoveryCallback, (error) => {
                if (error) {
                    console.error(`[RobotControl] Error discovering bloks from kebun_${kebunId}:`, error);
                } else {
                    console.log(`[RobotControl] Discovery listener connected for kebun_${kebunId}`);
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
    
    // Firebase listeners
    useEffect(() => {
        // Listen to robot status
        const statusRef = ref(database, 'robot/status');
        statusListenerRef.current = onValue(statusRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setRobotStatus({
                    current_state: data.current_state || initialRobotStatus?.current_state || 'offline',
                    battery_level: data.battery_level || initialRobotStatus?.battery_level || 0,
                    current_location: data.current_location || data.location || initialRobotStatus?.current_location || null,
                    last_update: data.last_update || initialRobotStatus?.last_update || null,
                });
            } else {
                // Fallback to initialRobotStatus if Firebase data is null
                setRobotStatus(initialRobotStatus);
            }
        });
        
        // Listen to active mission
        const missionRef = ref(database, 'robot/active_mission');
        missionListenerRef.current = onValue(missionRef, async (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Parse status to extract progress if needed
                const statusStr = data.status;
                const { status: parsedStatus, progress: parsedProgress } = parseStatusAndProgress(statusStr);
                const finalStatus = parsedStatus || data.status;
                
                // Check if mission is done or completed
                if (finalStatus === 'done' || finalStatus === 'completed' || 
                    statusStr?.toLowerCase().includes('done') || 
                    statusStr?.toLowerCase().includes('completed')) {
                    
                    // If it's a scheduled mission, update the schedule status in Firebase
                    if (data.schedule_id) {
                        const scheduleKey = `schedule_${data.schedule_id}`;
                        try {
                            await set(ref(database, `robot/schedules/${scheduleKey}/status`), 'completed');
                            await set(ref(database, `robot/schedules/${scheduleKey}/progress_percentage`), 100);
                            await set(ref(database, `robot/schedules/${scheduleKey}/completed_at`), Date.now());
                            
                            // Show notification for scheduled missions
                            showNotification('Misi selesai dan telah dipindahkan ke riwayat', 'success');
                            
                            // Refresh schedules to update history
                            fetchSchedules();
                        } catch (error) {
                            console.error('Error updating schedule status:', error);
                            showNotification('Misi selesai, tetapi gagal memperbarui status jadwal', 'error');
                        }
                    } else {
                        // Manual mission (no schedule_id) - save to completed_missions in Firebase
                        try {
                            const missionId = `manual_${Date.now()}`;
                            await set(ref(database, `robot/completed_missions/${missionId}`), {
                                mission_type: data.mission_type,
                                blok_id: data.blok_id,
                                blok_db_id: data.blok_db_id || null,
                                status: 'completed',
                                progress_percentage: 100,
                                started_at: data.started_at,
                                completed_at: Date.now(),
                                current_task: data.current_task || null,
                                images_captured: data.images_captured || 0,
                                total_images: data.total_images || 0,
                                mode: 'manual',
                                mission_id: missionId,
                            });
                            
                            showNotification('Misi manual selesai dan telah dipindahkan ke riwayat', 'success');
                        } catch (error) {
                            console.error('Error saving completed manual mission:', error);
                            showNotification('Misi manual selesai, tetapi gagal menyimpan ke riwayat', 'error');
                        }
                    }
                    
                    // Clear active_mission from Firebase after a short delay to allow UI to update
                    setTimeout(async () => {
                        try {
                            await set(ref(database, 'robot/active_mission'), null);
                        } catch (error) {
                            console.error('Error clearing active mission:', error);
                        }
                    }, 1000);
                    
                    // Clear active mission from state
                    setActiveMission(null);
                } else {
                    // Mission is still active
                    setActiveMission({
                        schedule_id: data.schedule_id || null,
                        blok_id: data.blok_id || null,
                        mission_type: data.mission_type || null,
                        started_at: data.started_at || null,
                        progress_percentage: parsedProgress !== null 
                            ? parsedProgress 
                            : (data.progress_percentage || 0),
                        current_task: data.current_task || null,
                        images_captured: data.images_captured || 0,
                        total_images: data.total_images || 0,
                        status: parsedStatus || data.status, // Store parsed status
                    });
                }
            } else {
                // Fallback to initialActiveMission if Firebase data is empty
                if (initialActiveMission && Object.keys(initialActiveMission).length > 0) {
                    setActiveMission(initialActiveMission);
                } else {
                    setActiveMission(null);
                }
            }
        });
        
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
        
        // Listen to schedules in Firebase (for real-time status updates)
        const schedulesRef = ref(database, 'robot/schedules');
        schedulesListenerRef.current = onValue(schedulesRef, (snapshot) => {
            const data = snapshot.val();
            // Store Firebase schedule data (can be null if all schedules deleted)
            setFirebaseSchedules(data || {});
            
            if (data) {
                // Update schedules state with Firebase data
                setSchedules(prevSchedules => {
                    const updatedSchedules = prevSchedules.map(schedule => {
                        const scheduleKey = `schedule_${schedule.id}`;
                        const firebaseData = data[scheduleKey];
                        
                        // If schedule exists in Firebase, update it
                        if (firebaseData) {
                            // Parse status to extract progress if needed
                            const statusStr = firebaseData.status || schedule.status;
                            const { status: parsedStatus, progress: parsedProgress } = parseStatusAndProgress(statusStr);
                            
                            // Use parsed status and progress, or fallback to Firebase data
                            const finalStatus = parsedStatus || firebaseData.status || schedule.status;
                            const finalProgress = parsedProgress !== null 
                                ? parsedProgress 
                                : (firebaseData.progress_percentage ?? schedule.progress_percentage);
                            
                            return {
                                ...schedule,
                                status: finalStatus,
                                progress_percentage: finalProgress,
                            };
                        }
                        // If schedule doesn't exist in Firebase but exists in local state,
                        // it might have been deleted, but keep it with current status
                        return schedule;
                    });
                    
                    // Remove schedules that are cancelled
                    return updatedSchedules.filter(s => s.status !== 'cancelled');
                });
            } else {
                // If Firebase data is empty/null, fallback to recentSchedules (props from MySQL)
                if (recentSchedules && recentSchedules.length > 0) {
                    // Filter out cancelled schedules
                    const filteredSchedules = recentSchedules
                        .filter(schedule => schedule.status !== 'cancelled')
                        .map(schedule => ({
                            id: schedule.id,
                            blok_id: schedule.blok_id,
                            blok_code: schedule.blok?.code || null,
                            blok_name: schedule.blok?.name || null,
                            mission_type: schedule.mission_type,
                            description: schedule.description,
                            scheduled_at: schedule.scheduled_at,
                            started_at: schedule.started_at,
                            completed_at: schedule.completed_at,
                            status: schedule.status,
                            priority: schedule.priority,
                            progress_percentage: schedule.progress_percentage || 0,
                            mission_details: schedule.mission_details,
                            created_by: schedule.creator?.name || null,
                        }));
                    setSchedules(filteredSchedules);
                } else {
                    // If no recentSchedules, refresh from API
                    fetchSchedules().then(() => {
                        setSchedules(prev => prev.filter(s => s.status !== 'cancelled'));
                    });
                }
            }
        });
        
        // Listen to completed manual missions
        const completedMissionsRef = ref(database, 'robot/completed_missions');
        completedMissionsListenerRef.current = onValue(completedMissionsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Convert Firebase object to array
                const missionsArray = Object.keys(data).map(key => ({
                    ...data[key],
                    id: key,
                    isManual: true, // Flag to identify manual missions
                }));
                // Sort by completed_at (newest first)
                missionsArray.sort((a, b) => (b.completed_at || 0) - (a.completed_at || 0));
                setCompletedManualMissions(missionsArray);
            } else {
                setCompletedManualMissions([]);
            }
        });
        
        // Initial fetch
        fetchSchedules();
        
        return () => {
            if (statusListenerRef.current) {
                off(statusRef, statusListenerRef.current);
            }
            if (missionListenerRef.current) {
                off(missionRef, missionListenerRef.current);
            }
            if (schedulesListenerRef.current) {
                off(schedulesRef, schedulesListenerRef.current);
            }
            if (completedMissionsListenerRef.current) {
                off(completedMissionsRef, completedMissionsListenerRef.current);
            }
        };
    }, []);
    
    // Helper functions
    const getStatusColor = (status) => {
        const statusMap = {
            'active': 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-400 shadow-lg shadow-green-500/30',
            'idle': 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-400 shadow-lg shadow-blue-500/30',
            'charging': 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-yellow-300 shadow-lg shadow-yellow-400/30',
            'offline': 'bg-gradient-to-r from-red-400 to-red-500 text-white border-red-300 shadow-lg shadow-red-400/30',
            'in_progress': 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-400 shadow-lg shadow-green-500/30',
            'paused': 'bg-gradient-to-r from-orange-400 to-orange-500 text-white border-orange-300 shadow-lg shadow-orange-400/30',
            'pending': 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-400 shadow-lg shadow-blue-500/30',
            'completed': 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-400 shadow-lg shadow-green-500/30',
            'done': 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-400 shadow-lg shadow-green-500/30',
            'cancelled': 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-300',
            'failed': 'bg-gradient-to-r from-red-400 to-red-500 text-white border-red-300 shadow-lg shadow-red-400/30',
        };
        return statusMap[status] || 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-300';
    };
    
    const getStatusLabel = (status) => {
        const labelMap = {
            'active': 'AKTIF',
            'idle': 'ONLINE',
            'charging': 'MENGISI',
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
    
    const getMissionTypeLabel = (type) => {
        const labelMap = {
            'deteksi': '🔍 Deteksi Kematangan',
            'penyiraman': '💧 Penyiraman',
            'pemupukan': '🌱 Pemupukan',
            'kombinasi': '⚡ Kombinasi',
        };
        return labelMap[type] || type;
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
    
    // Helper function to format location (same as Dashboard)
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
    
    const getLocationText = () => {
        return formatLocation(robotStatus.current_location);
    };
    
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
    
    const isRobotActive = robotStatus.current_state === 'active' || robotStatus.current_state === 'idle';
    // Check if there's an active mission (either scheduled or manual)
    const hasActiveMission = activeMission && (activeMission.schedule_id || activeMission.mission_type);
    
    // Helper function to parse status and extract progress (same as in useEffect)
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
    
    // Check if there's any schedule in progress or paused (check Firebase data first)
    const hasInProgressSchedule = schedules.some(s => {
        const scheduleKey = `schedule_${s.id}`;
        const firebaseData = firebaseSchedules[scheduleKey];
        const statusStr = firebaseData?.status || s.status;
        const { status } = parseStatusAndProgress(statusStr);
        return status === 'in_progress' || status === 'paused';
    });
    
    const inProgressSchedule = schedules.find(s => {
        const scheduleKey = `schedule_${s.id}`;
        const firebaseData = firebaseSchedules[scheduleKey];
        const statusStr = firebaseData?.status || s.status;
        const { status } = parseStatusAndProgress(statusStr);
        return status === 'in_progress' || status === 'paused';
    });
    
    // Check if mission is paused (scheduled or manual)
    const isPaused = (() => {
        // Check scheduled missions
        const scheduledPaused = schedules.some(s => {
            const scheduleKey = `schedule_${s.id}`;
            const firebaseData = firebaseSchedules[scheduleKey];
            const statusStr = firebaseData?.status || s.status;
            const { status } = parseStatusAndProgress(statusStr);
            return status === 'paused';
        });
        
        // Check manual active mission
        if (activeMission && !activeMission.schedule_id && activeMission.mission_type) {
            const statusStr = activeMission.status;
            const { status } = parseStatusAndProgress(statusStr);
            return status === 'paused';
        }
        
        return scheduledPaused;
    })();
    
    // Merge Firebase data with schedule if found
    const inProgressScheduleWithFirebase = inProgressSchedule ? (() => {
        const scheduleKey = `schedule_${inProgressSchedule.id}`;
        const firebaseData = firebaseSchedules[scheduleKey];
        if (firebaseData) {
            const statusStr = firebaseData.status || inProgressSchedule.status;
            const { status: parsedStatus, progress: parsedProgress } = parseStatusAndProgress(statusStr);
            return {
                ...inProgressSchedule,
                ...firebaseData,
                status: parsedStatus || firebaseData.status || inProgressSchedule.status,
                progress_percentage: parsedProgress !== null 
                    ? parsedProgress 
                    : (firebaseData.progress_percentage ?? inProgressSchedule.progress_percentage),
            };
        }
        return inProgressSchedule;
    })() : null;
    
    // Filter schedules - prioritize Firebase data and exclude cancelled
    const pendingSchedules = schedules.filter(s => {
        const scheduleKey = `schedule_${s.id}`;
        const firebaseData = firebaseSchedules[scheduleKey];
        const statusStr = firebaseData?.status || s.status;
        const { status } = parseStatusAndProgress(statusStr);
        const finalStatus = status || statusStr;
        
        // Exclude cancelled schedules
        if (finalStatus === 'cancelled') return false;
        // Exclude completed schedules (they should be in history)
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
                isManual: false, // Scheduled missions
            };
        }
        return { ...s, isManual: false };
    });
    
    // Add active manual mission to pending schedules if it exists
    const activeManualMission = activeMission && !activeMission.schedule_id && activeMission.mission_type ? (() => {
        const statusStr = activeMission.status;
        const { status: parsedStatus, progress: parsedProgress } = parseStatusAndProgress(statusStr);
        const finalStatus = parsedStatus || statusStr || 'in_progress';
        
        // Only include if not completed
        if (finalStatus === 'completed' || finalStatus === 'done') return null;
        
        // Format blok display
        const blokDisplay = activeMission.blok_range || activeMission.blok_id || 'Tidak diketahui';
        
        return {
            id: `manual_${activeMission.started_at || Date.now()}`,
            blok_id: activeMission.blok_id || null,
            blok_code: activeMission.blok_range || activeMission.blok_id || null,
            blok_name: null,
            mission_type: activeMission.mission_type,
            description: `Misi manual - ${blokDisplay}`,
            scheduled_at: activeMission.started_at ? new Date(activeMission.started_at).toISOString() : new Date().toISOString(),
            started_at: activeMission.started_at ? new Date(activeMission.started_at).toISOString() : null,
            completed_at: null,
            status: finalStatus,
            priority: 'high', // Manual missions are high priority
            progress_percentage: parsedProgress !== null 
                ? parsedProgress 
                : (activeMission.progress_percentage || 0),
            mission_details: {},
            created_by: null,
            isManual: true, // Mark as manual mission
        };
    })() : null;
    
    // Combine pending schedules with active manual mission
    const allPendingSchedules = activeManualMission 
        ? [...pendingSchedules, activeManualMission]
        : pendingSchedules;
    
    // Get completed schedules
    const completedSchedules = schedules.filter(s => {
        const scheduleKey = `schedule_${s.id}`;
        const firebaseData = firebaseSchedules[scheduleKey];
        const statusStr = firebaseData?.status || s.status;
        const { status } = parseStatusAndProgress(statusStr);
        const finalStatus = status || statusStr;
        
        // Exclude cancelled schedules
        if (finalStatus === 'cancelled') return false;
        // Include completed, done, and failed schedules
        return finalStatus === 'completed' || finalStatus === 'done' || finalStatus === 'failed';
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
                isManual: false, // Scheduled missions
            };
        }
        return { ...s, isManual: false };
    });
    
    // Combine completed schedules with completed manual missions
    const allCompletedMissions = [
        ...completedSchedules,
        ...completedManualMissions.map(m => ({
            id: m.mission_id || m.id,
            blok_id: m.blok_db_id || null,
            blok_code: m.blok_id || null,
            blok_name: null,
            mission_type: m.mission_type,
            description: null,
            scheduled_at: m.started_at ? new Date(m.started_at).toISOString() : null,
            started_at: m.started_at ? new Date(m.started_at).toISOString() : null,
            completed_at: m.completed_at ? new Date(m.completed_at).toISOString() : null,
            status: m.status || 'completed',
            priority: 'high',
            progress_percentage: m.progress_percentage || 100,
            mission_details: {},
            created_by: null,
            isManual: true,
        }))
    ].sort((a, b) => {
        // Sort by completed_at (newest first)
        const aTime = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const bTime = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        return bTime - aTime;
    });
    
    // Get bloks to use (prioritize firebaseBloks if available and more complete)
    const getBloksToUse = () => {
        // Prioritize firebaseBloks if it has more bloks than MySQL bloks
        if (firebaseBloks && firebaseBloks.length > 0 && firebaseBloks.length >= bloks.length) {
            return firebaseBloks;
        }
        // Fallback to MySQL bloks
        return bloks && bloks.length > 0 ? bloks : [];
    };
    
    const bloksToUse = getBloksToUse();
    
    // Helper function to parse blok code (e.g., "A1" -> {letter: "A", number: 1})
    const parseBlokCode = (code) => {
        if (!code) return null;
        const match = code.toString().match(/^([A-Z]+)(\d+)$/i);
        if (!match) return null;
        return {
            letter: match[1].toUpperCase(),
            number: parseInt(match[2], 10)
        };
    };
    
    // Helper function to generate blok code from letter and number
    const generateBlokCode = (letter, number) => {
        return `${letter}${number}`;
    };
    
    // Helper function to expand blok range (e.g., "A1-B2" -> ["A1", "A2", "B1", "B2"])
    const expandBlokRange = (fromCode, toCode) => {
        if (!fromCode || !toCode) return [];
        
        const from = parseBlokCode(fromCode);
        const to = parseBlokCode(toCode);
        
        if (!from || !to) return [];
        
        const result = [];
        const fromLetterCode = from.letter.charCodeAt(0);
        const toLetterCode = to.letter.charCodeAt(0);
        
        // Generate all bloks in range
        for (let letterCode = fromLetterCode; letterCode <= toLetterCode; letterCode++) {
            const letter = String.fromCharCode(letterCode);
            // Determine start and end numbers for this letter
            const startNum = (letterCode === fromLetterCode) ? from.number : 1;
            const endNum = (letterCode === toLetterCode) ? to.number : 99; // Assume max 99 per letter
            
            for (let num = startNum; num <= endNum; num++) {
                const code = generateBlokCode(letter, num);
                // Check if this blok exists in bloksToUse
                const exists = bloksToUse.some(b => {
                    const bCode = (b.code || b.id?.toString()).toString();
                    return bCode === code || bCode.toUpperCase() === code.toUpperCase();
                });
                if (exists) {
                    result.push(code);
                }
            }
        }
        
        return result;
    };
    
    // Get selected blok codes (single or range)
    const getSelectedBlokCodes = (fromCode, toCode) => {
        if (!fromCode) return [];
        if (!toCode || fromCode === toCode) {
            // Single blok
            return [fromCode];
        }
        // Range
        return expandBlokRange(fromCode, toCode);
    };
    
    return (
        <AuthenticatedLayout>
            <Head title="Kontrol Robot" />
            
            <DeleteMissionModal
                show={showDeleteModal}
                mission={missionToDelete}
                onClose={() => {
                    setShowDeleteModal(false);
                    setMissionToDelete(null);
                }}
                onConfirm={handleDeleteHistory}
            />
            
            <div className="min-h-screen relative overflow-hidden">
                {/* Animated Background - Same as Dashboard */}
                <AnimatedBackground />
                
                <div className="relative p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
                    {/* Back Button */}
                    <div className="mb-4">
                        <BackButton href="/dashboard" />
                    </div>
                    
                    {/* Notification Toast */}
                    <AnimatePresence>
                        {notification && (
                            <motion.div
                                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                animate={{ 
                                    opacity: 1, 
                                    y: 0, 
                                    scale: 1,
                                    top: `${topOffset}px`,
                                }}
                                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                style={{
                                    top: `${topOffset}px`,
                                }}
                                className="fixed right-4 z-50"
                            >
                                <Card className={`p-4 shadow-2xl ${
                                    notification.type === 'success' 
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-400' 
                                        : notification.type === 'warning'
                                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-yellow-400'
                                        : 'bg-gradient-to-r from-red-500 to-red-600 text-white border-red-400'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        {notification.type === 'success' ? (
                                            <CheckCircle className="w-5 h-5" />
                                        ) : notification.type === 'warning' ? (
                                            <AlertTriangle className="w-5 h-5" />
                                        ) : (
                                            <XCircle className="w-5 h-5" />
                                        )}
                                        <p className="font-medium">{notification.message}</p>
                                        <button
                                            onClick={() => setNotification(null)}
                                            className="ml-2 hover:opacity-80"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
                    >
                        <div className="flex items-center gap-3">
                            <motion.div
                                animate={{ 
                                    rotate: isRobotActive ? [0, 5, -5, 0] : 0,
                                    scale: isRobotActive ? [1, 1.05, 1] : 1,
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"
                            >
                                <Bot className="w-6 h-6 text-white" />
                            </motion.div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                    Kontrol Robot
                                </h1>
                                <p className="text-sm text-gray-600">Penjadwalan & Monitoring Real-time</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {robotStatus.current_state === 'offline' ? (
                                <WifiOff className="w-5 h-5 text-red-500" />
                            ) : (
                                <Wifi className="w-5 h-5 text-green-500" />
                            )}
                            <span className="text-xs text-gray-600">
                                {robotStatus.current_state === 'offline' ? 'Offline' : 'Online'}
                            </span>
                        </div>
                    </motion.div>

                    {/* Status Robot Real-time */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="p-5 md:p-7 bg-gradient-to-br from-blue-50 via-cyan-50/80 to-blue-100/90 border-2 border-blue-200/60 shadow-xl overflow-hidden relative group backdrop-blur-sm">
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
                            {robotStatus.current_state === 'idle' && (
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
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        <motion.div
                                            animate={{ 
                                                scale: isRobotActive 
                                                    ? [1, 1.15, 1] 
                                                    : robotStatus.current_state === 'idle'
                                                    ? [1, 1.08, 1]
                                                    : 1,
                                                rotate: isRobotActive ? [0, 5, -5, 0] : 0
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
                                            {robotStatus.current_state === 'idle' && (
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
                                            <h3 className="text-xl md:text-2xl font-extrabold text-gray-800 mb-1 drop-shadow-sm">MOV Bot Alpha</h3>
                                            <p className="text-xs md:text-sm text-blue-600 font-medium">ROBOT-001</p>
                                        </div>
                                    </div>
                                    <motion.span
                                        whileHover={{ scale: 1.1, rotate: 2 }}
                                        whileTap={{ scale: 0.95 }}
                                        className={`px-4 py-2 text-sm font-extrabold rounded-full border-2 shadow-xl backdrop-blur-sm ${getStatusColor(robotStatus.current_state)}`}
                                    >
                                        {getStatusLabel(robotStatus.current_state)}
                                    </motion.span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                    <motion.div
                                        whileHover={{ scale: 1.05, y: -2 }}
                                        className="relative bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-blue-100/60 shadow-lg overflow-hidden group"
                                    >
                                        {/* Glow Effect */}
                                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${getBatteryColor(robotStatus.battery_level).replace('text-', 'bg-').replace('-500', '-500/15')} blur-xl`} />
                                        
                                        <div className="relative z-10">
                                            <div className="flex items-center gap-2.5 mb-3">
                                                <div className={`p-2 rounded-lg ${getBatteryColor(robotStatus.battery_level).replace('text-', 'bg-')} bg-opacity-15`}>
                                                    <Battery className={`w-5 h-5 ${getBatteryColor(robotStatus.battery_level)}`} />
                                                </div>
                                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Baterai</span>
                                            </div>
                                            <div className="flex items-baseline gap-1.5 mb-3">
                                                <p className={`text-3xl md:text-4xl font-black ${getBatteryColor(robotStatus.battery_level)} drop-shadow-sm`}>
                                                    {robotStatus.battery_level}
                                                </p>
                                                <span className="text-sm text-gray-500 font-bold">%</span>
                                            </div>
                                            <div className="relative w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                                <motion.div
                                                    key={robotStatus.battery_level}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${robotStatus.battery_level}%` }}
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                    className={`h-full bg-gradient-to-r ${getBatteryGradient(robotStatus.battery_level)} rounded-full shadow-md relative`}
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
                                                {getLocationText()}
                                            </p>
                                        </div>
                                    </motion.div>
                                </div>
                                
                                {/* Robot Navigation Indicators */}
                                {(hasInProgressSchedule || hasActiveMission) && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="grid grid-cols-3 gap-3 mb-4"
                                    >
                                        <motion.div
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            className="relative bg-white/70 backdrop-blur-md p-3 rounded-xl border border-blue-100/60 shadow-lg text-center overflow-hidden group"
                                        >
                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-blue-400/15 blur-xl" />
                                            <div className="relative z-10">
                                                <motion.div
                                                    animate={{ rotate: [0, 360] }}
                                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                                    className="inline-block mb-1"
                                                >
                                                    <Navigation className="w-5 h-5 text-blue-500 mx-auto" />
                                                </motion.div>
                                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Navigasi</p>
                                                <p className="text-xs text-blue-600 font-bold mt-1">Aktif</p>
                                            </div>
                                        </motion.div>
                                        <motion.div
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            className="relative bg-white/70 backdrop-blur-md p-3 rounded-xl border border-blue-100/60 shadow-lg text-center overflow-hidden group"
                                        >
                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-green-400/15 blur-xl" />
                                            <div className="relative z-10">
                                                <motion.div
                                                    animate={{ scale: [1, 1.2, 1] }}
                                                    transition={{ duration: 1.5, repeat: Infinity }}
                                                    className="inline-block mb-1"
                                                >
                                                    <Radio className="w-5 h-5 text-green-500 mx-auto" />
                                                </motion.div>
                                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Koneksi</p>
                                                <p className="text-xs text-green-600 font-bold mt-1">Online</p>
                                            </div>
                                        </motion.div>
                                        <motion.div
                                            whileHover={{ scale: 1.05, y: -2 }}
                                            className="relative bg-white/70 backdrop-blur-md p-3 rounded-xl border border-blue-100/60 shadow-lg text-center overflow-hidden group"
                                        >
                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-purple-400/15 blur-xl" />
                                            <div className="relative z-10">
                                                <Gauge className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Kecepatan</p>
                                                <p className="text-xs text-gray-600 font-medium mt-1">Normal</p>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}

                                {/* Active Mission or In-Progress Schedule */}
                                {(hasActiveMission || inProgressScheduleWithFirebase) && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 rounded-xl border-2 border-blue-200 shadow-lg"
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <motion.div
                                                    animate={{ 
                                                        scale: [1, 1.2, 1],
                                                        rotate: [0, 10, -10, 0]
                                                    }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                    className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center"
                                                >
                                                    <Activity className="w-4 h-4 text-white" />
                                                </motion.div>
                                                <span className="text-sm font-bold text-gray-800">Misi Sedang Berjalan</span>
                                            </div>
                                            <motion.span
                                                animate={{ scale: [1, 1.1, 1] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                                className="text-sm font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full"
                                            >
                                                {activeMission?.progress_percentage || inProgressScheduleWithFirebase?.progress_percentage || 0}%
                                            </motion.span>
                                        </div>
                                        
                                        <div className="space-y-2 mb-3">
                                            <p className="text-sm font-semibold text-gray-800">
                                                {getMissionTypeLabel(activeMission?.mission_type || inProgressScheduleWithFirebase?.mission_type)}
                                            </p>
                                            
                                            {/* Show blok info for scheduled missions */}
                                            {inProgressScheduleWithFirebase && (
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <MapPin className="w-3 h-3" />
                                                    <span>{inProgressScheduleWithFirebase.blok_code || `Blok #${inProgressScheduleWithFirebase.blok_id}`}</span>
                                                </div>
                                            )}
                                            
                                            {/* Show blok info for manual missions */}
                                            {activeMission?.blok_id && !inProgressScheduleWithFirebase && (
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <MapPin className="w-3 h-3" />
                                                    <span>{activeMission.blok_id}</span>
                                                </div>
                                            )}
                                            
                                            {activeMission?.current_task && (
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <Zap className="w-3 h-3 text-yellow-500" />
                                                    <span className="capitalize">{activeMission.current_task.replace('_', ' ')}</span>
                                                </div>
                                            )}
                                            
                                            {activeMission?.total_images > 0 && (
                                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                                    <Camera className="w-3 h-3 text-purple-500" />
                                                    <span>Gambar: {activeMission.images_captured}/{activeMission.total_images}</span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ 
                                                    width: `${activeMission?.progress_percentage || inProgressScheduleWithFirebase?.progress_percentage || 0}%` 
                                                }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full shadow-md relative overflow-hidden"
                                            >
                                                <motion.div
                                                    animate={{ x: ['-100%', '100%'] }}
                                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                                />
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Quick Actions - Only for K-Petani */}
                    {isKPetani && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="space-y-3"
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <Button
                                    onClick={handlePauseMission}
                                    variant="outline"
                                    className={`h-12 border-2 font-medium transition-all ${
                                        (hasInProgressSchedule || hasActiveMission) && !isPaused
                                            ? 'border-orange-400 text-orange-600 hover:bg-orange-50 hover:border-orange-500 shadow-md'
                                            : isPaused
                                            ? 'border-blue-400 text-blue-600 hover:bg-blue-50 hover:border-blue-500 shadow-md bg-blue-50'
                                            : 'border-gray-300 text-gray-400 cursor-not-allowed'
                                    }`}
                                    disabled={(!hasInProgressSchedule && !hasActiveMission) || isLoading}
                                >
                                    {isLoading ? (
                                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                                    ) : isPaused ? (
                                        <>
                                            <Play className="w-4 h-4 mr-2" />
                                            Lanjutkan Misi
                                        </>
                                    ) : (
                                        <>
                                            <Pause className="w-4 h-4 mr-2" />
                                            Jeda Misi
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={() => setShowScheduleForm(true)}
                                    className="h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
                                >
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Jadwalkan Misi
                                </Button>
                                <Button
                                    onClick={() => setShowManualControl(true)}
                                    className="h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg"
                                    disabled={robotStatus.current_state === 'offline'}
                                >
                                    <Zap className="w-4 h-4 mr-2" />
                                    Aktifkan Manual
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {/* Manual Control Form */}
                    <AnimatePresence>
                        {showManualControl && isKPetani && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <Card className="p-4 md:p-6 border-2 border-purple-200 bg-white/80 backdrop-blur-sm shadow-xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                            <Zap className="w-5 h-5 text-purple-600" />
                                            Aktifkan Robot Manual
                                        </h3>
                                        <button
                                            onClick={() => setShowManualControl(false)}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-sm font-medium mb-2 block">Mode Misi</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['deteksi', 'penyiraman', 'pemupukan', 'kombinasi'].map((type) => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => setManualMissionType(type)}
                                                        className={`p-3 text-sm rounded-xl border-2 transition-all font-medium ${
                                                            manualMissionType === type 
                                                                ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-md' 
                                                                : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                    >
                                                        {getMissionTypeLabel(type)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="text-sm font-medium mb-2 block">Blok Kebun (Range)</Label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label htmlFor="manual-blok-from" className="text-xs text-gray-600 mb-1 block">Dari Blok</Label>
                                                    <select 
                                                        id="manual-blok-from"
                                                        value={manualBlokFrom}
                                                        onChange={(e) => setManualBlokFrom(e.target.value)}
                                                        className="w-full p-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" 
                                                        required
                                                    >
                                                        <option value="">Pilih Blok</option>
                                                        {bloksToUse.map((blok) => (
                                                            <option key={blok.id || blok.code} value={blok.code || blok.id}>
                                                                {blok.code} - {blok.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <Label htmlFor="manual-blok-to" className="text-xs text-gray-600 mb-1 block">Sampai Blok</Label>
                                                    <select 
                                                        id="manual-blok-to"
                                                        value={manualBlokTo}
                                                        onChange={(e) => setManualBlokTo(e.target.value)}
                                                        className="w-full p-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" 
                                                    >
                                                        <option value="">Pilih Blok (Opsional)</option>
                                                        {bloksToUse.map((blok) => (
                                                            <option key={blok.id || blok.code} value={blok.code || blok.id}>
                                                                {blok.code} - {blok.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            {manualBlokFrom && manualBlokTo && manualBlokFrom !== manualBlokTo && (
                                                <p className="text-xs text-purple-600 mt-2 font-medium">
                                                    Range: {manualBlokFrom} - {manualBlokTo} ({getSelectedBlokCodes(manualBlokFrom, manualBlokTo).length} blok)
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setShowManualControl(false)}
                                                className="flex-1 h-11"
                                            >
                                                Batal
                                            </Button>
                                            <Button 
                                                type="button"
                                                onClick={handleStartRobotManually}
                                                className="flex-1 h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                                                disabled={isLoading || !manualBlokFrom || robotStatus.current_state === 'offline'}
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                                                        Mengaktifkan...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Zap className="w-4 h-4 mr-2" />
                                                        Aktifkan Robot
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Form Penjadwalan Misi */}
                    <AnimatePresence>
                        {showScheduleForm && isKPetani && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="relative"
                            >
                                <Card className="relative overflow-hidden border-2 border-green-300/50 bg-gradient-to-br from-white via-green-50/30 to-emerald-50/30 backdrop-blur-xl shadow-2xl">
                                    {/* Animated background decoration */}
                                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-green-200/20 rounded-full blur-3xl animate-pulse"></div>
                                        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                                    </div>
                                    
                                    <div className="relative p-6 md:p-8">
                                        {/* Header */}
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                                                    <Calendar className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                                                        Jadwalkan Misi Baru
                                                    </h3>
                                                    <p className="text-xs text-gray-500 mt-0.5">Buat jadwal misi robot baru</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowScheduleForm(false)}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>

                                        <form onSubmit={handleCreateSchedule} className="space-y-6">
                                            {/* Tipe Misi */}
                                            <div>
                                                <Label className="text-sm font-semibold mb-3 block text-gray-700 flex items-center gap-2">
                                                    <Zap className="w-4 h-4 text-green-600" />
                                                    Tipe Misi
                                                </Label>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {[
                                                        { type: 'deteksi', icon: Camera, selectedClass: 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 shadow-lg ring-2 ring-blue-200', iconClass: 'text-blue-600', bgClass: 'from-blue-400/10 to-blue-600/10' },
                                                        { type: 'penyiraman', icon: Activity, selectedClass: 'border-cyan-500 bg-gradient-to-br from-cyan-50 to-cyan-100 text-cyan-700 shadow-lg ring-2 ring-cyan-200', iconClass: 'text-cyan-600', bgClass: 'from-cyan-400/10 to-cyan-600/10' },
                                                        { type: 'pemupukan', icon: Zap, selectedClass: 'border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 shadow-lg ring-2 ring-amber-200', iconClass: 'text-amber-600', bgClass: 'from-amber-400/10 to-amber-600/10' },
                                                        { type: 'kombinasi', icon: Radio, selectedClass: 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-700 shadow-lg ring-2 ring-purple-200', iconClass: 'text-purple-600', bgClass: 'from-purple-400/10 to-purple-600/10' }
                                                    ].map(({ type, icon: Icon, selectedClass, iconClass, bgClass }) => (
                                                        <motion.button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => setSelectedMisiType(type)}
                                                            whileHover={{ scale: 1.05 }}
                                                            whileTap={{ scale: 0.95 }}
                                                            className={`relative p-4 rounded-2xl border-2 transition-all font-medium overflow-hidden group ${
                                                                selectedMisiType === type 
                                                                    ? selectedClass
                                                                    : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'
                                                            }`}
                                                        >
                                                            {selectedMisiType === type && (
                                                                <motion.div
                                                                    initial={{ scale: 0 }}
                                                                    animate={{ scale: 1 }}
                                                                    className={`absolute inset-0 bg-gradient-to-br ${bgClass}`}
                                                                />
                                                            )}
                                                            <div className="relative flex flex-col items-center gap-2">
                                                                <Icon className={`w-5 h-5 ${selectedMisiType === type ? iconClass : 'text-gray-400'}`} />
                                                                <span className="text-xs md:text-sm">{getMissionTypeLabel(type)}</span>
                                                            </div>
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Blok Kebun (Range) */}
                                            <div>
                                                <Label className="text-sm font-semibold mb-3 block text-gray-700 flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-green-600" />
                                                    Blok Kebun (Range)
                                                </Label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <Label htmlFor="blok-from" className="text-xs text-gray-600 mb-1 block">Dari Blok</Label>
                                                        <select 
                                                            id="blok-from"
                                                            value={selectedBlokFrom}
                                                            onChange={(e) => setSelectedBlokFrom(e.target.value)}
                                                            className="w-full p-4 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md" 
                                                            required
                                                        >
                                                            <option value="">Pilih Blok</option>
                                                            {bloksToUse.map((blok) => (
                                                                <option key={blok.id || blok.code} value={blok.code || blok.id}>
                                                                    {blok.code} - {blok.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="blok-to" className="text-xs text-gray-600 mb-1 block">Sampai Blok</Label>
                                                        <select 
                                                            id="blok-to"
                                                            value={selectedBlokTo}
                                                            onChange={(e) => setSelectedBlokTo(e.target.value)}
                                                            className="w-full p-4 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md" 
                                                        >
                                                            <option value="">Pilih Blok (Opsional)</option>
                                                            {bloksToUse.map((blok) => (
                                                                <option key={blok.id || blok.code} value={blok.code || blok.id}>
                                                                    {blok.code} - {blok.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                {selectedBlokFrom && selectedBlokTo && selectedBlokFrom !== selectedBlokTo && (
                                                    <p className="text-xs text-green-600 mt-2 font-medium">
                                                        Range: {selectedBlokFrom} - {selectedBlokTo} ({getSelectedBlokCodes(selectedBlokFrom, selectedBlokTo).length} blok)
                                                    </p>
                                                )}
                                            </div>

                                            {/* Tanggal & Waktu */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="tanggal" className="text-sm font-semibold mb-3 block text-gray-700 flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-green-600" />
                                                        Tanggal
                                                    </Label>
                                                    <Input 
                                                        id="tanggal" 
                                                        type="date" 
                                                        className="h-12 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md" 
                                                        value={scheduleDate}
                                                        onChange={(e) => setScheduleDate(e.target.value)}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        required 
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="waktu" className="text-sm font-semibold mb-3 block text-gray-700 flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-green-600" />
                                                        Waktu
                                                    </Label>
                                                    <Input 
                                                        id="waktu" 
                                                        type="time" 
                                                        className="h-12 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md" 
                                                        value={scheduleTime}
                                                        onChange={(e) => setScheduleTime(e.target.value)}
                                                        required 
                                                    />
                                                </div>
                                            </div>

                                            {/* Prioritas */}
                                            <div>
                                                <Label htmlFor="priority" className="text-sm font-semibold mb-3 block text-gray-700 flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4 text-green-600" />
                                                    Prioritas
                                                </Label>
                                                <select 
                                                    id="priority"
                                                    value={schedulePriority}
                                                    onChange={(e) => setSchedulePriority(e.target.value)}
                                                    className="w-full p-4 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                                                >
                                                    <option value="low">🟢 Rendah</option>
                                                    <option value="medium">🟡 Sedang</option>
                                                    <option value="high">🟠 Tinggi</option>
                                                    <option value="urgent">🔴 Mendesak</option>
                                                </select>
                                            </div>

                                            {/* Deskripsi */}
                                            <div>
                                                <Label htmlFor="description" className="text-sm font-semibold mb-3 block text-gray-700 flex items-center gap-2">
                                                    <Edit className="w-4 h-4 text-green-600" />
                                                    Deskripsi <span className="text-xs font-normal text-gray-400">(Opsional)</span>
                                                </Label>
                                                <Input 
                                                    id="description" 
                                                    type="text" 
                                                    className="h-12 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md" 
                                                    value={scheduleDescription}
                                                    onChange={(e) => setScheduleDescription(e.target.value)}
                                                    placeholder="Tambahkan catatan atau instruksi khusus untuk misi ini..."
                                                />
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => setShowScheduleForm(false)}
                                                    className="flex-1 h-12 border-2 border-gray-300 hover:bg-gray-50 font-medium"
                                                >
                                                    Batal
                                                </Button>
                                                <Button 
                                                    type="submit" 
                                                    className="flex-1 h-12 bg-gradient-to-r from-green-600 via-green-500 to-emerald-600 hover:from-green-700 hover:via-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all font-semibold text-white"
                                                    disabled={isLoading}
                                                >
                                                    {isLoading ? (
                                                        <>
                                                            <Loader className="w-5 h-5 mr-2 animate-spin" />
                                                            Menyimpan...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="w-5 h-5 mr-2" />
                                                            Simpan Jadwal
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </form>
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Jadwal Misi */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-blue-200/50 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                                        <Calendar className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800">Jadwal Misi</h3>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={fetchSchedules}
                                    className="text-xs"
                                >
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Refresh
                                </Button>
                            </div>
                            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                                {allPendingSchedules.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-8">Tidak ada jadwal aktif</p>
                                ) : (
                                    allPendingSchedules.map((misi, index) => (
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
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-bold text-gray-800">
                                                        {misi.blok_code || `Blok #${misi.blok_id}`}
                                                    </span>
                                                    {misi.blok_name && (
                                                        <span className="text-xs text-gray-500">- {misi.blok_name}</span>
                                                    )}
                                                    {misi.isManual && (
                                                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-semibold">
                                                            Manual
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-3 py-1.5 rounded-full font-bold shadow-md ${getStatusColor(misi.status)}`}>
                                                        {getStatusLabel(misi.status)}
                                                    </span>
                                                    {isKPetani && (misi.status === 'pending' || misi.status === 'in_progress' || misi.status === 'paused') && !misi.isManual && (
                                                        <button
                                                            onClick={() => handleCancelSchedule(misi.id)}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                                            title="Batalkan jadwal"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
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
                                                                    ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                                                                    : 'bg-gradient-to-r from-green-500 to-emerald-500'
                                                            }`}
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <p className={`text-xs font-medium ${
                                                            misi.status === 'paused' ? 'text-orange-600' : 'text-green-600'
                                                        }`}>
                                                            {misi.status === 'paused' && '⏸️ '}
                                                            {misi.progress_percentage || 0}%
                                                        </p>
                                                        {misi.status === 'paused' && (
                                                            <span className="text-xs text-orange-600 font-semibold animate-pulse">
                                                                ⏸ DIJEDA
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Riwayat Misi */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-gray-200/50 shadow-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <Clock className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Riwayat Misi</h3>
                            </div>
                            <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                                {allCompletedMissions.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-8">Tidak ada riwayat misi</p>
                                ) : (
                                    allCompletedMissions.map((misi, index) => (
                                        <motion.div
                                            key={misi.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileHover={{ scale: 1.02, y: -2, x: 5 }}
                                            className="bg-gradient-to-br from-gray-50/90 via-slate-50/80 to-gray-100/90 p-5 md:p-6 rounded-2xl border-2 border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300"
                                        >
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-gray-800">
                                                        {misi.blok_code || `Blok #${misi.blok_id}`}
                                                    </span>
                                                    {misi.blok_name && (
                                                        <span className="text-xs text-gray-500">- {misi.blok_name}</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {misi.status === 'completed' || misi.status === 'done' ? (
                                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                                    ) : (
                                                        <XCircle className="w-5 h-5 text-red-600" />
                                                    )}
                                                    <span className={`text-xs px-3 py-1.5 rounded-full font-bold shadow-md ${getStatusColor(misi.status)}`}>
                                                        {getStatusLabel(misi.status)}
                                                    </span>
                                                    {isKPetani && (
                                                        <button
                                                            onClick={() => handleDeleteHistoryClick(misi, misi.isManual)}
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                                            title="Hapus riwayat misi"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-800 mb-2 font-medium">
                                                {getMissionTypeLabel(misi.mission_type)}
                                            </p>
                                            <p className="text-xs text-gray-600 mb-2">
                                                📅 {formatDateTime(misi.scheduled_at)}
                                                {misi.completed_at && ` • Selesai: ${formatDateTime(misi.completed_at)}`}
                                            </p>
                                            {misi.description && (
                                                <p className="text-xs text-gray-500 italic">{misi.description}</p>
                                            )}
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <Card className="p-4 bg-blue-50 border-2 border-blue-200 shadow-xl">
                            <h3 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Informasi
                            </h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li>• Robot otomatis kembali ke charging station saat baterai &lt;20%</li>
                                <li>• Misi kombinasi menggabungkan deteksi dan penyiraman/pemupukan</li>
                                <li>• K-Petani dapat mengontrol penuh jadwal dan operasi robot</li>
                                <li>• Status robot diperbarui secara real-time dari Firebase</li>
                            </ul>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

