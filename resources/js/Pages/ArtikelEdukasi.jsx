import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Search, BookOpen, TrendingUp, Lightbulb, Eye, Clock } from 'lucide-react';

export default function ArtikelEdukasi() {
    const { auth } = usePage().props;
    const userRole = auth?.user?.role;
    const [selectedCategory, setSelectedCategory] = useState('semua');
    const [searchQuery, setSearchQuery] = useState('');

    const categories = [
        { id: 'semua', label: 'Semua', icon: '📚' },
        { id: 'tips', label: 'Tips Pertanian', icon: '💡' },
        { id: 'teknologi', label: 'Teknologi', icon: '🤖' },
        { id: 'jenis-mangga', label: 'Jenis Mangga', icon: '🥭' },
        { id: 'perawatan', label: 'Perawatan', icon: '🌱' },
    ];

    const articles = [
        {
            id: 1,
            title: 'Cara Mendeteksi Kematangan Mangga dengan Akurat',
            category: 'tips',
            excerpt: 'Pelajari teknik-teknik modern untuk mengetahui tingkat kematangan buah mangga menggunakan AI dan metode tradisional...',
            image: '🥭',
            date: '28 Okt 2025',
            readTime: '5 min',
            views: 1234,
        },
        {
            id: 2,
            title: 'Teknologi IoT untuk Pertanian Modern',
            category: 'teknologi',
            excerpt: 'Bagaimana sensor IoT dapat membantu meningkatkan produktivitas kebun mangga dengan monitoring real-time...',
            image: '🤖',
            date: '27 Okt 2025',
            readTime: '7 min',
            views: 2156,
        },
        {
            id: 3,
            title: '10 Jenis Mangga Unggulan Indonesia',
            category: 'jenis-mangga',
            excerpt: 'Kenali berbagai varietas mangga lokal yang memiliki kualitas ekspor dan cara membedakannya...',
            image: '🍋',
            date: '26 Okt 2025',
            readTime: '8 min',
            views: 3421,
        },
        {
            id: 4,
            title: 'Jadwal Penyiraman Optimal untuk Mangga',
            category: 'perawatan',
            excerpt: 'Tentukan waktu dan volume penyiraman yang tepat untuk hasil maksimal berdasarkan kondisi cuaca...',
            image: '💧',
            date: '25 Okt 2025',
            readTime: '6 min',
            views: 1876,
        },
        {
            id: 5,
            title: 'Mengatasi Hama pada Pohon Mangga',
            category: 'perawatan',
            excerpt: 'Identifikasi dan cara mengatasi berbagai jenis hama yang menyerang mangga secara organik...',
            image: '🐛',
            date: '24 Okt 2025',
            readTime: '9 min',
            views: 2543,
        },
        {
            id: 6,
            title: 'AI dalam Pertanian: Masa Depan Farming',
            category: 'teknologi',
            excerpt: 'Penggunaan kecerdasan buatan untuk prediksi panen dan deteksi penyakit tanaman secara dini...',
            image: '🧠',
            date: '23 Okt 2025',
            readTime: '10 min',
            views: 4123,
        },
    ];

    const filteredArticles = articles.filter((article) => {
        const matchesCategory = selectedCategory === 'semua' || article.category === selectedCategory;
        const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <AuthenticatedLayout>
            <Head title="Artikel & Edukasi" />
            
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-blue-50/30">
                <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 mb-6"
                    >
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                            <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                Artikel & Edukasi 📚
                            </h1>
                            <p className="text-sm text-gray-600">Belajar tentang perawatan mangga dan teknologi terkini</p>
                        </div>
                    </motion.div>

                    {/* Search Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Cari artikel..."
                                className="pl-12 h-12 text-base border-2 border-gray-200 focus:border-green-500 rounded-xl"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </motion.div>

                    {/* Categories */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
                    >
                        {categories.map((cat, index) => (
                            <motion.button
                                key={cat.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 + index * 0.05 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all font-medium ${
                                    selectedCategory === cat.id
                                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                                        : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-green-500 hover:bg-green-50'
                                }`}
                            >
                                <span className="text-lg">{cat.icon}</span>
                                <span className="text-sm">{cat.label}</span>
                            </motion.button>
                        ))}
                    </motion.div>

                    {/* Featured Article */}
                    {selectedCategory === 'semua' && !searchQuery && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Card className="p-0 overflow-hidden bg-gradient-to-br from-green-500 via-emerald-500 to-yellow-500 border-0 shadow-xl">
                                <div className="p-6 md:p-8 text-white">
                                    <Badge className="bg-white text-green-600 mb-3 border-0">⭐ Trending</Badge>
                                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">Panduan Lengkap IoT untuk Petani Mangga</h3>
                                    <p className="text-base text-green-50 mb-4 max-w-2xl">
                                        Implementasi teknologi IoT dari awal hingga mendapatkan hasil panen optimal dengan monitoring real-time
                                    </p>
                                    <Button className="bg-white text-green-600 hover:bg-green-50 font-medium shadow-lg">
                                        Baca Sekarang
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* Articles Grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">
                                {selectedCategory === 'semua' ? 'Semua Artikel' : 'Hasil Pencarian'}
                            </h3>
                            <span className="text-sm text-gray-600 font-medium">{filteredArticles.length} artikel</span>
                        </div>

                        <div className="space-y-4">
                            <AnimatePresence>
                                {filteredArticles.map((article, index) => (
                                    <motion.div
                                        key={article.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ delay: index * 0.05 }}
                                        whileHover={{ scale: 1.02, x: 5 }}
                                    >
                                        <Card className="p-4 md:p-6 border-2 border-gray-200 hover:border-green-500 hover:shadow-xl transition-all cursor-pointer">
                                            <div className="flex gap-4">
                                                {/* Image/Icon */}
                                                <motion.div
                                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                                    className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-green-100 via-yellow-100 to-orange-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                                                >
                                                    <span className="text-4xl md:text-5xl">{article.image}</span>
                                                </motion.div>

                                                {/* Content */}
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                                                            {categories.find((c) => c.id === article.category)?.label}
                                                        </Badge>
                                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                                            <Clock className="w-3 h-3" />
                                                            {article.readTime}
                                                        </div>
                                                    </div>
                                                    <h4 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{article.title}</h4>
                                                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{article.excerpt}</p>
                                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                                        <span>{article.date}</span>
                                                        <span className="flex items-center gap-1">
                                                            <Eye className="w-3 h-3" />
                                                            {article.views} views
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    {/* Quick Links for Guests */}
                    {userRole === 'guest' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <Card className="p-4 md:p-6 bg-gradient-to-r from-green-50 via-yellow-50 to-green-50 border-2 border-green-200 shadow-xl">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                                        <Lightbulb className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-lg font-bold text-gray-900 mb-2">Ingin Akses Penuh?</h4>
                                        <p className="text-sm text-gray-700 mb-4">
                                            Daftar sebagai petani untuk mengakses fitur monitoring kebun, deteksi AI, dan kontrol penyiraman!
                                        </p>
                                        <Link href={route('register')}>
                                            <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 w-full shadow-lg">
                                                Daftar Sekarang
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* Topics */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-gray-200/50 shadow-xl">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-green-600" />
                                Topik Populer
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {['Penyiraman', 'Pemupukan', 'Deteksi AI', 'IoT', 'Panen', 'Kualitas', 'Hama', 'Cuaca'].map((topic, index) => (
                                    <motion.div
                                        key={topic}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.6 + index * 0.05 }}
                                        whileHover={{ scale: 1.1 }}
                                    >
                                        <Badge variant="outline" className="hover:bg-green-50 cursor-pointer border-2 border-gray-200 hover:border-green-500">
                                            #{topic}
                                        </Badge>
                                    </motion.div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Info for Mitra */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                    >
                        <Card className="p-4 md:p-6 bg-blue-50 border-2 border-blue-200 shadow-xl">
                            <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <span>👨‍🌾</span> Informasi Mitra
                            </h4>
                            <p className="text-sm text-gray-700 mb-4">
                                Tertarik untuk menjadi mitra atau distributor hasil panen? Hubungi kami untuk informasi lebih lanjut.
                            </p>
                            <Button variant="outline" className="w-full border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-medium">
                                Hubungi Mitra
                            </Button>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
