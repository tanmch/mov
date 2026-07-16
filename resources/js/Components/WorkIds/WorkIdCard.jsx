import { motion } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Link } from '@inertiajs/react';
import { Copy, Trash2, Edit, CheckCircle2, Sparkles, CheckCircle } from 'lucide-react';

export default function WorkIdCard({ workId, index, onCopy, onDelete, copiedId }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Card className={`p-5 bg-white/80 backdrop-blur-lg border-2 transition-all hover:shadow-xl ${
                workId.is_used 
                    ? 'border-green-200' 
                    : 'border-blue-200 hover:border-green-300'
            }`}>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <code className="text-lg font-mono font-bold text-green-700 bg-green-50 px-3 py-1 rounded-lg">
                                {workId.work_id}
                            </code>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onCopy(workId.work_id)}
                                className="p-1.5 rounded-lg bg-gray-100 hover:bg-green-100 transition-colors"
                                title="Copy ID"
                            >
                                {copiedId === workId.work_id ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Copy className="w-4 h-4 text-gray-600" />
                                )}
                            </motion.button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className={workId.role === 'k-petani' 
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                                : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'}>
                                {workId.role === 'k-petani' ? 'K-Petani' : 'Petani'}
                            </Badge>
                            {workId.is_used ? (
                                <Badge className="bg-green-100 text-green-800 border border-green-300">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Digunakan
                                </Badge>
                            ) : (
                                <Badge className="bg-blue-100 text-blue-800 border border-blue-300">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Tersedia
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-2 mb-4 text-sm">
                    {workId.creator && (
                        <div className="flex items-center gap-2 text-gray-600">
                            <span className="font-medium">Dibuat:</span>
                            <span>{workId.creator.name}</span>
                        </div>
                    )}
                    {workId.user && (
                        <div className="flex items-center gap-2 text-gray-600">
                            <span className="font-medium">Digunakan:</span>
                            <span>{workId.user.name}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                        <span>{new Date(workId.created_at).toLocaleDateString('id-ID')}</span>
                    </div>
                </div>

                {!workId.is_used && (
                    <div className="flex gap-2 pt-4 border-t border-gray-200">
                        <Link href={route('work-ids.edit', workId.id)} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                            </Button>
                        </Link>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => onDelete(workId)}
                                                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                                                    >
                                                        <Trash2 className="w-3 h-3 mr-1" />
                                                        Hapus
                                                    </Button>
                    </div>
                )}
            </Card>
        </motion.div>
    );
}

