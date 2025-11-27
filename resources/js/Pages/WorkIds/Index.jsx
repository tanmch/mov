import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Key, Plus } from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import { KPetaniOnly } from '@/Components/RoleGuard';
import WorkIdCard from '@/Components/WorkIds/WorkIdCard';
import StatsCards from '@/Components/WorkIds/StatsCards';
import FilterSection from '@/Components/WorkIds/FilterSection';
import NotificationToast from '@/Components/WorkIds/NotificationToast';
import DeleteConfirmationModal from '@/Components/WorkIds/DeleteConfirmationModal';

export default function Index({ workIds, filters = {} }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || '');
    const [statusFilter, setStatusFilter] = useState(filters.is_used !== null ? filters.is_used : '');
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');
    const [copiedId, setCopiedId] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [workIdToDelete, setWorkIdToDelete] = useState(null);

    const handleFilter = () => {
        router.get(route('work-ids.index'), {
            search: search || undefined,
            role: roleFilter || undefined,
            is_used: statusFilter !== '' ? statusFilter : undefined,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleCopyWorkId = (workId) => {
        navigator.clipboard.writeText(workId);
        setCopiedId(workId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const [notificationAction, setNotificationAction] = useState(null);

    const handleDeleteClick = (workId) => {
        setWorkIdToDelete(workId);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = () => {
        if (workIdToDelete) {
            router.delete(route('work-ids.destroy', workIdToDelete.id), {
                onSuccess: () => {
                    setNotificationMessage('ID Kerja berhasil dihapus.');
                    setNotificationType('success');
                    setNotificationAction('delete');
                    setShowNotification(true);
                    setTimeout(() => setShowNotification(false), 5000);
                    setShowDeleteModal(false);
                    setWorkIdToDelete(null);
                },
            });
        }
    };

    // Handle flash messages - same approach as delete
    useEffect(() => {
        console.log('[WorkIds/Index] useEffect triggered, flash:', flash);
        
        if (flash?.success) {
            console.log('[WorkIds/Index] Flash success detected:', flash.success);
            setNotificationMessage(flash.success);
            setNotificationType('success');
            // Detect action from message
            if (flash.success.includes('diperbarui') || flash.success.includes('diubah')) {
                setNotificationAction('edit');
            } else if (flash.success.includes('dihapus')) {
                setNotificationAction('delete');
            } else {
                setNotificationAction(null);
            }
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 5000);
        }
        if (flash?.error) {
            console.log('[WorkIds/Index] Flash error detected:', flash.error);
            setNotificationMessage(flash.error);
            setNotificationType('error');
            setNotificationAction(null);
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 5000);
        }
    }, [flash]);

    const stats = {
        total: workIds?.total || 0,
        used: workIds?.data?.filter(w => w.is_used).length || 0,
        available: workIds?.data?.filter(w => !w.is_used).length || 0,
    };

    return (
        <KPetaniOnly>
            <AuthenticatedLayout>
                <Head title="Manajemen ID Kerja" />
                
                <div className="min-h-screen relative overflow-hidden">
                    <AnimatedBackground />
                    
                    <div className="relative z-10 p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
                        <NotificationToast
                            show={showNotification}
                            message={notificationMessage}
                            type={notificationType}
                            action={notificationAction}
                            onClose={() => {
                                setShowNotification(false);
                                setNotificationAction(null);
                            }}
                        />

                        <DeleteConfirmationModal
                            show={showDeleteModal}
                            workId={workIdToDelete}
                            onClose={() => {
                                setShowDeleteModal(false);
                                setWorkIdToDelete(null);
                            }}
                            onConfirm={handleDeleteConfirm}
                        />

                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                        >
                            <div className="flex items-center gap-3">
                                <motion.div
                                    animate={{ rotate: [0, 5, -5, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                    className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"
                                >
                                    <Key className="w-6 h-6 text-white" />
                                </motion.div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                        Manajemen ID Kerja
                                    </h1>
                                    <p className="text-sm text-gray-600">Kelola ID Kerja untuk Petani dan K-Petani</p>
                                </div>
                            </div>
                            
                            <Link href={route('work-ids.create')}>
                                <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Buat ID Kerja
                                </Button>
                            </Link>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <StatsCards stats={stats} />
                        </div>

                        <FilterSection
                            search={search}
                            setSearch={setSearch}
                            roleFilter={roleFilter}
                            setRoleFilter={setRoleFilter}
                            statusFilter={statusFilter}
                            setStatusFilter={setStatusFilter}
                            onFilter={handleFilter}
                        />

                        {workIds?.data && workIds.data.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {workIds.data.map((workId, index) => (
                                    <WorkIdCard
                                        key={workId.id}
                                        workId={workId}
                                        index={index}
                                        onCopy={handleCopyWorkId}
                                        onDelete={handleDeleteClick}
                                        copiedId={copiedId}
                                    />
                                ))}
                            </div>
                        ) : (
                            <Card className="p-12 text-center bg-white/80 backdrop-blur-lg">
                                <Key className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-600 font-medium">Tidak ada ID Kerja ditemukan</p>
                                <p className="text-sm text-gray-500 mt-1">Coba ubah filter atau buat ID Kerja baru</p>
                            </Card>
                        )}

                        {workIds?.links && workIds.links.length > 3 && (
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white/80 backdrop-blur-lg rounded-xl border border-white/50">
                                <div className="text-sm text-gray-600">
                                    Menampilkan {workIds.from} - {workIds.to} dari {workIds.total} ID Kerja
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {workIds.links.map((link, index) => (
                                        <Link
                                            key={index}
                                            href={link.url || '#'}
                                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                                link.active
                                                    ? 'bg-green-500 text-white shadow-lg'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            } ${!link.url && 'opacity-50 cursor-not-allowed pointer-events-none'}`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </AuthenticatedLayout>
        </KPetaniOnly>
    );
}
