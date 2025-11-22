import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { FileText, Download, Filter, Calendar, BarChart3, TrendingUp, CheckCircle, RefreshCw, Sparkles, X } from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import SkeletonLoader, { SkeletonList } from '@/Components/ui/SkeletonLoader';
import EmptyState from '@/Components/ui/EmptyState';
import LoadingOverlay from '@/Components/ui/LoadingOverlay';
import BackButton from '@/Components/BackButton';

export default function LaporanEkspor() {
    const { auth } = usePage().props;
    const userRole = auth?.user?.role;
    const [selectedLaporanType, setSelectedLaporanType] = useState('deteksi');
    const [selectedFormat, setSelectedFormat] = useState('pdf');
    const [showFilter, setShowFilter] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDownloading, setIsDownloading] = useState(null);

    const ringkasanData = {
        totalDeteksi: 1250,
        totalPenyiraman: 48,
        avgKematangan: 67,
        prediksiPanen: '15 Nov 2024',
    };

    const [laporanTersedia, setLaporanTersedia] = useState([
        {
            id: 1,
            judul: 'Laporan Deteksi Kematangan - Oktober 2024',
            tanggal: '01-31 Okt 2024',
            tipe: 'Deteksi',
            ukuran: '2.4 MB',
            format: 'PDF',
        },
        {
            id: 2,
            judul: 'Laporan Sensor IoT - Oktober 2024',
            tanggal: '01-31 Okt 2024',
            tipe: 'Sensor',
            ukuran: '1.8 MB',
            format: 'Excel',
        },
        {
            id: 3,
            judul: 'Laporan Penyiraman Otomatis - Oktober 2024',
            tanggal: '01-31 Okt 2024',
            tipe: 'Penyiraman',
            ukuran: '950 KB',
            format: 'PDF',
        },
    ]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1200);
        return () => clearTimeout(timer);
    }, []);

    const handleGenerateLaporan = (e) => {
        e.preventDefault();
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            // Toast akan ditambahkan nanti
        }, 2000);
    };

    const handleDownload = (laporan) => {
        setIsDownloading(laporan.id);
        setTimeout(() => {
            setIsDownloading(null);
            // Download logic akan ditambahkan nanti
        }, 1500);
    };

    const getTipeColor = (tipe) => {
        switch (tipe) {
            case 'Deteksi':
                return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'Sensor':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Penyiraman':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'Panen':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Laporan & Ekspor" />
            
            <div className="min-h-screen relative overflow-hidden">
                <AnimatedBackground />
                <div className="relative p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
                    <LoadingOverlay show={isGenerating} message="Membuat laporan..." />
                    
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
                                <FileText className="w-6 h-6 text-white" />
                            </motion.div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                    Laporan & Ekspor
                                </h1>
                                <p className="text-sm text-gray-600">Generate & Download</p>
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

                    {/* Loading State */}
                    {isLoading ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <SkeletonCard />
                                <SkeletonCard />
                            </div>
                            <SkeletonCard />
                            <SkeletonLoader type="list" count={3} />
                        </div>
                    ) : (
                        <>
                    {/* Ringkasan Quick Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="grid grid-cols-2 gap-4"
                    >
                        <motion.div whileHover={{ scale: 1.05 }}>
                            <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200/50 shadow-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <BarChart3 className="w-5 h-5 text-purple-600" />
                                    <span className="text-sm text-gray-700 font-medium">Total Deteksi</span>
                                </div>
                                <p className="text-2xl font-bold text-purple-700">{ringkasanData.totalDeteksi}</p>
                                <span className="text-xs text-gray-600">bulan ini</span>
                            </Card>
                        </motion.div>

                        <motion.div whileHover={{ scale: 1.05 }}>
                            <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200/50 shadow-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                    <span className="text-sm text-gray-700 font-medium">Avg Kematangan</span>
                                </div>
                                <p className="text-2xl font-bold text-green-700">{ringkasanData.avgKematangan}%</p>
                                <span className="text-xs text-gray-600">rata-rata</span>
                            </Card>
                        </motion.div>
                    </motion.div>

                    {/* Form Generate Laporan */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="p-4 md:p-6 border-2 border-green-200 bg-white/80 backdrop-blur-sm shadow-xl">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-green-600" />
                                Generate Laporan Baru
                            </h3>
                            
                            <form onSubmit={handleGenerateLaporan} className="space-y-4">
                                <div>
                                    <Label className="text-sm font-medium mb-2 block">Tipe Laporan</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['deteksi', 'sensor', 'penyiraman', 'panen'].map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setSelectedLaporanType(type)}
                                                className={`p-3 text-sm rounded-xl border-2 transition-all font-medium ${
                                                    selectedLaporanType === type 
                                                        ? type === 'deteksi' ? 'border-purple-500 bg-purple-50 text-purple-700' :
                                                          type === 'sensor' ? 'border-blue-500 bg-blue-50 text-blue-700' :
                                                          type === 'penyiraman' ? 'border-green-500 bg-green-50 text-green-700' :
                                                          'border-yellow-500 bg-yellow-50 text-yellow-700'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                {type === 'deteksi' && '🔍 Deteksi'}
                                                {type === 'sensor' && '📊 Sensor'}
                                                {type === 'penyiraman' && '💧 Penyiraman'}
                                                {type === 'panen' && '🌾 Prediksi Panen'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-sm font-medium mb-2 block">Format Ekspor</Label>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedFormat('pdf')}
                                            className={`flex-1 p-3 text-sm rounded-xl border-2 transition-all font-medium ${
                                                selectedFormat === 'pdf' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            📄 PDF
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedFormat('excel')}
                                            className={`flex-1 p-3 text-sm rounded-xl border-2 transition-all font-medium ${
                                                selectedFormat === 'excel' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            📊 Excel
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label htmlFor="startDate" className="text-sm font-medium mb-2 block">Dari Tanggal</Label>
                                        <Input id="startDate" type="date" className="h-11 text-sm" required />
                                    </div>
                                    <div>
                                        <Label htmlFor="endDate" className="text-sm font-medium mb-2 block">Sampai Tanggal</Label>
                                        <Input id="endDate" type="date" className="h-11 text-sm" required />
                                    </div>
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowFilter(!showFilter)}
                                    className="w-full h-11"
                                >
                                    <Filter className="w-4 h-4 mr-2" />
                                    {showFilter ? 'Sembunyikan' : 'Tampilkan'} Filter Lanjutan
                                </Button>

                                <AnimatePresence>
                                    {showFilter && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200"
                                        >
                                            <div>
                                                <Label htmlFor="blok" className="text-sm font-medium mb-2 block">Filter Blok</Label>
                                                <select id="blok" className="w-full p-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                                    <option value="all">Semua Blok</option>
                                                    <option value="blok-a">Blok A</option>
                                                    <option value="blok-b">Blok B</option>
                                                    <option value="blok-c">Blok C</option>
                                                </select>
                                            </div>
                                            <div>
                                                <Label htmlFor="status" className="text-sm font-medium mb-2 block">Filter Status</Label>
                                                <select id="status" className="w-full p-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500">
                                                    <option value="all">Semua Status</option>
                                                    <option value="mentah">Mentah</option>
                                                    <option value="hampir-matang">Hampir Matang</option>
                                                    <option value="matang">Matang</option>
                                                    <option value="lewat-matang">Lewat Matang</option>
                                                </select>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <Button 
                                    type="submit" 
                                    disabled={isGenerating}
                                    className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
                                >
                                    {isGenerating ? (
                                        <>
                                            <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                                            Membuat Laporan...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-5 h-5 mr-2" />
                                            Generate & Download
                                        </>
                                    )}
                                </Button>
                            </form>
                        </Card>
                    </motion.div>

                    {/* Laporan Tersedia */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-blue-200/50 shadow-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <motion.div
                                    animate={{ rotate: [0, 360] }}
                                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                    className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg"
                                >
                                    <Calendar className="w-5 h-5 text-white" />
                                </motion.div>
                                <h3 className="text-lg font-bold text-gray-800">Laporan Tersimpan</h3>
                            </div>
                            {laporanTersedia.length === 0 ? (
                                <EmptyState
                                    icon={FileText}
                                    title="Belum Ada Laporan"
                                    message="Generate laporan baru untuk melihatnya di sini."
                                />
                            ) : (
                                <div className="space-y-3">
                                    {laporanTersedia.map((laporan, index) => (
                                        <motion.div
                                            key={laporan.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            whileHover={{ scale: 1.02, x: 5 }}
                                            className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border-2 border-gray-200 shadow-md hover:shadow-lg transition-all"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-gray-800 mb-2">{laporan.judul}</p>
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={`${getTipeColor(laporan.tipe)} border-2`}>
                                                            {laporan.tipe}
                                                        </Badge>
                                                        <span className="text-xs text-gray-600">{laporan.format}</span>
                                                    </div>
                                                </div>
                                                <motion.div
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                >
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleDownload(laporan)}
                                                        disabled={isDownloading === laporan.id}
                                                        className="h-9 px-3"
                                                    >
                                                        {isDownloading === laporan.id ? (
                                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Download className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                </motion.div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                                                <span>📅 {laporan.tanggal}</span>
                                                <span>📦 {laporan.ukuran}</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </motion.div>

                    {/* Statistik Ekspor */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-gray-200/50 shadow-xl">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">📈 Ringkasan Data Per Blok</h3>
                            <div className="space-y-3">
                                {['A', 'B', 'C'].map((blok, index) => (
                                    <motion.div
                                        key={blok}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        whileHover={{ scale: 1.02 }}
                                        className={`p-4 rounded-xl border-2 shadow-md ${
                                            blok === 'A' ? 'bg-purple-50 border-purple-200' :
                                            blok === 'B' ? 'bg-blue-50 border-blue-200' :
                                            'bg-green-50 border-green-200'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-lg font-bold text-gray-800">Blok {blok}</span>
                                            <CheckCircle className={`w-5 h-5 ${
                                                blok === 'A' ? 'text-purple-600' :
                                                blok === 'B' ? 'text-blue-600' :
                                                'text-green-600'
                                            }`} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-3 text-sm">
                                            <div>
                                                <p className="text-gray-600 mb-1 font-medium">Deteksi</p>
                                                <p className="text-lg font-bold text-purple-700">{blok === 'A' ? 450 : blok === 'B' ? 380 : 420}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600 mb-1 font-medium">Matang</p>
                                                <p className="text-lg font-bold text-green-700">{blok === 'A' ? '65%' : blok === 'B' ? '58%' : '72%'}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-600 mb-1 font-medium">Penyiraman</p>
                                                <p className="text-lg font-bold text-blue-700">18x</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
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
                            <h3 className="text-sm font-bold text-blue-700 mb-3">ℹ️ Informasi Laporan</h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    <span>Laporan PDF cocok untuk presentasi dan arsip</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    <span>Laporan Excel untuk analisis data lebih lanjut</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    <span>Data audit log hanya tersedia untuk K-Petani</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    <span>Laporan otomatis tersimpan selama 90 hari</span>
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
