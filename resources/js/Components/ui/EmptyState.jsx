import { motion } from 'framer-motion';
import { Button } from '@/Components/ui/button';

export default function EmptyState({ 
    icon: Icon, 
    title, 
    message, 
    actionLabel, 
    onAction,
    className = '' 
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-12 text-center bg-white/80 backdrop-blur-lg rounded-xl border-2 border-gray-200 ${className}`}
        >
            {Icon && (
                <motion.div
                    animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                    }}
                    transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        repeatDelay: 3
                    }}
                    className="w-20 h-20 mx-auto mb-4 text-gray-300"
                >
                    {typeof Icon === 'string' ? (
                        <span className="text-6xl">{Icon}</span>
                    ) : (
                        <Icon className="w-full h-full" />
                    )}
                </motion.div>
            )}
            
            <h3 className="text-xl font-bold text-gray-700 mb-2">
                {title || 'Tidak ada data'}
            </h3>
            
            {message && (
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    {message}
                </p>
            )}
            
            {actionLabel && onAction && (
                <Button
                    onClick={onAction}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                    {actionLabel}
                </Button>
            )}
        </motion.div>
    );
}

