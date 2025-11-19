import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Key, ArrowLeft, Save } from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import { KPetaniOnly } from '@/Components/RoleGuard';

export default function Edit({ workId }) {
    const { data, setData, put, processing, errors } = useForm({
        work_id: workId.work_id || '',
        notes: workId.notes || '',
    });

    const submit = (e) => {
        e.preventDefault();
        put(route('work-ids.update', workId.id));
    };

    return (
        <KPetaniOnly>
            <AuthenticatedLayout>
                <Head title="Edit ID Kerja" />
                
                <div className="min-h-screen relative overflow-hidden">
                    <AnimatedBackground />
                    
                    <div className="relative z-10 p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
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
                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <Key className="w-6 h-6 text-white" />
                                </div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                    Edit ID Kerja
                                </h1>
                            </div>
                        </motion.div>

                        <Card className="p-6 bg-white/80 backdrop-blur-lg border border-white/50">
                            <form onSubmit={submit} className="space-y-6">
                                <div>
                                    <Label htmlFor="work_id" className="text-sm font-medium mb-2">
                                        ID Kerja <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="work_id"
                                        value={data.work_id}
                                        onChange={(e) => setData('work_id', e.target.value)}
                                        required
                                    />
                                    {errors.work_id && (
                                        <p className="mt-1 text-sm text-red-600">{errors.work_id}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="notes" className="text-sm font-medium mb-2">
                                        Catatan
                                    </Label>
                                    <textarea
                                        id="notes"
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        rows="3"
                                        className="w-full rounded-lg border-gray-300 focus:border-green-500 focus:ring-green-500"
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600"
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        {processing ? 'Menyimpan...' : 'Simpan'}
                                    </Button>
                                    <Link href={route('work-ids.index')}>
                                        <Button type="button" variant="outline">Batal</Button>
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

