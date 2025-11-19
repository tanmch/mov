import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Input } from '@/Components/ui/input';
import { 
    Key, Plus, Search, Filter, CheckCircle2, XCircle, 
    Copy, Trash2, Edit, X, CheckCircle
} from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import { KPetaniOnly } from '@/Components/RoleGuard';

export default function Index({ workIds, filters = {} }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || '');
    const [statusFilter, setStatusFilter] = useState(filters.is_used !== null ? filters.is_used : '');
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

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
        // You can add a toast notification here
    };

    const handleDelete = (workId) => {
        if (confirm('Apakah Anda yakin ingin menghapus ID Kerja ini?')) {
            router.delete(route('work-ids.destroy', workId), {
                onSuccess: () => {
                    setNotificationMessage('ID Kerja berhasil dihapus.');
                    setNotificationType('success');
                    setShowNotification(true);
                    setTimeout(() => setShowNotification(false), 3000);
                },
            });
        }
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
                <Head title="Manajemen ID Kerja" />
                
                <div className="min-h-screen relative overflow-hidden">
                    <AnimatedBackground />
                    
                    <div className="relative z-10 p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
                        {/* Notification */}
                        <AnimatePresence>
                            {showNotification && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className={`p-4 rounded-lg shadow-lg flex items-center justify-between ${
                                        notificationType === 'success' 
                                            ? 'bg-green-50 border border-green-200' 
                                            : 'bg-red-50 border border-red-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {notificationType === 'success' ? (
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-600" />
                                        )}
                                        <p className={`font-medium ${
                                            notificationType === 'success' ? 'text-green-800' : 'text-red-800'
                                        }`}>
                                            {notificationMessage}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowNotification(false)}
                                        className="h-6 w-6 p-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Header */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                        >
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <Key className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                            Manajemen ID Kerja
                                        </h1>
                                        <p className="text-sm text-gray-600">Kelola ID Kerja untuk Petani dan K-Petani</p>
                                    </div>
                                </div>
                            </div>
                            
                            <Link href={route('work-ids.create')}>
                                <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Buat ID Kerja
                                </Button>
                            </Link>
                        </motion.div>

                        {/* Filters */}
                        <Card className="p-4 bg-white/80 backdrop-blur-lg border border-white/50">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder="Cari ID Kerja..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleFilter()}
                                        className="pl-9"
                                    />
                                </div>
                                
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="rounded-lg border-gray-300 focus:border-green-500 focus:ring-green-500"
                                >
                                    <option value="">Semua Role</option>
                                    <option value="petani">Petani</option>
                                    <option value="k-petani">K-Petani</option>
                                </select>
                                
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="rounded-lg border-gray-300 focus:border-green-500 focus:ring-green-500"
                                >
                                    <option value="">Semua Status</option>
                                    <option value="0">Belum Digunakan</option>
                                    <option value="1">Sudah Digunakan</option>
                                </select>
                                
                                <Button onClick={handleFilter} className="w-full">
                                    <Filter className="w-4 h-4 mr-2" />
                                    Filter
                                </Button>
                            </div>
                        </Card>

                        {/* Table */}
                        <Card className="bg-white/80 backdrop-blur-lg border border-white/50 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">ID Kerja</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Dibuat Oleh</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Digunakan Oleh</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Tanggal</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {workIds.data && workIds.data.length > 0 ? (
                                            workIds.data.map((workId) => (
                                                <motion.tr
                                                    key={workId.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="hover:bg-green-50/50 transition-colors"
                                                >
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <code className="text-sm font-mono font-semibold text-green-700">
                                                                {workId.work_id}
                                                            </code>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleCopyWorkId(workId.work_id)}
                                                                className="h-6 w-6 p-0"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge className={workId.role === 'k-petani' 
                                                            ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                                            : 'bg-gradient-to-r from-blue-500 to-cyan-500'}>
                                                            {workId.role === 'k-petani' ? 'K-Petani' : 'Petani'}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {workId.is_used ? (
                                                            <Badge className="bg-green-100 text-green-800">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Digunakan
                                                            </Badge>
                                                        ) : (
                                                            <Badge className="bg-gray-100 text-gray-800">
                                                                <XCircle className="w-3 h-3 mr-1" />
                                                                Tersedia
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {workId.creator?.name || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {workId.user?.name || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {workId.used_at 
                                                            ? new Date(workId.used_at).toLocaleDateString('id-ID')
                                                            : new Date(workId.created_at).toLocaleDateString('id-ID')}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            {!workId.is_used && (
                                                                <>
                                                                    <Link href={route('work-ids.edit', workId.id)}>
                                                                        <Button variant="ghost" size="sm">
                                                                            <Edit className="w-4 h-4" />
                                                                        </Button>
                                                                    </Link>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleDelete(workId.id)}
                                                                        className="text-red-600 hover:text-red-700"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                                                    Tidak ada ID Kerja ditemukan
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {workIds.links && workIds.links.length > 3 && (
                                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                        Menampilkan {workIds.from} - {workIds.to} dari {workIds.total} ID Kerja
                                    </div>
                                    <div className="flex gap-2">
                                        {workIds.links.map((link, index) => (
                                            <Link
                                                key={index}
                                                href={link.url || '#'}
                                                className={`px-3 py-1 rounded-lg text-sm ${
                                                    link.active
                                                        ? 'bg-green-500 text-white'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                } ${!link.url && 'opacity-50 cursor-not-allowed'}`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </AuthenticatedLayout>
        </KPetaniOnly>
    );
}

