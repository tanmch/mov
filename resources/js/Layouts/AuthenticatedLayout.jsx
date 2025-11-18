import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import BottomNav from '@/Components/BottomNav';
import TopNav from '@/Components/TopNav';
import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Bell, Menu, X, User, LogOut, Settings } from 'lucide-react';

export default function AuthenticatedLayout({ header, children }) {
    const user = usePage().props.auth.user;
    const [scrolled, setScrolled] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const { scrollY } = useScroll();

    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);

    useMotionValueEvent(scrollY, "change", (latest) => {
        setScrolled(latest > 20);
        
        // Hide/show navbar based on scroll direction
        if (latest < 10) {
            // Always show at top
            setIsVisible(true);
        } else if (latest > lastScrollY && latest > 100) {
            // Scrolling down - hide navbar
            setIsVisible(false);
        } else if (latest < lastScrollY) {
            // Scrolling up - show navbar
            setIsVisible(true);
        }
        
        setLastScrollY(latest);
    });

    const getRoleBadge = (role) => {
        const badges = {
            'k-petani': 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
            'petani': 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
            'guest': 'bg-gradient-to-r from-gray-400 to-gray-500 text-white',
        };
        return badges[role] || badges.guest;
    };

    const getRoleLabel = (role) => {
        const labels = {
            'k-petani': 'K-Petani',
            'petani': 'Petani',
            'guest': 'Guest',
        };
        return labels[role] || role;
    };

    return (
        <div className="min-h-screen bg-transparent">
            {/* Desktop Navigation - MOV Branded */}
            <motion.div 
                className="hidden md:block fixed top-0 left-0 right-0 z-[100]"
                initial={{ y: 0 }}
                animate={{ 
                    y: isVisible ? 0 : -100,
                    opacity: isVisible ? 1 : 0,
                }}
                transition={{ 
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1],
                }}
            >
                {/* Top Bar with Logo & User */}
                <motion.div 
                    className={`relative border-b-2 transition-all duration-300 overflow-hidden ${
                        scrolled 
                            ? 'bg-white/80 backdrop-blur-xl shadow-2xl border-green-300/30' 
                            : 'bg-gradient-to-r from-white via-green-50/30 to-white backdrop-blur-md border-green-200/50'
                    }`}
                    animate={{ 
                        backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: scrolled ? 'blur(20px)' : 'blur(8px)',
                        borderColor: scrolled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.5)',
                    }}
                >
                    {/* Animated Background Gradient */}
                    <motion.div
                        className="absolute inset-0 opacity-30"
                        animate={{
                            background: scrolled 
                                ? 'linear-gradient(90deg, transparent, rgba(34, 197, 94, 0.1), transparent)'
                                : 'linear-gradient(90deg, rgba(34, 197, 94, 0.05), rgba(16, 185, 129, 0.1), rgba(34, 197, 94, 0.05))',
                        }}
                        transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
                    />
                    
                    <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex h-20 md:h-24 justify-between items-center">
                            <motion.div 
                                className="flex items-center gap-6 md:gap-8"
                                whileHover={{ scale: 1.02 }}
                            >
                                <ApplicationLogo showText={true} asLink={true} href="/dashboard" />
                            </motion.div>

                            <div className="flex items-center gap-4 md:gap-6">
                                {/* User Info & Dropdown */}
                                <div className="relative z-[120]" data-dropdown-trigger>
                                    <Dropdown>
                                        <Dropdown.Trigger>
                                            <motion.div
                                                whileHover={{ scale: 1.05, y: -2 }}
                                                whileTap={{ scale: 0.95 }}
                                                className="relative flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 rounded-xl bg-gradient-to-r from-white to-green-50/50 hover:from-green-50 hover:to-emerald-50/50 border-2 border-green-200/50 hover:border-green-300/70 transition-all shadow-md hover:shadow-lg group cursor-pointer"
                                            >
                                                {/* Shine effect on hover */}
                                                <motion.div
                                                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-xl opacity-0 group-hover:opacity-100"
                                                    animate={{ x: ['-100%', '200%'] }}
                                                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                                                />
                                                
                                                <div className="text-right hidden sm:block relative z-10">
                                                    <motion.p 
                                                        className="text-sm md:text-base font-bold bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent"
                                                        whileHover={{ scale: 1.05 }}
                                                    >
                                                        {user.name}
                                                    </motion.p>
                                                    <motion.span 
                                                        className={`inline-block text-[10px] md:text-xs px-2 md:px-2.5 py-0.5 md:py-1 rounded-full font-bold ${getRoleBadge(user.role)} shadow-sm`}
                                                        whileHover={{ scale: 1.1, rotate: 2 }}
                                                    >
                                                        {getRoleLabel(user.role)}
                                                    </motion.span>
                                                </div>
                                                <motion.div 
                                                    className="relative w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base shadow-lg border-2 border-white/50"
                                                    whileHover={{ rotate: 360, scale: 1.1 }}
                                                    transition={{ duration: 0.5 }}
                                                >
                                                    {/* Glow effect */}
                                                    <motion.div
                                                        className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full blur-md opacity-50"
                                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.7, 0.5] }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                    />
                                                    <span className="relative z-10">{user.name.charAt(0).toUpperCase()}</span>
                                                </motion.div>
                                                <motion.svg
                                                    className="w-4 h-4 md:w-5 md:h-5 text-gray-500 group-hover:text-green-600 relative z-10 transition-colors"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                    animate={{ y: [0, 2, 0] }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </motion.svg>
                                            </motion.div>
                                        </Dropdown.Trigger>

                                        <Dropdown.Content 
                                            align="right"
                                            width="48"
                                            contentClasses="py-2 bg-white/95 backdrop-blur-xl border border-green-200/50 shadow-2xl"
                                        >
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="px-3 py-2.5 border-b border-gray-200/50"
                                            >
                                                <p className="text-sm font-bold text-gray-900">{user.name}</p>
                                                <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                                                <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full font-semibold ${getRoleBadge(user.role)}`}>
                                                    {getRoleLabel(user.role)}
                                                </span>
                                            </motion.div>
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.1 }}
                                            >
                                                <Dropdown.Link
                                                    href={route('profile')}
                                                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-green-50/50 hover:text-green-700 transition-colors rounded-md mx-1 my-0.5"
                                                >
                                                    <User className="w-4 h-4" />
                                                    <span className="font-medium">Profil</span>
                                                </Dropdown.Link>
                                                <Dropdown.Link
                                                    href={route('logout')}
                                                    method="post"
                                                    as="button"
                                                    className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50/50 hover:text-red-700 transition-colors rounded-md mx-1 my-0.5"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    <span className="font-medium">Logout</span>
                                                </Dropdown.Link>
                                            </motion.div>
                                        </Dropdown.Content>
                                    </Dropdown>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
            
            {/* Bottom Navigation Bar - Dynamic Island Style */}
            <TopNav />

            {/* Mobile Header - MOV Branded */}
            <motion.div 
                className="md:hidden fixed top-0 left-0 right-0 z-[100]"
                initial={{ y: 0 }}
                animate={{ 
                    y: isVisible ? 0 : -100,
                    opacity: isVisible ? 1 : 0,
                }}
                transition={{ 
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1],
                }}
            >
                {/* Top Bar with Logo & User */}
                <motion.div 
                    className={`border-b-2 border-green-200/50 transition-all duration-300 ${
                        scrolled ? 'bg-white/90 backdrop-blur-xl shadow-lg border-green-300/30' : 'bg-white/95 backdrop-blur-sm border-green-200/50'
                    }`}
                    animate={{ 
                        backgroundColor: scrolled ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: scrolled ? 'blur(20px)' : 'blur(4px)',
                        borderColor: scrolled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.5)',
                    }}
                >
                    <div className="px-4 py-4 flex items-center justify-between">
                        <ApplicationLogo showText={true} asLink={true} href="/dashboard" />
                        
                        <div className="flex items-center gap-2">
                            <div className="text-right mr-2">
                                <p className="text-sm font-bold text-gray-800">{user.name}</p>
                                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getRoleBadge(user.role)}`}>
                                    {getRoleLabel(user.role)}
                                </span>
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowingNavigationDropdown(!showingNavigationDropdown)}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                {showingNavigationDropdown ? (
                                    <X className="w-5 h-5 text-gray-600" />
                                ) : (
                                    <Menu className="w-5 h-5 text-gray-600" />
                                )}
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* Mobile Dropdown Menu */}
                {showingNavigationDropdown && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="border-t border-gray-200 bg-white"
                    >
                        <div className="px-4 py-3 space-y-2">
                            <Link
                                href={route('profile')}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
                                onClick={() => setShowingNavigationDropdown(false)}
                            >
                                <User className="w-4 h-4" />
                                Profile
                            </Link>
                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 font-medium"
                                onClick={() => setShowingNavigationDropdown(false)}
                            >
                                <LogOut className="w-4 h-4" />
                                Log Out
                            </Link>
                        </div>
                    </motion.div>
                )}
            </motion.div>

            {/* Spacer for fixed navbar */}
            <div className="h-20 md:h-24"></div>

            {header && (
                <header className="bg-white/80 backdrop-blur-md shadow-md hidden md:block border-b border-green-200/50">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main className="pb-20 md:pb-24">{children}</main>
        </div>
    );
}
