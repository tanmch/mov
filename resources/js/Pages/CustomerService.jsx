import { useState, useRef, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { useRole } from '@/hooks/useRole';
import { 
    MessageCircle, Phone, Mail, User, Send, HeadphonesIcon, 
    FileQuestion, BookOpen, Lightbulb, Settings, ShieldCheck,
    Sparkles, Zap, Clock, CheckCircle2
} from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import BackButton from '@/Components/BackButton';

export default function CustomerService() {
    const { isKPetani, userRole } = useRole();
    const [message, setMessage] = useState('');
    const [chatMessages, setChatMessages] = useState([
        {
            id: 1,
            from: 'bot',
            text: 'Halo! Selamat datang di MOV Center. Ada yang bisa kami bantu?',
            time: '10:30',
        },
    ]);
    const chatEndRef = useRef(null);
    const [isTyping, setIsTyping] = useState(false);

    // MOV Center Contact Info
    const contactInfo = {
        email: 'movproject03@gmail.com',
        phone: '+62 811-2019-210',
        whatsapp: '+62 811-2019-210',
        operationalHours: 'Senin - Jumat: 08:00 - 17:00 WIB',
    };

    // Help Categories - Seperti Tokopedia & IPB Help Center
    const helpCategories = [
        { 
            id: 'getting-started', 
            icon: <BookOpen className="w-6 h-6" />, 
            title: 'Memulai', 
            desc: 'Panduan awal menggunakan MOV',
            color: 'from-blue-500 to-blue-600',
            bgGradient: 'from-blue-50 to-blue-100'
        },
        { 
            id: 'iot-devices', 
            icon: <Settings className="w-6 h-6" />, 
            title: 'Perangkat IoT', 
            desc: 'Setup & troubleshooting sensor',
            color: 'from-green-500 to-green-600',
            bgGradient: 'from-green-50 to-green-100',
            kPetaniOnly: true
        },
        { 
            id: 'detection', 
            icon: <Lightbulb className="w-6 h-6" />, 
            title: 'Deteksi AI', 
            desc: 'Cara kerja deteksi kematangan',
            color: 'from-purple-500 to-purple-600',
            bgGradient: 'from-purple-50 to-purple-100'
        },
        { 
            id: 'account', 
            icon: <ShieldCheck className="w-6 h-6" />, 
            title: 'Akun & Keamanan', 
            desc: 'Kelola akun dan privasi',
            color: 'from-orange-500 to-orange-600',
            bgGradient: 'from-orange-50 to-orange-100'
        },
    ];

    // FAQ - Berbeda untuk K-Petani dan Petani biasa
    const faqPetani = [
        {
            question: 'Bagaimana cara menggunakan fitur deteksi AI?',
            answer: 'Upload foto buah mangga melalui menu Deteksi. Sistem AI akan menganalisis tingkat kematangan secara otomatis dalam hitungan detik. Pastikan foto jelas dan pencahayaan cukup untuk hasil akurat.'
        },
        {
            question: 'Apakah MOV Platform gratis?',
            answer: 'Versi dasar MOV Platform gratis untuk petani umum dengan fitur deteksi AI, artikel edukasi, dan prediksi panen. Upgrade ke K-Petani untuk akses IoT sensor dan kontrol otomatis.'
        },
        {
            question: 'Bagaimana cara membaca hasil prediksi panen?',
            answer: 'Hasil prediksi menampilkan persentase kematangan, estimasi hari panen, dan rekomendasi. Warna hijau = siap panen, kuning = tunggu, merah = belum matang.'
        },
        {
            question: 'Bagaimana cara menghubungi mitra eksportir?',
            answer: 'Informasi mitra PT. Sindang Sukses tersedia di menu Artikel. Klik "Info Mitra" untuk detail kontak dan cara bermitra.'
        },
    ];

    const faqKPetani = [
        ...faqPetani,
        {
            question: 'Bagaimana cara setup sensor IoT pertama kali?',
            answer: 'Ikuti panduan di menu Robot Control > Setup Device. Hubungkan sensor ke WiFi kebun, masukkan kode pairing, dan sistem akan otomatis mengkalibrasi. Butuh bantuan? Hubungi CS kami.'
        },
        {
            question: 'Kenapa data sensor tidak update real-time?',
            answer: 'Pastikan koneksi WiFi stabil, sensor memiliki daya cukup (>20%), dan tidak ada obstacle. Cek status koneksi di Dashboard. Jika masih bermasalah, restart sensor atau hubungi tim teknis.'
        },
        {
            question: 'Bagaimana cara mengatur jadwal penyiraman otomatis?',
            answer: 'Masuk ke menu Penyiraman > Jadwal Otomatis. Set waktu, blok kebun, dan volume air. Sistem akan menjalankan penyiraman sesuai jadwal atau kondisi kelembapan tanah.'
        },
        {
            question: 'Apakah bisa kontrol robot dari jarak jauh?',
            answer: 'Ya, K-Petani dapat mengontrol MOViBOT dari mana saja selama terhubung internet. Gunakan menu Robot Control untuk start/stop misi, monitor battery, dan lihat lokasi real-time.'
        },
        {
            question: 'Berapa biaya langganan untuk K-Petani?',
            answer: 'Paket K-Petani mulai dari Rp 500.000/bulan termasuk sensor IoT, cloud storage, dan support prioritas. Hubungi CS untuk penawaran khusus petani kebun besar.'
        },
    ];

    const currentFAQ = isKPetani ? faqKPetani : faqPetani;

    const handleSendMessage = () => {
        if (!message.trim()) return;

        const newMessage = {
            id: chatMessages.length + 1,
            from: 'user',
            text: message,
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        };

        setChatMessages([...chatMessages, newMessage]);
        setMessage('');
        setIsTyping(true);

        // Simulate bot response
        setTimeout(() => {
            setIsTyping(false);
            const botResponse = {
                id: chatMessages.length + 2,
                from: 'bot',
                text: 'Terima kasih atas pertanyaan Anda. Tim MOV Center akan segera merespons. Untuk bantuan lebih cepat, hubungi: ' + contactInfo.whatsapp,
                time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            };
            setChatMessages((prev) => [...prev, botResponse]);
        }, 1500);
    };

    // Auto scroll to bottom when new message
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, isTyping]);

    return (
        <AuthenticatedLayout>
            <Head title="MOV Center - Customer Service" />
            <AnimatedBackground />
            
            <div className="min-h-screen py-6 md:py-8 px-4 sm:px-6 lg:px-8 relative">
                <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
                    {/* Back Button */}
                    <div className="mb-4">
                        <BackButton href="/dashboard" />
                    </div>
                    
                    {/* Hero Header - Enhanced */}
                    <motion.div
                        initial={{ opacity: 0, y: -30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-8"
                    >
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ 
                                duration: 0.8, 
                                ease: [0.34, 1.56, 0.64, 1],
                                delay: 0.2 
                            }}
                            className="relative inline-block mb-6"
                        >
                            <div className="w-24 h-24 md:w-28 md:h-28 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl relative overflow-hidden">
                                <motion.div
                                    animate={{ 
                                        rotate: [0, 360],
                                        scale: [1, 1.1, 1]
                                    }}
                                    transition={{ 
                                        duration: 20, 
                                        repeat: Infinity,
                                        ease: "linear"
                                    }}
                                    className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"
                                />
                                <HeadphonesIcon className="w-12 h-12 md:w-14 md:h-14 text-white relative z-10 drop-shadow-lg" />
                                <motion.div
                                    animate={{ 
                                        scale: [1, 1.2, 1],
                                        opacity: [0.5, 0, 0.5]
                                    }}
                                    transition={{ 
                                        duration: 2, 
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl blur-xl"
                                />
                            </div>
                        </motion.div>
                        
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-4xl md:text-5xl font-extrabold mb-3 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent"
                        >
                            MOV Center
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-lg md:text-xl text-gray-600 mb-4"
                        >
                            Pusat Bantuan & Informasi
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 }}
                        >
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm px-4 py-1.5 shadow-lg border-0">
                                <Sparkles className="w-3 h-3 mr-1.5" />
                                {isKPetani ? 'K-Petani Support' : 'Petani Support'}
                            </Badge>
                        </motion.div>
                    </motion.div>

                    {/* Contact Cards - Enhanced with better animations */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6"
                    >
                        <motion.a
                            href={`tel:${contactInfo.phone}`}
                            whileHover={{ scale: 1.05, y: -5 }}
                            whileTap={{ scale: 0.95 }}
                            className="block"
                        >
                            <Card className="p-6 text-center hover:shadow-2xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-50 border-2 border-blue-200/60 hover:border-blue-400 relative overflow-hidden group">
                                <motion.div
                                    animate={{ 
                                        scale: [1, 1.1, 1],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{ 
                                        duration: 3, 
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-blue-400/30 transition-colors"
                                />
                                <motion.div
                                    whileHover={{ rotate: 360 }}
                                    transition={{ duration: 0.6 }}
                                    className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl relative z-10"
                                >
                                    <Phone className="w-8 h-8 text-white" />
                                </motion.div>
                                <p className="text-sm font-bold text-gray-800 relative z-10">Telepon</p>
                                <p className="text-xs text-gray-600 mt-1 relative z-10">Hubungi langsung</p>
                            </Card>
                        </motion.a>

                        <motion.a
                            href={`https://wa.me/${contactInfo.whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            whileHover={{ scale: 1.05, y: -5 }}
                            whileTap={{ scale: 0.95 }}
                            className="block"
                        >
                            <Card className="p-6 text-center hover:shadow-2xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-green-50 via-emerald-100 to-teal-50 border-2 border-green-200/60 hover:border-green-400 relative overflow-hidden group">
                                <motion.div
                                    animate={{ 
                                        scale: [1, 1.1, 1],
                                        rotate: [0, -5, 5, 0]
                                    }}
                                    transition={{ 
                                        duration: 3, 
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="absolute top-0 right-0 w-32 h-32 bg-green-400/20 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-green-400/30 transition-colors"
                                />
                                <motion.div
                                    whileHover={{ rotate: 360 }}
                                    transition={{ duration: 0.6 }}
                                    className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl relative z-10"
                                >
                                    <MessageCircle className="w-8 h-8 text-white" />
                                </motion.div>
                                <p className="text-sm font-bold text-gray-800 relative z-10">WhatsApp</p>
                                <p className="text-xs text-gray-600 mt-1 relative z-10">Chat langsung</p>
                            </Card>
                        </motion.a>

                        <motion.a
                            href={`mailto:${contactInfo.email}`}
                            whileHover={{ scale: 1.05, y: -5 }}
                            whileTap={{ scale: 0.95 }}
                            className="block"
                        >
                            <Card className="p-6 text-center hover:shadow-2xl transition-all duration-300 cursor-pointer bg-gradient-to-br from-purple-50 via-pink-100 to-rose-50 border-2 border-purple-200/60 hover:border-purple-400 relative overflow-hidden group">
                                <motion.div
                                    animate={{ 
                                        scale: [1, 1.1, 1],
                                        rotate: [0, 5, -5, 0]
                                    }}
                                    transition={{ 
                                        duration: 3, 
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="absolute top-0 right-0 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-purple-400/30 transition-colors"
                                />
                                <motion.div
                                    whileHover={{ rotate: 360 }}
                                    transition={{ duration: 0.6 }}
                                    className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl relative z-10"
                                >
                                    <Mail className="w-8 h-8 text-white" />
                                </motion.div>
                                <p className="text-sm font-bold text-gray-800 relative z-10">Email</p>
                                <p className="text-xs text-gray-600 mt-1 relative z-10">Kirim pesan</p>
                            </Card>
                        </motion.a>
                    </motion.div>

                    {/* Contact Details - Enhanced */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="p-6 md:p-8 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-2 border-green-200/60 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-green-400/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <Phone className="w-5 h-5 text-white" />
                                    </div>
                                    Informasi Kontak
                                </h3>
                                <div className="space-y-4">
                                    <motion.div
                                        whileHover={{ x: 5 }}
                                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-green-200/50 hover:border-green-300 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <MessageCircle className="w-5 h-5 text-green-600" />
                                            </div>
                                            <span className="text-gray-700 font-medium">WhatsApp CS</span>
                                        </div>
                                        <span className="text-gray-900 font-bold text-sm sm:text-base sm:ml-auto">{contactInfo.whatsapp}</span>
                                    </motion.div>
                                    <motion.div
                                        whileHover={{ x: 5 }}
                                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-green-200/50 hover:border-green-300 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Mail className="w-5 h-5 text-purple-600" />
                                            </div>
                                            <span className="text-gray-700 font-medium">Email</span>
                                        </div>
                                        <span className="text-gray-900 font-semibold text-xs sm:text-sm break-all sm:ml-auto">{contactInfo.email}</span>
                                    </motion.div>
                                    <motion.div
                                        whileHover={{ x: 5 }}
                                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-green-200/50 hover:border-green-300 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Clock className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <span className="text-gray-700 font-medium">Jam Operasional</span>
                                        </div>
                                        <span className="text-gray-900 font-semibold text-xs sm:text-sm sm:ml-auto">{contactInfo.operationalHours}</span>
                                    </motion.div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Help Categories - Enhanced Grid */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <Zap className="w-6 h-6 text-green-600" />
                            Kategori Bantuan
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            {helpCategories
                                .filter(cat => !cat.kPetaniOnly || isKPetani)
                                .map((category, index) => (
                                <motion.div
                                    key={category.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 + index * 0.1 }}
                                    whileHover={{ scale: 1.05, y: -5 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <Card className="p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer group border-2 hover:border-gray-400 relative overflow-hidden h-full">
                                        <div className={`absolute inset-0 bg-gradient-to-br ${category.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                                        <div className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg relative z-10`}>
                                            <motion.div
                                                whileHover={{ rotate: [0, -10, 10, -10, 0] }}
                                                transition={{ duration: 0.5 }}
                                                className="text-white"
                                            >
                                                {category.icon}
                                            </motion.div>
                                        </div>
                                        <p className="text-base font-bold text-gray-900 mb-2 relative z-10">{category.title}</p>
                                        <p className="text-sm text-gray-600 relative z-10">{category.desc}</p>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Live Chat - Enhanced */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <Card className="p-6 md:p-8 bg-white/90 backdrop-blur-xl border-2 border-gray-200/50 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-green-400/10 to-emerald-400/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                    <motion.div
                                        animate={{ 
                                            scale: [1, 1.1, 1],
                                        }}
                                        transition={{ 
                                            duration: 2, 
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                        className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl"
                                    >
                                        <MessageCircle className="w-8 h-8 text-white" />
                                    </motion.div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">Chat Langsung</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <motion.div
                                                animate={{ 
                                                    scale: [1, 1.2, 1],
                                                    opacity: [1, 0.5, 1]
                                                }}
                                                transition={{ 
                                                    duration: 1.5, 
                                                    repeat: Infinity,
                                                    ease: "easeInOut"
                                                }}
                                                className="w-3 h-3 bg-green-500 rounded-full"
                                            />
                                            <span className="text-sm text-gray-600 font-medium">Tim kami online</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Chat Messages - Enhanced */}
                                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 mb-5 h-80 overflow-y-auto space-y-4 custom-scrollbar border border-gray-200/50">
                                    <AnimatePresence>
                                        {chatMessages.map((msg) => (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ duration: 0.3 }}
                                                className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <motion.div
                                                    whileHover={{ scale: 1.02 }}
                                                    className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl shadow-lg ${
                                                        msg.from === 'user'
                                                            ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-br-sm'
                                                            : 'bg-white border-2 border-gray-200 text-gray-800 rounded-bl-sm'
                                                    }`}
                                                >
                                                    <p className="text-sm md:text-base leading-relaxed">{msg.text}</p>
                                                    <div className={`flex items-center gap-1 mt-2 text-xs ${
                                                        msg.from === 'user' ? 'text-green-100' : 'text-gray-500'
                                                    }`}>
                                                        <Clock className="w-3 h-3" />
                                                        {msg.time}
                                                    </div>
                                                </motion.div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    
                                    {isTyping && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="flex justify-start"
                                        >
                                            <div className="bg-white border-2 border-gray-200 rounded-2xl rounded-bl-sm p-4 shadow-lg">
                                                <div className="flex gap-1.5">
                                                    <motion.div
                                                        animate={{ y: [0, -8, 0] }}
                                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                                                        className="w-2 h-2 bg-gray-400 rounded-full"
                                                    />
                                                    <motion.div
                                                        animate={{ y: [0, -8, 0] }}
                                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                                                        className="w-2 h-2 bg-gray-400 rounded-full"
                                                    />
                                                    <motion.div
                                                        animate={{ y: [0, -8, 0] }}
                                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                                                        className="w-2 h-2 bg-gray-400 rounded-full"
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Input - Enhanced */}
                                <div className="flex gap-3">
                                    <Input
                                        placeholder="Ketik pesan Anda..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                        className="text-sm md:text-base flex-1 h-12 border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 rounded-xl"
                                    />
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <Button
                                            onClick={handleSendMessage}
                                            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white h-12 px-6 shadow-lg rounded-xl"
                                            disabled={!message.trim()}
                                        >
                                            <Send className="w-5 h-5" />
                                        </Button>
                                    </motion.div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* FAQ - Enhanced with better animations */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                    >
                        <Card className="p-6 md:p-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 border-2 border-blue-200/60 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
                            <div className="relative z-10">
                                <h4 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                        <FileQuestion className="w-5 h-5 text-white" />
                                    </div>
                                    Pertanyaan Umum (FAQ)
                                </h4>
                                <div className="space-y-4">
                                    {currentFAQ.map((faq, idx) => (
                                        <motion.details
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.7 + idx * 0.05 }}
                                            className="group"
                                        >
                                            <summary className="cursor-pointer text-base font-semibold text-gray-800 p-4 bg-white rounded-xl hover:bg-blue-100 transition-all duration-300 list-none flex items-center justify-between border-2 border-transparent hover:border-blue-300 shadow-sm">
                                                <span className="flex-1 pr-4">{faq.question}</span>
                                                <motion.span
                                                    animate={{ rotate: 0 }}
                                                    className="text-blue-600 text-xl transition-transform duration-300 group-open:rotate-180"
                                                >
                                                    ▼
                                                </motion.span>
                                            </summary>
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="overflow-hidden"
                                            >
                                                <p className="text-sm text-gray-700 mt-3 p-4 bg-white rounded-xl border-l-4 border-blue-500 shadow-sm leading-relaxed">
                                                    {faq.answer}
                                                </p>
                                            </motion.div>
                                        </motion.details>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Mitra Info - Enhanced */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                    >
                        <Card className="p-0 overflow-hidden border-2 border-yellow-200/60 shadow-2xl">
                            <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-amber-500 p-6 md:p-8 text-white relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-4">
                                        <motion.div
                                            animate={{ rotate: [0, 10, -10, 0] }}
                                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                            className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-xl"
                                        >
                                            🏢
                                        </motion.div>
                                        <div>
                                            <h4 className="text-2xl font-bold text-white">Mitra Kebun Mangga</h4>
                                            <p className="text-yellow-50 text-sm">PT Sindang Sukses</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 md:p-8 bg-gradient-to-br from-yellow-50 to-orange-50">
                                <div className="bg-white p-5 rounded-2xl shadow-lg mb-5 border border-yellow-200/50">
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-xl flex items-center justify-center flex-shrink-0 text-3xl shadow-lg">
                                            🏢
                                        </div>
                                        <div className="flex-1">
                                            <h5 className="text-lg font-bold text-gray-900 mb-1">PT. Sindang Sukses</h5>
                                            <p className="text-sm text-gray-600 mb-3">Mitra Kebun Mangga - Cirebon</p>
                                            <div className="flex gap-2 flex-wrap">
                                                <Badge className="bg-green-100 text-green-700 text-xs px-3 py-1 border border-green-300">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    Eksportir
                                                </Badge>
                                                <Badge className="bg-blue-100 text-blue-700 text-xs px-3 py-1 border border-blue-300">
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    Cirebon
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600 text-center font-medium">
                                    Lihat detail lengkap di menu Artikel → Info Mitra
                                </p>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Quick Tips - Enhanced */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9 }}
                    >
                        <Card className="p-6 md:p-8 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-2 border-green-200/60 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-green-400/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            <div className="relative z-10">
                                <h4 className="text-xl font-bold text-green-700 mb-4 flex items-center gap-2">
                                    <Lightbulb className="w-6 h-6 text-green-600" />
                                    💡 Tips Cepat
                                </h4>
                                <ul className="space-y-3 text-sm md:text-base text-gray-700">
                                    <motion.li
                                        whileHover={{ x: 5 }}
                                        className="flex items-start gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-green-200/50"
                                    >
                                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        <span>Gunakan WhatsApp untuk respons tercepat (1-5 menit)</span>
                                    </motion.li>
                                    <motion.li
                                        whileHover={{ x: 5 }}
                                        className="flex items-start gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-green-200/50"
                                    >
                                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        <span>Email untuk pertanyaan detail (respons 1-24 jam)</span>
                                    </motion.li>
                                    <motion.li
                                        whileHover={{ x: 5 }}
                                        className="flex items-start gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-green-200/50"
                                    >
                                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        <span>Chat untuk pertanyaan umum (bot + human support)</span>
                                    </motion.li>
                                    {isKPetani && (
                                        <motion.li
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            whileHover={{ x: 5 }}
                                            className="flex items-start gap-3 p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl border-2 border-green-300"
                                        >
                                            <Zap className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                            <span className="font-semibold">K-Petani mendapat prioritas support & troubleshooting gratis</span>
                                        </motion.li>
                                    )}
                                </ul>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
