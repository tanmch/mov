import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage, router } from '@inertiajs/react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { useHeaderOffset } from '@/hooks/useHeaderOffset';
import { Card } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Search, BookOpen, TrendingUp, Lightbulb, Eye, Clock, RefreshCw, ExternalLink, MessageCircle, Plus, Edit, Trash2, X, Sparkles, CheckCircle, Users, Settings } from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import SkeletonLoader, { SkeletonCard } from '@/Components/ui/SkeletonLoader';
import EmptyState from '@/Components/ui/EmptyState';
import BackButton from '@/Components/BackButton';
import ArticleCard from '@/Components/ArticleCard';

// Default articles (hardcoded) - defined outside component
const defaultArticlesList = [
        {
            id: 'manfaat-mangga-1',
            title: 'Manfaat Mangga: Buah Favorit Sejuta Umat dengan Segudang Khasiat',
            category: 'tips',
            excerpt: 'Mangga kaya akan vitamin C, A, E, beta-karoten, dan antioksidan yang membantu memperkuat sistem imun, menjaga kesehatan mata, pencernaan, kulit, dan jantung. Pelajari manfaat lengkap buah tropis ini...',
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
            image: '🐛',
            date: '17 Nov 2025',
            readTime: '9 min',
            views: 1890,
            source: 'MOV Platform',
        },
];

export default function ArtikelEdukasi({ dbArticles = [] }) {
    const page = usePage();
    const { auth, flash } = page.props;
    const userRole = auth?.user?.role;
    const isKPetani = userRole === 'k-petani';
    const topOffset = useHeaderOffset();
    const [selectedCategory, setSelectedCategory] = useState('semua');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);
    
    // Article management states (K-Petani only)
    const [showArticleModal, setShowArticleModal] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [articleFormData, setArticleFormData] = useState({
        title: '',
        source_url: '',
        year: new Date().getFullYear(),
        publish_date: new Date().toISOString().split('T')[0],
        description: '',
        category: 'berita',
    });
    const [articleErrors, setArticleErrors] = useState({});
    const [isSubmittingArticle, setIsSubmittingArticle] = useState(false);
    const [isGeneratingArticle, setIsGeneratingArticle] = useState(false);
    const [articleToDelete, setArticleToDelete] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteToast, setDeleteToast] = useState({ show: false, message: '', articleTitle: '', type: 'success' });
    const [hiddenDefaultArticles, setHiddenDefaultArticles] = useState(() => {
        // Load from localStorage
        const saved = localStorage.getItem('hiddenDefaultArticles');
        return saved ? JSON.parse(saved) : [];
    });

    const categories = [
        { id: 'semua', label: 'Semua', icon: '📚' },
        { id: 'berita', label: 'Berita Mangga', icon: '📰' },
        { id: 'tips', label: 'Tips Pertanian', icon: '💡' },
        { id: 'teknologi', label: 'Teknologi', icon: '🤖' },
        { id: 'jenis-mangga', label: 'Jenis Mangga', icon: '🥭' },
        { id: 'perawatan', label: 'Perawatan', icon: '🌱' },
    ];

    // Combine database articles with default articles
    const [articles, setArticles] = useState(() => {
        // Convert dbArticles to match the format
        const dbArticlesFormatted = (dbArticles || []).map(article => ({
            id: `db-${article.id}`,
            title: article.title,
            category: article.category || 'berita',
            excerpt: article.excerpt || article.description || '',
            image: article.image || '📰',
            date: article.date,
            readTime: article.readTime || '5 min',
            views: article.views || 0,
            source: article.source || 'MOV Platform',
            externalUrl: article.externalUrl || article.source_url || null,
            source_url: article.source_url || article.externalUrl || null,
        }));
        
        // Filter out hidden default articles
        const visibleDefaultArticles = defaultArticlesList.filter(
            article => !hiddenDefaultArticles.includes(article.id)
        );
        
        return [...dbArticlesFormatted, ...visibleDefaultArticles];
    });

    // Load team members from database
    useEffect(() => {
        loadTeamMembers();
    }, []);

    const loadTeamMembers = async () => {
        try {
            const response = await window.axios.get('/api/about-us');
            if (response.data && response.data.success) {
                setTeamMembers(response.data.team_members || []);
            }
        } catch (error) {
            console.error('Failed to load team members:', error);
            // Try fallback
            try {
                const altResponse = await fetch('/api/about-us');
                const altData = await altResponse.json();
                if (altData.success) {
                    setTeamMembers(altData.team_members || []);
                }
            } catch (altError) {
                console.error('Alternative fetch also failed:', altError);
            }
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    // Update articles when dbArticles changes
    useEffect(() => {
        if (dbArticles && Array.isArray(dbArticles)) {
            const dbArticlesFormatted = dbArticles.map(article => ({
                id: `db-${article.id}`,
                title: article.title,
                category: article.category || 'berita',
                excerpt: article.excerpt || article.description || '',
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
    }, [dbArticles]);

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

    // Check if article is from database (can be edited/deleted by K-Petani)
    const isArticleFromDB = (articleId) => {
        // Check if article ID starts with 'db-' prefix (new format)
        if (articleId?.toString().startsWith('db-')) {
            return true;
        }
        // Also check if article exists in dbArticles array (for backward compatibility)
        // This ensures all articles from database can be CRUD, even if they don't have 'db-' prefix
        if (dbArticles && Array.isArray(dbArticles)) {
            const originalId = getOriginalArticleId(articleId);
            if (originalId) {
                return dbArticles.some(a => a.id === originalId);
            }
            // If articleId is a number, check directly
            if (typeof articleId === 'number' || (!isNaN(articleId) && !articleId.toString().includes('-'))) {
                return dbArticles.some(a => a.id === parseInt(articleId));
            }
        }
        return false;
    };

    // Get original article ID from formatted ID
    const getOriginalArticleId = (articleId) => {
        if (!articleId) return null;
        
        // If it starts with 'db-', extract the ID
        if (articleId.toString().startsWith('db-')) {
            return parseInt(articleId.toString().replace('db-', ''));
        }
        
        // If it's already a number, return it
        if (typeof articleId === 'number') {
            return articleId;
        }
        
        // Try to parse as number (for backward compatibility with old articles)
        const parsed = parseInt(articleId);
        if (!isNaN(parsed)) {
            return parsed;
        }
        
        return null;
    };

    // Handle article modal
    const handleOpenArticleModal = (article = null) => {
        if (article) {
            const originalId = getOriginalArticleId(article.id);
            setSelectedArticle(originalId);
            
            // Check if article is from database
            const originalArticle = dbArticles.find(a => a.id === originalId);
            if (originalArticle) {
                // Article from database - load its data
                setArticleFormData({
                    title: originalArticle.title || '',
                    source_url: originalArticle.externalUrl || originalArticle.source_url || '',
                    year: originalArticle.year || new Date().getFullYear(),
                    publish_date: originalArticle.date ? new Date(originalArticle.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    description: originalArticle.excerpt || originalArticle.description || '',
                    category: originalArticle.category || 'berita',
                });
            } else {
                // Article is from default list (hardcoded) - allow editing and save to database
                // Parse date from article.date (format: "25 Nov 2025")
                let publishDate = new Date().toISOString().split('T')[0];
                let year = new Date().getFullYear();
                
                if (article.date) {
                    try {
                        // Try to parse date format like "25 Nov 2025"
                        const dateParts = article.date.trim().split(' ');
                        if (dateParts.length === 3) {
                            const day = parseInt(dateParts[0]);
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            const monthName = dateParts[1];
                            const month = monthNames.indexOf(monthName);
                            year = parseInt(dateParts[2]);
                            
                            if (month !== -1 && !isNaN(day) && !isNaN(year)) {
                                const dateObj = new Date(year, month, day);
                                if (!isNaN(dateObj.getTime())) {
                                    publishDate = dateObj.toISOString().split('T')[0];
                                }
                            }
                        } else {
                            // Try to extract year from date string
                            const yearMatch = article.date.match(/\d{4}/);
                            if (yearMatch) {
                                year = parseInt(yearMatch[0]);
                            }
                        }
                    } catch (e) {
                        // Use current date if parsing fails
                        console.error('Error parsing date:', e);
                    }
                }
                
                setArticleFormData({
                    title: article.title || '',
                    source_url: article.externalUrl || '',
                    year: year,
                    publish_date: publishDate,
                    description: article.excerpt || '',
                    category: article.category || 'berita',
                });
                // Set selectedArticle to null so it will be created as new article
                setSelectedArticle(null);
            }
        } else {
            setSelectedArticle(null);
            setArticleFormData({
                title: '',
                source_url: '',
                year: new Date().getFullYear(),
                publish_date: new Date().toISOString().split('T')[0],
                description: '',
                category: 'berita',
            });
        }
        setArticleErrors({});
        setShowArticleModal(true);
    };

    const handleCloseArticleModal = () => {
        setShowArticleModal(false);
        setSelectedArticle(null);
        setArticleFormData({
            title: '',
            source_url: '',
            year: new Date().getFullYear(),
            publish_date: new Date().toISOString().split('T')[0],
            description: '',
            category: 'berita',
        });
        setArticleErrors({});
    };

    const handleSubmitArticle = (e) => {
        e.preventDefault();
        setIsSubmittingArticle(true);
        setArticleErrors({});

        if (selectedArticle) {
            // Update article
            router.put(route('articles.update', selectedArticle), articleFormData, {
                preserveScroll: true,
                onSuccess: () => {
                    handleCloseArticleModal();
                    // The redirect will automatically reload the page with new articles
                },
                onError: (errors) => {
                    setArticleErrors(errors);
                    setIsSubmittingArticle(false);
                },
                onFinish: () => {
                    setIsSubmittingArticle(false);
                },
            });
        } else {
            // Create article
            router.post(route('articles.store'), articleFormData, {
                preserveScroll: true,
                onSuccess: () => {
                    handleCloseArticleModal();
                    // The redirect will automatically reload the page with new articles
                },
                onError: (errors) => {
                    console.error('Article creation error:', errors);
                    setArticleErrors(errors);
                    setIsSubmittingArticle(false);
                },
                onFinish: () => {
                    setIsSubmittingArticle(false);
                },
            });
        }
    };

    const handleDeleteArticleClick = (article) => {
        const originalId = getOriginalArticleId(article.id);
        if (originalId) {
            // Article is from database - can be deleted
            setArticleToDelete(originalId);
            setShowDeleteModal(true);
        } else {
            // Article is from default list - hide it from view (can't delete from code, but can hide)
            setArticleToDelete(article.id);
            setShowDeleteModal(true);
        }
    };

    const handleDeleteArticleConfirm = () => {
        if (articleToDelete) {
            // Find the article to get its title for the toast
            const articleToDeleteObj = articles.find(a => {
                const originalId = getOriginalArticleId(a.id);
                return originalId === articleToDelete || a.id === articleToDelete;
            });
            const articleTitle = articleToDeleteObj?.title || 'Artikel';
            
            // Check if it's a default article (string ID that doesn't start with 'db-') or database article
            if (typeof articleToDelete === 'string' && !articleToDelete.toString().startsWith('db-')) {
                // Default article - hide it from view
                const updatedHidden = [...hiddenDefaultArticles, articleToDelete];
                setHiddenDefaultArticles(updatedHidden);
                localStorage.setItem('hiddenDefaultArticles', JSON.stringify(updatedHidden));
                
                // Update articles list to remove the hidden article
                setArticles(prevArticles => prevArticles.filter(a => a.id !== articleToDelete));
                
                setShowDeleteModal(false);
                setArticleToDelete(null);
                
                // Show success toast
                setDeleteToast({
                    show: true,
                    message: `Artikel "${articleTitle}" berhasil dihapus`,
                    articleTitle: articleTitle,
                    type: 'success'
                });
                
                // Auto-hide toast after 4 seconds
                setTimeout(() => {
                    setDeleteToast({ show: false, message: '', articleTitle: '', type: 'success' });
                }, 4000);
            } else {
                // Database article - delete from database
                const originalId = typeof articleToDelete === 'string' 
                    ? getOriginalArticleId(articleToDelete)
                    : articleToDelete;
                    
                if (originalId) {
                    router.delete(route('articles.destroy', originalId), {
                        preserveScroll: true,
                        onSuccess: () => {
                            // The redirect will automatically reload the page with new articles
                            setShowDeleteModal(false);
                            setArticleToDelete(null);
                            
                            // Show success toast
                            setDeleteToast({
                                show: true,
                                message: `Artikel "${articleTitle}" berhasil dihapus`,
                                articleTitle: articleTitle,
                                type: 'success'
                            });
                            
                            // Auto-hide toast after 4 seconds
                            setTimeout(() => {
                                setDeleteToast({ show: false, message: '', articleTitle: '', type: 'success' });
                            }, 4000);
                        },
                        onError: () => {
                            setShowDeleteModal(false);
                            setArticleToDelete(null);
                            
                            // Show error toast
                            setDeleteToast({
                                show: true,
                                message: `Gagal menghapus artikel "${articleTitle}"`,
                                articleTitle: articleTitle,
                                type: 'error'
                            });
                            
                            // Auto-hide toast after 4 seconds
                            setTimeout(() => {
                                setDeleteToast({ show: false, message: '', articleTitle: '', type: 'success' });
                            }, 4000);
                        },
                    });
                } else {
                    setShowDeleteModal(false);
                    setArticleToDelete(null);
                }
            }
        }
    };

    const handleGenerateArticle = async () => {
        const url = articleFormData.source_url;
        
        if (!url || !url.trim()) {
            setArticleErrors({ source_url: 'URL harus diisi terlebih dahulu' });
            return;
        }

        // Validate URL format
        try {
            new URL(url);
        } catch (e) {
            setArticleErrors({ source_url: 'Format URL tidak valid' });
            return;
        }

        setIsGeneratingArticle(true);
        setArticleErrors({});

        try {
            // Get fresh CSRF token from meta tag (always fresh)
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
            
            if (!csrfToken) {
                throw new Error('CSRF token tidak ditemukan. Silakan refresh halaman.');
            }
            
            // Use axios which is already configured with CSRF token
            const response = await window.axios.post(route('articles.generate'), { url }, {
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                },
            });
            const data = response.data;

            if (data.success && data.data) {
                // Format publish_date to YYYY-MM-DD if needed
                let publishDate = data.data.publish_date;
                if (publishDate && publishDate.includes('/')) {
                    // Convert from MM/DD/YYYY to YYYY-MM-DD
                    const parts = publishDate.split('/');
                    if (parts.length === 3) {
                        publishDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
                    }
                }
                
                setArticleFormData({
                    ...articleFormData,
                    title: data.data.title || articleFormData.title || '',
                    year: data.data.year || articleFormData.year || new Date().getFullYear(),
                    publish_date: publishDate || articleFormData.publish_date || new Date().toISOString().split('T')[0],
                    description: data.data.description || articleFormData.description || '',
                });
                
                // Clear any previous errors
                setArticleErrors({});
            } else {
                setArticleErrors({ 
                    general: data.message || data.error || 'Gagal mengambil data artikel. Silakan isi manual.' 
                });
            }
        } catch (error) {
            console.error('Error generating article:', error);
            const errorMessage = error.response?.data?.message 
                || error.response?.data?.error 
                || error.message 
                || 'Terjadi kesalahan saat mengambil data artikel. Silakan isi manual.';
            setArticleErrors({ 
                general: errorMessage
            });
        } finally {
            setIsGeneratingArticle(false);
        }
    };

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
                        <div className="flex items-center gap-2">
                            {isKPetani && (
                                <Button
                                    onClick={() => handleOpenArticleModal()}
                                    size="sm"
                                    className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
                                >
                                    <Plus className="w-4 h-4" />
                                    Tambah Artikel
                                </Button>
                            )}
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
                        </div>
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
                                    <Badge className="bg-white text-green-600 mb-3 border-0">⭐ Featured</Badge>
                                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">Manfaat Mangga: Buah Favorit Sejuta Umat</h3>
                                    <p className="text-base text-green-50 mb-4 max-w-2xl">
                                        Temukan segudang manfaat kesehatan dari buah mangga, mulai dari vitamin C untuk imunitas, vitamin A untuk mata, hingga antioksidan untuk melawan radikal bebas. Pelajari juga varietas unggulan Mangga Indramayu dan teknik budidaya modern.
                                    </p>
                                    <Button 
                                        className="bg-white text-green-600 hover:bg-green-50 font-medium shadow-lg"
                                        onClick={() => {
                                            const article = articles.find(a => a.id === 'manfaat-mangga-1');
                                            if (article?.externalUrl) {
                                                window.open(article.externalUrl, '_blank', 'noopener,noreferrer');
                                            }
                                        }}
                                    >
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
                                        {filteredArticles.map((article, index) => {
                                            // Allow CRUD for all articles if user is K-Petani
                                            // Articles from database can be edited/deleted
                                            // Articles from default list can be edited (will be saved to database as new article)
                                            const isFromDB = isArticleFromDB(article.id);
                                            const articleActions = isKPetani ? (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 hover:bg-blue-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenArticleModal(article);
                                                        }}
                                                        title="Edit Artikel"
                                                    >
                                                        <Edit className="w-3.5 h-3.5 text-blue-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 hover:bg-red-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteArticleClick(article);
                                                        }}
                                                        title="Hapus Artikel"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                                    </Button>
                                                </>
                                            ) : null;

                                            return (
                                                <ArticleCard
                                                    key={article.id}
                                                    article={article}
                                                    category={categories.find((c) => c.id === article.category)}
                                                    index={index}
                                                    actions={articleActions}
                                                />
                                            );
                                        })}
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
                                        <h3 className="text-xl font-bold text-white">Mitra Kami</h3>
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
                                
                                <div className="space-y-2">
                                    <a 
                                        href="https://wa.me/628112019210" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="block"
                                    >
                                        <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg font-medium">
                                            Hubungi via WhatsApp 📞
                                        </Button>
                                    </a>
                                    <p className="text-xs text-center text-gray-600">
                                        WhatsApp: +62 811-2019-210
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Tentang Kami - Team Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 }}
                    >
                        <Card className="p-0 overflow-hidden border-2 border-green-300 shadow-2xl">
                            <div className="bg-gradient-to-r from-green-500 via-emerald-600 to-green-600 p-6 md:p-8 text-white relative overflow-hidden">
                                {/* Decorative elements */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                                <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-400/20 rounded-full blur-2xl"></div>
                                
                                <div className="flex items-center justify-between relative z-10">
                                    <div className="flex items-center gap-4">
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
                                    {isKPetani && (
                                        <Link href={route('about-us.management')}>
                                            <motion.div
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm shadow-lg"
                                                >
                                                    <Settings className="w-4 h-4 mr-2" />
                                                    Kelola
                                                </Button>
                                            </motion.div>
                                        </Link>
                                    )}
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
                                
                                {/* Team Members Grid - Loaded from database */}
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
                                                    delay: 0.9 + index * 0.1,
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
                                                                transition={{ delay: 0.9 + index * 0.1 + idx * 0.05 }}
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

            {/* Article Management Modal (K-Petani only) */}
            {isKPetani && showArticleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 p-4 flex items-center justify-between rounded-t-2xl">
                            <h2 className="text-xl font-bold text-white">
                                {selectedArticle ? 'Edit Artikel' : 'Tambah Artikel Baru'}
                            </h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCloseArticleModal}
                                className="text-white hover:bg-white/20 h-8 w-8 p-0"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <form onSubmit={handleSubmitArticle} className="p-6 space-y-4">
                            <div>
                                <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                                    Judul Artikel <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="title"
                                    type="text"
                                    value={articleFormData.title}
                                    onChange={(e) => setArticleFormData({ ...articleFormData, title: e.target.value })}
                                    className={`mt-1 ${articleErrors.title ? 'border-red-500' : ''}`}
                                    placeholder="Masukkan judul artikel"
                                    required
                                />
                                {articleErrors.title && (
                                    <p className="mt-1 text-sm text-red-500">{articleErrors.title}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="source_url" className="text-sm font-medium text-gray-700">
                                    URL Sumber <span className="text-red-500">*</span>
                                </Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        id="source_url"
                                        type="url"
                                        value={articleFormData.source_url}
                                        onChange={(e) => setArticleFormData({ ...articleFormData, source_url: e.target.value })}
                                        className={`flex-1 ${articleErrors.source_url ? 'border-red-500' : ''}`}
                                        placeholder="https://example.com/article"
                                        required
                                    />
                                    <Button
                                        type="button"
                                        onClick={handleGenerateArticle}
                                        disabled={isGeneratingArticle || !articleFormData.source_url}
                                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white whitespace-nowrap flex items-center gap-2"
                                        title="Generate otomatis judul, tahun, tanggal, dan deskripsi dari URL"
                                    >
                                        <Sparkles className={`w-4 h-4 ${isGeneratingArticle ? 'animate-spin' : ''}`} />
                                        {isGeneratingArticle ? 'Generating...' : 'Generate'}
                                    </Button>
                                </div>
                                {articleErrors.source_url && (
                                    <p className="mt-1 text-sm text-red-500">{articleErrors.source_url}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="year" className="text-sm font-medium text-gray-700">
                                        Tahun <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="year"
                                        type="number"
                                        value={articleFormData.year}
                                        onChange={(e) => setArticleFormData({ ...articleFormData, year: parseInt(e.target.value) })}
                                        className={`mt-1 ${articleErrors.year ? 'border-red-500' : ''}`}
                                        min="2000"
                                        max={new Date().getFullYear() + 1}
                                        required
                                    />
                                    {articleErrors.year && (
                                        <p className="mt-1 text-sm text-red-500">{articleErrors.year}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="publish_date" className="text-sm font-medium text-gray-700">
                                        Tanggal Publikasi <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="publish_date"
                                        type="date"
                                        value={articleFormData.publish_date}
                                        onChange={(e) => setArticleFormData({ ...articleFormData, publish_date: e.target.value })}
                                        className={`mt-1 ${articleErrors.publish_date ? 'border-red-500' : ''}`}
                                        required
                                    />
                                    {articleErrors.publish_date && (
                                        <p className="mt-1 text-sm text-red-500">{articleErrors.publish_date}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                                    Deskripsi
                                </Label>
                                <textarea
                                    id="description"
                                    value={articleFormData.description}
                                    onChange={(e) => setArticleFormData({ ...articleFormData, description: e.target.value })}
                                    className={`mt-1 w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 ${articleErrors.description ? 'border-red-500' : ''}`}
                                    rows="4"
                                    placeholder="Masukkan deskripsi artikel (opsional)"
                                />
                                {articleErrors.description && (
                                    <p className="mt-1 text-sm text-red-500">{articleErrors.description}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                                    Kategori <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="category"
                                    value={articleFormData.category}
                                    onChange={(e) => setArticleFormData({ ...articleFormData, category: e.target.value })}
                                    className={`mt-1 w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 ${articleErrors.category ? 'border-red-500' : ''}`}
                                    required
                                >
                                    {categories.filter(cat => cat.id !== 'semua').map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.icon} {category.label}
                                        </option>
                                    ))}
                                </select>
                                {articleErrors.category && (
                                    <p className="mt-1 text-sm text-red-500">{articleErrors.category}</p>
                                )}
                            </div>

                            {articleErrors.general && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">{articleErrors.general}</p>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-4 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCloseArticleModal}
                                    disabled={isSubmittingArticle}
                                >
                                    Batal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmittingArticle}
                                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                                >
                                    {isSubmittingArticle ? 'Menyimpan...' : selectedArticle ? 'Perbarui' : 'Simpan'}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isKPetani && showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <Trash2 className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Hapus Artikel</h3>
                                <p className="text-sm text-gray-600">Tindakan ini tidak dapat dibatalkan</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-6">
                            Apakah Anda yakin ingin menghapus artikel ini? Artikel yang dihapus tidak dapat dikembalikan.
                        </p>
                        <div className="flex items-center justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setArticleToDelete(null);
                                }}
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={handleDeleteArticleConfirm}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                Hapus
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Success/Error Flash Messages */}
            {flash?.success && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg"
                >
                    {flash.success}
                </motion.div>
            )}

            {/* Delete Success Toast */}
            <AnimatePresence>
                {deleteToast.show && (
                    <motion.div
                        key="delete-toast"
                        initial={{ opacity: 0, x: 400, scale: 0.8, y: -20 }}
                        animate={{ 
                            opacity: 1, 
                            x: 0, 
                            scale: 1, 
                            y: 0,
                            transition: { 
                                type: "spring", 
                                damping: 20, 
                                stiffness: 300
                            }
                        }}
                        exit={{ 
                            opacity: 0, 
                            x: 400, 
                            scale: 0.8,
                            transition: { duration: 0.2 }
                        }}
                        style={{ 
                            top: `${topOffset}px`,
                            transition: 'top 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                        className="fixed right-4 z-[100] max-w-md"
                    >
                        <motion.div
                            className={`relative overflow-hidden rounded-2xl shadow-2xl border-2 backdrop-blur-md ${
                                deleteToast.type === 'error'
                                    ? 'bg-gradient-to-br from-red-50/95 to-rose-50/95 border-red-200/50'
                                    : 'bg-gradient-to-br from-green-50/95 to-emerald-50/95 border-green-200/50'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {/* Animated Background Glow */}
                            <div className={`absolute inset-0 blur-xl ${
                                deleteToast.type === 'error'
                                    ? 'bg-gradient-to-br from-red-400/20 to-rose-400/20'
                                    : 'bg-gradient-to-br from-green-400/20 to-emerald-400/20'
                            }`}></div>
                            
                            {/* Animated Glow Effect */}
                            <motion.div
                                className={`absolute -inset-1 rounded-2xl ${
                                    deleteToast.type === 'error' ? 'bg-red-400' : 'bg-green-400'
                                }`}
                                animate={{
                                    opacity: [0.3, 0.6, 0.3],
                                    scale: [1, 1.05, 1],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                style={{ filter: 'blur(8px)' }}
                            />
                            
                            <div className="relative p-5 flex items-start gap-4">
                                {/* Icon */}
                                <motion.div
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ 
                                        delay: 0.2, 
                                        type: "spring", 
                                        stiffness: 200, 
                                        damping: 15 
                                    }}
                                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                                        deleteToast.type === 'error'
                                            ? 'bg-gradient-to-br from-red-500 to-rose-600 text-white'
                                            : 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                                    }`}
                                >
                                    {deleteToast.type === 'error' ? (
                                        <X className="w-6 h-6" />
                                    ) : (
                                        <CheckCircle className="w-6 h-6" />
                                    )}
                                </motion.div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <motion.h3
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className={`text-lg font-bold mb-1 ${
                                            deleteToast.type === 'error' ? 'text-red-800' : 'text-green-800'
                                        }`}
                                    >
                                        {deleteToast.type === 'error' 
                                            ? 'Gagal!' 
                                            : 'Berhasil Dihapus!'
                                        }
                                    </motion.h3>
                                    <motion.p
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.4 }}
                                        className={`text-sm ${
                                            deleteToast.type === 'error' ? 'text-red-700' : 'text-green-700'
                                        }`}
                                    >
                                        {deleteToast.message}
                                    </motion.p>
                                </div>

                                {/* Close Button */}
                                <motion.button
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 }}
                                    onClick={() => setDeleteToast({ show: false, message: '', articleTitle: '', type: 'success' })}
                                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                        deleteToast.type === 'error'
                                            ? 'hover:bg-red-100 text-red-600'
                                            : 'hover:bg-green-100 text-green-600'
                                    }`}
                                >
                                    <X className="w-4 h-4" />
                                </motion.button>

                                {/* Sparkle Effect */}
                                {deleteToast.type !== 'error' && (
                                    <div className="absolute top-2 right-2 pointer-events-none">
                                        <motion.div
                                            animate={{
                                                rotate: [0, 360],
                                                scale: [1, 1.2, 1],
                                            }}
                                            transition={{
                                                duration: 3,
                                                repeat: Infinity,
                                                ease: "linear"
                                            }}
                                        >
                                            <Sparkles className={`w-4 h-4 ${
                                                deleteToast.type === 'error' ? 'text-red-400' : 'text-green-400'
                                            } opacity-50`} />
                                        </motion.div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </AuthenticatedLayout>
    );
}
