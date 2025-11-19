import { useState, useEffect } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card } from '@/Components/ui/card';
import { Mail, Lock, User, Phone, Eye, EyeOff, Sparkles } from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';

export default function LoginRegister({ canResetPassword, status, isRegister = false }) {
    const [isLogin, setIsLogin] = useState(!isRegister);
    
    useEffect(() => {
        setIsLogin(!isRegister);
    }, [isRegister]);
    const [selectedRole, setSelectedRole] = useState('petani');
    const [showForgotPassword, setShowForgotPassword] = useState(false);

    const loginForm = useForm({
        username: '',
        password: '',
        remember: false,
    });

    const registerForm = useForm({
        name: '',
        email: '',
        username: '',
        id_kerja: '',
        phone: '',
        password: '',
        password_confirmation: '',
        role: 'petani',
    });

    const handleLogin = (e) => {
        e.preventDefault();
        loginForm.post(route('login'), {
            onFinish: () => loginForm.reset('password'),
        });
    };

    const handleRegister = (e) => {
        e.preventDefault();
        registerForm.post(route('register'), {
            onFinish: () => registerForm.reset('password', 'password_confirmation'),
        });
    };

    const handleForgotPassword = () => {
        setShowForgotPassword(true);
        setTimeout(() => setShowForgotPassword(false), 3000);
    };

    // Animated mangoes
    const mangoes = [
        { id: 1, left: '10%', delay: 0, duration: 3, stemLength: 45 },
        { id: 2, left: '30%', delay: 0.5, duration: 3.5, stemLength: 55 },
        { id: 3, left: '50%', delay: 1, duration: 2.8, stemLength: 40 },
        { id: 4, left: '70%', delay: 0.3, duration: 3.2, stemLength: 50 },
        { id: 5, left: '90%', delay: 0.8, duration: 3.3, stemLength: 42 },
    ];

    return (
        <>
            <Head title={isLogin ? "Login" : "Register"} />
            
            {/* DESKTOP LAYOUT */}
            <div className="hidden lg:flex h-screen w-screen overflow-hidden fixed inset-0">
                {/* LEFT SIDE - Visual/Animations */}
                <div className="flex-1 relative overflow-hidden flex items-center justify-center">
                    {/* Animated Background - Same as Dashboard */}
                    <AnimatedBackground />

                    {/* Animated Mangoes */}
                    <div className="absolute inset-0 pointer-events-none z-10">
                        {mangoes.map((mango) => (
                            <motion.div
                                key={mango.id}
                                className="absolute"
                                style={{ left: mango.left, top: '8px' }}
                                initial={{ y: 0, rotate: 0 }}
                                animate={{
                                    y: [0, 12, 0],
                                    rotate: [-8, 8, -8],
                                }}
                                transition={{
                                    duration: mango.duration,
                                    repeat: Infinity,
                                    delay: mango.delay,
                                    ease: [0.45, 0.05, 0.55, 0.95],
                                }}
                            >
                                <div className="flex flex-col items-center">
                                    <motion.div
                                        className="w-1.5 bg-gradient-to-b from-green-700 via-green-600 to-green-500 rounded-full shadow-sm"
                                        style={{ height: `${mango.stemLength}px` }}
                                        animate={{
                                            scaleX: [1, 0.8, 1.2, 1],
                                            rotateZ: [0, -2, 2, 0],
                                        }}
                                        transition={{
                                            duration: mango.duration * 0.8,
                                            repeat: Infinity,
                                            delay: mango.delay,
                                            ease: "easeInOut",
                                        }}
                                    />
                                    <motion.div
                                        className="relative"
                                        animate={{
                                            scale: [1, 1.05, 0.98, 1],
                                            rotateZ: [0, -2, 2, 0],
                                        }}
                                        transition={{
                                            duration: mango.duration * 0.6,
                                            repeat: Infinity,
                                            delay: mango.delay + 0.2,
                                            ease: "easeInOut",
                                        }}
                                    >
                                        <div className="w-11 h-13 bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 rounded-full relative shadow-xl"
                                            style={{ borderRadius: '45% 50% 50% 48% / 48% 45% 52% 50%' }}
                                        >
                                            <div className="absolute top-2 left-2 w-3.5 h-4 bg-gradient-to-br from-white via-yellow-100 to-transparent rounded-full opacity-80"></div>
                                            <div className="absolute top-3.5 left-1.5 w-2 h-2 bg-white rounded-full opacity-50"></div>
                                            <div className="absolute top-1.5 right-1.5 w-5 h-6 bg-gradient-to-br from-red-400 via-pink-400 to-transparent rounded-full opacity-50"></div>
                                        </div>
                                        <div className="absolute -top-1.5 right-1">
                                            <div className="w-4 h-2.5 bg-gradient-to-br from-green-400 to-green-600 rounded-full transform rotate-45 shadow-md"></div>
                                        </div>
                                    </motion.div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Animated Grass */}
                    <div className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none overflow-hidden z-10">
                        {Array.from({ length: 90 }).map((_, i) => {
                            const layer = i < 30 ? 'back' : i < 60 ? 'mid' : 'front';
                            const randomHeight = layer === 'back' ? 22 + Math.random() * 28 : layer === 'mid' ? 28 + Math.random() * 32 : 32 + Math.random() * 36;
                            const randomLeft = Math.random() * 100;
                            const randomDelay = Math.random() * 3;
                            const randomDuration = 2 + Math.random() * 2;
                            const randomRotation = -8 + Math.random() * 16;
                            const swayAmount = 5 + Math.random() * 10;
                            
                            return (
                                <motion.div
                                    key={i}
                                    className="absolute bottom-0"
                                    style={{
                                        left: `${randomLeft}%`,
                                        height: `${randomHeight}px`,
                                    }}
                                    animate={{
                                        rotateZ: [randomRotation - swayAmount, randomRotation + swayAmount, randomRotation - swayAmount],
                                        scaleY: [1, 1.08, 1],
                                        x: [-2, 2, -2],
                                    }}
                                    transition={{
                                        duration: randomDuration,
                                        repeat: Infinity,
                                        delay: randomDelay,
                                        ease: [0.45, 0.05, 0.55, 0.95],
                                    }}
                                >
                                    <div className={`${layer === 'back' ? 'w-1 opacity-70 bg-gradient-to-t from-green-700 via-green-600 to-green-500' : layer === 'mid' ? 'w-1.5 opacity-85 bg-gradient-to-t from-green-600 via-green-500 to-green-400' : 'w-2 bg-gradient-to-t from-green-500 via-green-400 to-green-300'} h-full rounded-t-full origin-bottom shadow-sm`}></div>
                                </motion.div>
                            );
                        })}
                        <div className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-green-800 via-green-700 to-transparent"></div>
                    </div>

                    {/* Logo & Welcome */}
                    <div className="text-center relative z-10">
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ 
                                duration: 0.8, 
                                ease: [0.34, 1.56, 0.64, 1],
                                delay: 0.2 
                            }}
                            className="mx-auto mb-2"
                        >
                            <img 
                                src="/mov-logo.png" 
                                alt="MOV Logo" 
                                className="w-40 h-auto mx-auto drop-shadow-2xl"
                            />
                        </motion.div>
                        
                        <motion.h1 
                            className="text-green-700 mb-1 text-lg"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                        >
                            Selamat datang di
                        </motion.h1>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.6 }}
                        >
                            <h1 className="text-green-600 mb-1.5 text-4xl tracking-wider" style={{ fontWeight: 900 }}>
                                MOV
                            </h1>
                        </motion.div>
                        <motion.p 
                            className="text-gray-600 italic text-sm"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.7 }}
                        >
                            Mango as an Object Vision
                        </motion.p>
                    </div>
                </div>

                {/* RIGHT SIDE - Form */}
                <div className="w-[480px] bg-white/95 backdrop-blur-xl shadow-2xl flex flex-col border-l border-green-100/50 relative z-10">
                    {/* Sticky Tab Switcher */}
                    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xl border-b border-green-100/50 p-4 pb-3">
                        <div className="max-w-md mx-auto w-full">
                            <div className="relative flex gap-2 p-1 bg-gray-100/80 rounded-xl">
                                <motion.div
                                    className="absolute top-1 bottom-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-lg"
                                    initial={false}
                                    animate={{
                                        left: isLogin ? '4px' : '50%',
                                        width: 'calc(50% - 4px)',
                                    }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsLogin(true)}
                                    className={`relative flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors z-10 ${
                                        isLogin ? 'text-white' : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    🔐 Login
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsLogin(false)}
                                    className={`relative flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors z-10 ${
                                        !isLogin ? 'text-white' : 'text-gray-600 hover:text-gray-900'
                                    }`}
                                >
                                    ✨ Register
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Form Content */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="max-w-md mx-auto w-full p-8 pt-4">

                        <AnimatePresence mode="wait">
                            {status && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl text-sm text-green-700 shadow-sm"
                                >
                                    {status}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence mode="wait">
                            {isLogin ? (
                                <motion.form
                                    key="login"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    onSubmit={handleLogin}
                                    className="space-y-3"
                                >
                                    <div>
                                        <Label htmlFor="username" className="text-sm font-medium mb-2 flex items-center gap-2 text-gray-700">
                                            <User className="w-4 h-4 text-green-600" />
                                            Username/ID
                                        </Label>
                                        <div className="relative">
                                            <Input 
                                                id="username" 
                                                value={loginForm.data.username}
                                                onChange={(e) => loginForm.setData('username', e.target.value)}
                                                placeholder="Masukkan username/ID" 
                                                required 
                                                className="h-11 pl-10 text-sm border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl transition-all" 
                                            />
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        </div>
                                        {loginForm.errors.username && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-xs text-red-600 mt-1.5 flex items-center gap-1"
                                            >
                                                <span>⚠️</span> {loginForm.errors.username}
                                            </motion.p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                                            <span>💡</span> Gunakan username atau ID Kerja (MK-...-Kiojay)
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="password" className="text-sm font-medium mb-2 flex items-center gap-2 text-gray-700">
                                            <Lock className="w-4 h-4 text-green-600" />
                                            Password
                                        </Label>
                                        <div className="relative">
                                            <Input 
                                                id="password" 
                                                type="password" 
                                                value={loginForm.data.password}
                                                onChange={(e) => loginForm.setData('password', e.target.value)}
                                                placeholder="••••••••" 
                                                required 
                                                className="h-11 pl-10 pr-10 text-sm border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl transition-all" 
                                            />
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        </div>
                                        {loginForm.errors.password && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-xs text-red-600 mt-1.5 flex items-center gap-1"
                                            >
                                                <span>⚠️</span> {loginForm.errors.password}
                                            </motion.p>
                                        )}
                                        <div className="text-right mt-1.5">
                                            <button
                                                type="button"
                                                onClick={handleForgotPassword}
                                                className="text-xs text-green-600 hover:text-green-700 hover:underline font-medium transition-colors"
                                            >
                                                🔑 Lupa password?
                                            </button>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {showForgotPassword && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-3 text-xs text-green-700 shadow-sm"
                                            >
                                                <p className="mb-1 font-medium">📧 Link reset telah dikirim ke email Anda.</p>
                                                <p className="text-xs text-gray-600">Cek inbox atau spam folder.</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <Button 
                                        type="submit" 
                                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-11 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 mt-4" 
                                        disabled={loginForm.processing}
                                    >
                                        {loginForm.processing ? (
                                            <span className="flex items-center gap-2">
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                                                />
                                                Memproses...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" />
                                                Masuk
                                            </span>
                                        )}
                                    </Button>
                                </motion.form>
                            ) : (
                                <motion.form
                                    key="register"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                    onSubmit={handleRegister}
                                    className="space-y-3"
                                >
                                    <div>
                                        <Label htmlFor="name" className="text-sm font-medium mb-1.5 flex items-center gap-2 text-gray-700">
                                            <User className="w-3.5 h-3.5 text-green-600" />
                                            Nama Lengkap
                                        </Label>
                                        <div className="relative">
                                            <Input 
                                                id="name" 
                                                value={registerForm.data.name}
                                                onChange={(e) => registerForm.setData('name', e.target.value)}
                                                placeholder="Masukkan nama lengkap" 
                                                required 
                                                className="h-10 pl-9 text-sm border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl transition-all" 
                                            />
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        </div>
                                        {registerForm.errors.name && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-xs text-red-600 mt-1.5 flex items-center gap-1"
                                            >
                                                <span>⚠️</span> {registerForm.errors.name}
                                            </motion.p>
                                        )}
                                    </div>

                                {selectedRole === 'petani' && (
                                    <div>
                                        <Label htmlFor="username" className="text-sm font-medium mb-1.5 flex items-center gap-2 text-gray-700">
                                            <User className="w-3.5 h-3.5 text-green-600" />
                                            Username
                                        </Label>
                                        <div className="relative">
                                            <Input 
                                                id="username" 
                                                value={registerForm.data.username}
                                                onChange={(e) => registerForm.setData('username', e.target.value)}
                                                placeholder="Masukkan username" 
                                                required 
                                                className="h-10 pl-9 text-sm border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl transition-all" 
                                            />
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        </div>
                                        {registerForm.errors.username && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-xs text-red-600 mt-1.5 flex items-center gap-1"
                                            >
                                                <span>⚠️</span> {registerForm.errors.username}
                                            </motion.p>
                                        )}
                                    </div>
                                )}

                                {/* ID Kerja - Required for Petani and K-Petani */}
                                {(selectedRole === 'petani' || selectedRole === 'k-petani') && (
                                    <div>
                                        <Label htmlFor="id_kerja" className="text-sm font-medium mb-1.5 flex items-center gap-2 text-gray-700">
                                            <User className="w-3.5 h-3.5 text-green-600" />
                                            ID Kerja <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="relative">
                                            <Input 
                                                id="id_kerja" 
                                                value={registerForm.data.id_kerja}
                                                onChange={(e) => registerForm.setData('id_kerja', e.target.value)}
                                                placeholder="Masukkan ID Kerja dari K-Petani" 
                                                required 
                                                className="h-10 pl-9 text-sm border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl transition-all" 
                                            />
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        </div>
                                        {registerForm.errors.id_kerja && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-xs text-red-600 mt-1 flex items-center gap-1"
                                            >
                                                <span>⚠️</span> {registerForm.errors.id_kerja}
                                            </motion.p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                            <span>💡</span> {selectedRole === 'k-petani' 
                                                ? 'ID Kerja wajib. Dapatkan ID Kerja dari K-Petani yang sudah terdaftar.' 
                                                : 'ID Kerja wajib. Dapatkan ID Kerja dari K-Petani untuk bisa registrasi.'}
                                        </p>
                                    </div>
                                )}

                                {/* Username - Optional for K-Petani */}
                                {selectedRole === 'k-petani' && (
                                    <div>
                                        <Label htmlFor="username" className="text-sm font-medium mb-1.5 flex items-center gap-2 text-gray-700">
                                            <User className="w-3.5 h-3.5 text-green-600" />
                                            Username <span className="text-gray-400 text-xs">(Opsional)</span>
                                        </Label>
                                        <div className="relative">
                                            <Input 
                                                id="username" 
                                                value={registerForm.data.username}
                                                onChange={(e) => registerForm.setData('username', e.target.value)}
                                                placeholder="Masukkan username (opsional)" 
                                                className="h-10 pl-9 text-sm border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl transition-all" 
                                            />
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        </div>
                                        {registerForm.errors.username && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-xs text-red-600 mt-1 flex items-center gap-1"
                                            >
                                                <span>⚠️</span> {registerForm.errors.username}
                                            </motion.p>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                            <span>💡</span> Username untuk login alternatif (opsional)
                                        </p>
                                    </div>
                                )}

                                {/* Email and Phone in Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Label htmlFor="email" className="text-sm font-medium mb-1.5 flex items-center gap-2 text-gray-700">
                                            <Mail className="w-3.5 h-3.5 text-green-600" />
                                            Email
                                        </Label>
                                        <div className="relative">
                                            <Input 
                                                id="email" 
                                                type="email" 
                                                value={registerForm.data.email}
                                                onChange={(e) => registerForm.setData('email', e.target.value)}
                                                placeholder="contoh@email.com" 
                                                required 
                                                className="h-10 pl-9 text-sm border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl transition-all" 
                                            />
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        </div>
                                        {registerForm.errors.email && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-xs text-red-600 mt-1 flex items-center gap-1"
                                            >
                                                <span>⚠️</span> {registerForm.errors.email}
                                            </motion.p>
                                        )}
                                    </div>

                                    <div>
                                        <Label htmlFor="phone" className="text-sm font-medium mb-1.5 flex items-center gap-2 text-gray-700">
                                            <Phone className="w-3.5 h-3.5 text-green-600" />
                                            No. Telepon <span className="text-gray-400 text-xs">(Ops)</span>
                                        </Label>
                                        <div className="relative">
                                            <Input 
                                                id="phone" 
                                                type="tel" 
                                                value={registerForm.data.phone}
                                                onChange={(e) => registerForm.setData('phone', e.target.value)}
                                                placeholder="081234567890" 
                                                className="h-10 pl-9 text-sm border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl transition-all" 
                                            />
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        </div>
                                        {registerForm.errors.phone && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-xs text-red-600 mt-1 flex items-center gap-1"
                                            >
                                                <span>⚠️</span> {registerForm.errors.phone}
                                            </motion.p>
                                        )}
                                    </div>
                                </div>

                                {/* Password Fields in Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Label htmlFor="password" className="text-sm font-medium mb-1.5 flex items-center gap-2 text-gray-700">
                                            <Lock className="w-3.5 h-3.5 text-green-600" />
                                            Password
                                        </Label>
                                        <div className="relative">
                                            <Input 
                                                id="password" 
                                                type="password" 
                                                value={registerForm.data.password}
                                                onChange={(e) => registerForm.setData('password', e.target.value)}
                                                placeholder="••••••••" 
                                                required 
                                                className="h-10 pl-9 text-sm border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl transition-all" 
                                            />
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        </div>
                                        {registerForm.errors.password && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-xs text-red-600 mt-1 flex items-center gap-1"
                                            >
                                                <span>⚠️</span> {registerForm.errors.password}
                                            </motion.p>
                                        )}
                                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                            <span>⚠️</span> Kapital, kecil, angka
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor="password_confirmation" className="text-sm font-medium mb-1.5 flex items-center gap-2 text-gray-700">
                                            <Lock className="w-3.5 h-3.5 text-green-600" />
                                            Konfirmasi
                                        </Label>
                                        <div className="relative">
                                            <Input 
                                                id="password_confirmation" 
                                                type="password" 
                                                value={registerForm.data.password_confirmation}
                                                onChange={(e) => registerForm.setData('password_confirmation', e.target.value)}
                                                placeholder="••••••••" 
                                                required 
                                                className="h-10 pl-9 text-sm border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl transition-all" 
                                            />
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                        </div>
                                        {registerForm.errors.password_confirmation && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-xs text-red-600 mt-1 flex items-center gap-1"
                                            >
                                                <span>⚠️</span> {registerForm.errors.password_confirmation}
                                            </motion.p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-sm font-medium mb-2 block text-gray-700">Tipe Pengguna</Label>
                                    <div className="flex gap-2">
                                        <motion.button
                                            type="button"
                                            onClick={() => {
                                                setSelectedRole('petani');
                                                registerForm.setData('role', 'petani');
                                            }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                                                selectedRole === 'petani'
                                                    ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md'
                                                    : 'border-gray-200 hover:border-green-300 bg-white'
                                            }`}
                                        >
                                            <div className="text-xl mb-1">👨‍🌾</div>
                                            <div className="text-xs font-semibold text-gray-700">Petani Umum</div>
                                            <div className="text-[10px] text-gray-500 mt-0.5">Akses Terbatas</div>
                                        </motion.button>
                                        <motion.button
                                            type="button"
                                            onClick={() => {
                                                setSelectedRole('k-petani');
                                                registerForm.setData('role', 'k-petani');
                                            }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                                                selectedRole === 'k-petani'
                                                    ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md'
                                                    : 'border-gray-200 hover:border-green-300 bg-white'
                                            }`}
                                        >
                                            <div className="text-xl mb-1">🌾</div>
                                            <div className="text-xs font-semibold text-gray-700">K-Petani</div>
                                            <div className="text-[10px] text-gray-500 mt-0.5">Akses Penuh</div>
                                        </motion.button>
                                    </div>
                                </div>

                                <Button 
                                    type="submit" 
                                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-10 text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 mt-3" 
                                    disabled={registerForm.processing}
                                >
                                    {registerForm.processing ? (
                                        <span className="flex items-center gap-2">
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                                            />
                                            Memproses...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4" />
                                            Daftar Sekarang
                                        </span>
                                    )}
                                </Button>
                                </motion.form>
                            )}
                        </AnimatePresence>

                            <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                                <p className="text-gray-600 mb-2 text-xs">Atau jelajahi sebagai tamu</p>
                                <Button
                                    variant="outline"
                                    onClick={() => router.visit('/')}
                                    className="w-full border-2 border-green-200 hover:bg-green-50 hover:border-green-300 h-9 text-xs font-medium transition-all"
                                >
                                    📚 Lihat Artikel Mangga
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MOBILE LAYOUT */}
            <div className="lg:hidden min-h-screen relative overflow-hidden flex flex-col p-4">
                {/* Animated Background - Same as Dashboard */}
                <AnimatedBackground />
                
                {/* Mobile Header */}
                <motion.div 
                    className="text-center mb-6 mt-8 relative z-10"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <motion.img 
                        src="/mov-logo.png" 
                        alt="MOV Logo" 
                        className="w-32 h-auto mx-auto drop-shadow-2xl mb-3"
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
                    />
                    <h1 className="text-green-700 mb-1 text-sm">Selamat datang di</h1>
                    <h1 className="text-green-600 mb-2 text-4xl tracking-wider font-black">
                        MOV
                    </h1>
                    <p className="text-gray-600 italic text-xs">Mango as an Object Vision</p>
                </motion.div>

                <Card className="w-full max-w-md mx-auto p-6 shadow-2xl bg-white/95 backdrop-blur-xl border border-green-100/50 relative z-10">
                    {/* Tab Switcher */}
                    <div className="relative flex gap-2 mb-6 p-1 bg-gray-100/80 rounded-xl">
                        <motion.div
                            className="absolute top-1 bottom-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-lg"
                            initial={false}
                            animate={{
                                left: isLogin ? '4px' : '50%',
                                width: 'calc(50% - 4px)',
                            }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                        <button
                            type="button"
                            onClick={() => setIsLogin(true)}
                            className={`relative flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors z-10 ${
                                isLogin ? 'text-white' : 'text-gray-600'
                            }`}
                        >
                            🔐 Login
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsLogin(false)}
                            className={`relative flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors z-10 ${
                                !isLogin ? 'text-white' : 'text-gray-600'
                            }`}
                        >
                            ✨ Register
                        </button>
                    </div>

                    {isLogin ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <Label htmlFor="username">Username/ID</Label>
                                <Input 
                                    id="username" 
                                    value={loginForm.data.username}
                                    onChange={(e) => loginForm.setData('username', e.target.value)}
                                    placeholder="Masukkan username/ID" 
                                    required 
                                />
                                {loginForm.errors.username && (
                                    <p className="text-xs text-red-600 mt-1">{loginForm.errors.username}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="password">Password</Label>
                                <Input 
                                    id="password" 
                                    type="password" 
                                    value={loginForm.data.password}
                                    onChange={(e) => loginForm.setData('password', e.target.value)}
                                    placeholder="••••••••" 
                                    required 
                                />
                                {loginForm.errors.password && (
                                    <p className="text-xs text-red-600 mt-1">{loginForm.errors.password}</p>
                                )}
                            </div>

                            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loginForm.processing}>
                                Masuk
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <Label htmlFor="name">Nama Lengkap</Label>
                                <Input 
                                    id="name" 
                                    value={registerForm.data.name}
                                    onChange={(e) => registerForm.setData('name', e.target.value)}
                                    placeholder="Masukkan nama lengkap" 
                                    required 
                                />
                                {registerForm.errors.name && (
                                    <p className="text-xs text-red-600 mt-1">{registerForm.errors.name}</p>
                                )}
                            </div>

                            {/* ID Kerja - Required for Petani and K-Petani */}
                            {(selectedRole === 'petani' || selectedRole === 'k-petani') && (
                                <div>
                                    <Label htmlFor="id_kerja">ID Kerja <span className="text-red-500">*</span></Label>
                                    <Input 
                                        id="id_kerja" 
                                        value={registerForm.data.id_kerja}
                                        onChange={(e) => registerForm.setData('id_kerja', e.target.value)}
                                        placeholder="Masukkan ID Kerja dari K-Petani" 
                                        required 
                                    />
                                    {registerForm.errors.id_kerja && (
                                        <p className="text-xs text-red-600 mt-1">{registerForm.errors.id_kerja}</p>
                                    )}
                                    <p className="text-xs text-gray-500 mt-1">
                                        ID Kerja wajib. Dapatkan ID Kerja dari K-Petani yang sudah terdaftar.
                                    </p>
                                </div>
                            )}

                            <div>
                                <Label htmlFor="username">Username</Label>
                                <Input 
                                    id="username" 
                                    value={registerForm.data.username}
                                    onChange={(e) => registerForm.setData('username', e.target.value)}
                                    placeholder="Masukkan username" 
                                    required 
                                />
                            </div>

                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input 
                                    id="email" 
                                    type="email" 
                                    value={registerForm.data.email}
                                    onChange={(e) => registerForm.setData('email', e.target.value)}
                                    placeholder="contoh@email.com" 
                                    required 
                                />
                            </div>

                            <div>
                                <Label htmlFor="password">Password</Label>
                                <Input 
                                    id="password" 
                                    type="password" 
                                    value={registerForm.data.password}
                                    onChange={(e) => registerForm.setData('password', e.target.value)}
                                    placeholder="••••••••" 
                                    required 
                                />
                            </div>

                            <div>
                                <Label htmlFor="password_confirmation">Konfirmasi Password</Label>
                                <Input 
                                    id="password_confirmation" 
                                    type="password" 
                                    value={registerForm.data.password_confirmation}
                                    onChange={(e) => registerForm.setData('password_confirmation', e.target.value)}
                                    placeholder="••••••••" 
                                    required 
                                />
                            </div>

                            <div>
                                <Label>Tipe Pengguna</Label>
                                <div className="flex gap-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedRole('petani');
                                            registerForm.setData('role', 'petani');
                                        }}
                                        className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                                            selectedRole === 'petani'
                                                ? 'border-green-500 bg-green-50'
                                                : 'border-gray-200 hover:border-green-300'
                                        }`}
                                    >
                                        <div className="text-2xl mb-1">👨‍🌾</div>
                                        <div className="text-sm">Petani Umum</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedRole('k-petani');
                                            registerForm.setData('role', 'k-petani');
                                        }}
                                        className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                                            selectedRole === 'k-petani'
                                                ? 'border-green-500 bg-green-50'
                                                : 'border-gray-200 hover:border-green-300'
                                        }`}
                                    >
                                        <div className="text-2xl mb-1">🌾</div>
                                        <div className="text-sm">K-Petani</div>
                                    </button>
                                </div>
                            </div>

                            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={registerForm.processing}>
                                Daftar
                            </Button>
                        </form>
                    )}
                </Card>
            </div>
        </>
    );
}

