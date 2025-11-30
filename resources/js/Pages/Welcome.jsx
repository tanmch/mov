import { Head, Link, usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Search, BookOpen, TrendingUp, Lightbulb, Eye, Clock, LogIn, UserPlus, ExternalLink, Users } from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import AnimatedBackground from '@/Components/AnimatedBackground';
import { useState, useEffect } from 'react';
import ArticleCard from '@/Components/ArticleCard';
import { useArticleImage } from '@/hooks/useArticleImage';

// Default articles (hardcoded) - same as ArtikelEdukasi
const defaultArticlesList = [
    {
        id: 'manfaat-mangga-1',
        title: 'Manfaat Mangga: Buah Favorit Sejuta Umat dengan Segudang Khasiat',
        category: 'tips',
        excerpt: 'Mangga kaya akan vitamin C, A, E, beta-karoten, dan antioksidan yang membantu memperkuat sistem imun, menjaga kesehatan mata, pencernaan, kulit, dan jantung. Pelajari manfaat lengkap buah tropis ini...',
        description: 'Mangga kaya akan vitamin C, A, E, beta-karoten, dan antioksidan yang membantu memperkuat sistem imun, menjaga kesehatan mata, pencernaan, kulit, dan jantung. Pelajari manfaat lengkap buah tropis ini...',
        image: '🥭',
        date: '25 Nov 2025',
        readTime: '8 min',
        views: 5234,
        source: 'Digitani IPB',
        externalUrl: 'https://digitani.ipb.ac.id/manfaat-mangga-buah-favorit-sejuta-umat/'
    },
    {
        id: 'manfaat-mangga-2',
        title: 'Manfaat Buah Mangga untuk Kesehatan: Penelitian dan Bukti Ilmiah',
        category: 'tips',
        excerpt: 'Temukan penelitian ilmiah tentang manfaat mangga bagi kesehatan, termasuk kandungan nutrisi, antioksidan, efek anti-inflamasi, dan potensi pencegahan penyakit degeneratif berdasarkan jurnal penelitian...',
        description: 'Temukan penelitian ilmiah tentang manfaat mangga bagi kesehatan, termasuk kandungan nutrisi, antioksidan, efek anti-inflamasi, dan potensi pencegahan penyakit degeneratif berdasarkan jurnal penelitian...',
        image: '📊',
        date: '25 Nov 2025',
        readTime: '10 min',
        views: 4123,
        source: 'Ciputra Hospital',
        externalUrl: 'https://ciputrahospital.com/manfaat-buah-mangga/'
    },
    {
        id: 'jurnal-mangga-ffhd',
        title: 'Penelitian Jurnal: Kandungan Nutrisi dan Manfaat Kesehatan Mangga',
        category: 'tips',
        excerpt: 'Review penelitian jurnal tentang kandungan nutrisi mangga, senyawa bioaktif, antioksidan, dan manfaat kesehatan berdasarkan studi ilmiah terkini. Pelajari bukti-bukti penelitian tentang efek mangga pada kesehatan...',
        description: 'Review penelitian jurnal tentang kandungan nutrisi mangga, senyawa bioaktif, antioksidan, dan manfaat kesehatan berdasarkan studi ilmiah terkini. Pelajari bukti-bukti penelitian tentang efek mangga pada kesehatan...',
        image: '📚',
        date: '24 Nov 2025',
        readTime: '12 min',
        views: 2890,
        source: 'FFHD Journal',
        externalUrl: 'https://ffhdj.com/index.php/ffhd/article/view/526'
    },
    {
        id: 'mangga-indramayu-1',
        title: 'Mangga Indramayu: Jenis, Ciri-ciri, dan Karakteristik Unggulan',
        category: 'jenis-mangga',
        excerpt: 'Indramayu dikenal sebagai "Kota Mangga" dengan varietas unggulan seperti Cengkir dan Gedong Gincu. Kenali ciri khas, karakteristik, dan keunggulan masing-masing jenis mangga Indramayu...',
        description: 'Indramayu dikenal sebagai "Kota Mangga" dengan varietas unggulan seperti Cengkir dan Gedong Gincu. Kenali ciri khas, karakteristik, dan keunggulan masing-masing jenis mangga Indramayu...',
        image: '🏆',
        date: '24 Nov 2025',
        readTime: '7 min',
        views: 4532,
        source: 'Halodoc & Detik Jabar',
        externalUrl: 'https://www.halodoc.com/artikel/mangga-indramayu-manisnya-jenis-dan-keunggulannya'
    },
    {
        id: 'tanam-bibit-indramayu',
        title: 'Panduan Lengkap Cara Menanam Bibit Mangga Indramayu',
        category: 'perawatan',
        excerpt: 'Pelajari langkah-langkah menanam bibit mangga Indramayu mulai dari pemilihan bibit, persiapan lahan, teknik penanaman, hingga perawatan harian untuk hasil panen optimal...',
        description: 'Pelajari langkah-langkah menanam bibit mangga Indramayu mulai dari pemilihan bibit, persiapan lahan, teknik penanaman, hingga perawatan harian untuk hasil panen optimal...',
        image: '🌱',
        date: '23 Nov 2025',
        readTime: '6 min',
        views: 3876,
        source: 'Agrotanaman',
        externalUrl: 'https://www.agrotanaman.com/p/cara-menanam-bibit-mangga-indramayu.html'
    },
    {
        id: 'budidaya-irwin-polybag',
        title: 'Cara Budidaya Mangga Irwin di Polybag untuk Pemula',
        category: 'perawatan',
        excerpt: 'Teknik budidaya mangga Irwin menggunakan polybag cocok untuk lahan terbatas. Pelajari cara pemilihan bibit, media tanam, penyiraman, pemupukan, dan perawatan hingga berbuah...',
        description: 'Teknik budidaya mangga Irwin menggunakan polybag cocok untuk lahan terbatas. Pelajari cara pemilihan bibit, media tanam, penyiraman, pemupukan, dan perawatan hingga berbuah...',
        image: '🪴',
        date: '22 Nov 2025',
        readTime: '9 min',
        views: 3421,
        source: 'Pertanian77',
        externalUrl: 'https://www.pertanian77.com/2018/08/cara-budidaya-mangga-irwin-di-polybag.html'
    },
    {
        id: 'agrimania-bundar',
        title: 'Merawat Agrimania: Si Bundar Berharga Mahal dari Kota Mangga',
        category: 'jenis-mangga',
        excerpt: 'Agrimania adalah varietas mangga premium dengan bentuk bundar sempurna dan harga yang tinggi. Pelajari karakteristik, teknik perawatan, dan tips budidaya untuk menghasilkan buah berkualitas ekspor...',
        description: 'Agrimania adalah varietas mangga premium dengan bentuk bundar sempurna dan harga yang tinggi. Pelajari karakteristik, teknik perawatan, dan tips budidaya untuk menghasilkan buah berkualitas ekspor...',
        image: '💎',
        date: '21 Nov 2025',
        readTime: '8 min',
        views: 2156,
        source: 'Republika Jabar',
        externalUrl: 'https://rejabar.republika.co.id/berita/r1hmvu327/merawat-agrimania-si-bundar-berharga-mahal-dari-kota-mangga'
    },
    {
        id: 'deteksi-kematangan',
        title: 'Cara Mendeteksi Kematangan Mangga dengan Akurat',
        category: 'tips',
        excerpt: 'Pelajari teknik-teknik modern untuk mengetahui tingkat kematangan buah mangga menggunakan AI dan metode tradisional...',
        description: 'Pelajari teknik-teknik modern untuk mengetahui tingkat kematangan buah mangga menggunakan AI dan metode tradisional...',
        image: '🔍',
        date: '20 Nov 2025',
        readTime: '5 min',
        views: 1876,
        source: 'MOV Platform',
    },
    {
        id: 'teknologi-iot',
        title: 'Teknologi IoT untuk Pertanian Modern',
        category: 'teknologi',
        excerpt: 'Bagaimana sensor IoT dapat membantu meningkatkan produktivitas kebun mangga dengan monitoring real-time...',
        description: 'Bagaimana sensor IoT dapat membantu meningkatkan produktivitas kebun mangga dengan monitoring real-time...',
        image: '🤖',
        date: '19 Nov 2025',
        readTime: '7 min',
        views: 2543,
        source: 'MOV Platform',
    },
    {
        id: 'penyiraman-optimal',
        title: 'Jadwal Penyiraman Optimal untuk Mangga',
        category: 'perawatan',
        excerpt: 'Tentukan waktu dan volume penyiraman yang tepat untuk hasil maksimal berdasarkan kondisi cuaca...',
        description: 'Tentukan waktu dan volume penyiraman yang tepat untuk hasil maksimal berdasarkan kondisi cuaca...',
        image: '💧',
        date: '18 Nov 2025',
        readTime: '6 min',
        views: 1234,
        source: 'MOV Platform',
    },
    {
        id: 'atasi-hama',
        title: 'Mengatasi Hama pada Pohon Mangga',
        category: 'perawatan',
        excerpt: 'Identifikasi dan cara mengatasi berbagai jenis hama yang menyerang mangga secara organik...',
        description: 'Identifikasi dan cara mengatasi berbagai jenis hama yang menyerang mangga secara organik...',
        image: '🐛',
        date: '17 Nov 2025',
        readTime: '9 min',
        views: 1890,
        source: 'MOV Platform',
    },
];

// Featured Article Card Component
function FeaturedArticleCard({ article, auth }) {
    // Use externalUrl or source_url (for database articles)
    const articleUrl = article.externalUrl || article.source_url || null;
    const { imageUrl, isLoading, hasImage, fallbackEmoji } = useArticleImage(
        articleUrl,
        article.image || '🥭'
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
        >
            <Card 
                className="p-0 overflow-hidden border-0 shadow-xl cursor-pointer hover:shadow-2xl transition-shadow"
                onClick={() => {
                    if (article?.externalUrl) {
                        window.open(article.externalUrl, '_blank', 'noopener,noreferrer');
                    } else if (auth?.user) {
                        window.location.href = route('artikel');
                    } else {
                        window.location.href = route('register');
                    }
                }}
            >
                <div className="relative">
                    {/* Image Background */}
                    {isLoading ? (
                        <div className="w-full h-64 bg-gradient-to-br from-green-500 via-emerald-500 to-yellow-500 flex items-center justify-center">
                            <span className="text-6xl animate-pulse">{fallbackEmoji}</span>
                        </div>
                    ) : hasImage && imageUrl ? (
                        <div className="relative w-full h-64 overflow-hidden">
                            <img 
                                src={imageUrl} 
                                alt={article.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextElementSibling.style.display = 'flex';
                                }}
                            />
                            <div className="hidden w-full h-64 bg-gradient-to-br from-green-500 via-emerald-500 to-yellow-500 items-center justify-center">
                                <span className="text-6xl">{fallbackEmoji}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-64 bg-gradient-to-br from-green-500 via-emerald-500 to-yellow-500 flex items-center justify-center">
                            <span className="text-6xl">{fallbackEmoji}</span>
                        </div>
                    )}
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    
                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <Badge className="mb-2 bg-white/20 text-white border-white/30 backdrop-blur-sm">
                            {article.category || 'Artikel'}
                        </Badge>
                        <h3 className="text-xl font-bold mb-2 line-clamp-2">{article.title}</h3>
                        <p className="text-sm text-white/90 line-clamp-2">{article.excerpt || article.description}</p>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}

export default function Welcome({ canLogin, canRegister, teamMembers: teamMembersProp = [] }) {
    const { auth, articles: articlesProp, categories } = usePage().props;
    const [searchQuery, setSearchQuery] = useState('');
    const [teamMembers, setTeamMembers] = useState(teamMembersProp || []);

    // Combine database articles with default articles (same as ArtikelEdukasi)
    const [articles, setArticles] = useState(() => {
        // Convert dbArticles to match the format
        const dbArticlesFormatted = (articlesProp || []).map(article => ({
            id: `db-${article.id}`,
            title: article.title,
            category: article.category || 'berita',
            excerpt: article.excerpt || article.description || '',
            description: article.description || article.excerpt || '',
            image: article.image || '📰',
            date: article.date,
            readTime: article.readTime || '5 min',
            views: article.views || 0,
            source: article.source || 'MOV Platform',
            externalUrl: article.externalUrl || article.source_url || null,
            source_url: article.source_url || article.externalUrl || null,
        }));
        
        return [...dbArticlesFormatted, ...defaultArticlesList];
    });

    // Update articles when articlesProp changes
    useEffect(() => {
        if (articlesProp && Array.isArray(articlesProp)) {
            const dbArticlesFormatted = articlesProp.map(article => ({
                id: `db-${article.id}`,
                title: article.title,
                category: article.category || 'berita',
                excerpt: article.excerpt || article.description || '',
                description: article.description || article.excerpt || '',
                image: article.image || '📰',
                date: article.date,
                readTime: article.readTime || '5 min',
                views: article.views || 0,
                source: article.source || 'MOV Platform',
                externalUrl: article.externalUrl || article.source_url || null,
                source_url: article.source_url || article.externalUrl || null,
            }));
            
            setArticles([...dbArticlesFormatted, ...defaultArticlesList]);
        }
    }, [articlesProp]);

    // Update team members when prop changes (data loaded directly from backend)
    useEffect(() => {
        if (teamMembersProp && teamMembersProp.length > 0) {
            setTeamMembers(teamMembersProp);
        }
    }, [teamMembersProp]);

    // Filter articles based on search - show all if no search query
    const filteredArticles = searchQuery.trim() 
        ? (articles?.filter(article => 
            article.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.description?.toLowerCase().includes(searchQuery.toLowerCase())
        ) || [])
        : (articles || []);

    return (
        <>
            <Head title="MOV Platform - Platform Monitoring & Deteksi Kematangan Buah Mangga" />
            <AnimatedBackground />
            
            <div className="min-h-screen">
                {/* Hero Section */}
                <div className="relative overflow-hidden bg-gradient-to-br from-green-50 via-emerald-50 to-yellow-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center mb-12"
                        >
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mb-6 flex justify-center"
                            >
                                <ApplicationLogo className="h-20 md:h-28" />
                            </motion.div>
                            
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-4xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-green-600 via-emerald-600 to-yellow-600 bg-clip-text text-transparent"
                            >
                                MOV Platform
                            </motion.h1>
                            
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-lg md:text-xl text-gray-700 mb-8 max-w-3xl mx-auto"
                            >
                                Platform Monitoring & Deteksi Kematangan Buah Mangga berbasis AI dan IoT
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                            >
                                {canRegister && (
                                    <Link href={route('register')}>
                                        <Button size="lg" className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg px-8 py-6 text-lg">
                                            <UserPlus className="w-5 h-5 mr-2" />
                                            Daftar Sekarang
                                        </Button>
                                    </Link>
                                )}
                                {canLogin && (
                                    <Link href={route('login')}>
                                        <Button size="lg" variant="outline" className="border-2 border-green-600 text-green-600 hover:bg-green-50 px-8 py-6 text-lg">
                                            <LogIn className="w-5 h-5 mr-2" />
                                            Masuk
                                        </Button>
                                    </Link>
                                )}
                            </motion.div>
                        </motion.div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                    {/* Search */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-8"
                    >
                        <div className="relative max-w-2xl mx-auto">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Cari artikel..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 pr-4 py-3 text-lg border-2 border-gray-300 focus:border-green-500 rounded-xl"
                            />
                        </div>
                    </motion.div>

                    {/* Featured Article - Only show when no search query */}
                    {!searchQuery && articles && articles.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mb-12"
                        >
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
                                Artikel Unggulan
                            </h2>
                            <FeaturedArticleCard article={articles[0]} auth={auth} />
                        </motion.div>
                    )}

                    {/* Articles Grid - Show all articles */}
                    {filteredArticles.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="mb-12"
                        >
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
                                {searchQuery ? 'Hasil Pencarian' : 'Semua Artikel'}
                            </h2>
                            <div className="space-y-4">
                                {filteredArticles.map((article, index) => (
                                    <ArticleCard
                                        key={article.id || index}
                                        article={article}
                                        category={categories?.find((c) => c.id === article.category)}
                                        index={index}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Show message if no articles */}
                    {(!articles || articles.length === 0) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="mb-12"
                        >
                            <Card className="p-12 text-center">
                                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Belum Ada Artikel</h3>
                                <p className="text-sm text-gray-600">Artikel akan muncul di sini setelah ditambahkan.</p>
                            </Card>
                        </motion.div>
                    )}

                    {/* Call to Action untuk Guest */}
                    {!auth?.user && (
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
                                        <h4 className="text-lg font-heading text-gray-900 mb-2">Ingin Akses Penuh?</h4>
                                        <p className="text-sm text-gray-700 mb-4 font-body">
                                            Daftar sebagai petani untuk mengakses fitur monitoring kebun, deteksi AI, dan kontrol penyiraman!
                                        </p>
                                        <div className="flex gap-3">
                                            {canRegister && (
                                                <Link href={route('register')} className="flex-1">
                                                    <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg">
                                                        Daftar Sekarang
                                                    </Button>
                                                </Link>
                                            )}
                                            {canLogin && (
                                                <Link href={route('login')} className="flex-1">
                                                    <Button variant="outline" className="w-full border-2 border-green-600 text-green-600 hover:bg-green-50">
                                                        Masuk
                                                    </Button>
                                                </Link>
                                            )}
                                    </div>
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
                            <h3 className="text-lg font-heading text-gray-900 mb-4 flex items-center gap-2">
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
                            <h4 className="text-lg font-heading text-gray-900 mb-3 flex items-center gap-2">
                                <span>👨‍🌾</span> Informasi Mitra
                            </h4>
                            <p className="text-sm text-gray-700 mb-4 font-body">
                                Tertarik untuk menjadi mitra atau distributor hasil panen? Hubungi kami untuk informasi lebih lanjut.
                            </p>
                            <Link
                                href={route('chat.guest')}
                                className="block w-full"
                            >
                                <Button variant="outline" className="w-full border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-heading">
                                    Hubungi Mitra
                                </Button>
                            </Link>
                        </Card>
                    </motion.div>

                    {/* Tentang Kami Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="mt-12"
                    >
                        <Card className="p-0 overflow-hidden border-2 border-green-300 shadow-2xl">
                            <div className="bg-gradient-to-r from-green-500 via-emerald-600 to-green-600 p-6 md:p-8 text-white relative overflow-hidden">
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-400/20 rounded-full blur-2xl"></div>
                                
                                <div className="flex items-center gap-4 mb-2 relative z-10">
                                    <motion.div
                                        whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                                        transition={{ duration: 0.5 }}
                                        className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl flex items-center justify-center text-3xl md:text-4xl shadow-2xl"
                                    >
                                        👥
                                    </motion.div>
                                    <div>
                                        <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-1 drop-shadow-lg">
                                            Tentang Kami
                                        </h3>
                                        <p className="text-sm md:text-base text-green-50 font-semibold">
                                            Kelompok SiGMA G2 - Tim Pengembang MOV Platform
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-4 md:p-6">
                                {/* Header with Logos */}
                                <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-6">
                                    <img 
                                        src="/Logo TEKOM.png" 
                                        alt="Logo TEKOM" 
                                        className="h-16 md:h-20 object-contain"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                    <img 
                                        src="/logo sv.png" 
                                        alt="Logo SV" 
                                        className="h-16 md:h-20 object-contain"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                </div>

                                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
                                    <p className="text-sm text-gray-800 mb-3 font-semibold text-center">
                                        Mengembangkan aplikasi web berbasis visi komputer untuk mendeteksi tingkat kematangan buah mangga melalui analisis gambar.
                                    </p>
                                    <div className="flex items-center justify-center gap-2">
                                        <Badge className="bg-green-600 text-white border-0">SiGMA G2</Badge>
                                        <span className="text-xs text-gray-600">IPB University</span>
                                    </div>
                                </div>
                                
                                {/* Team Members Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                                    {teamMembers.map((member, index) => {
                                        // Determine gradient colors based on jobdesc
                                        const jobdescLower = member.jobdesc.toLowerCase();
                                        let gradientFrom = 'from-blue-500';
                                        let gradientTo = 'to-indigo-600';
                                        let bgFrom = 'from-blue-50';
                                        let bgTo = 'to-indigo-50';
                                        let borderColor = 'border-blue-200';
                                        let badgeBg = 'bg-blue-100';
                                        let badgeText = 'text-blue-700';
                                        let badgeBorder = 'border-blue-300';

                                        if (jobdescLower.includes('robotik') && jobdescLower.includes('back-end')) {
                                            gradientFrom = 'from-green-500';
                                            gradientTo = 'to-emerald-600';
                                            bgFrom = 'from-green-50';
                                            bgTo = 'to-emerald-50';
                                            borderColor = 'border-green-200';
                                            badgeBg = 'bg-green-100';
                                            badgeText = 'text-green-700';
                                            badgeBorder = 'border-green-300';
                                        } else if (jobdescLower.includes('front-end') || (jobdescLower.includes('robotik') && !jobdescLower.includes('back-end'))) {
                                            gradientFrom = 'from-blue-500';
                                            gradientTo = 'to-indigo-600';
                                            bgFrom = 'from-blue-50';
                                            bgTo = 'to-indigo-50';
                                            borderColor = 'border-blue-200';
                                            badgeBg = 'bg-blue-100';
                                            badgeText = 'text-blue-700';
                                            badgeBorder = 'border-blue-300';
                                        } else if (jobdescLower.includes('stakeholder') || jobdescLower.includes('mitra') || jobdescLower.includes('database')) {
                                            gradientFrom = 'from-yellow-500';
                                            gradientTo = 'to-amber-600';
                                            bgFrom = 'from-yellow-50';
                                            bgTo = 'to-amber-50';
                                            borderColor = 'border-yellow-200';
                                            badgeBg = 'bg-yellow-100';
                                            badgeText = 'text-yellow-700';
                                            badgeBorder = 'border-yellow-300';
                                        } else if (jobdescLower.includes('machine learning')) {
                                            gradientFrom = 'from-purple-500';
                                            gradientTo = 'to-purple-700';
                                            bgFrom = 'from-purple-50';
                                            bgTo = 'to-purple-50';
                                            borderColor = 'border-purple-200';
                                            badgeBg = 'bg-purple-100';
                                            badgeText = 'text-purple-700';
                                            badgeBorder = 'border-purple-300';
                                        }

                                        return (
                                            <motion.div
                                                key={member.id || index}
                                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ 
                                                    delay: 0.8 + index * 0.1,
                                                    type: "spring",
                                                    stiffness: 100,
                                                    damping: 15
                                                }}
                                                whileHover={{ scale: 1.05, y: -8 }}
                                                className={`bg-gradient-to-br ${bgFrom} ${bgTo} p-6 md:p-8 rounded-2xl border-2 ${borderColor} shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden`}
                                            >
                                                {/* Decorative background pattern */}
                                                <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 ${gradientFrom.replace('from-', 'bg-')} rounded-full blur-3xl`}></div>
                                                
                                                <div className="flex flex-col items-center text-center relative z-10">
                                                    {/* Photo - Larger and more dominant */}
                                                    <motion.div
                                                        whileHover={{ rotate: [0, -5, 5, -5, 0] }}
                                                        transition={{ duration: 0.5 }}
                                                        className={`w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-full flex items-center justify-center mb-4 md:mb-6 shadow-2xl overflow-hidden ring-4 ring-white/50 relative`}
                                                    >
                                                        {member.photo_url ? (
                                                            <img 
                                                                src={member.photo_url} 
                                                                alt={member.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <Users className="w-16 h-16 md:w-20 md:h-20 text-white" />
                                                        )}
                                                        {/* Glow effect */}
                                                        <div className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${gradientTo} opacity-20 blur-xl`}></div>
                                                    </motion.div>
                                                    
                                                    {/* Name with gradient text */}
                                                    <h4 className="text-xl md:text-2xl font-extrabold mb-2 bg-gradient-to-r from-gray-800 to-gray-900 bg-clip-text text-transparent">
                                                        {member.name}
                                                    </h4>
                                                    
                                                    {/* Jobdesc badges */}
                                                    <div className="flex flex-wrap gap-2 justify-center mb-4">
                                                        {member.jobdesc.split(',').map((job, idx) => (
                                                            <motion.div
                                                                key={idx}
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                transition={{ delay: 0.8 + index * 0.1 + idx * 0.05 }}
                                                                whileHover={{ scale: 1.1 }}
                                                            >
                                                                <Badge 
                                                                    className={`${badgeBg} ${badgeText} ${badgeBorder} text-xs md:text-sm px-3 py-1 font-semibold shadow-md`}
                                                                >
                                                                    {job.trim()}
                                                                </Badge>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                    
                                                    {/* Description with better typography */}
                                                    <p className="text-sm md:text-base text-gray-700 leading-relaxed font-medium">
                                                        {member.description}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {teamMembers.length === 0 && (
                                    <div className="text-center py-12">
                                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500">Belum ada informasi tim</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </>
    );
}
