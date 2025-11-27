import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Key, ArrowLeft, Save, Sparkles } from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import { KPetaniOnly } from '@/Components/RoleGuard';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        role: 'petani',
        work_id: '',
        notes: '',
    });

    const [generateMultiple, setGenerateMultiple] = useState(false);
    const [count, setCount] = useState(1);

    const submit = (e) => {
        e.preventDefault();
        
        if (generateMultiple) {
            router.post(route('work-ids.generate-multiple'), {
                role: data.role,
                count: count,
                notes: data.notes,
            });
        } else {
            post(route('work-ids.store'));
        }
    };

    return (
        <KPetaniOnly>
            <AuthenticatedLayout>
                <Head title="Buat ID Kerja" />
                
                <div className="min-h-screen relative overflow-hidden">
                    <AnimatedBackground />
                    
                    <div className="relative z-10 p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
                        {/* Header */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-4"
                        >
                            <Link href={route('work-ids.index')}>
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
                                    <Key className="w-6 h-6 text-white" />
                                </motion.div>
                                <div>
                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                        Buat ID Kerja
                                    </h1>
                                    <p className="text-sm text-gray-600">Generate ID Kerja baru untuk registrasi</p>
                                </div>
                            </div>
                        </motion.div>

                        <Card className="p-6 bg-white/80 backdrop-blur-lg border border-white/50 shadow-xl">
                            <form onSubmit={submit} className="space-y-6">
                                {/* Generate Multiple Toggle */}
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 cursor-pointer"
                                    onClick={() => setGenerateMultiple(!generateMultiple)}
                                >
                                    <input
                                        type="checkbox"
                                        id="generateMultiple"
                                        checked={generateMultiple}
                                        onChange={(e) => setGenerateMultiple(e.target.checked)}
                                        className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                    />
                                    <Label htmlFor="generateMultiple" className="cursor-pointer flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-green-600" />
                                        <span className="font-medium">Generate Multiple ID Kerja</span>
                                    </Label>
                                </motion.div>

                                {/* Role Selection */}
                                <div>
                                    <Label htmlFor="role" className="text-sm font-medium mb-2 flex items-center gap-2">
                                        <Key className="w-4 h-4 text-green-600" />
                                        Role <span className="text-red-500">*</span>
                                    </Label>
                                    <select
                                        id="role"
                                        value={data.role}
                                        onChange={(e) => setData('role', e.target.value)}
                                        className="w-full rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 p-3 transition-all"
                                        required
                                    >
                                        <option value="petani">🌾 Petani</option>
                                        <option value="k-petani">👨‍💼 K-Petani</option>
                                    </select>
                                    {errors.role && (
                                        <p className="mt-1 text-sm text-red-600">{errors.role}</p>
                                    )}
                                </div>

                                {/* Work ID (if not generating multiple) */}
                                {!generateMultiple && (
                                    <div>
                                        <Label htmlFor="work_id" className="text-sm font-medium mb-2">
                                            ID Kerja <span className="text-gray-400 text-xs">(Kosongkan untuk auto-generate)</span>
                                        </Label>
                                        <Input
                                            id="work_id"
                                            value={data.work_id}
                                            onChange={(e) => setData('work_id', e.target.value)}
                                            placeholder="Contoh: P-ABC12345 atau KP-XYZ67890"
                                            className="rounded-xl border-2"
                                        />
                                        {errors.work_id && (
                                            <p className="mt-1 text-sm text-red-600">{errors.work_id}</p>
                                        )}
                                        <p className="mt-1 text-xs text-gray-500">
                                            💡 Jika dikosongkan, ID Kerja akan dibuat otomatis
                                        </p>
                                    </div>
                                )}

                                {/* Count (if generating multiple) */}
                                {generateMultiple && (
                                    <div>
                                        <Label htmlFor="count" className="text-sm font-medium mb-2">
                                            Jumlah ID Kerja <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="count"
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={count}
                                            onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                                            className="rounded-xl border-2"
                                            required
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            💡 Maksimal 50 ID Kerja per kali generate
                                        </p>
                                    </div>
                                )}

                                {/* Notes */}
                                <div>
                                    <Label htmlFor="notes" className="text-sm font-medium mb-2">
                                        Catatan <span className="text-gray-400 text-xs">(Opsional)</span>
                                    </Label>
                                    <textarea
                                        id="notes"
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        rows="3"
                                        className="w-full rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 p-3 resize-none"
                                        placeholder="Tambahkan catatan untuk ID Kerja ini..."
                                    />
                                </div>

                                {/* Submit Button */}
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg"
                                    >
                                        {processing ? (
                                            'Memproses...'
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                {generateMultiple ? `Generate ${count} ID Kerja` : 'Buat ID Kerja'}
                                            </>
                                        )}
                                    </Button>
                                    <Link href={route('work-ids.index')}>
                                        <Button type="button" variant="outline" className="px-6">
                                            Batal
                                        </Button>
                                    </Link>
                                </div>
                            </form>
                        </Card>
                    </div>
                </div>
            </AuthenticatedLayout>
        </KPetaniOnly>
    );
}
