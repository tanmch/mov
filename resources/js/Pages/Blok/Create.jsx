import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Grid3x3, ArrowLeft, Save, X } from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import { KPetaniOnly } from '@/Components/RoleGuard';
import { useHeaderOffset } from '@/hooks/useHeaderOffset';

export default function Create({ kebuns = [], selectedKebunId = null }) {
    const topOffset = useHeaderOffset();
    const { data, setData, post, processing, errors } = useForm({
        kebun_id: selectedKebunId || (kebuns.length > 0 ? kebuns[0].id : ''),
        code: '',
        name: '',
        luas: '',
        jumlah_pohon: '',
        status: 'sehat',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('blok.store'));
    };

    return (
        <KPetaniOnly>
            <AuthenticatedLayout>
                <Head title="Tambah Blok" />
                
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
                                    <Grid3x3 className="w-6 h-6 text-white" />
                                </motion.div>
                                <div>
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                        Tambah Blok Baru
                                    </h1>
                                    <p className="text-sm text-gray-600">Buat blok baru untuk kebun</p>
                                </div>
                            </div>
                        </motion.div>

                        <Card className="p-6 bg-white/80 backdrop-blur-lg border border-white/50 shadow-xl">
                            <form onSubmit={submit} className="space-y-6">
                                {/* Kebun Selection */}
                                <div>
                                    <Label htmlFor="kebun_id" className="text-sm font-medium mb-2 flex items-center gap-2">
                                        <Grid3x3 className="w-4 h-4 text-green-600" />
                                        Kebun <span className="text-red-500">*</span>
                                    </Label>
                                    <select
                                        id="kebun_id"
                                        value={data.kebun_id}
                                        onChange={(e) => setData('kebun_id', e.target.value)}
                                        className={`w-full rounded-md border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 p-3 transition-all ${errors.kebun_id ? 'border-red-500' : ''}`}
                                        required
                                    >
                                        <option value="">Pilih Kebun</option>
                                        {kebuns.map((kebun) => (
                                            <option key={kebun.id} value={kebun.id}>
                                                {kebun.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.kebun_id && <p className="mt-1 text-sm text-red-500">{errors.kebun_id}</p>}
                                </div>

                                {/* Code */}
                                <div>
                                    <Label htmlFor="code" className="text-sm font-medium mb-2 flex items-center gap-2">
                                        <Grid3x3 className="w-4 h-4 text-green-600" />
                                        Kode Blok <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="code"
                                        type="text"
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value.toUpperCase())}
                                        className={errors.code ? 'border-red-500' : ''}
                                        placeholder="Contoh: A1, B2, C1"
                                        required
                                    />
                                    {errors.code && <p className="mt-1 text-sm text-red-500">{errors.code}</p>}
                                    <p className="mt-1 text-xs text-gray-500">
                                        💡 Kode blok harus unik untuk setiap kebun
                                    </p>
                                </div>

                                {/* Name */}
                                <div>
                                    <Label htmlFor="name" className="text-sm font-medium mb-2">
                                        Nama Blok <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className={errors.name ? 'border-red-500' : ''}
                                        placeholder="Contoh: Blok A1"
                                        required
                                    />
                                    {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                                </div>

                                {/* Luas & Jumlah Pohon */}
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
                                            placeholder="0.5"
                                        />
                                        {errors.luas && <p className="mt-1 text-sm text-red-500">{errors.luas}</p>}
                                    </div>
                                    <div>
                                        <Label htmlFor="jumlah_pohon" className="text-sm font-medium mb-2">
                                            Jumlah Pohon
                                        </Label>
                                        <Input
                                            id="jumlah_pohon"
                                            type="number"
                                            min="0"
                                            value={data.jumlah_pohon}
                                            onChange={(e) => setData('jumlah_pohon', e.target.value)}
                                            className={errors.jumlah_pohon ? 'border-red-500' : ''}
                                            placeholder="23"
                                        />
                                        {errors.jumlah_pohon && <p className="mt-1 text-sm text-red-500">{errors.jumlah_pohon}</p>}
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
                                        <option value="sehat">Sehat</option>
                                        <option value="perlu_perhatian">Perlu Perhatian</option>
                                        <option value="maintenance">Maintenance</option>
                                    </select>
                                    {errors.status && <p className="mt-1 text-sm text-red-500">{errors.status}</p>}
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
                                        {processing ? 'Menyimpan...' : 'Simpan Blok'}
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

