import { motion } from 'framer-motion';

export function SkeletonCard() {
    return (
        <div className="p-5 bg-white/80 backdrop-blur-lg border-2 border-gray-200 rounded-xl">
            <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded-lg w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
        </div>
    );
}

export function SkeletonList({ count = 3 }) {
    return (
        <div className="space-y-3">
            {[...Array(count)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-4 bg-white/80 backdrop-blur-lg border-2 border-gray-200 rounded-xl"
                >
                    <div className="animate-pulse flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

export function SkeletonChart() {
    return (
        <div className="p-6 bg-white/80 backdrop-blur-lg border-2 border-gray-200 rounded-xl">
            <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded-lg w-1/3"></div>
                <div className="h-64 bg-gray-200 rounded-lg"></div>
                <div className="flex gap-4 justify-center">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
            </div>
        </div>
    );
}

export function SkeletonGrid({ count = 6, columns = 3 }) {
    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-4`}>
            {[...Array(count)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                >
                    <SkeletonCard />
                </motion.div>
            ))}
        </div>
    );
}

export default function SkeletonLoader({ type = 'card', count, columns }) {
    switch (type) {
        case 'card':
            return <SkeletonCard />;
        case 'list':
            return <SkeletonList count={count} />;
        case 'chart':
            return <SkeletonChart />;
        case 'grid':
            return <SkeletonGrid count={count} columns={columns} />;
        default:
            return <SkeletonCard />;
    }
}

