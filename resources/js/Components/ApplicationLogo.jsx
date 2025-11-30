import { motion } from 'framer-motion';
import { Link } from '@inertiajs/react';

export default function ApplicationLogo({ className = '', showText = true, asLink = false, href = '/dashboard' }) {
    const LogoContent = (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={`relative flex items-center gap-2 md:gap-3 ${className} ${asLink ? 'hover:opacity-90 transition-opacity cursor-pointer' : ''}`}
            whileHover={{ scale: 1.02 }}
        >
            {/* MOV Logo Image */}
            <motion.div
                animate={{ 
                    rotate: [0, 3, -3, 0],
                    scale: [1, 1.05, 1]
                }}
                transition={{ 
                    duration: 4, 
                    repeat: Infinity,
                    repeatDelay: 2,
                    ease: "easeInOut"
                }}
                className="relative"
            >
                {/* Glow effect behind logo */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-green-400/30 to-emerald-500/30 rounded-full blur-xl"
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                />
                
                <img 
                    src="/mov-logo.png" 
                    alt="MOV Logo" 
                    className="relative z-10 h-10 md:h-14 w-auto object-contain drop-shadow-2xl filter brightness-110"
                    onError={(e) => {
                        // Fallback jika logo tidak ditemukan
                        e.target.style.display = 'none';
                    }}
                />
                
                {/* Enhanced shine effect overlay */}
                <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ 
                        duration: 3, 
                        repeat: Infinity,
                        repeatDelay: 2,
                        ease: "easeInOut"
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none z-20 rounded-full"
                />
                
                {/* Pulsing ring */}
                <motion.div
                    className="absolute inset-0 border-2 border-green-400/30 rounded-full"
                    animate={{ 
                        scale: [1, 1.3, 1],
                        opacity: [0.5, 0, 0.5]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            </motion.div>

            {/* Text Logo - Optional */}
            {showText && (
                <div className="flex flex-col relative">
                    <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="relative text-xl md:text-2xl font-heading bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 bg-clip-text text-transparent leading-tight"
                    >
                        MOV
                        {/* Animated gradient overlay */}
                        <motion.span
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                        />
                    </motion.span>
                    <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-[10px] md:text-xs text-gray-600 font-body leading-tight hidden md:block bg-gradient-to-r from-gray-600 to-gray-700 bg-clip-text text-transparent"
                    >
                        Smart Farming
                    </motion.span>
                </div>
            )}
        </motion.div>
    );

    if (asLink) {
        return (
            <Link href={href}>
                {LogoContent}
            </Link>
        );
    }

    return LogoContent;
}
