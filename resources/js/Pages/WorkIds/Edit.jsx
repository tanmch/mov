import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, Link, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Key, ArrowLeft, Save } from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import { KPetaniOnly } from '@/Components/RoleGuard';
import NotificationToast from '@/Components/WorkIds/NotificationToast';

export default function Edit({ workId }) {
    const { flash } = usePage().props;
    const { data, setData, put, processing, errors } = useForm({
        work_id: workId.work_id || '',
        notes: workId.notes || '',
    });
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    const submit = (e) => {
        e.preventDefault();
        put(route('work-ids.update', workId.id));
    };

    useEffect(() => {
        if (flash?.success) {
            setNotificationMessage(flash.success);
            setNotificationType('success');
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 5000);
        }
        if (flash?.error) {
            setNotificationMessage(flash.error);
            setNotificationType('error');
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 5000);
        }
    }, [flash]);

    return (
        <KPetaniOnly>
            <AuthenticatedLayout>
                <Head title="Edit ID Kerja" />
                
                <div className="min-h-screen relative overflow-hidden">
                    <AnimatedBackground />
                    
                    <div className="relative z-10 p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
                        <NotificationToast
                            show={showNotification}
                            message={notificationMessage}
                            type={notificationType}
                            action="edit"
                            onClose={() => setShowNotification(false)}
                        />
                        
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
                                        Edit ID Kerja
                                    </h1>
                                    <p className="text-sm text-gray-600">Ubah informasi ID Kerja</p>
                                </div>
                            </div>
                        </motion.div>

                        <Card className="p-6 bg-white/80 backdrop-blur-lg border border-white/50 shadow-xl">
                            <form onSubmit={submit} className="space-y-6">
                                <div>
                                    <Label htmlFor="work_id" className="text-sm font-medium mb-2 flex items-center gap-2">
                                        <Key className="w-4 h-4 text-green-600" />
                                        ID Kerja <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="work_id"
                                        value={data.work_id}
                                        onChange={(e) => setData('work_id', e.target.value)}
                                        className="rounded-xl border-2"
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
                                        className="w-full rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 p-3 resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg"
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        {processing ? 'Menyimpan...' : 'Simpan'}
                                    </Button>
                                    <Link href={route('work-ids.index')}>
                                        <Button type="button" variant="outline" className="px-6">Batal</Button>
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
