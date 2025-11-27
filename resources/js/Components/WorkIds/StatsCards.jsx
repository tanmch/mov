import { motion } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Key, CheckCircle2, XCircle } from 'lucide-react';

export default function StatsCards({ stats }) {
    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Total ID Kerja</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                        </div>
                        <Key className="w-8 h-8 text-blue-500 opacity-50" />
                    </div>
                </Card>
            </motion.div>
            
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Tersedia</p>
                            <p className="text-2xl font-bold text-green-600">{stats.available}</p>
                        </div>
                        <CheckCircle2 className="w-8 h-8 text-green-500 opacity-50" />
                    </div>
                </Card>
            </motion.div>
            
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Digunakan</p>
                            <p className="text-2xl font-bold text-amber-600">{stats.used}</p>
                        </div>
                        <XCircle className="w-8 h-8 text-amber-500 opacity-50" />
                    </div>
                </Card>
            </motion.div>
        </>
    );
}

