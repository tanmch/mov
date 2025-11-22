import { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Camera, Upload, Trash2, CheckCircle, Clock, Sparkles, Loader, AlertCircle, X } from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import BackButton from '@/Components/BackButton';
import { useMangoDetection } from '@/hooks/useMangoDetection';
import DetectionCanvas from '@/Components/DetectionCanvas';
import CameraCapture from '@/Components/CameraCapture';
import LoadingOverlay from '@/Components/ui/LoadingOverlay';

export default function DeteksiKematangan() {
    const { auth } = usePage().props;
    const userRole = auth?.user?.role;
    const fileInputRef = useRef(null);
    
    const { 
        loadModel, 
        detectFromFile, 
        isLoading: isDetecting, 
        isModelLoaded, 
        error: detectionError 
    } = useMangoDetection();
    
    const [detectionHistory, setDetectionHistory] = useState([]);
    const [showCamera, setShowCamera] = useState(false);
    const [modelLoading, setModelLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load model on mount
    useEffect(() => {
        const initializeModel = async () => {
            try {
                setModelLoading(true);
                await loadModel();
            } catch (err) {
                setError('Gagal memuat model ML. Pastikan file model tersedia.');
                console.error('Model loading error:', err);
            } finally {
                setModelLoading(false);
            }
        };
        
        initializeModel();
    }, [loadModel]);

    const getRecommendation = (maturity, status) => {
        if (maturity >= 75) return 'Siap dipanen dalam 1-2 hari';
        if (maturity >= 50) return 'Tunggu 5-7 hari lagi sebelum panen';
        if (maturity > 0) return 'Masih memerlukan 2-3 minggu untuk matang';
        return 'Tidak dapat menentukan kematangan';
    };

    const formatTimestamp = () => {
        const now = new Date();
        return now.toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleFileUpload = async (file) => {
        if (!file) return;
        
        try {
            setError(null);
            const result = await detectFromFile(file);
            
            if (result.detections.length === 0) {
                setError('Tidak ada mangga terdeteksi pada gambar. Pastikan gambar mengandung buah mangga yang jelas.');
                return;
            }

            // Process each detection
            const processedResults = result.detections.map((det, index) => ({
                id: Date.now() + index,
                imageUrl: result.imageUrl,
                imageWidth: result.imageWidth,
                imageHeight: result.imageHeight,
                detections: [det],
                maturity: det.maturity,
                status: det.status,
                className: det.className,
                confidence: det.confidence,
                recommendation: getRecommendation(det.maturity, det.status),
                timestamp: formatTimestamp(),
                allDetections: result.detections
            }));

            // Add to history
            setDetectionHistory(prev => [...processedResults, ...prev]);
        } catch (err) {
            setError(err.message || 'Terjadi kesalahan saat mendeteksi gambar');
            console.error('Detection error:', err);
        }
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileUpload(file);
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleCameraCapture = (file) => {
        setShowCamera(false);
        handleFileUpload(file);
    };

    const handleDeleteDetection = (id) => {
        setDetectionHistory(prev => prev.filter(d => d.id !== id));
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

    // Calculate week data from history
    const weekData = detectionHistory.length > 0
        ? Array.from({ length: 7 }, (_, i) => {
            const dayAgo = new Date();
            dayAgo.setDate(dayAgo.getDate() - (6 - i));
            const dayDetections = detectionHistory.filter(d => {
                const detDate = new Date(d.timestamp);
                return detDate.toDateString() === dayAgo.toDateString();
            });
            return dayDetections.length > 0
                ? Math.round(dayDetections.reduce((sum, d) => sum + d.maturity, 0) / dayDetections.length)
                : 0;
        })
        : [0, 0, 0, 0, 0, 0, 0];

    return (
        <AuthenticatedLayout>
            <Head title="Deteksi Kematangan" />
            
            <div className="min-h-screen relative overflow-hidden">
                <AnimatedBackground />
                <LoadingOverlay show={modelLoading} message="Memuat model Machine Learning..." />
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
                                <p className="text-sm text-gray-600">
                                    {isModelLoaded ? 'AI-powered detection siap digunakan' : 'Memuat model...'}
                                </p>
                            </div>
                        </div>
                        {isModelLoaded && (
                            <Badge className="bg-green-500 text-white border-0">
                                ✓ Model Loaded
                            </Badge>
                        )}
                    </motion.div>

                    {/* Error Message */}
                    <AnimatePresence>
                        {(error || detectionError) && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="mb-4"
                            >
                                <Card className="p-4 bg-red-50 border-2 border-red-200">
                                    <div className="flex items-center gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                                        <p className="text-red-800 text-sm flex-1">{error || detectionError}</p>
                                        <button
                                            onClick={() => setError(null)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Upload Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="p-6 md:p-8 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 border-2 border-dashed border-yellow-400 shadow-xl">
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
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Deteksi Kematangan Mangga</h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    {isDetecting 
                                        ? 'Menganalisis gambar dengan AI...' 
                                        : 'Upload gambar atau gunakan kamera untuk deteksi real-time'}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileInputChange}
                                        className="hidden"
                                        id="file-upload"
                                        disabled={!isModelLoaded || isDetecting}
                                    />
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={!isModelLoaded || isDetecting}
                                        className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 flex items-center gap-2 shadow-lg"
                                    >
                                        <Upload className="w-4 h-4" />
                                        {isDetecting ? 'Mendeteksi...' : 'Upload Gambar'}
                                    </Button>
                                    <Button 
                                        onClick={() => setShowCamera(true)}
                                        variant="outline" 
                                        disabled={!isModelLoaded || isDetecting}
                                        className="border-2 border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                                    >
                                        <Camera className="w-4 h-4 mr-2" />
                                        Buka Kamera
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Current Week Chart */}
                    {detectionHistory.length > 0 && (
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
                                                style={{ height: `${Math.max(value, 10)}%`, minHeight: '20px' }}
                                            ></motion.div>
                                            <span className="text-xs font-medium text-gray-600">{value}%</span>
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="flex flex-wrap justify-center gap-4 text-sm">
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
                    )}

                    {/* Detection History */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-gray-200/50 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Riwayat Deteksi</h3>
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                                    {detectionHistory.length} hasil
                                </Badge>
                            </div>

                            {detectionHistory.length > 0 ? (
                                <div className="space-y-4">
                                    <AnimatePresence>
                                        {detectionHistory.map((result, index) => (
                                            <motion.div
                                                key={result.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                transition={{ delay: index * 0.05 }}
                                                whileHover={{ scale: 1.01 }}
                                            >
                                                <Card className="p-4 border-2 border-gray-200 shadow-md">
                                                    <div className="flex flex-col md:flex-row gap-4">
                                                        {/* Image with Detection Canvas */}
                                                        <div className="w-full md:w-64 flex-shrink-0">
                                                            <DetectionCanvas
                                                                imageUrl={result.imageUrl}
                                                                detections={result.allDetections || result.detections}
                                                                imageWidth={result.imageWidth}
                                                                imageHeight={result.imageHeight}
                                                                className="rounded-lg overflow-hidden"
                                                            />
                                                        </div>

                                                        {/* Details */}
                                                        <div className="flex-1">
                                                            <div className="flex items-start justify-between mb-3">
                                                                <div>
                                                                    <Badge className={`${getMaturityColor(result.maturity)} border-2 mb-2 shadow-sm`}>
                                                                        {result.status} - {result.maturity}%
                                                                    </Badge>
                                                                    <p className="text-xs text-gray-500 mb-1">
                                                                        {result.className} ({(result.confidence * 100).toFixed(1)}% confidence)
                                                                    </p>
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
                                <div className="text-center py-12">
                                    <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">Belum ada hasil deteksi</p>
                                    <p className="text-sm text-gray-400 mt-1">Upload gambar atau gunakan kamera untuk memulai deteksi</p>
                                </div>
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
                                    <span>Ambil foto dengan pencahayaan yang cukup dan hindari bayangan</span>
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
                                    <span>Model AI dapat mendeteksi: Unripe, Half-Ripe, Ripe, dan OverRipe</span>
                                </li>
                            </ul>
                        </Card>
                    </motion.div>
                </div>
            </div>

            {/* Camera Capture Modal */}
            <CameraCapture
                isOpen={showCamera}
                onCapture={handleCameraCapture}
                onClose={() => setShowCamera(false)}
            />
        </AuthenticatedLayout>
    );
}
