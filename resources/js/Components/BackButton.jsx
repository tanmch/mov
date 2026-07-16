import { Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

export default function BackButton({ 
    href = '/dashboard', 
    label = 'Kembali',
    className = '',
    onClick
}) {
    const [isHovered, setIsHovered] = useState(false);

    const handleClick = (e) => {
        if (onClick) {
            onClick(e);
        } else if (href) {
            router.visit(href);
        } else {
            router.back();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -30, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ 
                duration: 0.4,
                ease: [0.34, 1.56, 0.64, 1] // Bounce effect
            }}
            className={`inline-block ${className}`}
        >
            <motion.button
                onClick={handleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                whileHover={{ 
                    scale: 1.05,
                    x: -2,
                }}
                whileTap={{ scale: 0.95 }}
                className="group relative flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3 
                         bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 
                         hover:from-emerald-700 hover:via-green-700 hover:to-teal-700
                         text-white font-bold text-sm sm:text-base
                         rounded-xl sm:rounded-2xl
                         shadow-lg hover:shadow-2xl hover:shadow-emerald-500/50
                         border-2 border-white/30 hover:border-white/50
                         backdrop-blur-sm
                         transition-all duration-300
                         overflow-hidden
                         z-10"
            >
                {/* Animated Background Gradient */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                    initial={{ x: '-100%' }}
                    animate={{ 
                        x: isHovered ? '200%' : '-100%',
                    }}
                    transition={{ 
                        duration: 0.6,
                        ease: "easeInOut"
                    }}
                />

                {/* Pulse Ring Effect */}
                {isHovered && (
                    <motion.div
                        className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-white/40"
                        initial={{ scale: 1, opacity: 0.8 }}
                        animate={{ 
                            scale: [1, 1.3, 1],
                            opacity: [0.8, 0, 0.8]
                        }}
                        transition={{ 
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeOut"
                        }}
                    />
                )}

                {/* Icon with Animation */}
                <motion.div
                    animate={{ 
                        x: isHovered ? [-2, 2, -2, 0] : 0,
                    }}
                    transition={{ 
                        duration: 0.5,
                        ease: "easeInOut"
                    }}
                    className="relative z-10"
                >
                    <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 drop-shadow-lg" strokeWidth={2.5} />
                </motion.div>

                {/* Label with Glow Effect */}
                <motion.span
                    className="relative z-10 drop-shadow-md whitespace-nowrap"
                    animate={{
                        textShadow: isHovered 
                            ? '0 0 8px rgba(255, 255, 255, 0.8)' 
                            : '0 0 4px rgba(255, 255, 255, 0.4)'
                    }}
                    transition={{ duration: 0.3 }}
                >
                    {label}
                </motion.span>

                {/* Decorative Sparkles */}
                <motion.div
                    className="absolute top-1 right-2 w-1 h-1 bg-white rounded-full"
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                <motion.div
                    className="absolute bottom-1 right-4 w-0.5 h-0.5 bg-white/80 rounded-full"
                    animate={{
                        scale: [1, 1.8, 1],
                        opacity: [0.3, 0.8, 0.3],
                    }}
                    transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.5
                    }}
                />
            </motion.button>
        </motion.div>
    );
}

