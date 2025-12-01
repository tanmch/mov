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

export default function LaporanEkspor({ summary = {}, availableReports = [], blokOptions = [], blokStats = [] }) {
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
        
        // Validasi tanggal
        if (!startDate || !endDate) {
            setNotification({
                type: 'error',
                message: 'Silakan pilih tanggal mulai dan tanggal akhir',
            });
            setIsGenerating(false);
            setTimeout(() => setNotification(null), 5000);
            return;
        }
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        
        // Validasi: end date harus >= start date
        if (end < start) {
            setNotification({
                type: 'error',
                message: 'Tanggal akhir harus lebih besar atau sama dengan tanggal mulai',
            });
            setIsGenerating(false);
            setTimeout(() => setNotification(null), 5000);
            return;
        }
        
        // Validasi: tanggal tidak boleh di masa depan
        if (start > today || end > today) {
            setNotification({
                type: 'error',
                message: 'Tanggal tidak boleh di masa depan',
            });
            setIsGenerating(false);
            setTimeout(() => setNotification(null), 5000);
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

    const handleGenerateLatestData = async () => {
        setIsGenerating(true);
        
        try {
            const response = await window.axios.get('/laporan/generate-latest', {
                params: {
                    format: selectedFormat,
                },
                responseType: 'blob',
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
                            message: errorData.message || 'Gagal membuat laporan data terbaru',
                        });
                        setTimeout(() => setNotification(null), 5000);
                    } catch (e) {
                        setNotification({
                            type: 'error',
                            message: 'Gagal membuat laporan data terbaru',
                        });
                        setTimeout(() => setNotification(null), 5000);
                    }
                };
                reader.readAsText(response.data);
                setIsGenerating(false);
                return;
            }
            
            // Create blob and download
            const blob = new Blob([response.data], {
                type: response.headers['content-type'] || 'application/octet-stream'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // Get filename from Content-Disposition header or use default
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'laporan_data_terbaru_' + new Date().toISOString().split('T')[0];
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
                message: 'Laporan data terbaru berhasil dibuat dan diunduh!',
            });
            setTimeout(() => setNotification(null), 3000);
        } catch (error) {
            console.error('Error generating latest data report:', error);
            let errorMessage = 'Gagal membuat laporan data terbaru';
            
            if (error.response) {
                if (error.response.status === 404) {
                    // Handle 404 specifically
                    if (error.response.data) {
                        if (error.response.data instanceof Blob) {
                            const text = await error.response.data.text();
                            try {
                                const json = JSON.parse(text);
                                errorMessage = json.message || 'Tidak ada data terbaru yang tersedia';
                            } catch {
                                errorMessage = 'Tidak ada data terbaru yang tersedia. Pastikan ada data sensor atau kontrol robot yang sudah disinkronkan dari Firebase ke MySQL.';
                            }
                        } else if (typeof error.response.data === 'object') {
                            errorMessage = error.response.data.message || errorMessage;
                        } else if (typeof error.response.data === 'string') {
                            errorMessage = error.response.data;
                        }
                    } else {
                        errorMessage = 'Tidak ada data terbaru yang tersedia. Pastikan ada data sensor atau kontrol robot yang sudah disinkronkan dari Firebase ke MySQL.';
                    }
                } else if (error.response.data) {
                    // Try to parse JSON error response
                    if (error.response.data instanceof Blob) {
                        const text = await error.response.data.text();
                        try {
                            const json = JSON.parse(text);
                            errorMessage = json.message || errorMessage;
                        } catch {
                            errorMessage = text || errorMessage;
                        }
                    } else if (typeof error.response.data === 'object') {
                        errorMessage = error.response.data.message || errorMessage;
                    } else if (typeof error.response.data === 'string') {
                        errorMessage = error.response.data;
                    }
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
                                                {type === 'penyiraman' && '💧 Penyiraman & Pemupukan'}
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
                                            📊 CSV/Excel
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

                                <div className="border-t border-gray-200 pt-4 mt-4">
                                    <Button
                                        type="button"
                                        onClick={handleGenerateLatestData}
                                        disabled={isGenerating}
                                        className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold shadow-lg"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Generate Data Terbaru (Hari Ini)
                                            </>
                                        )}
                                    </Button>
                                    <p className="text-xs text-gray-500 mt-2 text-center">
                                        Mengambil semua data sensor dan kontrol robot terbaru hari ini
                                    </p>
                                </div>

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
                            {blokStats.length === 0 ? (
                                <EmptyState
                                    icon={BarChart3}
                                    title="Tidak Ada Data Blok"
                                    message="Belum ada data untuk ditampilkan."
                                />
                            ) : (
                                <div className="space-y-3">
                                    {blokStats
                                        .filter((blok, index, self) => 
                                            // Remove duplicates by code (if same code, take first one)
                                            index === self.findIndex(b => (b.code || b.id) === (blok.code || blok.id))
                                        )
                                        .map((blok, index) => {
                                        const colors = [
                                            { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
                                            { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
                                            { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-600' },
                                            { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-600' },
                                            { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-600' },
                                        ];
                                        const color = colors[index % colors.length];
                                        
                                        return (
                                            <motion.div
                                                key={blok.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                whileHover={{ scale: 1.02 }}
                                                className={`p-4 rounded-xl border-2 shadow-md ${color.bg} ${color.border}`}
                                            >
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex-1">
                                                        <span className="text-lg font-bold text-gray-800">Blok {blok.code} - {blok.name}</span>
                                                        {blok.kebun_name && (
                                                            <p className="text-xs text-gray-500 mt-0.5">Kebun: {blok.kebun_name}</p>
                                                        )}
                                                    </div>
                                                    <CheckCircle className={`w-5 h-5 ${color.text}`} />
                                                </div>
                                                <div className="grid grid-cols-3 gap-3 text-sm">
                                                    <div>
                                                        <p className="text-gray-600 mb-1 font-medium">Deteksi</p>
                                                        <p className="text-lg font-bold text-purple-700">{blok.deteksi}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600 mb-1 font-medium">Matang</p>
                                                        <p className="text-lg font-bold text-green-700">{blok.matang}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-gray-600 mb-1 font-medium">Penyiraman</p>
                                                        <p className="text-lg font-bold text-blue-700">{blok.penyiraman}</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
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
                                    <span>Laporan CSV/Excel untuk analisis data lebih lanjut (format CSV yang dapat dibuka di Excel)</span>
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
                    <AnimatePresence>
                        {notification && (
                            <motion.div
                                key="notification-toast"
                                initial={{ opacity: 0, x: 400, scale: 0.8, y: -20 }}
                                animate={{ 
                                    opacity: 1, 
                                    x: 0, 
                                    scale: 1, 
                                    y: 0,
                                    transition: { type: "spring", damping: 20, stiffness: 300 }
                                }}
                                exit={{ 
                                    opacity: 0, 
                                    x: 400, 
                                    scale: 0.8,
                                    transition: { duration: 0.2 }
                                }}
                                className="fixed top-4 right-4 z-[100] max-w-md"
                            >
                                <motion.div
                                    className={`relative overflow-hidden rounded-2xl shadow-2xl border-2 backdrop-blur-md ${
                                        notification.type === 'error'
                                            ? 'bg-gradient-to-br from-red-50/95 to-rose-50/95 border-red-200/50'
                                            : 'bg-gradient-to-br from-green-50/95 to-emerald-50/95 border-green-200/50'
                                    }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {/* Animated Background Glow */}
                                    <div className={`absolute inset-0 blur-xl ${
                                        notification.type === 'error'
                                            ? 'bg-gradient-to-br from-red-400/20 to-rose-400/20'
                                            : 'bg-gradient-to-br from-green-400/20 to-emerald-400/20'
                                    }`}></div>
                                    
                                    {/* Animated Glow Effect */}
                                    <motion.div
                                        className={`absolute -inset-1 rounded-2xl ${
                                            notification.type === 'error' ? 'bg-red-400' : 'bg-green-400'
                                        }`}
                                        animate={{
                                            opacity: [0.3, 0.6, 0.3],
                                            scale: [1, 1.05, 1],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                        style={{ filter: 'blur(8px)' }}
                                    />
                                    
                                    <div className="relative p-5 flex items-start gap-4">
                                        {/* Icon */}
                                        <motion.div
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ 
                                                delay: 0.2, 
                                                type: "spring", 
                                                stiffness: 200, 
                                                damping: 15 
                                            }}
                                            className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                                                notification.type === 'error'
                                                    ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white'
                                                    : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                                            }`}
                                        >
                                            {notification.type === 'error' ? (
                                                <AlertCircle className="w-6 h-6" />
                                            ) : (
                                                <CheckCircle className="w-6 h-6" />
                                            )}
                                        </motion.div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <motion.h3
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.3 }}
                                                className={`text-lg font-bold mb-1 ${
                                                    notification.type === 'error' ? 'text-red-800' : 'text-green-800'
                                                }`}
                                            >
                                                {notification.type === 'error' 
                                                    ? 'Gagal!' 
                                                    : 'Berhasil!'
                                                }
                                            </motion.h3>
                                            <motion.p
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.4 }}
                                                className={`text-sm ${
                                                    notification.type === 'error' ? 'text-red-700' : 'text-green-700'
                                                }`}
                                            >
                                                {notification.message}
                                            </motion.p>
                                        </div>

                                        {/* Close Button */}
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.5 }}
                                            onClick={() => setNotification(null)}
                                            className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                                notification.type === 'error'
                                                    ? 'hover:bg-red-100 text-red-600'
                                                    : 'hover:bg-green-100 text-green-600'
                                            }`}
                                        >
                                            <X className="w-4 h-4" />
                                        </motion.button>

                                        {/* Sparkle Effect */}
                                        {notification.type !== 'error' && (
                                            <div className="absolute top-2 right-2 pointer-events-none">
                                                <motion.div
                                                    animate={{
                                                        rotate: [0, 360],
                                                        scale: [1, 1.2, 1],
                                                    }}
                                                    transition={{
                                                        duration: 3,
                                                        repeat: Infinity,
                                                        ease: "linear"
                                                    }}
                                                >
                                                    <Sparkles className={`w-4 h-4 ${
                                                        notification.type === 'error' ? 'text-red-400' : 'text-green-400'
                                                    } opacity-50`} />
                                                </motion.div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
