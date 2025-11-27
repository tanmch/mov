import { motion, AnimatePresence } from 'framer-motion';
import { Loader } from 'lucide-react';

export default function LoadingOverlay({ 
    show, 
    message = 'Memproses...', 
    progress = null,
    fullScreen = false 
}) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`fixed inset-0 z-50 flex items-center justify-center ${
                        fullScreen 
                            ? 'bg-black/50 backdrop-blur-sm' 
                            : 'bg-white/80 backdrop-blur-lg'
                    }`}
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="bg-white/95 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border-2 border-gray-200 max-w-sm w-full mx-4"
                    >
                        <div className="text-center">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ 
                                    duration: 1, 
                                    repeat: Infinity, 
                                    ease: "linear" 
                                }}
                                className="w-16 h-16 mx-auto mb-4 text-green-500"
                            >
                                <Loader className="w-full h-full" />
                            </motion.div>
                            
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                {message}
                            </h3>
                            
                            {progress !== null && (
                                <div className="mt-4">
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-green-500 to-emerald-600"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2">{progress}%</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

