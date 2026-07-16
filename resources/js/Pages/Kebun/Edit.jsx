import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { MapPin, ArrowLeft, Save, X, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import { KPetaniOnly } from '@/Components/RoleGuard';
import { useHeaderOffset } from '@/hooks/useHeaderOffset';

export default function Edit({ kebun }) {
    const topOffset = useHeaderOffset();
    const { data, setData, put, delete: destroy, processing, errors } = useForm({
        name: kebun.name || '',
        description: kebun.description || '',
        location: kebun.location || '',
        latitude: kebun.latitude || '',
        longitude: kebun.longitude || '',
        luas: kebun.luas || '',
        jenis_mangga: kebun.jenis_mangga || '',
        status: kebun.status || 'active',
    });

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const submit = (e) => {
        e.preventDefault();
        put(route('kebun.update', kebun.id));
    };

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        setIsDeleting(true);
        destroy(route('kebun.destroy', kebun.id), {
            onFinish: () => {
                setIsDeleting(false);
                setShowDeleteConfirm(false);
            }
        });
    };

    const cancelDelete = () => {
        setShowDeleteConfirm(false);
    };

    return (
        <KPetaniOnly>
            <AuthenticatedLayout>
                <Head title={`Edit Kebun: ${kebun.name}`} />
                
                {/* Delete Confirmation Modal */}
                <AnimatePresence>
                    {showDeleteConfirm && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={cancelDelete}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
                            />
                            
                            {/* Modal */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Card className="w-full max-w-md bg-white/95 backdrop-blur-xl border-2 border-red-200 shadow-2xl overflow-hidden relative">
                                    {/* Animated background gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-orange-50 to-red-100 opacity-50"></div>
                                    
                                    {/* Decorative elements */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-200/30 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-200/30 rounded-full blur-2xl -ml-12 -mb-12"></div>
                                    
                                    <div className="relative z-10 p-6">
                                        {/* Icon */}
                                        <motion.div
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                                            className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-xl shadow-red-500/30 mx-auto mb-4"
                                        >
                                            <ShieldAlert className="w-8 h-8 text-white" />
                                        </motion.div>
                                        
                                        {/* Title */}
                                        <motion.h3
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2 }}
                                            className="text-2xl font-bold text-center text-gray-900 mb-2"
                                        >
                                            Hapus Kebun?
                                        </motion.h3>
                                        
                                        {/* Warning message */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3 }}
                                            className="space-y-3 mb-6"
                                        >
                                            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                                                <div className="flex items-start gap-3">
                                                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-semibold text-red-900 mb-1">
                                                            Tindakan ini tidak dapat dibatalkan!
                                                        </p>
                                                        <p className="text-sm text-red-700">
                                                            Kebun <span className="font-bold">"{kebun.name}"</span> akan dihapus secara permanen. 
                                                            Semua blok dan data terkait juga akan terpengaruh.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3">
                                                <p className="text-xs text-amber-800 font-medium">
                                                    💡 Pastikan Anda sudah membackup data penting sebelum menghapus.
                                                </p>
                                            </div>
                                        </motion.div>
                                        
                                        {/* Action buttons */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.4 }}
                                            className="flex items-center gap-3"
                                        >
                                            <Button
                                                type="button"
                                                onClick={cancelDelete}
                                                disabled={isDeleting}
                                                variant="outline"
                                                className="flex-1 border-2 border-gray-300 hover:bg-gray-50"
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Batal
                                            </Button>
                                            <Button
                                                type="button"
                                                onClick={confirmDelete}
                                                disabled={isDeleting}
                                                className="flex-1 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white shadow-lg shadow-red-500/30"
                                            >
                                                {isDeleting ? (
                                                    <>
                                                        <motion.div
                                                            animate={{ rotate: 360 }}
                                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                            className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"
                                                        />
                                                        Menghapus...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Ya, Hapus Kebun
                                                    </>
                                                )}
                                            </Button>
                                        </motion.div>
                                    </div>
                                </Card>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
                
                <div className="min-h-screen relative overflow-hidden">
                    <AnimatedBackground />
                    
                    <div className="relative z-10 p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
                        {/* Header */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-4"
                        >
                            <Link href={route('kebun')}>
                                <Button variant="ghost" size="sm">
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Kembali
                                </Button>
                            </Link>
                            <div className="flex items-center gap-3">
                                <motion.div
                                    animate={{ rotate: [0, 5, -5, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                    className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"
                                >
                                    <MapPin className="w-6 h-6 text-white" />
                                </motion.div>
                                <div>
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                        Edit Kebun
                                    </h1>
                                    <p className="text-sm text-gray-600">Ubah informasi kebun</p>
                                </div>
                            </div>
                        </motion.div>

                        <Card className="p-6 bg-white/80 backdrop-blur-lg border border-white/50 shadow-xl">
                            <form onSubmit={submit} className="space-y-6">
                                {/* Name */}
                                <div>
                                    <Label htmlFor="name" className="text-sm font-medium mb-2 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-green-600" />
                                        Nama Kebun <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className={errors.name ? 'border-red-500' : ''}
                                        placeholder="Contoh: Kebun Mangga Indah"
                                        required
                                    />
                                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                                </div>

                                {/* Description */}
                                <div>
                                    <Label htmlFor="description" className="text-sm font-medium mb-2">
                                        Deskripsi
                                    </Label>
                                    <textarea
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        className={`w-full rounded-md border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 p-3 resize-none ${errors.description ? 'border-red-500' : ''}`}
                                        placeholder="Deskripsi kebun (opsional)"
                                        rows={3}
                                    />
                                    {errors.description && <p className="mt-1 text-sm text-red-500">{errors.description}</p>}
                                </div>

                                {/* Location */}
                                <div>
                                    <Label htmlFor="location" className="text-sm font-medium mb-2 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-green-600" />
                                        Lokasi <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="location"
                                        type="text"
                                        value={data.location}
                                        onChange={(e) => setData('location', e.target.value)}
                                        className={errors.location ? 'border-red-500' : ''}
                                        placeholder="Contoh: Cirebon, Jawa Barat"
                                        required
                                    />
                                    {errors.location && <p className="mt-1 text-sm text-red-500">{errors.location}</p>}
                                </div>

                                {/* Latitude & Longitude */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="latitude" className="text-sm font-medium mb-2">
                                            Latitude (Opsional)
                                        </Label>
                                        <Input
                                            id="latitude"
                                            type="number"
                                            step="any"
                                            value={data.latitude}
                                            onChange={(e) => setData('latitude', e.target.value)}
                                            className={errors.latitude ? 'border-red-500' : ''}
                                            placeholder="-6.2088"
                                        />
                                        {errors.latitude && <p className="mt-1 text-sm text-red-500">{errors.latitude}</p>}
                                    </div>
                                    <div>
                                        <Label htmlFor="longitude" className="text-sm font-medium mb-2">
                                            Longitude (Opsional)
                                        </Label>
                                        <Input
                                            id="longitude"
                                            type="number"
                                            step="any"
                                            value={data.longitude}
                                            onChange={(e) => setData('longitude', e.target.value)}
                                            className={errors.longitude ? 'border-red-500' : ''}
                                            placeholder="106.8456"
                                        />
                                        {errors.longitude && <p className="mt-1 text-sm text-red-500">{errors.longitude}</p>}
                                    </div>
                                </div>

                                {/* Luas & Jenis Mangga */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="luas" className="text-sm font-medium mb-2">
                                            Luas (Hektar)
                                        </Label>
                                        <Input
                                            id="luas"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={data.luas}
                                            onChange={(e) => setData('luas', e.target.value)}
                                            className={errors.luas ? 'border-red-500' : ''}
                                            placeholder="2.5"
                                        />
                                        {errors.luas && <p className="mt-1 text-sm text-red-500">{errors.luas}</p>}
                                    </div>
                                    <div>
                                        <Label htmlFor="jenis_mangga" className="text-sm font-medium mb-2">
                                            Jenis Mangga
                                        </Label>
                                        <Input
                                            id="jenis_mangga"
                                            type="text"
                                            value={data.jenis_mangga}
                                            onChange={(e) => setData('jenis_mangga', e.target.value)}
                                            className={errors.jenis_mangga ? 'border-red-500' : ''}
                                            placeholder="Contoh: Mangga Arumanis"
                                        />
                                        {errors.jenis_mangga && <p className="mt-1 text-sm text-red-500">{errors.jenis_mangga}</p>}
                                    </div>
                                </div>

                                {/* Status */}
                                <div>
                                    <Label htmlFor="status" className="text-sm font-medium mb-2">
                                        Status
                                    </Label>
                                    <select
                                        id="status"
                                        value={data.status}
                                        onChange={(e) => setData('status', e.target.value)}
                                        className="w-full rounded-md border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 p-3 transition-all"
                                    >
                                        <option value="active">Aktif</option>
                                        <option value="inactive">Nonaktif</option>
                                        <option value="maintenance">Maintenance</option>
                                    </select>
                                    {errors.status && <p className="mt-1 text-sm text-red-500">{errors.status}</p>}
                                </div>

                                {/* Form Actions */}
                                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                    <Button
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={processing}
                                        className="bg-red-500 hover:bg-red-600 text-white"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Hapus Kebun
                                    </Button>
                                    <div className="flex items-center gap-3">
                                        <Link href={route('kebun')}>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                disabled={processing}
                                            >
                                                <X className="w-4 h-4 mr-2" />
                                                Batal
                                            </Button>
                                        </Link>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </Card>
                    </div>
                </div>
            </AuthenticatedLayout>
        </KPetaniOnly>
    );
}

