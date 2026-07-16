import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/Components/ui/button';
import { CheckCircle, XCircle, X, Sparkles, Trash2, Edit } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useHeaderOffset } from '@/hooks/useHeaderOffset';

export default function NotificationToast({ show, message, type, onClose, action }) {
    const [progress, setProgress] = useState(100);
    const topOffset = useHeaderOffset();
    const toastRef = useRef(null);

    useEffect(() => {
        if (show) {
            setProgress(100);
            const interval = setInterval(() => {
                setProgress((prev) => {
                    if (prev <= 0) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 2;
                });
            }, 100);

            const timer = setTimeout(() => {
                onClose();
            }, 5000);

            return () => {
                clearInterval(interval);
                clearTimeout(timer);
            };
        }
    }, [show, onClose]);

    const getIcon = () => {
        if (action === 'edit') {
            return <Edit className="w-6 h-6" />;
        }
        if (action === 'delete') {
            return <Trash2 className="w-6 h-6" />;
        }
        return type === 'success' ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />;
    };

    const getTitle = () => {
        if (action === 'edit') return 'Berhasil Diperbarui!';
        if (action === 'delete') return 'Berhasil Dihapus!';
        return type === 'success' ? 'Berhasil!' : 'Terjadi Kesalahan';
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    ref={toastRef}
                    initial={{ opacity: 0, x: 400, scale: 0.8 }}
                    animate={{ 
                        opacity: 1, 
                        x: 0, 
                        scale: 1,
                        top: `${topOffset}px`,
                    }}
                    exit={{ opacity: 0, x: 400, scale: 0.8 }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30,
                    }}
                    style={{
                        top: `${topOffset}px`,
                    }}
                    className="fixed right-4 z-50 max-w-md w-full md:w-auto"
                >
                    <div className={`relative overflow-hidden rounded-2xl shadow-2xl backdrop-blur-xl border-2 ${
                        type === 'success' 
                            ? 'bg-gradient-to-br from-green-50/95 to-emerald-50/95 border-green-200/50' 
                            : 'bg-gradient-to-br from-red-50/95 to-rose-50/95 border-red-200/50'
                    }`}>
                        {/* Decorative Background */}
                        <div className={`absolute inset-0 opacity-30 ${
                            type === 'success'
                                ? 'bg-gradient-to-br from-green-400/20 to-emerald-400/20'
                                : 'bg-gradient-to-br from-red-400/20 to-rose-400/20'
                        }`}></div>
                        
                        {/* Animated Glow Effect */}
                        <motion.div
                            className={`absolute -inset-1 opacity-50 blur-xl ${
                                type === 'success' ? 'bg-green-400' : 'bg-red-400'
                            }`}
                            animate={{
                                opacity: [0.3, 0.6, 0.3],
                                scale: [1, 1.05, 1],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                        />

                        <div className="relative z-10 p-5">
                            <div className="flex items-start gap-4">
                                {/* Icon Container */}
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 200,
                                        damping: 15,
                                        delay: 0.1,
                                    }}
                                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                                        type === 'success'
                                            ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                                            : 'bg-gradient-to-br from-red-500 to-rose-600 text-white'
                                    }`}
                                >
                                    {getIcon()}
                                </motion.div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <motion.h3
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className={`font-bold text-lg mb-1 ${
                                            type === 'success' ? 'text-green-800' : 'text-red-800'
                                        }`}
                                    >
                                        {getTitle()}
                                    </motion.h3>
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className={`text-sm ${
                                            type === 'success' ? 'text-green-700' : 'text-red-700'
                                        }`}
                                    >
                                        {message}
                                    </motion.p>

                                    {/* Progress Bar */}
                                    <div className="mt-3 h-1 bg-white/30 rounded-full overflow-hidden">
                                        <motion.div
                                            className={`h-full rounded-full ${
                                                type === 'success'
                                                    ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                                    : 'bg-gradient-to-r from-red-500 to-rose-600'
                                            }`}
                                            initial={{ width: '100%' }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.1, ease: "linear" }}
                                        />
                                    </div>
                                </div>

                                {/* Close Button */}
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={onClose}
                                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                        type === 'success'
                                            ? 'hover:bg-green-100 text-green-600'
                                            : 'hover:bg-red-100 text-red-600'
                                    }`}
                                >
                                    <X className="w-4 h-4" />
                                </motion.button>
                            </div>

                            {/* Sparkle Effects */}
                            <div className="absolute top-2 right-2 pointer-events-none">
                                <motion.div
                                    animate={{
                                        rotate: [0, 360],
                                        scale: [1, 1.2, 1],
                                    }}
                                    transition={{
                                        duration: 3,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }}
                                >
                                    <Sparkles className={`w-4 h-4 ${
                                        type === 'success' ? 'text-green-400' : 'text-red-400'
                                    } opacity-50`} />
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
