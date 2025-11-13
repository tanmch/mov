import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Camera, Upload, Trash2, CheckCircle, Clock, Sparkles } from 'lucide-react';

export default function DeteksiKematangan() {
    const { auth } = usePage().props;
    const userRole = auth?.user?.role;
    const [isDetecting, setIsDetecting] = useState(false);
    const [detectionHistory, setDetectionHistory] = useState([
        {
            id: 1,
            image: '🥭',
            maturity: 85,
            status: 'Matang',
            recommendation: 'Siap dipanen dalam 1-2 hari',
            timestamp: '2 jam lalu',
        },
        {
            id: 2,
            image: '🥭',
            maturity: 60,
            status: 'Setengah Matang',
            recommendation: 'Tunggu 5-7 hari lagi',
            timestamp: '1 hari lalu',
        },
        {
            id: 3,
            image: '🥭',
            maturity: 35,
            status: 'Muda',
            recommendation: 'Masih memerlukan 2-3 minggu',
            timestamp: '3 hari lalu',
        },
    ]);

    const handleUploadImage = () => {
        setIsDetecting(true);
        setTimeout(() => {
            const newDetection = {
                id: Date.now(),
                image: '🥭',
                maturity: Math.floor(Math.random() * 40) + 60,
                status: 'Matang',
                recommendation: 'Siap dipanen dalam 2-3 hari',
                timestamp: 'Baru saja',
            };
            setDetectionHistory([newDetection, ...detectionHistory]);
            setIsDetecting(false);
        }, 2000);
    };

    const handleDeleteDetection = (id) => {
        setDetectionHistory(detectionHistory.filter((d) => d.id !== id));
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
            
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-blue-50/30">
                <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 mb-6"
                    >
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Camera className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                                Deteksi Kematangan 🥭
                            </h1>
                            <p className="text-sm text-gray-600">Upload gambar buah untuk analisis AI</p>
                        </div>
                    </motion.div>

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
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Gambar Mangga</h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    Ambil foto buah mangga untuk analisis kematangan menggunakan AI
                                </p>
                                <div className="flex gap-3 justify-center">
                                    <Button
                                        onClick={handleUploadImage}
                                        disabled={isDetecting}
                                        className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 flex items-center gap-2 shadow-lg"
                                    >
                                        <Upload className="w-4 h-4" />
                                        {isDetecting ? 'Mendeteksi...' : 'Upload Gambar'}
                                    </Button>
                                    <Button 
                                        variant="outline" 
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
                                                transition={{ delay: index * 0.1 }}
                                                whileHover={{ scale: 1.02, x: 5 }}
                                            >
                                                <Card className="p-4 border-2 border-gray-200 shadow-md">
                                                    <div className="flex gap-4">
                                                        {/* Image Preview */}
                                                        <motion.div
                                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                                            className="w-20 h-20 bg-gradient-to-br from-yellow-200 via-orange-200 to-amber-200 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                                                        >
                                                            <span className="text-5xl">{result.image}</span>
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
                                <div className="text-center py-12">
                                    <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500">Belum ada hasil deteksi</p>
                                    <p className="text-sm text-gray-400 mt-1">Upload gambar untuk memulai deteksi</p>
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
            </div>
        </AuthenticatedLayout>
    );
}

