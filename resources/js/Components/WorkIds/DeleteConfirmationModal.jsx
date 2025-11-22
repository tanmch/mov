import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/Components/ui/button';
import { X, Trash2, AlertTriangle, Shield } from 'lucide-react';

export default function DeleteConfirmationModal({ show, onClose, onConfirm, workId }) {
    return (
        <AnimatePresence>
            {show && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 20 }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 30,
                            }}
                            className="w-full max-w-md pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl border-2 border-red-200/50 shadow-2xl">
                                {/* Decorative Background */}
                                <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-rose-50/50"></div>
                                
                                {/* Animated Glow Effect */}
                                <motion.div
                                    className="absolute -inset-1 bg-gradient-to-r from-red-400 to-rose-500 opacity-30 blur-xl"
                                    animate={{
                                        opacity: [0.2, 0.4, 0.2],
                                        scale: [1, 1.05, 1],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    }}
                                />

                                <div className="relative z-10 p-6 md:p-8">
                                    {/* Close Button */}
                                    <motion.button
                                        whileHover={{ scale: 1.1, rotate: 90 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={onClose}
                                        className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </motion.button>

                                    {/* Icon Container */}
                                    <div className="flex justify-center mb-6">
                                        <motion.div
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{
                                                type: "spring",
                                                stiffness: 200,
                                                damping: 15,
                                            }}
                                            className="relative"
                                        >
                                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                                                <Trash2 className="w-10 h-10 text-white" />
                                            </div>
                                            <motion.div
                                                animate={{
                                                    scale: [1, 1.2, 1],
                                                    opacity: [0.5, 0.8, 0.5],
                                                }}
                                                transition={{
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                }}
                                                className="absolute inset-0 rounded-full bg-red-400 blur-xl"
                                            />
                                        </motion.div>
                                    </div>

                                    {/* Content */}
                                    <div className="text-center mb-6">
                                        <motion.h3
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                            className="text-2xl font-bold text-gray-800 mb-2"
                                        >
                                            Hapus ID Kerja?
                                        </motion.h3>
                                        
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.2 }}
                                            className="text-gray-600 mb-4"
                                        >
                                            Apakah Anda yakin ingin menghapus ID Kerja ini?
                                        </motion.p>

                                        {workId && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.3 }}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 border-2 border-red-200 rounded-xl"
                                            >
                                                <code className="text-lg font-mono font-bold text-red-700">
                                                    {workId.work_id}
                                                </code>
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Warning Box */}
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl"
                                    >
                                        <div className="flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                            <div className="text-left">
                                                <p className="text-sm font-semibold text-amber-800 mb-1">
                                                    Tindakan ini tidak dapat dibatalkan
                                                </p>
                                                <p className="text-xs text-amber-700">
                                                    ID Kerja yang sudah digunakan tidak dapat dihapus. Pastikan ID Kerja ini belum digunakan sebelum menghapus.
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="flex-1"
                                        >
                                            <Button
                                                onClick={onClose}
                                                variant="outline"
                                                className="w-full h-12 border-2 border-gray-300 hover:bg-gray-50 font-semibold rounded-xl"
                                            >
                                                Batal
                                            </Button>
                                        </motion.div>
                                        
                                        <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="flex-1"
                                        >
                                            <Button
                                                onClick={onConfirm}
                                                className="w-full h-12 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold rounded-xl shadow-lg flex items-center justify-center gap-2"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                                Ya, Hapus
                                            </Button>
                                        </motion.div>
                                    </div>

                                    {/* Security Note */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500"
                                    >
                                        <Shield className="w-3 h-3" />
                                        <span>Tindakan ini akan menghapus ID Kerja secara permanen</span>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}

