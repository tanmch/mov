import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Bot, Play, Pause, Battery, MapPin, Calendar, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';

export default function RobotControl() {
    const { auth } = usePage().props;
    const userRole = auth?.user?.role;
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [selectedMisiType, setSelectedMisiType] = useState('deteksi');

    // Mock data - akan diganti dengan data real nanti
    const robotStatus = {
        id: 'ROBOT-001',
        nama: 'MOV Bot Alpha',
        status: 'aktif',
        battery: 85,
        lokasi: 'Blok A - Baris 3',
        misiCurrent: 'Deteksi Kematangan',
        progress: 65,
    };

    const jadwalMisi = [
        {
            id: 1,
            tanggal: '2024-11-07',
            waktu: '08:00',
            tipe: 'Deteksi',
            blok: 'Blok A',
            status: 'Berjalan',
            progress: 65,
        },
        {
            id: 2,
            tanggal: '2024-11-07',
            waktu: '14:00',
            tipe: 'Penyiraman',
            blok: 'Blok B',
            status: 'Terjadwal',
            progress: 0,
        },
        {
            id: 3,
            tanggal: '2024-11-08',
            waktu: '06:00',
            tipe: 'Kombinasi (Deteksi + Penyiraman)',
            blok: 'Blok C',
            status: 'Terjadwal',
            progress: 0,
        },
    ];

    const riwayatMisi = [
        {
            id: 1,
            tanggal: '2024-11-06',
            waktu: '08:00 - 10:30',
            tipe: 'Deteksi',
            blok: 'Blok A',
            status: 'Selesai',
            hasil: '85 mangga terdeteksi',
        },
        {
            id: 2,
            tanggal: '2024-11-06',
            waktu: '14:00 - 15:15',
            tipe: 'Penyiraman',
            blok: 'Blok B',
            status: 'Selesai',
            hasil: '250L air disalurkan',
        },
    ];

    const handleScheduleMisi = (e) => {
        e.preventDefault();
        // Toast akan ditambahkan nanti
        setShowScheduleForm(false);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'aktif':
            case 'Berjalan':
            case 'Selesai':
                return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-400 shadow-lg shadow-green-500/30';
            case 'Terjadwal':
                return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-400 shadow-lg shadow-blue-500/30';
            case 'charging':
                return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white border-yellow-300 shadow-lg shadow-yellow-400/30';
            case 'offline':
            case 'Gagal':
                return 'bg-gradient-to-r from-red-400 to-red-500 text-white border-red-300 shadow-lg shadow-red-400/30';
            default:
                return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-300';
        }
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

    return (
        <AuthenticatedLayout>
            <Head title="Kontrol Robot" />
            
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-blue-50/30">
                <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between mb-6"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Bot className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                    Kontrol Robot
                                </h1>
                                <p className="text-sm text-gray-600">Penjadwalan & Monitoring</p>
                            </div>
                        </div>
                        <Bot className="w-8 h-8 text-green-500 hidden md:block" />
                    </motion.div>

                    {/* Status Robot Real-time */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="p-4 md:p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 border-2 border-green-200/50 shadow-xl overflow-hidden relative">
                            <div className="absolute inset-0 opacity-5">
                                <div className="absolute inset-0" style={{
                                    backgroundImage: `radial-gradient(circle at 2px 2px, green 1px, transparent 0)`,
                                    backgroundSize: '40px 40px'
                                }}></div>
                            </div>
                            
                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <motion.div
                                            animate={{ 
                                                scale: robotStatus.status === 'aktif' ? [1, 1.1, 1] : 1,
                                                rotate: robotStatus.status === 'aktif' ? [0, 5, -5, 0] : 0
                                            }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"
                                        >
                                            <Bot className="w-6 h-6 text-white" />
                                        </motion.div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800">{robotStatus.nama}</h3>
                                            <p className="text-xs text-gray-600">{robotStatus.id}</p>
                                        </div>
                                    </div>
                                    <motion.span
                                        whileHover={{ scale: 1.05 }}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-full border-2 shadow-lg ${getStatusColor(robotStatus.status)}`}
                                    >
                                        {robotStatus.status.toUpperCase()}
                                    </motion.span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-white/50 shadow-md"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Battery className={`w-5 h-5 ${getBatteryColor(robotStatus.battery)}`} />
                                            <span className="text-xs font-medium text-gray-600">Baterai</span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <p className={`text-2xl font-bold ${getBatteryColor(robotStatus.battery)}`}>
                                                {robotStatus.battery}
                                            </p>
                                            <span className="text-xs text-gray-500">%</span>
                                        </div>
                                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${robotStatus.battery}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className={`h-full bg-gradient-to-r ${getBatteryGradient(robotStatus.battery)} rounded-full`}
                                            />
                                        </div>
                                    </motion.div>
                                    <motion.div
                                        whileHover={{ scale: 1.02 }}
                                        className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-white/50 shadow-md"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin className="w-5 h-5 text-blue-500" />
                                            <span className="text-xs font-medium text-gray-600">Lokasi</span>
                                        </div>
                                        <p className="text-sm font-semibold text-gray-800 leading-tight">{robotStatus.lokasi}</p>
                                    </motion.div>
                                </div>

                                {robotStatus.status === 'aktif' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-white/50 shadow-md"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-medium text-gray-700">Misi Saat Ini</span>
                                            <span className="text-xs font-bold text-green-600">{robotStatus.progress}%</span>
                                        </div>
                                        <p className="text-xs text-gray-800 mb-2">{robotStatus.misiCurrent}</p>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${robotStatus.progress}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-sm"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Quick Actions - Only for K-Petani */}
                    {userRole === 'k-petani' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="grid grid-cols-2 gap-3"
                        >
                            <Button
                                onClick={() => {}}
                                variant="outline"
                                className="h-12 border-2 border-red-300 text-red-600 hover:bg-red-50 font-medium"
                                disabled={robotStatus.status !== 'aktif'}
                            >
                                <Pause className="w-4 h-4 mr-2" />
                                Jeda Misi
                            </Button>
                            <Button
                                onClick={() => setShowScheduleForm(true)}
                                className="h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg"
                            >
                                <Calendar className="w-4 h-4 mr-2" />
                                Jadwalkan Misi
                            </Button>
                        </motion.div>
                    )}

                    {/* Form Penjadwalan Misi */}
                    <AnimatePresence>
                        {showScheduleForm && userRole === 'k-petani' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <Card className="p-4 md:p-6 border-2 border-green-200 bg-white/80 backdrop-blur-sm shadow-xl">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <span>📅</span> Jadwalkan Misi Baru
                                    </h3>
                                    <form onSubmit={handleScheduleMisi} className="space-y-4">
                                        <div>
                                            <Label className="text-sm font-medium mb-2 block">Tipe Misi</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedMisiType('deteksi')}
                                                    className={`p-3 text-sm rounded-xl border-2 transition-all font-medium ${
                                                        selectedMisiType === 'deteksi' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                                >
                                                    🔍 Deteksi
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedMisiType('penyiraman')}
                                                    className={`p-3 text-sm rounded-xl border-2 transition-all font-medium ${
                                                        selectedMisiType === 'penyiraman' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                                >
                                                    💧 Penyiraman
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedMisiType('pemupukan')}
                                                    className={`p-3 text-sm rounded-xl border-2 transition-all font-medium ${
                                                        selectedMisiType === 'pemupukan' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                                >
                                                    🌱 Pemupukan
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedMisiType('kombinasi')}
                                                    className={`p-3 text-sm rounded-xl border-2 transition-all font-medium ${
                                                        selectedMisiType === 'kombinasi' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                                >
                                                    ⚡ Kombinasi
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <Label htmlFor="blok" className="text-sm font-medium mb-2 block">Blok Kebun</Label>
                                            <select 
                                                id="blok" 
                                                className="w-full p-3 text-sm border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" 
                                                required
                                            >
                                                <option value="">Pilih Blok</option>
                                                <option value="blok-a">Blok A</option>
                                                <option value="blok-b">Blok B</option>
                                                <option value="blok-c">Blok C</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label htmlFor="tanggal" className="text-sm font-medium mb-2 block">Tanggal</Label>
                                                <Input id="tanggal" type="date" className="h-11 text-sm" required />
                                            </div>
                                            <div>
                                                <Label htmlFor="waktu" className="text-sm font-medium mb-2 block">Waktu</Label>
                                                <Input id="waktu" type="time" className="h-11 text-sm" required />
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setShowScheduleForm(false)}
                                                className="flex-1 h-11"
                                            >
                                                Batal
                                            </Button>
                                            <Button 
                                                type="submit" 
                                                className="flex-1 h-11 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                            >
                                                Simpan Jadwal
                                            </Button>
                                        </div>
                                    </form>
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
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                                    <Calendar className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-800">Jadwal Misi</h3>
                            </div>
                            <div className="space-y-3">
                                {jadwalMisi.map((misi, index) => (
                                    <motion.div
                                        key={misi.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        whileHover={{ scale: 1.02, x: 5 }}
                                        className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-xl border-2 border-gray-200 shadow-md"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-bold text-gray-800">{misi.blok}</span>
                                            <span className={`text-xs px-3 py-1.5 rounded-full font-bold shadow-md ${getStatusColor(misi.status)}`}>
                                                {misi.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-800 mb-2 font-medium">{misi.tipe}</p>
                                        <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                                            <span>📅 {misi.tanggal}</span>
                                            <span>🕐 {misi.waktu}</span>
                                        </div>
                                        {misi.progress > 0 && (
                                            <div className="mt-3">
                                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${misi.progress}%` }}
                                                        transition={{ duration: 1, ease: "easeOut" }}
                                                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                                                    />
                                                </div>
                                                <p className="text-xs text-green-600 mt-1 text-right font-medium">{misi.progress}%</p>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
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
                                <h3 className="text-sm font-bold text-gray-800">Riwayat Misi</h3>
                            </div>
                            <div className="space-y-3">
                                {riwayatMisi.map((misi, index) => (
                                    <motion.div
                                        key={misi.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        whileHover={{ scale: 1.02, x: 5 }}
                                        className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-xl border-2 border-gray-200 shadow-md"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-bold text-gray-800">{misi.blok}</span>
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        </div>
                                        <p className="text-sm text-gray-800 mb-2 font-medium">{misi.tipe}</p>
                                        <p className="text-xs text-gray-600 mb-2">📅 {misi.tanggal} • {misi.waktu}</p>
                                        <p className="text-xs text-green-600 font-medium">✓ {misi.hasil}</p>
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
                            <h3 className="text-sm font-bold text-blue-700 mb-3 flex items-center gap-2">
                                <span>ℹ️</span> Informasi
                            </h3>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li>• Robot otomatis kembali ke charging station saat baterai &lt;20%</li>
                                <li>• Misi kombinasi menggabungkan deteksi dan penyiraman/pemupukan</li>
                                <li>• K-Petani dapat mengontrol penuh jadwal dan operasi robot</li>
                            </ul>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
