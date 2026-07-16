import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useHeaderOffset } from '@/hooks/useHeaderOffset';
import { router } from '@inertiajs/react';

export default function ChatNotificationToast({ notification, onClose, onClick }) {
    const [progress, setProgress] = useState(100);
    const topOffset = useHeaderOffset();
    const toastRef = useRef(null);

    useEffect(() => {
        if (notification) {
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
    }, [notification, onClose]);

    if (!notification) return null;

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else if (notification.data?.chat_id) {
            // Navigate to chat
            if (notification.data?.is_group) {
                router.visit(route('chat.index'), {
                    data: { groupId: notification.data.chat_id }
                });
            } else {
                router.visit(route('chat.index'), {
                    data: { chatId: notification.data.chat_id }
                });
            }
        }
        // Mark as read when clicked
        if (notification.id) {
            window.axios.post(route('notifications.mark-read', notification.id)).catch(() => {});
        }
        onClose();
    };

    return (
        <AnimatePresence>
            {notification && (
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
                    className="fixed right-4 z-50 max-w-md w-full md:w-auto cursor-pointer"
                    onClick={handleClick}
                >
                    <div className="relative overflow-hidden rounded-2xl shadow-2xl backdrop-blur-xl border-2 bg-gradient-to-br from-blue-50/95 via-purple-50/95 to-pink-50/95 border-blue-200/50">
                        {/* Decorative Background */}
                        <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-pink-400/20"></div>
                        
                        {/* Animated Glow Effect */}
                        <motion.div
                            className="absolute -inset-1 opacity-50 blur-xl bg-blue-400"
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
                                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 text-white"
                                >
                                    <MessageCircle className="w-6 h-6" />
                                </motion.div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <motion.h3
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 }}
                                        className="font-bold text-lg mb-1 text-gray-800"
                                    >
                                        {notification.title}
                                    </motion.h3>
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="text-sm text-gray-700 line-clamp-2"
                                    >
                                        {notification.message}
                                    </motion.p>
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.4 }}
                                        className="text-xs text-gray-500 mt-1"
                                    >
                                        {notification.time_ago || 'Baru saja'}
                                    </motion.p>

                                    {/* Progress Bar */}
                                    <div className="mt-3 h-1 bg-white/30 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600"
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClose();
                                    }}
                                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-blue-100 text-blue-600"
                                >
                                    <X className="w-4 h-4" />
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

