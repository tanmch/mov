import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { MapPin, ArrowLeft, Save, X } from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import { KPetaniOnly } from '@/Components/RoleGuard';
import { useHeaderOffset } from '@/hooks/useHeaderOffset';

export default function Create() {
    const topOffset = useHeaderOffset();
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
        location: '',
        latitude: '',
        longitude: '',
        luas: '',
        jenis_mangga: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('kebun.store'));
    };

    return (
        <KPetaniOnly>
            <AuthenticatedLayout>
                <Head title="Tambah Kebun" />
                
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
                                        Tambah Kebun Baru
                                    </h1>
                                    <p className="text-sm text-gray-600">Buat kebun baru untuk monitoring</p>
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

                                {/* Form Actions */}
                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
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
                                        {processing ? 'Menyimpan...' : 'Simpan Kebun'}
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                </div>
            </AuthenticatedLayout>
        </KPetaniOnly>
    );
}

