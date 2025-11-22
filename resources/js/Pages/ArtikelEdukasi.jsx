import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Search, BookOpen, TrendingUp, Lightbulb, Eye, Clock, RefreshCw, ExternalLink, MessageCircle } from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import SkeletonLoader, { SkeletonCard } from '@/Components/ui/SkeletonLoader';
import EmptyState from '@/Components/ui/EmptyState';
import BackButton from '@/Components/BackButton';

export default function ArtikelEdukasi() {
    const { auth } = usePage().props;
    const userRole = auth?.user?.role;
    const [selectedCategory, setSelectedCategory] = useState('semua');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);

    const categories = [
        { id: 'semua', label: 'Semua', icon: '📚' },
        { id: 'berita', label: 'Berita Mangga', icon: '📰' },
        { id: 'tips', label: 'Tips Pertanian', icon: '💡' },
        { id: 'teknologi', label: 'Teknologi', icon: '🤖' },
        { id: 'jenis-mangga', label: 'Jenis Mangga', icon: '🥭' },
        { id: 'perawatan', label: 'Perawatan', icon: '🌱' },
    ];

    const [articles, setArticles] = useState([
        {
            id: 'detik-1',
            title: 'Ekspor Mangga Indonesia Meningkat 45% ke Jepang',
            category: 'berita',
            excerpt: 'Kementerian Pertanian mencatat peningkatan signifikan ekspor mangga gedong gincu...',
            image: '📈',
            date: '20 Nov 2025',
            readTime: '4 min',
            views: 5234,
            source: 'Detik Finance',
            externalUrl: 'https://finance.detik.com/berita-ekonomi-bisnis/d-7046387/ekspor-mangga-naik-45-persen-jepang-jadi-pasar-utama'
        },
        {
            id: 'detik-2',
            title: 'Harga Mangga Gedong Gincu Tembus Rp 50 Ribu per Kg',
            category: 'berita',
            excerpt: 'Jelang musim panen raya, harga mangga gedong gincu di tingkat petani mencapai rekor...',
            image: '💰',
            date: '18 Nov 2025',
            readTime: '3 min',
            views: 4532,
            source: 'Detik Food',
            externalUrl: 'https://food.detik.com/info-kuliner/d-7108524/harga-mangga-gedong-gincu-naik-ini-penyebabnya'
        },
        {
            id: 'detik-3',
            title: 'Teknologi AI Deteksi Kematangan Mangga Dikembangkan IPB',
            category: 'teknologi',
            excerpt: 'Peneliti IPB berhasil kembangkan sistem AI yang dapat mendeteksi tingkat kematangan...',
            image: '🤖',
            date: '15 Nov 2025',
            readTime: '5 min',
            views: 3876,
            source: 'Detik News',
            externalUrl: 'https://news.detik.com/berita/d-7095432/ipb-kembangkan-teknologi-ai-untuk-petani-mangga'
        },
        {
            id: 1,
            title: 'Cara Mendeteksi Kematangan Mangga dengan Akurat',
            category: 'tips',
            excerpt: 'Pelajari teknik-teknik modern untuk mengetahui tingkat kematangan buah mangga menggunakan AI dan metode tradisional...',
            image: '🥭',
            date: '28 Okt 2025',
            readTime: '5 min',
            views: 1234,
            source: 'MOV Platform',
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
            source: 'MOV Platform',
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
            source: 'MOV Platform',
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
            source: 'MOV Platform',
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
            source: 'MOV Platform',
        },
    ]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (searchQuery) {
            setIsSearching(true);
            const timer = setTimeout(() => {
                setIsSearching(false);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [searchQuery]);

    const filteredArticles = articles.filter((article) => {
        const matchesCategory = selectedCategory === 'semua' || article.category === selectedCategory;
        const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <AuthenticatedLayout>
            <Head title="Artikel & Edukasi" />
            
            <div className="min-h-screen relative overflow-hidden">
                <AnimatedBackground />
                <div className="relative p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
                    {/* Back Button */}
                    <div className="mb-4">
                        <BackButton href="/dashboard" />
                    </div>
                    
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
                    >
                        <div className="flex items-center gap-3">
                            <motion.div
                                animate={{ rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg"
                            >
                                <BookOpen className="w-6 h-6 text-white" />
                            </motion.div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                    Artikel & Edukasi 📚
                                </h1>
                                <p className="text-sm text-gray-600">Belajar tentang perawatan mangga dan teknologi terkini</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setIsLoading(true)}
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </motion.div>

                    {/* Search Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card className="p-4 bg-white/90 backdrop-blur-xl border-2 border-white/50 shadow-lg">
                            <div className="relative">
                                <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors ${
                                    searchQuery ? 'text-green-500' : 'text-gray-400'
                                }`} />
                                <Input
                                    type="text"
                                    placeholder="Cari artikel..."
                                    className="pl-12 pr-12 h-12 text-base border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl bg-white/80"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                {isSearching && (
                                    <RefreshCw className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500 animate-spin" />
                                )}
                            </div>
                        </Card>
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
                    {isLoading ? (
                        <div className="space-y-4">
                            <SkeletonLoader type="list" count={6} />
                        </div>
                    ) : (
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

                            {filteredArticles.length === 0 ? (
                                <EmptyState
                                    icon={BookOpen}
                                    title="Artikel Tidak Ditemukan"
                                    message={searchQuery 
                                        ? `Tidak ada artikel yang cocok dengan "${searchQuery}"`
                                        : `Belum ada artikel dalam kategori "${categories.find(c => c.id === selectedCategory)?.label}"`
                                    }
                                />
                            ) : (
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
                                                <Card 
                                                    className={`p-4 md:p-6 bg-white/80 backdrop-blur-lg border-2 border-gray-200 hover:border-green-500 hover:shadow-xl transition-all ${
                                                        article.externalUrl ? 'cursor-pointer' : ''
                                                    }`}
                                                    onClick={() => {
                                                        if (article.externalUrl) {
                                                            window.open(article.externalUrl, '_blank', 'noopener,noreferrer');
                                                        }
                                                    }}
                                                >
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
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <h4 className="text-lg font-bold text-gray-900 line-clamp-2 flex-1">{article.title}</h4>
                                                        {article.externalUrl && (
                                                            <ExternalLink className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{article.excerpt}</p>
                                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                                        <span>{article.date}</span>
                                                        <span className="flex items-center gap-1">
                                                            <Eye className="w-3 h-3" />
                                                            {article.views} views
                                                        </span>
                                                    </div>
                                                    {article.source && (
                                                        <div className="text-xs text-gray-500">
                                                            Sumber: <span className="font-medium text-gray-700">{article.source}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                            )}
                        </motion.div>
                    )}

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

                    {/* Customer Service Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                    >
                        <Card className="p-4 md:p-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 shadow-xl">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                                    <MessageCircle className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-lg font-bold text-gray-900 mb-2">Butuh Bantuan?</h4>
                                    <p className="text-sm text-gray-700 mb-4">
                                        Hubungi customer service kami untuk bantuan teknis, konsultasi, atau pertanyaan lainnya.
                                    </p>
                                    <Link href="/customer-service">
                                        <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 w-full shadow-lg text-white">
                                            Hubungi MOV Center 💬
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Info for Mitra - Enhanced */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                    >
                        <Card className="p-0 overflow-hidden border-2 border-green-200 shadow-xl">
                            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 md:p-6 text-white">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-lg">
                                        🏢
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Mitra Projek Eksportir</h3>
                                        <p className="text-sm text-green-50">PT Sindang Sukses</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-4 md:p-6">
                                <p className="text-sm text-gray-700 mb-4">
                                    Distributor & eksportir mangga terpercaya dengan pengalaman 10+ tahun. Siap membantu memasarkan hasil panen Anda ke pasar nasional dan internasional.
                                </p>
                                
                                {/* Quick Stats */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <div className="bg-green-50 p-3 rounded-lg text-center border border-green-200">
                                        <p className="text-lg font-bold text-green-600">500+</p>
                                        <p className="text-xs text-gray-600">Petani</p>
                                    </div>
                                    <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-200">
                                        <p className="text-lg font-bold text-blue-600">15+</p>
                                        <p className="text-xs text-gray-600">Negara</p>
                                    </div>
                                    <div className="bg-yellow-50 p-3 rounded-lg text-center border border-yellow-200">
                                        <p className="text-lg font-bold text-yellow-600">1000+</p>
                                        <p className="text-xs text-gray-600">Ton/Th</p>
                                    </div>
                                </div>
                                
                                {/* Benefits */}
                                <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                                    <p className="text-sm font-semibold text-gray-700 mb-2">Keuntungan bermitra:</p>
                                    <div className="space-y-2">
                                        {['Harga kompetitif', 'Pembayaran tepat waktu', 'Akses pasar ekspor'].map((benefit, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                                                <span className="text-green-600 font-bold">✓</span>
                                                <span>{benefit}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <Link href="/artikel">
                                    <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg font-medium">
                                        Lihat Detail & Kontak 📞
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
