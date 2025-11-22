import { motion } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Search, Filter, X, Sparkles } from 'lucide-react';

export default function FilterSection({ search, setSearch, roleFilter, setRoleFilter, statusFilter, setStatusFilter, onFilter }) {
    const hasActiveFilters = search || roleFilter || statusFilter;

    const handleClearFilters = () => {
        setSearch('');
        setRoleFilter('');
        setStatusFilter('');
        setTimeout(() => onFilter(), 100);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
        >
            <Card className="p-5 bg-white/90 backdrop-blur-xl border-2 border-white/50 shadow-xl overflow-hidden relative">
                {/* Decorative Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-green-200/30 to-emerald-200/30 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-blue-200/30 to-cyan-200/30 rounded-full blur-3xl"></div>
                </div>

                <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <motion.div
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center"
                            >
                                <Filter className="w-4 h-4 text-white" />
                            </motion.div>
                            <div>
                                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                    Filter & Pencarian
                                    <Sparkles className="w-4 h-4 text-green-500" />
                                </h3>
                                <p className="text-xs text-gray-500">Temukan ID Kerja dengan mudah</p>
                            </div>
                        </div>
                        {hasActiveFilters && (
                            <motion.button
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleClearFilters}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                            >
                                <X className="w-3 h-3" />
                                Reset
                            </motion.button>
                        )}
                    </div>

                    {/* Filter Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Search Input */}
                        <motion.div
                            whileFocus={{ scale: 1.02 }}
                            className="relative group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-green-500 transition-colors" />
                                <Input
                                    placeholder="Cari ID Kerja..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && onFilter()}
                                    className="pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 bg-white/80 backdrop-blur-sm transition-all"
                                />
                            </div>
                        </motion.div>

                        {/* Role Filter */}
                        <motion.div
                            whileFocus={{ scale: 1.02 }}
                            className="relative group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative">
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white/80 backdrop-blur-sm transition-all appearance-none cursor-pointer font-medium text-gray-700"
                                >
                                    <option value="">🌐 Semua Role</option>
                                    <option value="petani">🌾 Petani</option>
                                    <option value="k-petani">👨‍💼 K-Petani</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </motion.div>

                        {/* Status Filter */}
                        <motion.div
                            whileFocus={{ scale: 1.02 }}
                            className="relative group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 bg-white/80 backdrop-blur-sm transition-all appearance-none cursor-pointer font-medium text-gray-700"
                                >
                                    <option value="">📊 Semua Status</option>
                                    <option value="0">✨ Belum Digunakan</option>
                                    <option value="1">✅ Sudah Digunakan</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </motion.div>

                        {/* Filter Button */}
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Button
                                onClick={onFilter}
                                className="w-full h-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 py-3"
                            >
                                <Filter className="w-5 h-5" />
                                <span>Terapkan Filter</span>
                            </Button>
                        </motion.div>
                    </div>

                    {/* Active Filters Badge */}
                    {hasActiveFilters && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-2"
                        >
                            <span className="text-xs font-medium text-gray-600">Filter Aktif:</span>
                            {search && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-200"
                                >
                                    <Search className="w-3 h-3" />
                                    "{search}"
                                </motion.span>
                            )}
                            {roleFilter && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium border border-blue-200"
                                >
                                    Role: {roleFilter === 'k-petani' ? 'K-Petani' : 'Petani'}
                                </motion.span>
                            )}
                            {statusFilter && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium border border-amber-200"
                                >
                                    Status: {statusFilter === '1' ? 'Digunakan' : 'Tersedia'}
                                </motion.span>
                            )}
                        </motion.div>
                    )}
                </div>
            </Card>
        </motion.div>
    );
}
