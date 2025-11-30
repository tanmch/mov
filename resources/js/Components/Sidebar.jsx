import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { useRole } from '@/hooks/useRole';
import { 
    BarChart3, Bot, TrendingUp, Activity, Zap, ChevronLeft, ChevronRight,
    Home, Leaf, Camera, BookOpen, User, X, Menu, Grid3x3, Sparkles, MessageCircle, HeadphonesIcon, Users
} from 'lucide-react';

export default function Sidebar() {
    const { url } = usePage();
    const { isPetani } = useRole();
    const [isOpen, setIsOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const sidebarRef = useRef(null);
    const resizeTimeoutRef = useRef(null);
    const { scrollY } = useScroll();

    // Scroll detection for hide/show behavior (same as TopNav)
    useMotionValueEvent(scrollY, "change", (latest) => {
        const currentScrollY = latest;
        
        // Show sidebar when scrolling up, hide when scrolling down
        if (currentScrollY < lastScrollY || currentScrollY < 100) {
            setIsVisible(true);
        } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
            setIsVisible(false);
        }
        
        setLastScrollY(currentScrollY);
    });

    // Initialize state from localStorage only once on mount
    useEffect(() => {
        setIsMounted(true);
        if (window.innerWidth >= 1024) {
            const savedState = localStorage.getItem('sidebarOpen');
            if (savedState !== null) {
                setIsOpen(savedState === 'true');
            } else {
                setIsOpen(true); // Default open on desktop
            }
        } else {
            setIsOpen(false); // Always closed on mobile
        }
    }, []);

    // Listen for toggle event from Dashboard
    useEffect(() => {
        const handleToggleMobileSidebar = () => {
            console.log('[Sidebar] Toggle mobile sidebar event received');
            setIsMobileMenuOpen(prev => {
                console.log('[Sidebar] Mobile menu state:', prev, '->', !prev);
                return !prev;
            });
        };

        window.addEventListener('toggleMobileSidebar', handleToggleMobileSidebar);
        console.log('[Sidebar] Event listener registered for toggleMobileSidebar');
        return () => {
            window.removeEventListener('toggleMobileSidebar', handleToggleMobileSidebar);
        };
    }, []);

    // Close mobile menu when clicking outside
    useEffect(() => {
        if (!isMobileMenuOpen) return;

        const handleClickOutside = (event) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                setIsMobileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobileMenuOpen]);

    // Handle window resize with debounce to prevent layout shifts
    useEffect(() => {
        const handleResize = () => {
            // Clear previous timeout
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }

            // Debounce resize handler
            resizeTimeoutRef.current = setTimeout(() => {
                const width = window.innerWidth;
                if (width < 1024) {
                    // Mobile: always close
                    setIsOpen(false);
                } else {
                    // Desktop: maintain current state or load from localStorage
                    const savedState = localStorage.getItem('sidebarOpen');
                    if (savedState !== null) {
                        setIsOpen(savedState === 'true');
                    }
                }
            }, 150); // Debounce 150ms
        };

        window.addEventListener('resize', handleResize, { passive: true });
        return () => {
            window.removeEventListener('resize', handleResize);
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }
        };
    }, []); // Empty deps - only run once

    // Save state and dispatch event when sidebar state changes (only on desktop)
    // Use ref to track previous value to prevent unnecessary updates
    const prevIsOpenRef = useRef(isOpen);
    useEffect(() => {
        if (!isMounted) {
            prevIsOpenRef.current = isOpen;
            return; // Don't run on initial mount
        }
        
        // Only update if value actually changed
        if (prevIsOpenRef.current === isOpen) return;
        prevIsOpenRef.current = isOpen;
        
        if (window.innerWidth >= 1024) {
            localStorage.setItem('sidebarOpen', isOpen.toString());
            // Dispatch event only if value changed
            window.dispatchEvent(new CustomEvent('sidebarToggle', { 
                detail: { isOpen, isMobile: false } 
            }));
        }
    }, [isOpen, isMounted]);

    const handleToggle = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    const isActive = useCallback((href) => {
        return url === href || url.startsWith(href + '/');
    }, [url]);

    // Navigation items - Memoize to prevent re-creation
    // For petani, MOV Center redirects to chat. For K-Petani, show both
    const navItems = useMemo(() => [
        { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' },
        { id: 'kebun', label: 'Kebun', icon: Leaf, href: '/kebun' },
        { id: 'deteksi', label: 'Deteksi', icon: Camera, href: '/deteksi' },
        { id: 'artikel', label: 'Artikel', icon: BookOpen, href: '/artikel' },
        ...(isPetani 
            ? [{ id: 'mov-center', label: 'MOV Center', icon: MessageCircle, href: '/chat' }]
            : [
                { id: 'chat', label: 'Chat', icon: MessageCircle, href: '/chat' },
                { id: 'customer-service', label: 'MOV Center', icon: HeadphonesIcon, href: '/customer-service' },
                { id: 'about-us', label: 'Tentang Kami', icon: Users, href: '/about-us' }
            ]
        ),
        { id: 'profil', label: 'Profil', icon: User, href: '/profile' },
    ], [isPetani]);

    // Quick Actions - Memoize to prevent re-creation
    const quickActions = useMemo(() => [
        { 
            id: 'sensor', 
            label: 'Data Sensor', 
            subLabel: 'Lengkap',
            icon: BarChart3, 
            href: '/sensor',
            color: 'from-blue-500 to-cyan-500',
            bgColor: 'from-blue-50 via-cyan-50 to-blue-100',
            borderColor: 'border-blue-300/60',
            hoverBorder: 'border-blue-400/80',
            hoverGlow: 'from-blue-400/20 to-cyan-400/20',
        },
        { 
            id: 'robot', 
            label: 'Kontrol Robot', 
            subLabel: 'MOV Bot',
            icon: Bot, 
            href: '/robot',
            color: 'from-green-500 to-emerald-500',
            bgColor: 'from-green-50 via-emerald-50 to-teal-100',
            borderColor: 'border-green-300/60',
            hoverBorder: 'border-green-400/80',
            hoverGlow: 'from-green-400/20 to-emerald-400/20',
        },
        { 
            id: 'prediksi', 
            label: 'Prediksi Panen', 
            subLabel: 'AI Analysis',
            icon: TrendingUp, 
            href: '/prediksi',
            color: 'from-yellow-500 to-amber-500',
            bgColor: 'from-yellow-50 via-amber-50 to-orange-100',
            borderColor: 'border-yellow-300/60',
            hoverBorder: 'border-yellow-400/80',
            hoverGlow: 'from-yellow-400/20 to-amber-400/20',
        },
        { 
            id: 'laporan', 
            label: 'Laporan', 
            subLabel: 'Detail Report',
            icon: Activity, 
            href: '/laporan',
            color: 'from-purple-500 to-pink-500',
            bgColor: 'from-purple-50 via-pink-50 to-rose-100',
            borderColor: 'border-purple-300/60',
            hoverBorder: 'border-purple-400/80',
            hoverGlow: 'from-purple-400/20 to-pink-400/20',
        },
    ], []);


    // Sidebar content component - Static to prevent re-renders
    const SidebarContent = ({ isCollapsed, isActive }) => {
        return (
        <div className={`relative flex flex-col ${isCollapsed ? '' : 'h-full'}`} style={{ overflow: 'visible' }}>
            {/* Static Background - No animations to prevent re-renders */}
            <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ zIndex: 0 }}>
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-200/40 via-purple-200/40 to-pink-200/40" />
            </div>

            {/* Decorative Elements - Behind content */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400/20 via-purple-400/20 to-transparent rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" style={{ zIndex: 0 }}></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-pink-400/20 via-purple-400/20 to-transparent rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none" style={{ zIndex: 0 }}></div>

            <div className="relative h-full flex flex-col min-h-0" style={{ zIndex: 1, isolation: 'isolate' }}>
                {/* Logo Section - Fixed Height */}
                <div 
                    className={`${isCollapsed ? 'px-2' : 'p-3 md:p-4'} ${isCollapsed ? 'border-b-0' : 'border-b border-white/20'} flex-shrink-0 relative`} 
                    style={{ 
                        zIndex: 2,
                        paddingTop: isCollapsed ? '0.5rem' : undefined,
                        paddingBottom: isCollapsed ? '0.75rem' : undefined,
                    }}
                >
                    <div className={`flex items-center justify-center ${isCollapsed ? 'gap-0' : 'gap-3'}`}>
                        <motion.div 
                            className={`${isCollapsed ? 'w-8 h-8' : 'w-8 h-8'} bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 ${isCollapsed ? 'rounded-xl' : 'rounded-xl'} flex items-center justify-center ${isCollapsed ? 'shadow-xl' : 'shadow-xl'} shadow-indigo-500/40 flex-shrink-0 transition-all duration-300`}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                        >
                            <Zap className={`${isCollapsed ? 'w-4 h-4' : 'w-4 h-4'} text-white`} />
                        </motion.div>
                        {!isCollapsed && (
                            <motion.div 
                                className="overflow-hidden"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                            >
                                <h2 className="text-base font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent whitespace-nowrap">
                                    Quick Actions
                                </h2>
                                <p className="text-[10px] text-gray-600 font-medium">Akses Cepat</p>
                            </motion.div>
                        )}
                    </div>
                </div>

                {/* Quick Actions Grid - No scroll needed */}
                <div 
                    className={`flex-1 min-h-0 overflow-visible ${isCollapsed ? 'px-2' : 'p-3 md:p-4'} flex items-center justify-center`}
                    style={{
                        paddingTop: isCollapsed ? '0.5rem' : undefined,
                        paddingBottom: isCollapsed ? '0.5rem' : undefined,
                    }}
                >
                    {isCollapsed ? (
                        // Collapsed View - Dynamic Island Style
                        <div className="w-full" style={{ marginTop: 0, marginBottom: 0 }}>
                            <div className="flex flex-col" style={{ gap: '1rem' }}>
                                {quickActions.map((action) => {
                                    const Icon = action.icon;
                                    const active = isActive(action.href);
                                    return (
                                        <motion.div
                                            key={action.id}
                                            className="group relative"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <Link href={action.href} className="block group/link">
                                                <motion.div
                                                    className={`relative w-full ${isCollapsed ? 'h-12' : 'h-14'} bg-gradient-to-br ${action.bgColor} backdrop-blur-xl ${isCollapsed ? 'rounded-2xl' : 'rounded-xl'} ${isCollapsed ? 'border border-white/30' : 'border-2'} ${active ? action.hoverBorder : action.borderColor} ${isCollapsed ? 'shadow-lg' : 'shadow-lg'} hover:shadow-2xl transition-all duration-300 overflow-visible cursor-pointer flex items-center justify-center group-hover:border-opacity-100`}
                                                    whileHover={isCollapsed ? { scale: 1.05, y: -2 } : {}}
                                                    style={{
                                                        backdropFilter: isCollapsed ? 'blur(20px) saturate(180%)' : undefined,
                                                        WebkitBackdropFilter: isCollapsed ? 'blur(20px) saturate(180%)' : undefined,
                                                    }}
                                                >
                                                    {/* Animated Background Gradient */}
                                                    <div className={`absolute inset-0 bg-gradient-to-br ${action.bgColor} opacity-100 group-hover:opacity-90 transition-opacity duration-300 ${isCollapsed ? 'rounded-2xl' : 'rounded-xl'}`}></div>
                                                    
                                                    {/* Shimmer Effect - Only on hover */}
                                                    <motion.div 
                                                        className={`absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none ${isCollapsed ? 'rounded-2xl' : 'rounded-xl'}`}
                                                        animate={{
                                                            background: active ? [
                                                                'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                                                                'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
                                                            ] : 'transparent'
                                                        }}
                                                        transition={{
                                                            duration: 2,
                                                            repeat: active ? Infinity : 0,
                                                            repeatType: 'reverse'
                                                        }}
                                                    ></motion.div>
                                                    
                                                    {/* Glow Effect on Hover */}
                                                    <motion.div 
                                                        className={`absolute inset-0 bg-gradient-to-br ${action.hoverGlow} blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${isCollapsed ? 'rounded-2xl' : 'rounded-xl'}`}
                                                        animate={{
                                                            scale: active ? [1, 1.1, 1] : 1
                                                        }}
                                                        transition={{
                                                            duration: 2,
                                                            repeat: active ? Infinity : 0
                                                        }}
                                                    ></motion.div>
                                                    
                                                    {/* Icon Container - Enhanced with better sizing */}
                                                    <motion.div
                                                        className={`relative z-10 ${isCollapsed ? 'w-9 h-9' : 'w-10 h-10'} bg-gradient-to-br ${action.color} ${isCollapsed ? 'rounded-xl' : 'rounded-lg'} flex items-center justify-center ${isCollapsed ? 'shadow-xl' : 'shadow-xl'} transition-all duration-200 ${active ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-transparent' : ''}`}
                                                        whileHover={{ 
                                                            scale: 1.15,
                                                            rotate: [0, -5, 5, 0]
                                                        }}
                                                        transition={{
                                                            rotate: {
                                                                duration: 0.5,
                                                                repeat: active ? Infinity : 0,
                                                                repeatType: 'reverse'
                                                            }
                                                        }}
                                                    >
                                                        <Icon className={`${isCollapsed ? 'w-4 h-4' : 'w-5 h-5'} text-white drop-shadow-lg`} />
                                                    </motion.div>

                                                    {/* Active Indicator - Enhanced */}
                                                    {active && (
                                                        <motion.div
                                                            className={`absolute left-0 top-1/2 -translate-y-1/2 ${isCollapsed ? 'w-0.5' : 'w-1'} ${isCollapsed ? 'h-8' : 'h-10'} bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 rounded-r-full shadow-lg`}
                                                            initial={{ scaleY: 0 }}
                                                            animate={{ scaleY: 1 }}
                                                            transition={{ duration: 0.3 }}
                                                        />
                                                    )}
                                                    
                                                    {/* Pulse ring for active state */}
                                                    {active && (
                                                        <motion.div
                                                            className={`absolute inset-0 border-2 border-transparent ${isCollapsed ? 'rounded-2xl' : 'rounded-xl'}`}
                                                            animate={{
                                                                borderColor: [
                                                    'rgba(99, 102, 241, 0)',
                                                    'rgba(99, 102, 241, 0.5)',
                                                    'rgba(99, 102, 241, 0)',
                                                ],
                                                scale: [1, 1.05, 1],
                                            }}
                                            transition={{
                                                duration: 2,
                                                repeat: Infinity,
                                                ease: 'easeInOut'
                                            }}
                                                        />
                                                    )}
                                                </motion.div>
                                            </Link>
                                            
                                            {/* Enhanced Tooltip on Hover - Only when collapsed */}
                                            {isCollapsed && (
                                                <div 
                                                    className="absolute left-full ml-3 top-1/2 -translate-y-1/2 pointer-events-none z-[10000] opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 translate-x-[-8px] group-hover:translate-x-0 transition-all duration-200 ease-out"
                                                >
                                                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 backdrop-blur-sm text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl whitespace-nowrap relative border border-gray-700/50">
                                                        <span className="text-white drop-shadow-lg">
                                                            {action.label}
                                                        </span>
                                                        {/* Enhanced Arrow */}
                                                        <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-r-[6px] border-r-gray-900 border-b-[6px] border-b-transparent"></div>
                                                        {/* Glow effect on tooltip */}
                                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-xl blur-sm -z-10"></div>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        // Expanded View - Full Cards (Compact to fit without scroll)
                        <div className="space-y-2.5 w-full">
                                {quickActions.map((action) => {
                                    const Icon = action.icon;
                                    const active = isActive(action.href);
                                    return (
                                        <div
                                            key={action.id}
                                            className="group"
                                        >
                                            <Link href={action.href} className="block h-full">
                                                <div
                                                    className={`relative min-h-[75px] bg-gradient-to-br ${action.bgColor} backdrop-blur-md rounded-xl border-2 ${active ? action.hoverBorder : action.borderColor} shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer p-3`}
                                                >
                                                    {/* Glow Effect */}
                                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${action.hoverGlow} blur-xl`}></div>
                                                    
                                                    {/* Background Pattern */}
                                                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                                                        <div className="absolute inset-0" style={{
                                                            backgroundImage: `linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)`,
                                                            backgroundSize: '20px 20px'
                                                        }}></div>
                                                    </div>
                                                    
                                                    {/* Content */}
                                                    <div className="relative z-10 flex flex-row items-center gap-2.5 h-full justify-start">
                                                        <div className={`w-10 h-10 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center shadow-lg flex-shrink-0 ${active ? 'animate-pulse' : ''}`}>
                                                            <Icon className="w-5 h-5 text-white" />
                                                        </div>
                                                        <div className="text-left flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-gray-800 truncate">{action.label}</p>
                                                            <p className="text-[10px] text-gray-600 font-medium truncate">{action.subLabel}</p>
                                                        </div>
                                                    </div>

                                                    {/* Active Indicator */}
                                                    {active && (
                                                        <div
                                                            className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 via-purple-500 to-pink-500 rounded-r-full shadow-lg"
                                                        />
                                                    )}
                                                </div>
                                            </Link>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </div>

                {/* Toggle Button - Fixed Position - Enhanced */}
                <div 
                    className={`${isCollapsed ? 'px-2' : 'p-2'} ${isCollapsed ? 'border-t-0' : 'border-t border-white/20'} flex-shrink-0`}
                    style={{
                        paddingTop: isCollapsed ? '0.75rem' : undefined,
                        paddingBottom: isCollapsed ? '0.5rem' : undefined,
                    }}
                >
                    <motion.button
                        whileHover={{ scale: 1.05, x: isCollapsed ? 2 : -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleToggle}
                        className={`w-full flex items-center justify-center ${isCollapsed ? 'px-2 py-1.5' : 'gap-1.5 px-2 py-1.5'} bg-white/70 backdrop-blur-xl rounded-xl border border-white/50 hover:border-indigo-300/60 ${isCollapsed ? 'shadow-lg' : 'shadow-lg'} hover:shadow-xl transition-all group`}
                        style={{
                            backdropFilter: isCollapsed ? 'blur(20px) saturate(180%)' : undefined,
                            WebkitBackdropFilter: isCollapsed ? 'blur(20px) saturate(180%)' : undefined,
                        }}
                    >
                        {isCollapsed ? (
                            <motion.div
                                animate={{ x: [0, 2, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                            >
                                <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-indigo-600 transition-colors" />
                            </motion.div>
                        ) : (
                            <>
                                <ChevronLeft className="w-4 h-4 text-gray-700 group-hover:text-indigo-600 transition-colors" />
                                <span className="text-xs font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">Sembunyikan</span>
                            </>
                        )}
                    </motion.button>
                </div>
            </div>
        </div>
        );
    };

    if (!isMounted) {
        return null; // Prevent hydration mismatch
    }

    return (
        <>
            {/* Desktop Sidebar - Fixed width to prevent layout shifts */}
            <motion.aside
                ref={sidebarRef}
                className="hidden lg:block fixed left-0 z-40"
                initial={false}
                animate={{
                    width: isOpen ? 320 : 80, // Reduced from 88 to 80 for more elegant look
                    top: isVisible ? '6rem' : '1rem', // Add 0.5rem (8px) spacing from header when visible (96px), top-4 (16px) when hidden
                    bottom: isOpen ? '5rem' : 'auto', // Space for bottom nav when expanded, auto when collapsed
                    height: isOpen ? 'auto' : 'fit-content', // Auto height when expanded, fit-content when collapsed
                }}
                transition={{
                    duration: 0.3,
                    ease: [0.4, 0, 0.2, 1],
                }}
                style={{
                    willChange: 'width, top, bottom, height',
                    overflow: 'visible',
                }}
            >
                <motion.div
                    className="bg-gradient-to-br from-white/80 via-indigo-50/70 to-purple-50/80 backdrop-blur-2xl border-r border-white/40 shadow-2xl overflow-visible relative"
                    initial={false}
                    animate={{
                        borderRadius: isOpen ? '0 2rem 2rem 0' : '0 2rem 2rem 0', // Dynamic island style - more rounded
                        height: isOpen ? '100%' : 'fit-content', // Full height when expanded, fit-content when collapsed
                        transform: isOpen ? 'none' : 'rotate(-1deg)', // Slight tilt when collapsed for dynamic island effect
                    }}
                    transition={{
                        duration: 0.3,
                        ease: [0.4, 0, 0.2, 1],
                    }}
                    style={{ 
                        overflow: 'visible',
                        display: 'flex',
                        flexDirection: 'column',
                        backdropFilter: 'blur(30px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                    }}
                >
                    <SidebarContent 
                        isCollapsed={!isOpen} 
                        isActive={isActive}
                    />
                </motion.div>
            </motion.aside>

            {/* Mobile Sidebar - Slide from Left (like desktop) */}
            <AnimatePresence mode="wait">
                {isMobileMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                console.log('[Sidebar] Backdrop clicked, closing sidebar');
                                setIsMobileMenuOpen(false);
                            }}
                            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]"
                        />

                        {/* Mobile Sidebar - Slide from left, follows header */}
                        <motion.aside
                            ref={sidebarRef}
                            initial={{ x: -320, opacity: 0 }}
                            animate={{ 
                                x: 0, 
                                opacity: 1,
                                top: isVisible ? '4.5rem' : '0.5rem', // Follow header: 4.5rem when visible, 0.5rem when hidden
                                bottom: '5rem', // Space for bottom nav
                            }}
                            exit={{ x: -320, opacity: 0 }}
                            transition={{ 
                                type: "spring", 
                                stiffness: 300, 
                                damping: 30,
                                top: {
                                    duration: 0.3,
                                    ease: [0.4, 0, 0.2, 1]
                                }
                            }}
                            className="lg:hidden fixed left-0 w-80 z-[100]"
                            style={{
                                willChange: 'transform, opacity, top',
                            }}
                        >
                            <motion.div
                                className="h-full bg-gradient-to-br from-indigo-50/95 via-purple-50/90 to-pink-50/95 backdrop-blur-xl border-r-2 border-indigo-200/60 shadow-2xl overflow-hidden relative rounded-r-3xl"
                            >
                                <div className="absolute top-4 right-4 z-20">
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="w-8 h-8 bg-white/80 backdrop-blur-md rounded-lg border border-gray-200 shadow-lg flex items-center justify-center hover:bg-red-50 hover:border-red-300 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-600" />
                                    </motion.button>
                                </div>
                                <div className="pt-12 pb-4 px-4 h-full overflow-y-auto custom-scrollbar">
                                    <SidebarContent 
                                        isCollapsed={false}
                                        isActive={isActive}
                                    />
                                </div>
                            </motion.div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Mobile Quick Actions Button - Vertical Line with Handle and Arrow */}
            <motion.button
                whileHover={{ scaleX: 1.3, x: 2 }}
                whileTap={{ scaleX: 0.9 }}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[Sidebar] Quick Actions button clicked, dispatching event');
                    // Dispatch event to open mobile sidebar
                    const event = new CustomEvent('toggleMobileSidebar', {
                        bubbles: true,
                        cancelable: true
                    });
                    window.dispatchEvent(event);
                }}
                animate={{
                    top: isVisible ? '4.5rem' : '0.5rem', // Follow header: 4.5rem when visible (below header), 0.5rem when hidden
                }}
                transition={{
                    top: {
                        duration: 0.3,
                        ease: [0.4, 0, 0.2, 1]
                    }
                }}
                className="lg:hidden fixed left-0 z-[100] w-2 h-20 bg-gradient-to-b from-green-500 via-emerald-500 to-green-600 shadow-lg group cursor-pointer rounded-r-lg flex flex-col items-center justify-center gap-1"
                title="Quick Actions - Geser untuk membuka"
                aria-label="Toggle Quick Actions Menu"
                style={{
                    willChange: 'transform, top',
                }}
            >
                {/* Arrow Icon - Indikator bisa digeser ke kanan */}
                <motion.div
                    animate={{
                        x: isMobileMenuOpen ? 3 : 0,
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20
                    }}
                    className="absolute left-1/2 -translate-x-1/2"
                >
                    <ChevronRight className="w-5 h-5 text-gray-900 drop-shadow-lg" strokeWidth={3} />
                </motion.div>
                
                {/* Handle Grip Lines - Indikator bisa digeser */}
                <div className="flex flex-col gap-0.5 items-center mt-3">
                    <div className="w-1 h-1 bg-white/80 rounded-full"></div>
                    <div className="w-1 h-1 bg-white/80 rounded-full"></div>
                    <div className="w-1 h-1 bg-white/80 rounded-full"></div>
                </div>
                
                {/* Hover glow effect */}
                <motion.div
                    className="absolute inset-0 bg-green-400/30 rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity blur-sm"
                    animate={{
                        opacity: isMobileMenuOpen ? 0.5 : 0,
                    }}
                />
            </motion.button>
        </>
    );
}


