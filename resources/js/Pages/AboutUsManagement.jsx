import { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Textarea } from '@/Components/ui/textarea';
import { 
    Users, Plus, Edit, Trash2, Save, X, RefreshCw, Upload, Camera
} from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import BackButton from '@/Components/BackButton';
import NotificationToast from '@/Components/WorkIds/NotificationToast';

export default function AboutUsManagement({ teamMembers: teamMembersProp = [] }) {
    const { flash } = usePage().props;
    const [teamMembers, setTeamMembers] = useState(teamMembersProp || []);
    const [editingId, setEditingId] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const fileInputRef = useRef(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success', action: null });
    
    const addForm = useForm({
        name: '',
        photo: null,
        jobdesc: '',
        description: '',
        order: 0,
        is_active: true,
    });

    const editForm = useForm({
        name: '',
        photo: null,
        jobdesc: '',
        description: '',
        order: 0,
        is_active: true,
    });

    // Update team members when prop changes
    useEffect(() => {
        setTeamMembers(teamMembersProp || []);
    }, [teamMembersProp]);

    // Show toast notification when flash message exists
    useEffect(() => {
        if (flash?.success) {
            // Determine action based on context
            let action = 'success';
            if (flash.success.includes('diupdate') || flash.success.includes('diperbarui')) {
                action = 'edit';
            } else if (flash.success.includes('dihapus')) {
                action = 'delete';
            }
            
            setToast({
                show: true,
                message: flash.success,
                type: 'success',
                action: action,
            });
        }
    }, [flash]);

    // Sort by order
    const sortedMembers = [...teamMembers].sort((a, b) => {
        if (a.order !== b.order) {
            return a.order - b.order;
        }
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['teamMembers'],
            preserveScroll: true,
            onFinish: () => {
                setIsRefreshing(false);
            },
        });
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!addForm.data.name.trim() || !addForm.data.jobdesc.trim() || !addForm.data.description.trim()) return;

        addForm.post(route('about-us.store'), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: (page) => {
                setShowAddModal(false);
                addForm.reset();
                fileInputRef.current = null;
                router.reload({
                    only: ['teamMembers'],
                    preserveScroll: true,
                });
            },
            onError: (errors) => {
                // Toast will be handled by flash message from backend
            },
        });
    };

    const handleEdit = (member) => {
        setEditingId(member.id);
        editForm.setData({
            name: member.name,
            photo: null,
            jobdesc: member.jobdesc,
            description: member.description,
            order: member.order || 0,
            is_active: member.is_active ?? true,
        });
    };

    const handleUpdate = async (id, e) => {
        e.preventDefault();
        if (!editForm.data.name.trim() || !editForm.data.jobdesc.trim() || !editForm.data.description.trim()) return;

        editForm.post(route('about-us.update', id), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: (page) => {
                setEditingId(null);
                editForm.reset();
                fileInputRef.current = null;
                router.reload({
                    only: ['teamMembers'],
                    preserveScroll: true,
                });
            },
            onError: (errors) => {
                // Toast will be handled by flash message from backend
            },
        });
    };

    const handleDelete = async (id) => {
        if (!confirm('Apakah Anda yakin ingin menghapus anggota tim ini?')) return;

        router.delete(route('about-us.destroy', id), {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({
                    only: ['teamMembers'],
                    preserveScroll: true,
                });
            },
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        editForm.reset();
        fileInputRef.current = null;
    };

    const handlePhotoChange = (e, formType) => {
        const file = e.target.files[0];
        if (file) {
            if (formType === 'add') {
                addForm.setData('photo', file);
            } else {
                editForm.setData('photo', file);
            }
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Tentang Kami - Management" />
            <AnimatedBackground />
            
            {/* Toast Notification */}
            <NotificationToast
                show={toast.show}
                message={toast.message}
                type={toast.type}
                action={toast.action}
                onClose={() => setToast({ ...toast, show: false })}
            />
            
            <div className="min-h-screen py-6 md:py-8 px-4 sm:px-6 lg:px-8 relative">
                <div className="max-w-7xl mx-auto">
                    <BackButton href="/dashboard" />
                    
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                    Tentang Kami
                                </h1>
                                <p className="text-gray-600 mt-2">Kelola informasi tim pengembang</p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className="h-10 w-10 p-0"
                                    title="Refresh"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                </Button>
                                <Button
                                    onClick={() => setShowAddModal(true)}
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Tambah Anggota
                                </Button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Team Members Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {sortedMembers.length === 0 ? (
                            <div className="col-span-2">
                                <Card className="p-12 text-center">
                                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500 font-medium">
                                        Belum ada anggota tim. Tambah anggota baru untuk mulai.
                                    </p>
                                </Card>
                            </div>
                        ) : (
                            sortedMembers.map((member) => (
                                <motion.div
                                    key={member.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    whileHover={{ scale: 1.01 }}
                                >
                                    <Card className={`p-6 border-2 transition-all ${
                                        !member.is_active ? 'border-gray-200 bg-gray-50 opacity-75' : 'border-gray-200 hover:border-green-300'
                                    }`}>
                                        {editingId === member.id ? (
                                            // Edit Mode
                                            <form onSubmit={(e) => handleUpdate(member.id, e)} className="space-y-4">
                                                {/* Photo Upload */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Foto Profil
                                                    </label>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center overflow-hidden shadow-lg">
                                                            {editForm.data.photo ? (
                                                                <img 
                                                                    src={URL.createObjectURL(editForm.data.photo)} 
                                                                    alt="Preview"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : member.photo_url ? (
                                                                <img 
                                                                    src={member.photo_url} 
                                                                    alt={member.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <Users className="w-12 h-12 text-white" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handlePhotoChange(e, 'edit')}
                                                                className="hidden"
                                                                id={`edit-photo-${member.id}`}
                                                            />
                                                            <label
                                                                htmlFor={`edit-photo-${member.id}`}
                                                                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                                            >
                                                                <Camera className="w-4 h-4" />
                                                                {editForm.data.photo ? 'Ganti Foto' : 'Upload Foto'}
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Nama <span className="text-red-500">*</span>
                                                    </label>
                                                    <Input
                                                        value={editForm.data.name}
                                                        onChange={(e) => editForm.setData('name', e.target.value)}
                                                        placeholder="Masukkan nama..."
                                                        className="w-full"
                                                        required
                                                    />
                                                    {editForm.errors.name && (
                                                        <p className="text-xs text-red-600 mt-1">{editForm.errors.name}</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Jobdesc (pisahkan dengan koma) <span className="text-red-500">*</span>
                                                    </label>
                                                    <Input
                                                        value={editForm.data.jobdesc}
                                                        onChange={(e) => editForm.setData('jobdesc', e.target.value)}
                                                        placeholder="Contoh: Front-End, Robotik"
                                                        className="w-full"
                                                        required
                                                    />
                                                    {editForm.errors.jobdesc && (
                                                        <p className="text-xs text-red-600 mt-1">{editForm.errors.jobdesc}</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Penjelasan <span className="text-red-500">*</span>
                                                    </label>
                                                    <Textarea
                                                        value={editForm.data.description}
                                                        onChange={(e) => editForm.setData('description', e.target.value)}
                                                        placeholder="Masukkan penjelasan..."
                                                        rows={4}
                                                        className="w-full"
                                                        required
                                                    />
                                                    {editForm.errors.description && (
                                                        <p className="text-xs text-red-600 mt-1">{editForm.errors.description}</p>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Urutan
                                                        </label>
                                                        <Input
                                                            type="number"
                                                            value={editForm.data.order}
                                                            onChange={(e) => editForm.setData('order', parseInt(e.target.value) || 0)}
                                                            min="0"
                                                            className="w-full"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 pt-8">
                                                        <input
                                                            type="checkbox"
                                                            id={`active-${member.id}`}
                                                            checked={editForm.data.is_active}
                                                            onChange={(e) => editForm.setData('is_active', e.target.checked)}
                                                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                                        />
                                                        <label htmlFor={`active-${member.id}`} className="text-sm text-gray-700">
                                                            Aktif
                                                        </label>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <Button
                                                        type="submit"
                                                        disabled={editForm.processing}
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                    >
                                                        {editForm.processing ? (
                                                            <motion.div
                                                                animate={{ rotate: 360 }}
                                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                                                            />
                                                        ) : (
                                                            <>
                                                                <Save className="w-4 h-4 mr-2" />
                                                                Simpan
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={handleCancelEdit}
                                                        disabled={editForm.processing}
                                                    >
                                                        <X className="w-4 h-4 mr-2" />
                                                        Batal
                                                    </Button>
                                                </div>
                                            </form>
                                        ) : (
                                            // View Mode
                                            <>
                                                <div className="flex flex-col md:flex-row gap-4">
                                                    {/* Photo */}
                                                    <div className="flex-shrink-0">
                                                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center overflow-hidden shadow-lg mx-auto md:mx-0">
                                                            {member.photo_url ? (
                                                                <img 
                                                                    src={member.photo_url} 
                                                                    alt={member.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <Users className="w-12 h-12 md:w-16 md:h-16 text-white" />
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 text-center md:text-left">
                                                        <h4 className="text-xl font-bold text-gray-900 mb-2">
                                                            {member.name}
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-3">
                                                            {member.jobdesc.split(',').map((job, idx) => (
                                                                <Badge 
                                                                    key={idx}
                                                                    className="bg-green-100 text-green-700 text-xs"
                                                                >
                                                                    {job.trim()}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                        <p className="text-sm text-gray-700 leading-relaxed mb-4">
                                                            {member.description}
                                                        </p>
                                                        {!member.is_active && (
                                                            <Badge className="bg-gray-500 text-white text-xs">
                                                                Nonaktif
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                                    <span className="text-xs text-gray-500">Urutan: {member.order}</span>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(member)}
                                                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                                        >
                                                            <Edit className="w-4 h-4 mr-1" />
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelete(member.id)}
                                                            className="text-red-600 border-red-300 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-1" />
                                                            Hapus
                                                        </Button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </Card>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Add Member Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => {
                            setShowAddModal(false);
                            addForm.reset();
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200"
                        >
                            {/* Header */}
                            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-green-500 to-emerald-600">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-white">Tambah Anggota Tim</h3>
                                    <button
                                        onClick={() => {
                                            setShowAddModal(false);
                                            addForm.reset();
                                        }}
                                        className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleAdd} className="p-6 space-y-4">
                                {/* Photo Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Foto Profil
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center overflow-hidden shadow-lg">
                                            {addForm.data.photo ? (
                                                <img 
                                                    src={URL.createObjectURL(addForm.data.photo)} 
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <Users className="w-12 h-12 text-white" />
                                            )}
                                        </div>
                                        <div>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => handlePhotoChange(e, 'add')}
                                                className="hidden"
                                                id="add-photo"
                                                ref={fileInputRef}
                                            />
                                            <label
                                                htmlFor="add-photo"
                                                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                            >
                                                <Camera className="w-4 h-4" />
                                                Upload Foto
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nama <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        value={addForm.data.name}
                                        onChange={(e) => addForm.setData('name', e.target.value)}
                                        placeholder="Masukkan nama..."
                                        className="w-full"
                                        required
                                    />
                                    {addForm.errors.name && (
                                        <p className="text-xs text-red-600 mt-1">{addForm.errors.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Jobdesc (pisahkan dengan koma) <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        value={addForm.data.jobdesc}
                                        onChange={(e) => addForm.setData('jobdesc', e.target.value)}
                                        placeholder="Contoh: Front-End, Robotik"
                                        className="w-full"
                                        required
                                    />
                                    {addForm.errors.jobdesc && (
                                        <p className="text-xs text-red-600 mt-1">{addForm.errors.jobdesc}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Penjelasan <span className="text-red-500">*</span>
                                    </label>
                                    <Textarea
                                        value={addForm.data.description}
                                        onChange={(e) => addForm.setData('description', e.target.value)}
                                        placeholder="Masukkan penjelasan..."
                                        rows={6}
                                        className="w-full"
                                        required
                                    />
                                    {addForm.errors.description && (
                                        <p className="text-xs text-red-600 mt-1">{addForm.errors.description}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Urutan
                                        </label>
                                        <Input
                                            type="number"
                                            value={addForm.data.order}
                                            onChange={(e) => addForm.setData('order', parseInt(e.target.value) || 0)}
                                            min="0"
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 pt-8">
                                        <input
                                            type="checkbox"
                                            id="is_active"
                                            checked={addForm.data.is_active}
                                            onChange={(e) => addForm.setData('is_active', e.target.checked)}
                                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                        />
                                        <label htmlFor="is_active" className="text-sm text-gray-700">
                                            Aktif
                                        </label>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button
                                        type="submit"
                                        disabled={addForm.processing}
                                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                                    >
                                        {addForm.processing ? (
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mx-auto"
                                            />
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Simpan Anggota
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowAddModal(false);
                                            addForm.reset();
                                        }}
                                        disabled={addForm.processing}
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Batal
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AuthenticatedLayout>
    );
}


