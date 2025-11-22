import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { useRole } from '@/hooks/useRole';
import { KPetaniOnly } from '@/Components/RoleGuard';
import { User, MapPin, Calendar, Settings, Bell, Shield, HelpCircle, LogOut, ChevronRight, Edit, Package, TrendingUp, Users, Plus, UserPlus, Search, Filter, MoreVertical, Trash2, Power, Mail, Phone, X, CheckCircle2, XCircle, Key, Activity, Zap } from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import DeleteUserModal from '@/Components/Users/DeleteUserModal';
import BackButton from '@/Components/BackButton';

export default function Profil({ users = [], filters = {}, currentUser = null }) {
    const { auth, flash } = usePage().props;
    const user = auth?.user;
    const userRole = user?.role;
    const { isKPetani, canManageUsers } = useRole();
    const [showUserManagement, setShowUserManagement] = useState(false);
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [roleFilter, setRoleFilter] = useState(filters.role || 'all');
    const [showUserModal, setShowUserModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        username: '',
        id_kerja: '',
        phone: '',
        role: 'petani',
        password: '',
        password_confirmation: '',
    });
    const [profileFormData, setProfileFormData] = useState({
        name: '',
        email: '',
        username: '',
        id_kerja: '',
        phone: '',
    });
    const [errors, setErrors] = useState({});
    const [profileErrors, setProfileErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [enableSensorSimulation, setEnableSensorSimulation] = useState(
        currentUser?.enable_sensor_simulation || user?.enable_sensor_simulation || false
    );
    const [isTogglingSimulation, setIsTogglingSimulation] = useState(false);

    const userData = {
        name: user?.name || 'User',
        email: user?.email || 'user@email.com',
        phone: user?.phone || '+62 812-3456-7890',
        role: userRole === 'k-petani' ? 'K-Petani (IoT Connected)' : userRole === 'petani' ? 'Petani Umum' : 'Guest',
        location: 'Cirebon, Jawa Barat',
        joinDate: user?.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        }) : '15 Januari 2025',
        farmSize: '2.5 Ha',
        totalTrees: 95,
    };

    const handleLogout = () => {
        router.post(route('logout'));
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'k-petani':
                return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
            case 'petani':
                return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
            default:
                return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
        }
    };

    // Filter users berdasarkan search dan role
    const filteredUsers = (users || []).filter(u => {
        const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             u.phone?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const handleOpenUserManagement = () => {
        setShowUserManagement(true);
        // Fetch users dengan filter
        router.get(route('users.index'), {
            search: searchQuery,
            role: roleFilter,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleCloseUserManagement = () => {
        setShowUserManagement(false);
        setSearchQuery('');
        setRoleFilter('all');
    };

    const handleSearchChange = (value) => {
        setSearchQuery(value);
        router.get(route('users.index'), {
            search: value,
            role: roleFilter,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleRoleFilterChange = (value) => {
        setRoleFilter(value);
        router.get(route('users.index'), {
            search: searchQuery,
            role: value,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleOpenCreateModal = () => {
        setSelectedUser(null);
        setFormData({
            name: '',
            email: '',
            username: '',
            id_kerja: '',
            phone: '',
            role: 'petani',
            password: '',
            password_confirmation: '',
        });
        setErrors({});
        setShowUserModal(true);
    };

    const handleOpenEditModal = (user) => {
        setSelectedUser(user);
        setFormData({
            name: user.name || '',
            email: user.email || '',
            username: user.username || '',
            id_kerja: user.id_kerja || '',
            phone: user.phone || '',
            role: user.role || 'petani',
            password: '',
            password_confirmation: '',
        });
        setErrors({});
        setShowUserModal(true);
    };

    const handleCloseModal = () => {
        setShowUserModal(false);
        setSelectedUser(null);
        setFormData({
            name: '',
            email: '',
            username: '',
            id_kerja: '',
            phone: '',
            role: 'petani',
            password: '',
            password_confirmation: '',
        });
        setErrors({});
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});

        const submitData = { ...formData };
        // Jika edit dan password kosong, hapus dari submit
        if (selectedUser && !submitData.password) {
            delete submitData.password;
            delete submitData.password_confirmation;
        }

        if (selectedUser) {
            // Update user
            router.put(route('users.update', selectedUser.id), submitData, {
                preserveScroll: true,
                onSuccess: () => {
                    handleCloseModal();
                    router.reload({ only: ['users', 'flash'] });
                },
                onError: (errors) => {
                    setErrors(errors);
                    setIsSubmitting(false);
                },
            });
        } else {
            // Create user
            router.post(route('users.store'), submitData, {
                preserveScroll: true,
                onSuccess: () => {
                    handleCloseModal();
                    router.reload({ only: ['users', 'flash'] });
                },
                onError: (errors) => {
                    setErrors(errors);
                    setIsSubmitting(false);
                },
            });
        }
    };

    const handleDeleteUserClick = (userItem) => {
        setUserToDelete(userItem);
        setShowDeleteModal(true);
    };

    const handleDeleteUserConfirm = () => {
        if (userToDelete) {
            router.delete(route('users.destroy', userToDelete.id), {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload({ only: ['users', 'flash'] });
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                },
            });
        }
    };

    const handleToggleActive = (userId, currentStatus) => {
        router.post(route('users.toggle-active', userId), {}, {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({ only: ['users', 'flash'] });
            },
        });
    };

    const handleCloseProfileModal = () => {
        setShowProfileModal(false);
        setProfileFormData({
            name: '',
            email: '',
            username: '',
            id_kerja: '',
            phone: '',
        });
        setProfileErrors({});
    };

    const handleSubmitProfile = (e) => {
        e.preventDefault();
        setIsSubmittingProfile(true);
        setProfileErrors({});

        router.patch(route('profile.update'), profileFormData, {
            preserveScroll: true,
            onSuccess: () => {
                handleCloseProfileModal();
                router.reload({ only: ['auth', 'flash'] });
            },
            onError: (errors) => {
                setProfileErrors(errors);
                setIsSubmittingProfile(false);
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Profil Saya" />
            
            <DeleteUserModal
                show={showDeleteModal}
                user={userToDelete}
                onClose={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                }}
                onConfirm={handleDeleteUserConfirm}
            />
            
            <div className="min-h-screen relative overflow-hidden">
                <AnimatedBackground />
                <div className="relative p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
                    {/* Back Button */}
                    <div className="mb-4">
                        <BackButton href="/dashboard" />
                    </div>
                    
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 mb-6"
                    >
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                            <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                Profil Saya 👤
                            </h1>
                            <p className="text-sm text-gray-600">Kelola akun dan pengaturan Anda</p>
                        </div>
                    </motion.div>

                    {/* Profile Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="p-5 md:p-8 bg-gradient-to-br from-green-50 via-yellow-50 to-orange-50 border-2 border-green-200/50 shadow-xl">
                            <div className="flex items-start gap-4 md:gap-6">
                                <motion.div
                                    whileHover={{ scale: 1.05, rotate: 5 }}
                                    className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-green-500 to-yellow-500 rounded-full flex items-center justify-center text-3xl md:text-4xl flex-shrink-0 shadow-lg"
                                >
                                    👨‍🌾
                                </motion.div>
                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{userData.name}</h3>
                                            <Badge className={`${getRoleBadgeColor(userRole)} border-0 shadow-md`}>
                                                {userData.role}
                                            </Badge>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="border-green-500 text-green-600 hover:bg-green-50"
                                            onClick={() => {
                                                setProfileFormData({
                                                    name: user?.name || '',
                                                    email: user?.email || '',
                                                    username: user?.username || '',
                                                    id_kerja: user?.id_kerja || '',
                                                    phone: user?.phone || '',
                                                });
                                                setProfileErrors({});
                                                setShowProfileModal(true);
                                            }}
                                        >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit
                                        </Button>
                                    </div>
                                    <div className="space-y-2 mt-4 text-sm">
                                        <p className="text-gray-700 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-green-600" />
                                            {userData.location}
                                        </p>
                                        <p className="text-gray-700 flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-green-600" />
                                            Bergabung: {userData.joinDate}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Farm Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-gray-200/50 shadow-xl">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Statistik Kebun</h3>
                            <div className="grid grid-cols-3 gap-3 md:gap-4 text-center">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-md"
                                >
                                    <Package className="w-6 h-6 text-green-600 mx-auto mb-2" />
                                    <p className="text-2xl md:text-3xl font-bold text-green-600">{userData.farmSize}</p>
                                    <p className="text-xs md:text-sm text-gray-600 mt-1">Luas Kebun</p>
                                </motion.div>
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl border border-yellow-200 shadow-md"
                                >
                                    <TrendingUp className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                                    <p className="text-2xl md:text-3xl font-bold text-yellow-600">{userData.totalTrees}</p>
                                    <p className="text-xs md:text-sm text-gray-600 mt-1">Total Pohon</p>
                                </motion.div>
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200 shadow-md"
                                >
                                    <Package className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                                    <p className="text-2xl md:text-3xl font-bold text-orange-600">8</p>
                                    <p className="text-xs md:text-sm text-gray-600 mt-1">Blok Aktif</p>
                                </motion.div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Account Information */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-gray-200/50 shadow-xl">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Informasi Akun</h3>
                            <div className="space-y-3">
                                <motion.div
                                    whileHover={{ x: 5 }}
                                    className="flex items-center justify-between py-3 border-b border-gray-100"
                                >
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Email</p>
                                        <p className="text-gray-900 font-medium">{userData.email}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </motion.div>
                                <motion.div
                                    whileHover={{ x: 5 }}
                                    className="flex items-center justify-between py-3 border-b border-gray-100"
                                >
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Nomor Telepon</p>
                                        <p className="text-gray-900 font-medium">{userData.phone}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </motion.div>
                                <motion.div
                                    whileHover={{ x: 5 }}
                                    className="flex items-center justify-between py-3"
                                >
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Password</p>
                                        <p className="text-gray-900 font-medium">••••••••</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400" />
                                </motion.div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* K-Petani Only: User Management */}
                    <KPetaniOnly>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Card className="p-4 md:p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 border-2 border-green-300/50 shadow-xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                                            <Users className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">User Management</h3>
                                            <p className="text-sm text-gray-600">Kelola user dan petani</p>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        className="border-green-500 text-green-600 hover:bg-green-50"
                                        onClick={handleOpenCreateModal}
                                    >
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Tambah User
                                    </Button>
                                </div>
                                
                                <div className="space-y-3">
                                    <motion.div
                                        whileHover={{ x: 5, backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                                        className="flex items-center justify-between p-3 rounded-lg border border-green-200 bg-white/50 cursor-pointer"
                                        onClick={handleOpenUserManagement}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Users className="w-5 h-5 text-green-600" />
                                            <div>
                                                <p className="font-medium text-gray-900">Daftar User & Petani</p>
                                                <p className="text-xs text-gray-600">Lihat dan kelola semua user</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    </motion.div>
                                    
                                    <Link href={route('work-ids.index')}>
                                        <motion.div
                                            whileHover={{ x: 5, backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                                            className="flex items-center justify-between p-3 rounded-lg border border-green-200 bg-white/50 cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Key className="w-5 h-5 text-green-600" />
                                                <div>
                                                    <p className="font-medium text-gray-900">Manajemen ID Kerja</p>
                                                    <p className="text-xs text-gray-600">Buat dan kelola ID Kerja</p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                        </motion.div>
                                    </Link>
                                </div>
                            </Card>
                        </motion.div>
                    </KPetaniOnly>

                    {/* User Management Expanded View - Enhanced */}
                    <AnimatePresence>
                        {showUserManagement && (
                            <KPetaniOnly>
                                <motion.div
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                                    transition={{ duration: 0.3, ease: "easeOut" }}
                                    className="mt-6"
                                >
                                    <Card className="p-5 md:p-8 bg-gradient-to-br from-white via-green-50/30 to-emerald-50/20 backdrop-blur-xl border-2 border-green-300/60 shadow-2xl relative overflow-hidden">
                                        {/* Decorative Background Elements */}
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-emerald-400/10 to-green-400/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
                                        
                                        <div className="relative z-10">
                                            {/* Enhanced Header */}
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b-2 border-green-200/50">
                                                <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                                    <motion.div
                                                        animate={{ 
                                                            rotate: [0, 5, -5, 0],
                                                            scale: [1, 1.05, 1]
                                                        }}
                                                        transition={{ 
                                                            duration: 3, 
                                                            repeat: Infinity,
                                                            ease: "easeInOut"
                                                        }}
                                                        className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden flex-shrink-0"
                                                    >
                                                        <motion.div
                                                            animate={{ 
                                                                rotate: [0, 360],
                                                                scale: [1, 1.2, 1]
                                                            }}
                                                            transition={{ 
                                                                duration: 20, 
                                                                repeat: Infinity,
                                                                ease: "linear"
                                                            }}
                                                            className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"
                                                        />
                                                        <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white relative z-10 drop-shadow-lg" />
                                                    </motion.div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1">
                                                            Kelola User & Petani
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                                            <p className="text-xs sm:text-sm text-gray-600 font-medium">
                                                                Total: <span className="font-bold text-green-600">{filteredUsers.length}</span> user
                                                            </p>
                                                            <div className="w-1 h-1 bg-gray-400 rounded-full hidden sm:block"></div>
                                                            <p className="text-xs text-gray-500">
                                                                {users?.length || 0} total terdaftar
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                                                    <motion.div
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        className="flex-1 sm:flex-none"
                                                    >
                                                        <Button 
                                                            className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg border-0"
                                                            onClick={handleOpenCreateModal}
                                                        >
                                                            <UserPlus className="w-4 h-4 mr-2" />
                                                            <span className="hidden sm:inline">Tambah User</span>
                                                            <span className="sm:hidden">Tambah</span>
                                                        </Button>
                                                    </motion.div>
                                                    <motion.button
                                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={handleCloseUserManagement}
                                                        className="p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors shadow-md flex-shrink-0"
                                                        title="Tutup"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </motion.button>
                                                </div>
                                            </div>

                                            {/* Enhanced Search & Filter */}
                                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                                                <motion.div
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.1 }}
                                                    className="relative flex-1 w-full"
                                                >
                                                    <div className="relative">
                                                        <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 z-10" />
                                                        <input
                                                            type="text"
                                                            placeholder="Cari user berdasarkan nama, email, atau telepon..."
                                                            value={searchQuery}
                                                            onChange={(e) => handleSearchChange(e.target.value)}
                                                            className="w-full pl-10 sm:pl-12 pr-10 sm:pr-4 py-2.5 sm:py-3.5 bg-white/90 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/20 outline-none transition-all shadow-md hover:shadow-lg text-sm sm:text-base"
                                                        />
                                                        {searchQuery && (
                                                            <motion.button
                                                                initial={{ opacity: 0, scale: 0 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                onClick={() => handleSearchChange('')}
                                                                className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </motion.button>
                                                        )}
                                                    </div>
                                                </motion.div>
                                                <motion.div
                                                    initial={{ opacity: 0, x: 20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.15 }}
                                                    className="flex items-center gap-2 sm:gap-3"
                                                >
                                                    <div className="p-2 sm:p-2.5 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl border border-green-200 flex-shrink-0">
                                                        <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                                                    </div>
                                                    <select
                                                        value={roleFilter}
                                                        onChange={(e) => handleRoleFilterChange(e.target.value)}
                                                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-3.5 bg-white/90 backdrop-blur-sm border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-500/20 outline-none transition-all shadow-md hover:shadow-lg text-sm sm:text-base font-medium sm:min-w-[160px]"
                                                    >
                                                        <option value="all">📋 Semua Role</option>
                                                        <option value="k-petani">🌾 K-Petani</option>
                                                        <option value="petani">👨‍🌾 Petani</option>
                                                        <option value="guest">👤 Guest</option>
                                                    </select>
                                                </motion.div>
                                            </div>

                                            {/* Enhanced User List */}
                                            <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                                                <AnimatePresence mode="wait">
                                                    {filteredUsers.length > 0 ? (
                                                        filteredUsers.map((userItem, index) => (
                                                            <motion.div
                                                                key={userItem.id}
                                                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                                                                transition={{ 
                                                                    delay: index * 0.03,
                                                                    duration: 0.3,
                                                                    ease: "easeOut"
                                                                }}
                                                                whileHover={{ scale: 1.02, y: -2 }}
                                                            >
                                                                <Card className="p-5 border-2 border-gray-200/60 hover:border-green-400 bg-gradient-to-br from-white via-green-50/20 to-emerald-50/10 transition-all duration-300 shadow-md hover:shadow-xl relative overflow-hidden group">
                                                                    {/* Hover Glow Effect */}
                                                                    <div className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-green-400/5 to-green-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                                    
                                                                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                                        {/* Enhanced Avatar */}
                                                                        <motion.div
                                                                            whileHover={{ scale: 1.15, rotate: [0, -10, 10, -10, 0] }}
                                                                            transition={{ duration: 0.5 }}
                                                                            className="relative flex-shrink-0"
                                                                        >
                                                                            <div className="w-16 h-16 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-xl relative overflow-hidden">
                                                                                <motion.div
                                                                                    animate={{ 
                                                                                        rotate: [0, 360],
                                                                                        scale: [1, 1.2, 1]
                                                                                    }}
                                                                                    transition={{ 
                                                                                        duration: 10, 
                                                                                        repeat: Infinity,
                                                                                        ease: "linear"
                                                                                    }}
                                                                                    className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent"
                                                                                />
                                                                                <span className="relative z-10 drop-shadow-lg">
                                                                                    {userItem.name.charAt(0).toUpperCase()}
                                                                                </span>
                                                                            </div>
                                                                            {/* Status Indicator */}
                                                                            <motion.div
                                                                                animate={{ 
                                                                                    scale: userItem.is_active ? [1, 1.2, 1] : 1,
                                                                                    opacity: userItem.is_active ? [0.8, 1, 0.8] : 0.5
                                                                                }}
                                                                                transition={{ 
                                                                                    duration: 2, 
                                                                                    repeat: Infinity,
                                                                                    ease: "easeInOut"
                                                                                }}
                                                                                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white shadow-lg ${
                                                                                    userItem.is_active ? 'bg-green-500' : 'bg-gray-400'
                                                                                }`}
                                                                            />
                                                                        </motion.div>

                                                                        {/* Enhanced User Info */}
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex flex-col gap-2 sm:gap-3 mb-2 sm:mb-3">
                                                                                <div className="flex-1">
                                                                                    <h4 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900 mb-2 group-hover:text-green-700 transition-colors break-words">
                                                                                        {userItem.name}
                                                                                    </h4>
                                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                                        <Badge className={`${getRoleBadgeColor(userItem.role)} text-xs px-2 sm:px-3 py-0.5 sm:py-1 border-0 shadow-md`}>
                                                                                            {userItem.role === 'k-petani' ? '🌾 K-Petani' : userItem.role === 'petani' ? '👨‍🌾 Petani' : '👤 Guest'}
                                                                                        </Badge>
                                                                                        {userItem.is_active ? (
                                                                                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 sm:px-3 py-0.5 sm:py-1 flex items-center gap-1.5 border-0 shadow-md">
                                                                                                <motion.div
                                                                                                    animate={{ scale: [1, 1.2, 1] }}
                                                                                                    transition={{ duration: 1.5, repeat: Infinity }}
                                                                                                >
                                                                                                    <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                                                                </motion.div>
                                                                                                <span className="hidden sm:inline">Aktif</span>
                                                                                                <span className="sm:hidden">✓</span>
                                                                                            </Badge>
                                                                                        ) : (
                                                                                            <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs px-2 sm:px-3 py-0.5 sm:py-1 flex items-center gap-1.5 border-0 shadow-md">
                                                                                                <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                                                                <span className="hidden sm:inline">Nonaktif</span>
                                                                                                <span className="sm:hidden">✗</span>
                                                                                            </Badge>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            
                                                                            <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                                                                                <motion.p
                                                                                    whileHover={{ x: 5 }}
                                                                                    className="text-gray-700 flex items-center gap-2 font-medium"
                                                                                >
                                                                                    <div className="p-1 sm:p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
                                                                                        <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                                                                                    </div>
                                                                                    <span className="truncate break-all">{userItem.email}</span>
                                                                                </motion.p>
                                                                                <motion.p
                                                                                    whileHover={{ x: 5 }}
                                                                                    className="text-gray-700 flex items-center gap-2 font-medium"
                                                                                >
                                                                                    <div className="p-1 sm:p-1.5 bg-green-100 rounded-lg flex-shrink-0">
                                                                                        <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                                                                                    </div>
                                                                                    <span className="break-all">{userItem.phone || 'Tidak ada'}</span>
                                                                                </motion.p>
                                                                                <motion.p
                                                                                    whileHover={{ x: 5 }}
                                                                                    className="text-gray-500 text-xs flex items-center gap-2"
                                                                                >
                                                                                    <div className="p-1 bg-gray-100 rounded-lg flex-shrink-0">
                                                                                        <Calendar className="w-3 h-3 text-gray-600" />
                                                                                    </div>
                                                                                    <span className="break-words">
                                                                                        Bergabung: {new Date(userItem.created_at).toLocaleDateString('id-ID', { 
                                                                                            day: 'numeric', 
                                                                                            month: 'long', 
                                                                                            year: 'numeric' 
                                                                                        })}
                                                                                    </span>
                                                                                </motion.p>
                                                                            </div>
                                                                        </div>

                                                                        {/* Enhanced Actions */}
                                                                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap sm:flex-nowrap">
                                                                            <motion.button
                                                                                whileHover={{ scale: 1.1, y: -2 }}
                                                                                whileTap={{ scale: 0.9 }}
                                                                                onClick={() => handleOpenEditModal(userItem)}
                                                                                className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg hover:shadow-xl"
                                                                                title="Edit User"
                                                                            >
                                                                                <Edit className="w-4 h-4" />
                                                                            </motion.button>
                                                                            <motion.button
                                                                                whileHover={{ scale: 1.1, y: -2 }}
                                                                                whileTap={{ scale: 0.9 }}
                                                                                onClick={() => handleToggleActive(userItem.id, userItem.is_active)}
                                                                                className={`p-3 rounded-xl transition-all shadow-lg hover:shadow-xl ${
                                                                                    userItem.is_active 
                                                                                        ? 'bg-gradient-to-br from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white' 
                                                                                        : 'bg-gradient-to-br from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
                                                                                }`}
                                                                                title={userItem.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                                            >
                                                                                <Power className="w-4 h-4" />
                                                                            </motion.button>
                                                                            <motion.button
                                                                                whileHover={{ scale: 1.1, y: -2 }}
                                                                                whileTap={{ scale: 0.9 }}
                                                                                onClick={() => handleDeleteUserClick(userItem)}
                                                                                className="p-3 rounded-xl bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all shadow-lg hover:shadow-xl"
                                                                                title="Hapus User"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </motion.button>
                                                                        </div>
                                                                    </div>
                                                                </Card>
                                                            </motion.div>
                                                        ))
                                                    ) : (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className="text-center py-16"
                                                        >
                                                            <motion.div
                                                                animate={{ 
                                                                    scale: [1, 1.1, 1],
                                                                    rotate: [0, 5, -5, 0]
                                                                }}
                                                                transition={{ 
                                                                    duration: 3, 
                                                                    repeat: Infinity,
                                                                    ease: "easeInOut"
                                                                }}
                                                                className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
                                                            >
                                                                <Users className="w-12 h-12 text-gray-400" />
                                                            </motion.div>
                                                            <h4 className="text-xl font-bold text-gray-700 mb-2">Tidak ada user ditemukan</h4>
                                                            <p className="text-sm text-gray-500 mb-4">Coba ubah filter atau kata kunci pencarian</p>
                                                            <motion.button
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => {
                                                                    setSearchQuery('');
                                                                    setRoleFilter('all');
                                                                    handleSearchChange('');
                                                                    handleRoleFilterChange('all');
                                                                }}
                                                                className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-medium"
                                                            >
                                                                Reset Filter
                                                            </motion.button>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            </KPetaniOnly>
                        )}
                    </AnimatePresence>

                    {/* Sensor Simulation Settings */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: isKPetani ? 0.5 : 0.4 }}
                    >
                        <Card className="p-4 md:p-6 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 border-2 border-blue-200/50 shadow-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                                    <Activity className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900">Simulasi Data Sensor</h3>
                                    <p className="text-sm text-gray-600">Aktifkan untuk mengubah data sensor otomatis setiap 5 detik</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-xl border-2 border-blue-200">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                        enableSensorSimulation 
                                            ? 'bg-gradient-to-br from-blue-500 to-cyan-500' 
                                            : 'bg-gray-200'
                                    } transition-all`}>
                                        <Zap className={`w-6 h-6 ${
                                            enableSensorSimulation ? 'text-white' : 'text-gray-400'
                                        }`} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">
                                            {enableSensorSimulation ? 'Simulasi Aktif' : 'Simulasi Nonaktif'}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                            {enableSensorSimulation 
                                                ? 'Data sensor akan berubah setiap 5 detik' 
                                                : 'Aktifkan untuk mulai simulasi'}
                                        </p>
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={async () => {
                                        setIsTogglingSimulation(true);
                                        try {
                                            const response = await fetch('/api/profile/toggle-sensor-simulation', {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                                                },
                                                credentials: 'same-origin',
                                            });

                                            const data = await response.json();
                                            
                                            if (data.success) {
                                                setEnableSensorSimulation(data.enable_sensor_simulation);
                                                // Show notification
                                                router.reload({ 
                                                    only: ['auth'],
                                                    preserveScroll: true,
                                                });
                                            } else {
                                                alert('Gagal mengubah pengaturan: ' + (data.message || 'Unknown error'));
                                            }
                                        } catch (error) {
                                            console.error('Error toggling simulation:', error);
                                            alert('Terjadi kesalahan saat mengubah pengaturan');
                                        } finally {
                                            setIsTogglingSimulation(false);
                                        }
                                    }}
                                    disabled={isTogglingSimulation}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                        enableSensorSimulation ? 'bg-blue-600' : 'bg-gray-300'
                                    }`}
                                >
                                    <motion.span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            enableSensorSimulation ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                        layout
                                    />
                                </motion.button>
                            </div>
                            {enableSensorSimulation && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-4 p-3 bg-blue-100/50 border border-blue-300 rounded-xl"
                                >
                                    <p className="text-xs text-blue-800 font-medium">
                                        💡 <strong>Catatan:</strong> Jalankan command <code className="bg-blue-200 px-1 rounded">php artisan sensor:simulate</code> di terminal untuk mulai simulasi. Command akan berjalan terus dan update data sensor setiap 5 detik.
                                    </p>
                                </motion.div>
                            )}
                        </Card>
                    </motion.div>

                    {/* Notification Settings */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: isKPetani ? 0.6 : 0.5 }}
                    >
                        <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-green-200/50 shadow-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                                    <Bell className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Pengaturan Notifikasi</h3>
                            </div>
                            <div className="space-y-4">
                                {[
                                    { id: 'notif-deteksi', label: 'Hasil Deteksi Kematangan', checked: true },
                                    { id: 'notif-penyiraman', label: 'Status Penyiraman', checked: true },
                                    { id: 'notif-prediksi', label: 'Prediksi Panen', checked: true },
                                    { id: 'notif-artikel', label: 'Artikel & Tips Baru', checked: false },
                                ].map((notif) => (
                                    <div key={notif.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                        <label htmlFor={notif.id} className="text-sm font-medium text-gray-700 cursor-pointer">
                                            {notif.label}
                                        </label>
                                        <input
                                            type="checkbox"
                                            id={notif.id}
                                            defaultChecked={notif.checked}
                                            className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Menu Items */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: isKPetani ? 0.7 : 0.6 }}
                        className="space-y-3"
                    >
                        {[
                            { icon: HelpCircle, label: 'Bantuan & Dukungan', href: '#' },
                            { icon: Shield, label: 'Privasi & Keamanan', href: '#' },
                            { icon: Settings, label: 'Pengaturan Umum', href: '#' },
                        ].map((item, index) => (
                            <motion.div
                                key={item.label}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5 + index * 0.1 }}
                                whileHover={{ scale: 1.02, x: 5 }}
                            >
                                <Card className="p-4 border-2 border-gray-200 hover:border-green-500 hover:bg-green-50/50 transition-all cursor-pointer shadow-md">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <item.icon className="w-5 h-5 text-gray-600" />
                                            <span className="text-gray-900 font-medium">{item.label}</span>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* IoT Status (for K-Petani) */}
                    {userRole === 'k-petani' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: isKPetani ? 0.8 : 0.7 }}
                        >
                            <Card className="p-4 md:p-6 bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 border-2 border-blue-200/50 shadow-xl">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="text-lg font-bold text-gray-900">Status Koneksi IoT</h4>
                                        <p className="text-sm text-gray-600">Semua sensor terhubung</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <motion.div
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="w-3 h-3 bg-green-500 rounded-full"
                                        />
                                        <span className="text-sm font-bold text-green-600">Active</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {['Sensor Suhu', 'Sensor Kelembapan', 'Sistem Penyiraman', 'AI Detection'].map((sensor, index) => (
                                        <motion.div
                                            key={sensor}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.6 + index * 0.1 }}
                                            whileHover={{ scale: 1.05 }}
                                            className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-white/50 shadow-md"
                                        >
                                            <p className="text-xs text-gray-600 mb-1">{sensor}</p>
                                            <p className="text-sm font-bold text-green-600">✓ Online</p>
                                        </motion.div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* App Info */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: isKPetani ? 0.9 : 0.8 }}
                    >
                        <Card className="p-4 bg-gray-50 border-2 border-gray-200 shadow-md">
                            <div className="text-center text-sm text-gray-600 space-y-2">
                                <p className="font-bold text-gray-700">MOV Platform v1.0.0</p>
                                <p>© 2025 MOV Platform. All rights reserved.</p>
                                <div className="flex justify-center gap-3 mt-3">
                                    <button className="text-green-600 hover:underline font-medium">Kebijakan Privasi</button>
                                    <span className="text-gray-400">•</span>
                                    <button className="text-green-600 hover:underline font-medium">Syarat & Ketentuan</button>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Logout Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: isKPetani ? 1.0 : 0.9 }}
                    >
                        <Button
                            onClick={handleLogout}
                            variant="outline"
                            className="w-full border-2 border-red-500 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2 h-12 font-medium shadow-md"
                        >
                            <LogOut className="w-5 h-5" />
                            Keluar dari Akun
                        </Button>
                    </motion.div>

                    {/* Success/Error Messages */}
                    {flash?.success && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="fixed top-20 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg"
                        >
                            {flash.success}
                        </motion.div>
                    )}

                    {flash?.error && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="fixed top-20 right-4 z-50 bg-red-500 text-white px-6 py-3 rounded-xl shadow-lg"
                        >
                            {flash.error}
                        </motion.div>
                    )}

                    {/* User Modal/Form */}
                    <AnimatePresence>
                        {showUserModal && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                                onClick={handleCloseModal}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                                >
                                    <div className="p-6 border-b border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-2xl font-bold text-gray-900">
                                                {selectedUser ? 'Edit User' : 'Tambah User Baru'}
                                            </h2>
                                            <button
                                                onClick={handleCloseModal}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <X className="w-5 h-5 text-gray-500" />
                                            </button>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                        {/* Name */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nama Lengkap <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none transition-all ${
                                                    errors.name ? 'border-red-500' : 'border-gray-200 focus:border-green-500'
                                                }`}
                                                required
                                            />
                                            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none transition-all ${
                                                    errors.email ? 'border-red-500' : 'border-gray-200 focus:border-green-500'
                                                }`}
                                                required
                                            />
                                            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                                        </div>

                                        {/* Username & ID Kerja */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Username
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.username}
                                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                    className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none transition-all ${
                                                        errors.username ? 'border-red-500' : 'border-gray-200 focus:border-green-500'
                                                    }`}
                                                />
                                                {errors.username && <p className="mt-1 text-sm text-red-500">{errors.username}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    ID Kerja
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.id_kerja}
                                                    onChange={(e) => setFormData({ ...formData, id_kerja: e.target.value })}
                                                    className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none transition-all ${
                                                        errors.id_kerja ? 'border-red-500' : 'border-gray-200 focus:border-green-500'
                                                    }`}
                                                />
                                                {errors.id_kerja && <p className="mt-1 text-sm text-red-500">{errors.id_kerja}</p>}
                                            </div>
                                        </div>

                                        {/* Phone & Role */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Nomor Telepon
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none transition-all ${
                                                        errors.phone ? 'border-red-500' : 'border-gray-200 focus:border-green-500'
                                                    }`}
                                                />
                                                {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Role <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={formData.role}
                                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                    className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none transition-all ${
                                                        errors.role ? 'border-red-500' : 'border-gray-200 focus:border-green-500'
                                                    }`}
                                                    required
                                                >
                                                    <option value="petani">Petani</option>
                                                    <option value="k-petani">K-Petani</option>
                                                    <option value="guest">Guest</option>
                                                </select>
                                                {errors.role && <p className="mt-1 text-sm text-red-500">{errors.role}</p>}
                                            </div>
                                        </div>

                                        {/* Password */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    {selectedUser ? 'Password Baru (kosongkan jika tidak diubah)' : 'Password'} <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none transition-all ${
                                                        errors.password ? 'border-red-500' : 'border-gray-200 focus:border-green-500'
                                                    }`}
                                                    required={!selectedUser}
                                                />
                                                {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Konfirmasi Password <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="password"
                                                    value={formData.password_confirmation}
                                                    onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                                                    className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none transition-all ${
                                                        errors.password_confirmation ? 'border-red-500' : 'border-gray-200 focus:border-green-500'
                                                    }`}
                                                    required={!selectedUser}
                                                />
                                                {errors.password_confirmation && <p className="mt-1 text-sm text-red-500">{errors.password_confirmation}</p>}
                                            </div>
                                        </div>

                                        {/* Form Actions */}
                                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleCloseModal}
                                                disabled={isSubmitting}
                                            >
                                                Batal
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={isSubmitting}
                                                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                            >
                                                {isSubmitting ? 'Menyimpan...' : selectedUser ? 'Update User' : 'Buat User'}
                                            </Button>
                                        </div>
                                    </form>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Profile Edit Modal */}
                    <AnimatePresence>
                        {showProfileModal && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                                onClick={handleCloseProfileModal}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.9, opacity: 0 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                                >
                                    <div className="p-6 border-b border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-2xl font-bold text-gray-900">
                                                Edit Profile
                                            </h2>
                                            <button
                                                onClick={handleCloseProfileModal}
                                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <X className="w-5 h-5 text-gray-500" />
                                            </button>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSubmitProfile} className="p-6 space-y-4">
                                        {/* Name */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nama Lengkap <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={profileFormData.name}
                                                onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
                                                className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none transition-all ${
                                                    profileErrors.name ? 'border-red-500' : 'border-gray-200 focus:border-green-500'
                                                }`}
                                                required
                                            />
                                            {profileErrors.name && <p className="mt-1 text-sm text-red-500">{profileErrors.name}</p>}
                                        </div>

                                        {/* Email */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={profileFormData.email}
                                                onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                                                className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none transition-all ${
                                                    profileErrors.email ? 'border-red-500' : 'border-gray-200 focus:border-green-500'
                                                }`}
                                                required
                                            />
                                            {profileErrors.email && <p className="mt-1 text-sm text-red-500">{profileErrors.email}</p>}
                                        </div>

                                        {/* Username & ID Kerja */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Username
                                                </label>
                                                <input
                                                    type="text"
                                                    value={profileFormData.username}
                                                    onChange={(e) => setProfileFormData({ ...profileFormData, username: e.target.value })}
                                                    className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none transition-all ${
                                                        profileErrors.username ? 'border-red-500' : 'border-gray-200 focus:border-green-500'
                                                    }`}
                                                />
                                                {profileErrors.username && <p className="mt-1 text-sm text-red-500">{profileErrors.username}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    ID Kerja
                                                </label>
                                                <input
                                                    type="text"
                                                    value={profileFormData.id_kerja}
                                                    onChange={(e) => setProfileFormData({ ...profileFormData, id_kerja: e.target.value })}
                                                    className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none transition-all ${
                                                        profileErrors.id_kerja ? 'border-red-500' : 'border-gray-200 focus:border-green-500'
                                                    }`}
                                                />
                                                {profileErrors.id_kerja && <p className="mt-1 text-sm text-red-500">{profileErrors.id_kerja}</p>}
                                            </div>
                                        </div>

                                        {/* Phone */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nomor Telepon
                                            </label>
                                            <input
                                                type="tel"
                                                value={profileFormData.phone}
                                                onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                                                className={`w-full px-4 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-green-500/20 outline-none transition-all ${
                                                    profileErrors.phone ? 'border-red-500' : 'border-gray-200 focus:border-green-500'
                                                }`}
                                            />
                                            {profileErrors.phone && <p className="mt-1 text-sm text-red-500">{profileErrors.phone}</p>}
                                        </div>

                                        {/* Form Actions */}
                                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleCloseProfileModal}
                                                disabled={isSubmittingProfile}
                                            >
                                                Batal
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={isSubmittingProfile}
                                                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                            >
                                                {isSubmittingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
                                            </Button>
                                        </div>
                                    </form>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

