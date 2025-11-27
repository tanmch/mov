import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { FileText, Download, Filter, Calendar, BarChart3, TrendingUp, CheckCircle, RefreshCw, Sparkles, X, AlertCircle } from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import SkeletonLoader, { SkeletonList } from '@/Components/ui/SkeletonLoader';
import EmptyState from '@/Components/ui/EmptyState';
import LoadingOverlay from '@/Components/ui/LoadingOverlay';
import BackButton from '@/Components/BackButton';

export default function LaporanEkspor({ summary = {}, availableReports = [], blokOptions = [] }) {
    const { auth } = usePage().props;
    const userRole = auth?.user?.role;
    const [selectedLaporanType, setSelectedLaporanType] = useState('deteksi');
    const [selectedFormat, setSelectedFormat] = useState('pdf');
    const [showFilter, setShowFilter] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDownloading, setIsDownloading] = useState(null);
    const [selectedBlokId, setSelectedBlokId] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [notification, setNotification] = useState(null);

    const ringkasanData = {
        totalDeteksi: summary?.totalDeteksi ?? 0,
        totalPenyiraman: summary?.totalPenyiraman ?? 0,
        avgKematangan: summary?.avgKematangan ?? 0,
        prediksiPanen: summary?.prediksiPanen ?? 'Tidak ada',
    };

    const [laporanTersedia, setLaporanTersedia] = useState(availableReports || []);

    const handleGenerateLaporan = async (e) => {
        e.preventDefault();
        setIsGenerating(true);
        
        const formData = new FormData(e.target);
        const startDate = formData.get('startDate');
        const endDate = formData.get('endDate');
        
        if (!startDate || !endDate) {
            setNotification({
                type: 'error',
                message: 'Silakan pilih tanggal mulai dan tanggal akhir',
            });
            setIsGenerating(false);
            setTimeout(() => setNotification(null), 3000);
            return;
        }
        
        try {
            const response = await window.axios.post(route('laporan.generate'), {
                type: selectedLaporanType,
                format: selectedFormat,
                start_date: startDate,
                end_date: endDate,
                blok_id: selectedBlokId || null,
                status: selectedStatus || null,
            }, {
                responseType: 'blob', // Important for file download
                validateStatus: function (status) {
                    // Accept both success (200) and error responses
                    return status >= 200 && status < 500;
                }
            });
            
            // Check if response is an error (JSON error message)
            if (response.headers['content-type'] && response.headers['content-type'].includes('application/json')) {
                // Response is JSON error, not a file
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const errorData = JSON.parse(reader.result);
                        setNotification({
                            type: 'error',
                            message: errorData.message || 'Gagal membuat laporan',
                        });
                        setTimeout(() => setNotification(null), 5000);
                    } catch (e) {
                        setNotification({
                            type: 'error',
                            message: 'Gagal membuat laporan',
                        });
                        setTimeout(() => setNotification(null), 5000);
                    }
                };
                reader.readAsText(response.data);
                return;
            }
            
            // Create blob and download
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // Get filename from Content-Disposition header or use default
            const contentDisposition = response.headers['content-disposition'];
            let filename = `laporan_${selectedLaporanType}_${startDate}_${endDate}`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }
            
            const extension = selectedFormat === 'pdf' ? '.pdf' : selectedFormat === 'csv' ? '.csv' : '.xlsx';
            link.setAttribute('download', filename + extension);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            setNotification({
                type: 'success',
                message: 'Laporan berhasil dibuat dan diunduh!',
            });
            setTimeout(() => setNotification(null), 3000);
        } catch (error) {
            console.error('Error generating report:', error);
            let errorMessage = 'Gagal membuat laporan';
            
            if (error.response) {
                // Server responded with error
                if (error.response.data && typeof error.response.data === 'object') {
                    errorMessage = error.response.data.message || errorMessage;
                } else if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setNotification({
                type: 'error',
                message: errorMessage,
            });
            setTimeout(() => setNotification(null), 5000);
        } finally {
            setIsGenerating(false);
        }
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
                                        <Input id="startDate" name="startDate" type="date" className="h-11 text-sm" required />
                                    </div>
                                    <div>
                                        <Label htmlFor="endDate" className="text-sm font-medium mb-2 block">Sampai Tanggal</Label>
                                        <Input id="endDate" name="endDate" type="date" className="h-11 text-sm" required />
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
                                                <select 
                                                    id="blok" 
                                                    value={selectedBlokId}
                                                    onChange={(e) => setSelectedBlokId(e.target.value)}
                                                    className="w-full p-2.5 sm:p-3 text-xs sm:text-sm border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-green-500/20 focus:border-green-500 bg-gradient-to-br from-white to-green-50/30 text-gray-900 font-medium shadow-sm hover:shadow-md transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23334155%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px] sm:bg-[length:12px] bg-[right_8px_center] sm:bg-[right_12px_center] bg-no-repeat pr-8 sm:pr-10"
                                                >
                                                    <option value="">Semua Blok</option>
                                                    {blokOptions.map((blok) => (
                                                        <option key={blok.value} value={blok.value}>
                                                            {blok.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {selectedLaporanType === 'deteksi' && (
                                                <div>
                                                    <Label htmlFor="status" className="text-sm font-medium mb-2 block">Filter Status</Label>
                                                    <select 
                                                        id="status" 
                                                        value={selectedStatus}
                                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                                        className="w-full p-2.5 sm:p-3 text-xs sm:text-sm border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 sm:focus:ring-4 focus:ring-green-500/20 focus:border-green-500 bg-gradient-to-br from-white to-green-50/30 text-gray-900 font-medium shadow-sm hover:shadow-md transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23334155%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px] sm:bg-[length:12px] bg-[right_8px_center] sm:bg-[right_12px_center] bg-no-repeat pr-8 sm:pr-10"
                                                    >
                                                        <option value="">Semua Status</option>
                                                        <option value="mentah">Mentah</option>
                                                        <option value="hampir_matang">Hampir Matang</option>
                                                        <option value="matang">Matang</option>
                                                        <option value="lewat_matang">Lewat Matang</option>
                                                    </select>
                                                </div>
                                            )}
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
                                        <AlertCircle className="w-5 h-5" />
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
            </div>
        </AuthenticatedLayout>
    );
}
