import { Link, usePage } from '@inertiajs/react';
import { Home, Leaf, Camera, BookOpen, User } from 'lucide-react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function TopNav() {
    const { url } = usePage();
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const { scrollY } = useScroll();

    useMotionValueEvent(scrollY, "change", (latest) => {
        const currentScrollY = latest;
        
        // Show nav when scrolling up, hide when scrolling down
        if (currentScrollY < lastScrollY || currentScrollY < 100) {
            setIsVisible(true);
        } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
            setIsVisible(false);
        }
        
        setLastScrollY(currentScrollY);
    });
    
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' },
        { id: 'kebun', label: 'Kebun', icon: Leaf, href: '/kebun' },
        { id: 'deteksi', label: 'Deteksi', icon: Camera, href: '/deteksi' },
        { id: 'artikel', label: 'Artikel', icon: BookOpen, href: '/artikel' },
        { id: 'profil', label: 'Profil', icon: User, href: '/profile' },
    ];

    const isActive = (href) => {
        return url === href || url.startsWith(href + '/');
    };

    return (
        <div className="fixed bottom-4 md:bottom-6 left-0 right-0 z-50 flex justify-center items-center pointer-events-none">
            <motion.nav
                initial={{ y: 100, opacity: 0, scale: 0.8 }}
                animate={{
                    y: isVisible ? 0 : 100,
                    opacity: isVisible ? 1 : 0,
                    scale: isVisible ? 1 : 0.8,
                }}
                transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                }}
                className="pointer-events-auto"
            >
                {/* Dynamic Island Style Navigation */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-white/95 backdrop-blur-2xl border border-green-200/30 rounded-full shadow-2xl"
                    style={{
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(34, 197, 94, 0.1)',
                    }}
                >
                    {/* Mobile: Compact Layout */}
                    <div className="flex items-center justify-center gap-0.5 px-2 py-2 md:hidden">
                        {navItems.map((item, index) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ scale: 1.1, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex-1"
                                >
                                    <Link
                                        href={item.href}
                                        className={`relative flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-full transition-all ${
                                            active
                                                ? 'text-green-600 bg-gradient-to-br from-green-100/80 to-emerald-100/80'
                                                : 'text-gray-500 hover:text-green-600 hover:bg-gray-50/50'
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 ${active ? 'text-green-600' : ''}`} />
                                        <span className={`text-[9px] font-semibold whitespace-nowrap ${active ? 'text-green-600' : 'text-gray-600'}`}>
                                            {item.label}
                                        </span>
                                        {active && (
                                            <motion.div
                                                layoutId="activeIndicator"
                                                className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-green-600 rounded-full shadow-lg"
                                                initial={false}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        )}
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Desktop: Extended Layout */}
                    <div className="hidden md:flex items-center justify-center gap-1 px-4 py-3">
                        {navItems.map((item, index) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ scale: 1.1, y: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Link
                                        href={item.href}
                                        className={`relative flex flex-row items-center justify-center gap-2 px-5 py-2.5 rounded-full transition-all ${
                                            active
                                                ? 'text-green-600 bg-gradient-to-br from-green-100/80 to-emerald-100/80'
                                                : 'text-gray-500 hover:text-green-600 hover:bg-gray-50/50'
                                        }`}
                                    >
                                        <Icon className={`w-5 h-5 ${active ? 'text-green-600' : ''}`} />
                                        <span className={`text-sm font-semibold whitespace-nowrap ${active ? 'text-green-600' : 'text-gray-600'}`}>
                                            {item.label}
                                        </span>
                                        {active && (
                                            <motion.div
                                                layoutId="activeIndicator"
                                                className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-green-600 rounded-full shadow-lg"
                                                initial={false}
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                            />
                                        )}
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            </motion.nav>
        </div>
    );
}
