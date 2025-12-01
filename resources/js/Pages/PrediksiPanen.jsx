import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Calendar, TrendingUp, Package, FileText, Sun, Cloud, AlertCircle, RefreshCw } from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import SkeletonLoader, { SkeletonCard, SkeletonChart } from '@/Components/ui/SkeletonLoader';
import EmptyState from '@/Components/ui/EmptyState';
import BackButton from '@/Components/BackButton';

export default function PrediksiPanen() {
    const { auth } = usePage().props;
    const userRole = auth?.user?.role;
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [predictionData, setPredictionData] = useState({
        estimatedDate: '15-20 November 2025',
        daysLeft: 18,
        totalFruit: 850,
        qualityScore: 92,
        expectedYield: '2.5 ton',
    });

    const [blockPredictions, setBlockPredictions] = useState([
        { block: 'C2', readiness: 95, fruits: 120, harvestDate: '2-3 hari', quality: 'Sangat Baik' },
        { block: 'C3', readiness: 92, fruits: 115, harvestDate: '3-4 hari', quality: 'Sangat Baik' },
        { block: 'A1', readiness: 78, fruits: 130, harvestDate: '7-10 hari', quality: 'Baik' },
        { block: 'B2', readiness: 72, fruits: 125, harvestDate: '10-12 hari', quality: 'Baik' },
        { block: 'A2', readiness: 65, fruits: 135, harvestDate: '15-18 hari', quality: 'Sedang' },
    ]);

    const [weekTrend, setWeekTrend] = useState([65, 70, 74, 78, 82, 86, 90]);

    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1500);
        return () => clearTimeout(timer);
    }, []);

    const handleSendReport = () => {
        // Toast akan ditambahkan nanti
    };

    const handleRefresh = () => {
        setIsLoading(true);
        setError(null);
        setTimeout(() => {
            setIsLoading(false);
        }, 1500);
    };

    const getReadinessColor = (readiness) => {
        if (readiness >= 90) return 'bg-gradient-to-r from-green-500 to-emerald-500';
        if (readiness >= 70) return 'bg-gradient-to-r from-yellow-500 to-amber-500';
        return 'bg-gradient-to-r from-orange-500 to-red-500';
    };

    return (
        <AuthenticatedLayout>
            <Head title="Prediksi Panen" />
            
            <div className="min-h-screen relative overflow-hidden">
                <AnimatedBackground />
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
                                className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"
                            >
                                <TrendingUp className="w-6 h-6 text-white" />
                            </motion.div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                    Prediksi Panen 📊
                                </h1>
                                <p className="text-sm text-gray-600">Estimasi waktu panen optimal berdasarkan AI</p>
                            </div>
                        </div>
                        <Button
                            onClick={handleRefresh}
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </motion.div>

                    {/* Error State */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3"
                            >
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <p className="text-red-800 font-medium">{error}</p>
                                <Button
                                    onClick={() => setError(null)}
                                    variant="ghost"
                                    size="sm"
                                    className="ml-auto"
                                >
                                    Tutup
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Loading State */}
                    {isLoading ? (
                        <div className="space-y-6">
                            <SkeletonCard />
                            <SkeletonCard />
                            <SkeletonChart />
                            <SkeletonLoader type="list" count={5} />
                        </div>
                    ) : blockPredictions.length === 0 ? (
                        <EmptyState
                            icon="📊"
                            title="Belum Ada Data Prediksi"
                            message="Data prediksi panen akan muncul setelah ada data deteksi kematangan dari robot."
                            actionLabel="Refresh Data"
                            onAction={handleRefresh}
                        />
                    ) : (
                        <>
                    {/* Main Prediction Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="p-5 md:p-8 bg-gradient-to-br from-green-50 via-yellow-50 to-orange-50 border-2 border-green-300 shadow-xl">
                            <div className="text-center mb-6">
                                <motion.div
                                    animate={{ rotate: [0, 10, -10, 0] }}
                                    transition={{ duration: 3, repeat: Infinity }}
                                    className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4 shadow-lg"
                                >
                                    <Calendar className="w-10 h-10 text-white" />
                                </motion.div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Perkiraan Panen Optimal</h3>
                                <p className="text-3xl font-bold text-green-600 mb-2">{predictionData.estimatedDate}</p>
                                <Badge className="bg-green-100 text-green-700 border-green-200 text-sm px-4 py-1">
                                    {predictionData.daysLeft} hari lagi
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="bg-white/80 backdrop-blur-sm p-4 rounded-xl text-center border border-white/50 shadow-md"
                                >
                                    <Package className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                                    <p className="text-xs text-gray-600 mb-1 font-medium">Total Buah</p>
                                    <p className="text-2xl font-bold text-gray-900">{predictionData.totalFruit}</p>
                                </motion.div>
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="bg-white/80 backdrop-blur-sm p-4 rounded-xl text-center border border-white/50 shadow-md"
                                >
                                    <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
                                    <p className="text-xs text-gray-600 mb-1 font-medium">Kualitas</p>
                                    <p className="text-2xl font-bold text-gray-900">{predictionData.qualityScore}%</p>
                                </motion.div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Expected Yield */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="p-4 md:p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-2 border-blue-200/50 shadow-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-2 font-medium">Perkiraan Hasil Panen</p>
                                    <p className="text-3xl font-bold text-blue-700">{predictionData.expectedYield}</p>
                                </div>
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="text-6xl"
                                >
                                    🥭
                                </motion.div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Weekly Trend Chart */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-green-200/50 shadow-xl">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Tren Kematangan 7 Hari</h3>
                            <div className="h-48 bg-gradient-to-t from-green-100 via-emerald-50 to-transparent rounded-xl flex items-end justify-around p-4 mb-4">
                                {weekTrend.map((value, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ height: 0 }}
                                        animate={{ height: 'auto' }}
                                        transition={{ delay: i * 0.1, duration: 0.5 }}
                                        className="flex flex-col items-center gap-2 flex-1"
                                    >
                                        <div className="text-xs font-bold text-green-700 mb-1">{value}%</div>
                                        <motion.div
                                            initial={{ scaleY: 0 }}
                                            animate={{ scaleY: 1 }}
                                            transition={{ delay: i * 0.1 + 0.2, duration: 0.5 }}
                                            className="w-full bg-gradient-to-t from-green-600 to-emerald-400 rounded-t-lg shadow-md"
                                            style={{ height: `${(value / 100) * 100}%`, minHeight: '20px' }}
                                        ></motion.div>
                                        <span className="text-xs text-gray-600 font-medium">H{i + 1}</span>
                                    </motion.div>
                                ))}
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-gray-600">Rata-rata peningkatan: <strong className="text-green-600">+4% per hari</strong></p>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Block Predictions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-gray-200/50 shadow-xl">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Prediksi Per Blok</h3>
                            <div className="space-y-3">
                                {blockPredictions.map((block, index) => (
                                    <motion.div
                                        key={block.block}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        whileHover={{ scale: 1.02, x: 5 }}
                                    >
                                        <Card className="p-4 border-2 border-gray-200 shadow-md">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-4 h-4 rounded-full ${getReadinessColor(block.readiness)} shadow-sm`}></div>
                                                    <span className="text-lg font-bold text-gray-900">Blok {block.block}</span>
                                                </div>
                                                <Badge className="bg-green-100 text-green-700 border-green-200">
                                                    {block.readiness}% siap
                                                </Badge>
                                            </div>

                                            <div className="mb-3">
                                                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${block.readiness}%` }}
                                                        transition={{ duration: 1, ease: "easeOut" }}
                                                        className={`h-full ${getReadinessColor(block.readiness)} rounded-full`}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-3 text-sm">
                                                <div>
                                                    <p className="text-gray-600 mb-1 font-medium">Buah</p>
                                                    <p className="text-lg font-bold text-gray-900">{block.fruits}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600 mb-1 font-medium">Panen</p>
                                                    <p className="text-lg font-bold text-gray-900">{block.harvestDate}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600 mb-1 font-medium">Kualitas</p>
                                                    <p className="text-lg font-bold text-gray-900">{block.quality}</p>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="space-y-3"
                    >
                        <Button
                            onClick={handleSendReport}
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 flex items-center justify-center gap-2 shadow-lg h-12"
                        >
                            <FileText className="w-5 h-5" />
                            Kirim Laporan ke Sistem
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full border-2 border-green-500 text-green-600 hover:bg-green-50 font-medium h-12"
                        >
                            📥 Unduh Prediksi (PDF)
                        </Button>
                    </motion.div>

                    {/* Weather Impact */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <Card className="p-4 md:p-6 bg-yellow-50 border-2 border-yellow-200 shadow-xl">
                            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Sun className="w-5 h-5 text-yellow-600" />
                                Faktor Cuaca
                            </h4>
                            <div className="space-y-3 text-sm mb-4">
                                <div className="flex justify-between items-center bg-white/60 p-3 rounded-lg">
                                    <span className="text-gray-700 font-medium">Suhu rata-rata</span>
                                    <span className="text-gray-900 font-bold">27-29°C</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/60 p-3 rounded-lg">
                                    <span className="text-gray-700 font-medium">Kelembapan</span>
                                    <span className="text-gray-900 font-bold">65-70%</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/60 p-3 rounded-lg">
                                    <span className="text-gray-700 font-medium">Curah hujan</span>
                                    <span className="text-gray-900 font-bold">Sedang</span>
                                </div>
                            </div>
                            <div className="p-3 bg-green-100 rounded-xl border border-green-300">
                                <p className="text-sm text-green-800 font-medium">
                                    ✓ Kondisi cuaca mendukung pematangan optimal
                                </p>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Recommendations */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                    >
                        <Card className="p-4 md:p-6 bg-blue-50 border-2 border-blue-200 shadow-xl">
                            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span>💡</span> Rekomendasi Panen
                            </h4>
                            <ul className="text-sm text-gray-700 space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    <span>Prioritas panen: Blok C2 dan C3 (siap dalam 2-4 hari)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    <span>Siapkan tenaga kerja minimal 5-7 orang</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    <span>Pastikan alat pengangkut dan kemasan tersedia</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    <span>Lakukan panen di pagi hari (06:00 - 10:00)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    <span>Sortir buah berdasarkan kualitas setelah panen</span>
                                </li>
                            </ul>
                        </Card>
                    </motion.div>
                        </>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
