import { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Camera, Upload, Trash2, CheckCircle, Clock, Sparkles, Loader, RefreshCw, X, MapPin, Save } from 'lucide-react';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import AnimatedBackground from '@/Components/AnimatedBackground';
import SkeletonLoader, { SkeletonList } from '@/Components/ui/SkeletonLoader';
import EmptyState from '@/Components/ui/EmptyState';
import LoadingOverlay from '@/Components/ui/LoadingOverlay';
import BackButton from '@/Components/BackButton';
import { useMangoDetection } from '@/hooks/useMangoDetection';
import CameraCapture from '@/Components/CameraCapture';

export default function DeteksiKematangan({ blokOptions = [], detectionHistory: initialHistory = [] }) {
    const { auth, flash } = usePage().props;
    const userRole = auth?.user?.role;
    const router = usePage().router;
    const fileInputRef = useRef(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [showBlokModal, setShowBlokModal] = useState(false);
    const [selectedBlokId, setSelectedBlokId] = useState('');
    const [pendingFile, setPendingFile] = useState(null);
    const [pendingDetections, setPendingDetections] = useState(null);
    const [currentImage, setCurrentImage] = useState(null);
    const [currentDetections, setCurrentDetections] = useState([]);
    const [detectionHistory, setDetectionHistory] = useState(initialHistory || []);
    const [notification, setNotification] = useState(null);

    const { loadModel, detectFromFile, detectFromImage, isLoading: isModelLoading, isModelLoaded, error: modelError } = useMangoDetection();

    useEffect(() => {
        // Load model on mount
        loadModel().catch(err => {
            console.error('Failed to load model:', err);
        });
        
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    // Show notification from flash message
    useEffect(() => {
        if (flash?.success) {
            setNotification({
                type: 'success',
                message: flash.success,
            });
            setTimeout(() => setNotification(null), 5000);
        }
    }, [flash]);

    const handleFileSelect = async (file) => {
        if (!file) return;
        
        // Validate image type
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validImageTypes.includes(file.type.toLowerCase())) {
            alert('Silakan pilih file gambar yang valid (JPEG, PNG, atau WebP)');
            return;
        }

        try {
            setIsDetecting(true);
            setCurrentImage(URL.createObjectURL(file));
            
            const result = await detectFromFile(file);
            
            if (result && result.detections && result.detections.length > 0) {
                // Get the best detection (highest confidence)
                const bestDetection = result.detections.reduce((best, current) => 
                    current.confidence > best.confidence ? current : best
                );
                
                const newDetection = {
                    id: Date.now(),
                    imageUrl: result.imageUrl,
                    maturity: bestDetection.maturity,
                    status: bestDetection.status,
                    confidence: bestDetection.confidence,
                    className: bestDetection.className,
                    recommendation: getRecommendation(bestDetection.maturity, bestDetection.status),
                    timestamp: 'Baru saja',
                    detections: result.detections,
                    imageWidth: result.imageWidth,
                    imageHeight: result.imageHeight,
                };
                
                setCurrentDetections(result.detections);
                setDetectionHistory([newDetection, ...detectionHistory]);
                
                // Store file and detections for saving to database
                setPendingFile(file);
                setPendingDetections(result.detections);
                
                // Show blok selection modal
                setShowBlokModal(true);
            } else {
                alert('Tidak ada mangga yang terdeteksi dalam gambar. Pastikan gambar mengandung buah mangga.');
            }
        } catch (error) {
            console.error('Detection error:', error);
            alert('Gagal melakukan deteksi: ' + error.message);
        } finally {
            setIsDetecting(false);
        }
    };

    const handleUploadImage = () => {
        fileInputRef.current?.click();
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
        // Reset input
        e.target.value = '';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDeleteDetection = async (id) => {
        if (!confirm('Yakin ingin menghapus riwayat deteksi ini?')) {
            return;
        }

        try {
            const response = await window.axios.delete(route('detections.destroy', id));
            if (response.data.success) {
                setDetectionHistory(detectionHistory.filter((d) => d.id !== id));
                if (currentImage && detectionHistory.find(d => d.id === id)?.imageUrl === currentImage) {
                    setCurrentImage(null);
                    setCurrentDetections([]);
                }
                setNotification({
                    type: 'success',
                    message: 'Riwayat deteksi berhasil dihapus',
                });
                setTimeout(() => setNotification(null), 3000);
            }
        } catch (error) {
            console.error('Error deleting detection:', error);
            alert('Gagal menghapus riwayat deteksi');
        }
    };

    const handleDeleteAllDetections = async () => {
        if (!confirm('Yakin ingin menghapus semua riwayat deteksi?')) {
            return;
        }

        try {
            const response = await window.axios.delete(route('detections.destroyAll'));
            if (response.data.success) {
                setDetectionHistory([]);
                setCurrentImage(null);
                setCurrentDetections([]);
                setNotification({
                    type: 'success',
                    message: 'Semua riwayat deteksi berhasil dihapus',
                });
                setTimeout(() => setNotification(null), 3000);
            }
        } catch (error) {
            console.error('Error deleting all detections:', error);
            alert('Gagal menghapus semua riwayat deteksi');
        }
    };

    const handleCameraCapture = async (file, detections) => {
        if (detections && detections.length > 0) {
            const imageUrl = URL.createObjectURL(file);
            const bestDetection = detections.reduce((best, current) => 
                current.confidence > best.confidence ? current : best
            );
            
            const newDetection = {
                id: Date.now(),
                imageUrl: imageUrl,
                maturity: bestDetection.maturity,
                status: bestDetection.status,
                confidence: bestDetection.confidence,
                className: bestDetection.className,
                recommendation: getRecommendation(bestDetection.maturity, bestDetection.status),
                timestamp: 'Baru saja',
                detections: detections,
            };
            
            setCurrentDetections(detections);
            setCurrentImage(imageUrl);
            setDetectionHistory([newDetection, ...detectionHistory]);
            
            // Store file and detections for saving to database
            setPendingFile(file);
            setPendingDetections(detections);
            
            setShowCamera(false);
            // Show blok selection modal
            setShowBlokModal(true);
        } else {
            alert('Tidak ada mangga yang terdeteksi. Pastikan kamera mengarah ke buah mangga.');
        }
    };

    const handleSaveDetection = async () => {
        if (!selectedBlokId || !pendingFile || !pendingDetections) {
            alert('Silakan pilih blok terlebih dahulu');
            return;
        }

        try {
            setIsDetecting(true);
            
            // Validate required data
            if (!selectedBlokId) {
                alert('Silakan pilih blok terlebih dahulu');
                setIsDetecting(false);
                return;
            }
            
            if (!pendingFile) {
                alert('File gambar tidak ditemukan');
                setIsDetecting(false);
                return;
            }
            
            if (!pendingDetections || !Array.isArray(pendingDetections) || pendingDetections.length === 0) {
                alert('Data deteksi tidak valid');
                setIsDetecting(false);
                return;
            }
            
            const formData = new FormData();
            // Ensure blok_id is an integer
            const blokIdInt = parseInt(selectedBlokId, 10);
            if (isNaN(blokIdInt)) {
                alert('Blok ID tidak valid');
                setIsDetecting(false);
                return;
            }
            formData.append('blok_id', blokIdInt);
            formData.append('image', pendingFile);
            formData.append('detections', JSON.stringify(pendingDetections));
            
            // Debug: Log what we're sending
            console.log('Sending detection data:', {
                blok_id: blokIdInt,
                blok_id_type: typeof blokIdInt,
                image: pendingFile?.name,
                image_type: pendingFile?.type,
                image_size: pendingFile?.size,
                detections_count: pendingDetections?.length,
                detections_preview: pendingDetections?.slice(0, 1),
            });

            // Use axios which is already configured with CSRF token
            const response = await window.axios.post(route('detections.store'), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                // Show success notification
                const notificationMessage = response.data.message || 'Hasil deteksi berhasil disimpan!';
                setNotification({
                    type: 'success',
                    message: notificationMessage,
                });
                
                // Clear pending data
                setPendingFile(null);
                setPendingDetections(null);
                setSelectedBlokId('');
                setShowBlokModal(false);
                
                // Auto-hide notification after 5 seconds
                setTimeout(() => {
                    setNotification(null);
                }, 5000);
                
                // Reload page to update dashboard after 2 seconds
                setTimeout(() => {
                    router.reload({ only: [] });
                }, 2000);
            } else {
                alert(response.data.message || 'Gagal menyimpan hasil deteksi');
            }
        } catch (error) {
            console.error('Save error:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            
            // Show detailed error message
            let errorMessage = 'Gagal menyimpan hasil deteksi';
            
            if (error.response?.data?.errors) {
                // Laravel validation errors
                const errors = error.response.data.errors;
                const errorList = Object.entries(errors)
                    .map(([field, messages]) => {
                        const msgArray = Array.isArray(messages) ? messages : [messages];
                        return `${field}: ${msgArray.join(', ')}`;
                    })
                    .join('\n');
                errorMessage = `Validasi gagal:\n${errorList}`;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            // Show error in console for debugging
            console.error('Final error message:', errorMessage);
            
            alert(errorMessage);
        } finally {
            setIsDetecting(false);
        }
    };

    const getRecommendation = (maturity, status) => {
        if (maturity >= 75) {
            return 'Siap dipanen dalam 1-2 hari. Buah sudah matang optimal.';
        } else if (maturity >= 50) {
            return 'Tunggu 5-7 hari lagi. Buah masih dalam proses pematangan.';
        } else {
            return 'Masih memerlukan 2-3 minggu. Buah masih muda, perlu perawatan lebih lanjut.';
        }
    };

    const getMaturityColor = (maturity) => {
        if (maturity >= 75) return 'text-green-600 bg-green-100 border-green-200';
        if (maturity >= 50) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
        return 'text-orange-600 bg-orange-100 border-orange-200';
    };

    const getStatusColor = (maturity) => {
        if (maturity >= 75) return 'bg-gradient-to-r from-green-500 to-emerald-500';
        if (maturity >= 50) return 'bg-gradient-to-r from-yellow-500 to-amber-500';
        return 'bg-gradient-to-r from-orange-500 to-red-500';
    };

    const weekData = [45, 52, 60, 68, 72, 78, 85];

    return (
        <AuthenticatedLayout>
            <Head title="Deteksi Kematangan" />
            
            <div className="min-h-screen relative overflow-hidden">
                <AnimatedBackground />
                <LoadingOverlay show={isDetecting} message="Menganalisis kematangan dengan AI..." />
                <div className="relative p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
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
                                className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg"
                            >
                                <Camera className="w-6 h-6 text-white" />
                            </motion.div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                                    Deteksi Kematangan 🥭
                                </h1>
                                <p className="text-sm text-gray-600">Upload gambar buah untuk analisis AI</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setIsLoading(true)}
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </motion.div>

                    {/* Upload Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card 
                            className={`p-6 md:p-8 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 border-2 border-dashed shadow-xl transition-all ${
                                isDragging 
                                    ? 'border-yellow-500 bg-gradient-to-br from-yellow-100 via-orange-100 to-amber-100 scale-105' 
                                    : 'border-yellow-400'
                            }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="text-center">
                                <motion.div
                                    animate={{ 
                                        scale: isDetecting ? [1, 1.1, 1] : 1,
                                        rotate: isDetecting ? [0, 10, -10, 0] : 0
                                    }}
                                    transition={{ duration: 1, repeat: isDetecting ? Infinity : 0 }}
                                    className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                                >
                                    {isDetecting ? (
                                        <Loader className="w-10 h-10 text-white animate-spin" />
                                    ) : (
                                        <Camera className="w-10 h-10 text-white" />
                                    )}
                                </motion.div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Gambar Mangga</h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    Ambil foto buah mangga untuk analisis kematangan menggunakan AI
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    onChange={handleFileInputChange}
                                    className="hidden"
                                />
                                <div className="flex gap-3 justify-center">
                                    <Button
                                        onClick={handleUploadImage}
                                        disabled={isDetecting || !isModelLoaded}
                                        className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 flex items-center gap-2 shadow-lg"
                                    >
                                        <Upload className="w-4 h-4" />
                                        {isDetecting ? 'Mendeteksi...' : isModelLoading ? 'Memuat Model...' : 'Upload Gambar'}
                                    </Button>
                                    <Button 
                                        onClick={() => setShowCamera(true)}
                                        disabled={!isModelLoaded}
                                        variant="outline" 
                                        className="border-2 border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                                    >
                                        <Camera className="w-4 h-4 mr-2" />
                                        {isModelLoading ? 'Memuat Model...' : 'Buka Kamera'}
                                    </Button>
                                </div>
                                {modelError && (
                                    <p className="mt-4 text-sm text-red-600 text-center">
                                        Error: {modelError}
                                    </p>
                                )}
                                {!isModelLoaded && !isModelLoading && (
                                    <p className="mt-4 text-sm text-yellow-600 text-center">
                                        Model AI sedang dimuat...
                                    </p>
                                )}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Current Week Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-yellow-200/50 shadow-xl">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Grafik Deteksi Minggu Ini</h3>
                            <div className="h-48 bg-gradient-to-t from-yellow-100 via-orange-50 to-transparent rounded-xl flex items-end justify-around p-4 mb-4">
                                {weekData.map((value, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ height: 0 }}
                                        animate={{ height: 'auto' }}
                                        transition={{ delay: i * 0.1, duration: 0.5 }}
                                        className="flex flex-col items-center gap-2"
                                    >
                                        <motion.div
                                            initial={{ scaleY: 0 }}
                                            animate={{ scaleY: 1 }}
                                            transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
                                            className={`w-10 md:w-12 rounded-t-lg shadow-md ${
                                                value >= 75 ? 'bg-gradient-to-t from-green-500 to-emerald-600' : 
                                                value >= 50 ? 'bg-gradient-to-t from-yellow-500 to-amber-600' : 
                                                'bg-gradient-to-t from-orange-500 to-red-600'
                                            }`}
                                            style={{ height: `${(value / 100) * 100}%`, minHeight: '20px' }}
                                        ></motion.div>
                                        <span className="text-xs font-medium text-gray-600">{value}%</span>
                                    </motion.div>
                                ))}
                            </div>
                            <div className="flex justify-center gap-6 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-green-500 rounded shadow-sm"></div>
                                    <span className="text-gray-700 font-medium">Matang (&gt;75%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-yellow-500 rounded shadow-sm"></div>
                                    <span className="text-gray-700 font-medium">Setengah (50-75%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-orange-500 rounded shadow-sm"></div>
                                    <span className="text-gray-700 font-medium">Muda (&lt;50%)</span>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Detection History */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-gray-200/50 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Riwayat Deteksi</h3>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                                        {detectionHistory.length} hasil
                                    </Badge>
                                    {detectionHistory.length > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleDeleteAllDetections}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Hapus Semua
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {isLoading ? (
                                <SkeletonLoader type="list" count={3} />
                            ) : detectionHistory.length > 0 ? (
                                <div className="space-y-4">
                                    <AnimatePresence>
                                        {detectionHistory.map((result, index) => (
                                            <motion.div
                                                key={result.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                transition={{ delay: index * 0.1 }}
                                                whileHover={{ scale: 1.02, x: 5 }}
                                            >
                                                <Card className="p-4 border-2 border-gray-200 shadow-md">
                                                    <div className="flex gap-4">
                                                        {/* Image Preview */}
                                                        <motion.div
                                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                                            className="w-20 h-20 bg-gradient-to-br from-yellow-200 via-orange-200 to-amber-200 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg overflow-hidden"
                                                        >
                                                            {result.imageUrl ? (
                                                                <img 
                                                                    src={result.imageUrl} 
                                                                    alt="Detection result" 
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <span className="text-5xl">🥭</span>
                                                            )}
                                                        </motion.div>

                                                        {/* Details */}
                                                        <div className="flex-1">
                                                            <div className="flex items-start justify-between mb-3">
                                                                <div>
                                                                    <Badge className={`${getMaturityColor(result.maturity)} border-2 mb-2 shadow-sm`}>
                                                                        {result.status} - {result.maturity}%
                                                                    </Badge>
                                                                    <p className="text-sm text-gray-600 flex items-center gap-2">
                                                                        <Clock className="w-4 h-4" />
                                                                        {result.timestamp}
                                                                    </p>
                                                                </div>
                                                                <motion.button
                                                                    whileHover={{ scale: 1.1 }}
                                                                    whileTap={{ scale: 0.9 }}
                                                                    onClick={() => handleDeleteDetection(result.id)}
                                                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 className="w-5 h-5 text-red-500" />
                                                                </motion.button>
                                                            </div>

                                                            {/* Progress Bar */}
                                                            <div className="mb-3">
                                                                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                                                                    <motion.div
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${result.maturity}%` }}
                                                                        transition={{ duration: 1, ease: "easeOut" }}
                                                                        className={`h-full ${getStatusColor(result.maturity)} rounded-full shadow-sm`}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Recommendation */}
                                                            <div className="flex items-start gap-2 bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl border border-green-200">
                                                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                                                <p className="text-sm text-green-700 font-medium">{result.recommendation}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <EmptyState
                                    icon={Camera}
                                    title="Belum Ada Hasil Deteksi"
                                    message="Upload gambar mangga untuk memulai analisis kematangan dengan AI."
                                    actionLabel="Upload Gambar"
                                    onAction={handleUploadImage}
                                />
                            )}
                        </Card>
                    </motion.div>

                    {/* Info Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="p-4 md:p-6 bg-blue-50 border-2 border-blue-200 shadow-xl">
                            <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-blue-600" />
                                Tips Deteksi Akurat
                            </h4>
                            <ul className="text-sm text-gray-700 space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    <span>Ambil foto dengan pencahayaan yang cukup</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    <span>Pastikan buah terlihat jelas dan tidak blur</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    <span>Foto dari berbagai sisi untuk hasil lebih akurat</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    <span>Hindari bayangan pada buah</span>
                                </li>
                            </ul>
                        </Card>
                    </motion.div>
                </div>

                {/* Camera Capture Modal */}
                {showCamera && (
                    <CameraCapture
                        isOpen={showCamera}
                        onClose={() => setShowCamera(false)}
                        onCapture={handleCameraCapture}
                        isModelLoaded={isModelLoaded}
                    />
                )}

                {/* Blok Selection Modal */}
                {showBlokModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-green-600" />
                                    Pilih Blok Kebun
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setShowBlokModal(false);
                                        setPendingFile(null);
                                        setPendingDetections(null);
                                        setSelectedBlokId('');
                                    }}
                                    className="h-8 w-8 p-0"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="blok" className="text-sm font-medium text-gray-700 mb-2 block">
                                        Blok Kebun <span className="text-red-500">*</span>
                                    </Label>
                                    <select
                                        id="blok"
                                        value={selectedBlokId}
                                        onChange={(e) => setSelectedBlokId(e.target.value)}
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                                        required
                                    >
                                        <option value="">Pilih Blok...</option>
                                        {blokOptions.map((blok) => (
                                            <option key={blok.value} value={blok.value}>
                                                {blok.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {pendingDetections && pendingDetections.length > 0 && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                        <p className="text-sm text-green-700 font-medium mb-1">
                                            Hasil Deteksi:
                                        </p>
                                        <p className="text-xs text-green-600">
                                            {pendingDetections.length} mangga terdeteksi
                                            {pendingDetections[0]?.status && ` - Status: ${pendingDetections[0].status}`}
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowBlokModal(false);
                                            setPendingFile(null);
                                            setPendingDetections(null);
                                            setSelectedBlokId('');
                                        }}
                                        className="flex-1"
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        onClick={handleSaveDetection}
                                        disabled={!selectedBlokId || isDetecting}
                                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                    >
                                        {isDetecting ? (
                                            <>
                                                <Loader className="w-4 h-4 mr-2 animate-spin" />
                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Simpan
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Notification Toast */}
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100]"
                    >
                        <Card className={`p-4 shadow-2xl ${
                            notification.type === 'success' 
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                                : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                        }`}>
                            <div className="flex items-center gap-3">
                                {notification.type === 'success' ? (
                                    <CheckCircle className="w-5 h-5" />
                                ) : (
                                    <X className="w-5 h-5" />
                                )}
                                <p className="font-medium">{notification.message}</p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setNotification(null)}
                                    className="ml-2 h-6 w-6 p-0 text-white hover:bg-white/20"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

