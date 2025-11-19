import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { useRole } from '@/hooks/useRole';
import { KPetaniOnly } from '@/Components/RoleGuard';
import { User, MapPin, Calendar, Settings, Bell, Shield, HelpCircle, LogOut, ChevronRight, Edit, Package, TrendingUp, Users, Plus, UserPlus, Search, Filter, MoreVertical, Trash2, Power, Mail, Phone, X, CheckCircle2, XCircle, Key } from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';

export default function Profil({ users = [], filters = {} }) {
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

    const handleDeleteUser = (userId) => {
        if (confirm('Apakah Anda yakin ingin menghapus user ini?')) {
            router.delete(route('users.destroy', userId), {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload({ only: ['users', 'flash'] });
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
            
            <div className="min-h-screen relative overflow-hidden">
                <AnimatedBackground />
                <div className="relative p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
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

                    {/* User Management Expanded View */}
                    <AnimatePresence>
                        {showUserManagement && (
                            <KPetaniOnly>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    transition={{ delay: 0.5 }}
                                    className="mt-6"
                                >
                                    <Card className="p-4 md:p-6 bg-white/90 backdrop-blur-xl border-2 border-green-300/50 shadow-2xl">
                                        {/* Header dengan Close Button */}
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                                                    <Users className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900">Kelola User & Petani</h3>
                                                    <p className="text-sm text-gray-600">Total: {filteredUsers.length} user</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    className="border-green-500 text-green-600 hover:bg-green-50"
                                                    onClick={handleOpenCreateModal}
                                                >
                                                    <UserPlus className="w-4 h-4 mr-2" />
                                                    Tambah User
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    className="border-gray-300 text-gray-600 hover:bg-gray-50"
                                                    onClick={handleCloseUserManagement}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Search & Filter */}
                                        <div className="flex flex-col md:flex-row gap-3 mb-6">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Cari user berdasarkan nama atau email..."
                                                    value={searchQuery}
                                                    onChange={(e) => handleSearchChange(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Filter className="w-5 h-5 text-gray-400" />
                                                <select
                                                    value={roleFilter}
                                                    onChange={(e) => handleRoleFilterChange(e.target.value)}
                                                    className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none transition-all"
                                                >
                                                    <option value="all">Semua Role</option>
                                                    <option value="k-petani">K-Petani</option>
                                                    <option value="petani">Petani</option>
                                                    <option value="guest">Guest</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* User List */}
                                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                            <AnimatePresence>
                                                {filteredUsers.length > 0 ? (
                                                    filteredUsers.map((userItem, index) => (
                                                        <motion.div
                                                            key={userItem.id}
                                                            initial={{ opacity: 0, x: -20 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: 20 }}
                                                            transition={{ delay: index * 0.05 }}
                                                            whileHover={{ scale: 1.02, x: 5 }}
                                                        >
                                                            <Card className="p-4 border-2 border-gray-200 hover:border-green-300 bg-gradient-to-r from-white to-green-50/30 transition-all shadow-md hover:shadow-lg">
                                                                <div className="flex items-start gap-4">
                                                                    {/* Avatar */}
                                                                    <motion.div
                                                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                                                        className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0"
                                                                    >
                                                                        {userItem.name.charAt(0).toUpperCase()}
                                                                    </motion.div>

                                                                    {/* User Info */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-start justify-between mb-2">
                                                                            <div>
                                                                                <h4 className="font-bold text-gray-900 mb-1">{userItem.name}</h4>
                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                    <Badge className={`${getRoleBadgeColor(userItem.role)} text-xs`}>
                                                                                        {userItem.role === 'k-petani' ? 'K-Petani' : userItem.role === 'petani' ? 'Petani' : 'Guest'}
                                                                                    </Badge>
                                                                                    {userItem.is_active ? (
                                                                                        <Badge className="bg-green-100 text-green-700 text-xs flex items-center gap-1">
                                                                                            <CheckCircle2 className="w-3 h-3" />
                                                                                            Aktif
                                                                                        </Badge>
                                                                                    ) : (
                                                                                        <Badge className="bg-red-100 text-red-700 text-xs flex items-center gap-1">
                                                                                            <XCircle className="w-3 h-3" />
                                                                                            Nonaktif
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <div className="space-y-1.5 text-sm">
                                                                            <p className="text-gray-600 flex items-center gap-2">
                                                                                <Mail className="w-4 h-4 text-green-600" />
                                                                                {userItem.email}
                                                                            </p>
                                                                            <p className="text-gray-600 flex items-center gap-2">
                                                                                <Phone className="w-4 h-4 text-green-600" />
                                                                                {userItem.phone}
                                                                            </p>
                                                                            <p className="text-gray-500 text-xs flex items-center gap-2">
                                                                                <Calendar className="w-3 h-3" />
                                                                                Bergabung: {new Date(userItem.created_at).toLocaleDateString('id-ID', { 
                                                                                    day: 'numeric', 
                                                                                    month: 'long', 
                                                                                    year: 'numeric' 
                                                                                })}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Actions */}
                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                        <motion.button
                                                                            whileHover={{ scale: 1.1 }}
                                                                            whileTap={{ scale: 0.9 }}
                                                                            onClick={() => handleOpenEditModal(userItem)}
                                                                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                                            title="Edit User"
                                                                        >
                                                                            <Edit className="w-4 h-4" />
                                                                        </motion.button>
                                                                        <motion.button
                                                                            whileHover={{ scale: 1.1 }}
                                                                            whileTap={{ scale: 0.9 }}
                                                                            onClick={() => handleToggleActive(userItem.id, userItem.is_active)}
                                                                            className={`p-2 rounded-lg transition-colors ${
                                                                                userItem.is_active 
                                                                                    ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' 
                                                                                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                                                                            }`}
                                                                            title={userItem.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                                        >
                                                                            <Power className="w-4 h-4" />
                                                                        </motion.button>
                                                                        <motion.button
                                                                            whileHover={{ scale: 1.1 }}
                                                                            whileTap={{ scale: 0.9 }}
                                                                            onClick={() => handleDeleteUser(userItem.id)}
                                                                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
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
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        className="text-center py-12"
                                                    >
                                                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                                        <p className="text-gray-600 font-medium">Tidak ada user ditemukan</p>
                                                        <p className="text-sm text-gray-500 mt-1">Coba ubah filter atau kata kunci pencarian</p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </Card>
                                </motion.div>
                            </KPetaniOnly>
                        )}
                    </AnimatePresence>

                    {/* Notification Settings */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: isKPetani ? 0.5 : 0.4 }}
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
                        transition={{ delay: 0.5 }}
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
                            transition={{ delay: 0.6 }}
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
                        transition={{ delay: 0.7 }}
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
                        transition={{ delay: 0.8 }}
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

