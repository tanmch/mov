import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { useRole } from '@/hooks/useRole';
import { KPetaniOnly } from '@/Components/RoleGuard';
import { MapPin, ThermometerSun, Droplets, Sprout, Leaf, Edit, Plus, Settings } from 'lucide-react';

export default function KebunMonitoring() {
    const { auth } = usePage().props;
    const { isKPetani, canEdit } = useRole();
    const [selectedBlok, setSelectedBlok] = useState(null);

    // Mock data - akan diganti dengan data real nanti
    const blokData = [
        { id: 'A1', status: 'sehat', suhu: 27, kelembapan: 70, trees: 12 },
        { id: 'A2', status: 'sehat', suhu: 28, kelembapan: 68, trees: 12 },
        { id: 'B1', status: 'perhatian', suhu: 32, kelembapan: 45, trees: 10 },
        { id: 'B2', status: 'sehat', suhu: 27, kelembapan: 72, trees: 11 },
        { id: 'C1', status: 'sehat', suhu: 26, kelembapan: 75, trees: 13 },
        { id: 'C2', status: 'siap-panen', suhu: 28, kelembapan: 65, trees: 12 },
        { id: 'C3', status: 'siap-panen', suhu: 29, kelembapan: 63, trees: 11 },
        { id: 'D1', status: 'sehat', suhu: 27, kelembapan: 69, trees: 12 },
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case 'sehat':
                return 'bg-gradient-to-br from-green-500 to-emerald-600';
            case 'perhatian':
                return 'bg-gradient-to-br from-yellow-500 to-amber-600';
            case 'siap-panen':
                return 'bg-gradient-to-br from-orange-500 to-red-600';
            default:
                return 'bg-gradient-to-br from-gray-400 to-gray-600';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'sehat':
                return 'Sehat';
            case 'perhatian':
                return 'Perlu Perhatian';
            case 'siap-panen':
                return 'Siap Panen';
            default:
                return 'Unknown';
        }
    };

    const selected = blokData.find((b) => b.id === selectedBlok);

    return (
        <AuthenticatedLayout>
            <Head title="Monitoring Kebun" />
            
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
                                <Leaf className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                    Monitoring Kebun 🌳
                                </h1>
                                <p className="text-sm text-gray-600">Peta interaktif area kebun mangga Anda</p>
                            </div>
                        </div>
                        
                        {/* K-Petani Only: Management Buttons */}
                        <KPetaniOnly>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="outline" 
                                    className="border-green-500 text-green-600 hover:bg-green-50"
                                    onClick={() => {
                                        // TODO: Open modal untuk tambah/edit kebun
                                        alert('Fitur Tambah Kebun akan segera tersedia');
                                    }}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Tambah Kebun
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="border-green-500 text-green-600 hover:bg-green-50"
                                    onClick={() => {
                                        // TODO: Open modal untuk edit kebun
                                        alert('Fitur Edit Kebun akan segera tersedia');
                                    }}
                                >
                                    <Settings className="w-4 h-4 mr-2" />
                                    Kelola Kebun
                                </Button>
                            </div>
                        </KPetaniOnly>
                    </motion.div>

                    {/* Map Grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="p-4 md:p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 border-2 border-green-200/50 shadow-xl">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-900">Peta Blok Kebun</h3>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-green-600" />
                                    <span className="text-sm font-medium text-gray-700">Area Total: 2.5 Ha</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-3 mb-4">
                                {blokData.map((blok, index) => (
                                    <motion.button
                                        key={blok.id}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedBlok(blok.id)}
                                        className={`aspect-square rounded-xl ${getStatusColor(
                                            blok.status
                                        )} hover:opacity-90 transition-all flex flex-col items-center justify-center text-white shadow-lg ${
                                            selectedBlok === blok.id ? 'ring-4 ring-green-600 scale-105 shadow-2xl' : ''
                                        }`}
                                    >
                                        <span className="text-xs opacity-90 font-medium">Blok</span>
                                        <span className="font-bold text-lg">{blok.id}</span>
                                    </motion.button>
                                ))}
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-4 text-sm pt-4 border-t border-green-200">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-green-500 rounded shadow-sm"></div>
                                    <span className="text-gray-700 font-medium">Sehat</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-yellow-500 rounded shadow-sm"></div>
                                    <span className="text-gray-700 font-medium">Perlu Perhatian</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-orange-500 rounded shadow-sm"></div>
                                    <span className="text-gray-700 font-medium">Siap Panen</span>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Selected Block Details */}
                    {selected && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <Card className="p-4 md:p-6 border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-xl">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">Detail Blok {selected.id}</h3>
                                    <Badge className={`${getStatusColor(selected.status)} text-white border-0 shadow-md`}>
                                        {getStatusLabel(selected.status)}
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        className="bg-white/80 backdrop-blur-sm p-3 rounded-xl text-center border border-white/50 shadow-md"
                                    >
                                        <ThermometerSun className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                                        <p className="text-xs text-gray-600 mb-1 font-medium">Suhu</p>
                                        <p className="text-lg font-bold text-gray-900">{selected.suhu}°C</p>
                                    </motion.div>
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        className="bg-white/80 backdrop-blur-sm p-3 rounded-xl text-center border border-white/50 shadow-md"
                                    >
                                        <Droplets className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                                        <p className="text-xs text-gray-600 mb-1 font-medium">Kelembapan</p>
                                        <p className="text-lg font-bold text-gray-900">{selected.kelembapan}%</p>
                                    </motion.div>
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        className="bg-white/80 backdrop-blur-sm p-3 rounded-xl text-center border border-white/50 shadow-md"
                                    >
                                        <Sprout className="w-6 h-6 text-green-600 mx-auto mb-2" />
                                        <p className="text-xs text-gray-600 mb-1 font-medium">Pohon</p>
                                        <p className="text-lg font-bold text-gray-900">{selected.trees}</p>
                                    </motion.div>
                                </div>

                                {selected.status === 'perhatian' && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-yellow-100 border-2 border-yellow-400 rounded-xl p-3 mb-3 shadow-md"
                                    >
                                        <p className="text-sm text-yellow-800 font-medium">
                                            ⚠️ Kelembapan rendah terdeteksi. Disarankan melakukan penyiraman segera.
                                        </p>
                                    </motion.div>
                                )}

                                {selected.status === 'siap-panen' && (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="bg-orange-100 border-2 border-orange-400 rounded-xl p-3 mb-3 shadow-md"
                                    >
                                        <p className="text-sm text-orange-800 font-medium">
                                            🎉 Buah di blok ini sudah mencapai kematangan optimal. Siap untuk dipanen!
                                        </p>
                                    </motion.div>
                                )}
                            </Card>
                        </motion.div>
                    )}

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-gray-200/50 shadow-xl">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Aksi Kebun</h3>
                            <div className="space-y-3">
                                <Link href="/penyiraman">
                                    <Button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 flex items-center justify-center gap-2 shadow-lg">
                                        <Droplets className="w-5 h-5" />
                                        Kontrol Jadwal Penyiraman
                                    </Button>
                                </Link>
                                <Link href="/deteksi">
                                    <Button className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 flex items-center justify-center gap-2 shadow-lg">
                                        <Sprout className="w-5 h-5" />
                                        Deteksi Kematangan Buah
                                    </Button>
                                </Link>
                                <Link href="/prediksi">
                                    <Button
                                        variant="outline"
                                        className="w-full border-2 border-green-500 text-green-600 hover:bg-green-50 font-medium"
                                    >
                                        📊 Lihat Prediksi Panen
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Summary Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="p-4 md:p-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 border-2 border-emerald-200/50 shadow-xl">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Ringkasan Kebun</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/50 shadow-md"
                                >
                                    <p className="text-3xl font-bold text-green-600 mb-1">
                                        {blokData.filter((b) => b.status === 'sehat').length}
                                    </p>
                                    <p className="text-sm text-gray-700 font-medium">Blok Sehat</p>
                                </motion.div>
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/50 shadow-md"
                                >
                                    <p className="text-3xl font-bold text-orange-600 mb-1">
                                        {blokData.filter((b) => b.status === 'siap-panen').length}
                                    </p>
                                    <p className="text-sm text-gray-700 font-medium">Siap Panen</p>
                                </motion.div>
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/50 shadow-md"
                                >
                                    <p className="text-3xl font-bold text-yellow-600 mb-1">
                                        {blokData.filter((b) => b.status === 'perhatian').length}
                                    </p>
                                    <p className="text-sm text-gray-700 font-medium">Perlu Perhatian</p>
                                </motion.div>
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/50 shadow-md"
                                >
                                    <p className="text-3xl font-bold text-gray-700 mb-1">
                                        {blokData.reduce((acc, b) => acc + b.trees, 0)}
                                    </p>
                                    <p className="text-sm text-gray-700 font-medium">Total Pohon</p>
                                </motion.div>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

