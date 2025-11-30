import { useState, useRef, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { useRole } from '@/hooks/useRole';
import { 
    MessageCircle, Phone, Mail, User, Send, HeadphonesIcon, 
    FileQuestion, BookOpen, Lightbulb, Settings, ShieldCheck,
    Sparkles, Zap, Clock, CheckCircle2, Edit, X, Save
} from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import BackButton from '@/Components/BackButton';
import ApplicationLogo from '@/Components/ApplicationLogo';

import ChatRoom from './CustomerService/ChatRoom';
import GuestChatRoom from './CustomerService/GuestChatRoom';
import FAQManagement from './CustomerService/FAQManagement';

export default function CustomerService({ contactInfo: contactInfoProp, guestPrivateChats, faqs, categories }) {
    const { isKPetani, userRole } = useRole();
    const { flash } = usePage().props;
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
    const [hasRequestedCS, setHasRequestedCS] = useState(false);
    const [myQuestions, setMyQuestions] = useState([]);
    const [lastQuestionId, setLastQuestionId] = useState(null);
    const [isEditingContact, setIsEditingContact] = useState(false);
    const [activeTab, setActiveTab] = useState('guest-chat'); // 'guest-chat' or 'questions'
    const [contactFormData, setContactFormData] = useState({
        whatsapp: '',
        phone: '',
        email: '',
        operational_hours: '',
    });

    // MOV Center Contact Info - from database or default
    const defaultContactInfo = {
        email: 'movproject03@gmail.com',
        phone: '+62 811-2019-210',
        whatsapp: '+62 811-2019-210',
        operationalHours: 'Senin - Jumat: 08:00 - 17:00 WIB',
    };

    const contactInfo = contactInfoProp ? {
        email: contactInfoProp.email || defaultContactInfo.email,
        phone: contactInfoProp.phone || defaultContactInfo.phone,
        whatsapp: contactInfoProp.whatsapp || defaultContactInfo.whatsapp,
        operationalHours: contactInfoProp.operational_hours || defaultContactInfo.operationalHours,
    } : defaultContactInfo;

    // Initialize form data when editing
    useEffect(() => {
        if (isEditingContact && contactInfoProp) {
            setContactFormData({
                whatsapp: contactInfoProp.whatsapp || '',
                phone: contactInfoProp.phone || '',
                email: contactInfoProp.email || '',
                operational_hours: contactInfoProp.operational_hours || '',
            });
        }
    }, [isEditingContact, contactInfoProp]);

    const handleSaveContact = (e) => {
        e.preventDefault();
        
        if (contactInfoProp?.id) {
            // Update existing
            router.put(route('contact-info.update', contactInfoProp.id), contactFormData, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsEditingContact(false);
                    router.reload({ only: ['contactInfo'] });
                },
            });
        } else {
            // Create new
            router.post(route('contact-info.store'), contactFormData, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsEditingContact(false);
                    router.reload({ only: ['contactInfo'] });
                },
            });
        }
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
            question: 'Bagaimana cara menggunakan fitur deteksi kematangan Buah berdasarkan analisis AI?',
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

    // Auto-answer bot function
    const findAnswerByKeyword = (userMessage) => {
        const messageLower = userMessage.toLowerCase();
        
        // Keyword mapping untuk auto-answer
        const keywordMap = {
            // Deteksi AI
            'deteksi': ['deteksi', 'ai', 'kematangan', 'foto', 'gambar', 'scan', 'analisis'],
            'cara deteksi': ['cara deteksi', 'bagaimana deteksi', 'panduan deteksi'],
            
            // Sensor IoT
            'sensor': ['sensor', 'iot', 'perangkat', 'device', 'alat'],
            'setup sensor': ['setup sensor', 'pasang sensor', 'instal sensor', 'setting sensor'],
            'sensor tidak update': ['sensor tidak update', 'data tidak muncul', 'sensor error', 'sensor bermasalah'],
            
            // Robot Control
            'robot': ['robot', 'movibot', 'bot', 'kontrol robot'],
            'kontrol robot': ['kontrol robot', 'jalankan robot', 'start robot', 'stop robot'],
            'jadwal robot': ['jadwal robot', 'scheduling', 'misi robot'],
            
            // Penyiraman
            'penyiraman': ['penyiraman', 'siram', 'air', 'irigasi'],
            'jadwal penyiraman': ['jadwal penyiraman', 'penyiraman otomatis', 'auto penyiraman'],
            
            // Akun & Pembayaran
            'harga': ['harga', 'biaya', 'bayar', 'langganan', 'paket', 'subscription'],
            'akun': ['akun', 'account', 'profil', 'profile', 'ubah password', 'ganti password'],
            
            // Prediksi & Laporan
            'prediksi': ['prediksi', 'panen', 'kapan panen', 'estimasi'],
            'laporan': ['laporan', 'report', 'export', 'download'],
            
            // Mitra & Ekspor
            'mitra': ['mitra', 'eksportir', 'ekspor', 'jual', 'distributor'],
            
            // Troubleshooting
            'error': ['error', 'gagal', 'tidak bisa', 'masalah', 'bug', 'bermasalah'],
            'lupa password': ['lupa password', 'reset password', 'forgot password'],
        };

        // Check each FAQ for keyword match
        for (const faq of currentFAQ) {
            const questionLower = faq.question.toLowerCase();
            const answerLower = faq.answer.toLowerCase();
            
            // Check if user message contains keywords from question or answer
            for (const [key, keywords] of Object.entries(keywordMap)) {
                const hasKeyword = keywords.some(keyword => 
                    messageLower.includes(keyword) || 
                    questionLower.includes(keyword) ||
                    answerLower.includes(keyword)
                );
                
                if (hasKeyword) {
                    // Check if this FAQ matches the keyword
                    const faqMatches = keywords.some(keyword => 
                        questionLower.includes(keyword) || 
                        answerLower.includes(keyword)
                    );
                    
                    if (faqMatches) {
                        return {
                            found: true,
                            answer: faq.answer,
                            question: faq.question,
                        };
                    }
                }
            }
            
            // Direct question match (fuzzy)
            const questionWords = questionLower.split(/\s+/);
            const messageWords = messageLower.split(/\s+/);
            const matchingWords = questionWords.filter(word => 
                word.length > 3 && messageWords.includes(word)
            );
            
            if (matchingWords.length >= 2) {
                return {
                    found: true,
                    answer: faq.answer,
                    question: faq.question,
                };
            }
        }

        return { found: false };
    };

    const handleSendMessage = (e) => {
        // Prevent form submission if called from form
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        
        if (!message.trim()) return;

        const userMessage = message.trim();
        const messageLower = userMessage.toLowerCase();
        
        // Check for "Chat dengan CS" keyword - langsung transfer ke CS
        const chatWithCSKeywords = ['chat dengan cs', 'chat cs', 'hubungi cs', 'cs langsung', 'customer service', 'bicara dengan cs'];
        const wantsDirectCS = chatWithCSKeywords.some(keyword => messageLower.includes(keyword));
        
        const newMessage = {
            id: chatMessages.length + 1,
            from: 'user',
            text: userMessage,
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            answeredAt: null,
            readAt: null,
        };

        setChatMessages([...chatMessages, newMessage]);
        setMessage(''); // Clear input field after sending
        setIsTyping(true);
        
        // Keep focus on input and prevent page scroll
        setTimeout(() => {
            const input = document.getElementById('chat-input');
            if (input) {
                input.focus();
            }
        }, 100);

        // Try to find auto-answer
        setTimeout(() => {
            setIsTyping(false);
            
            let botResponse;
            
            // If user wants direct CS or has already requested CS, save to database and start chat
            if (wantsDirectCS || hasRequestedCS) {
                // Mark that user has requested CS - disable auto-answer from now on
                const isFirstRequest = wantsDirectCS && !hasRequestedCS;
                if (isFirstRequest) {
                    setHasRequestedCS(true);
                }
                
                // Save question to database
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
                if (csrfToken && window.axios) {
                    window.axios.post(route('questions.store'), {
                        question: userMessage,
                        category: 'general',
                    }, {
                        headers: {
                            'X-CSRF-TOKEN': csrfToken,
                            'Accept': 'application/json',
                        },
                    }).then((response) => {
                        console.log('Question saved to database', response.data);
                        // Start checking for answers
                        if (response.data?.question_id) {
                            setLastQuestionId(response.data.question_id);
                            // Store question ID in chat message for tracking
                            setChatMessages(prev => prev.map((msg, idx) => 
                                idx === prev.length - 1 
                                    ? { ...msg, questionId: response.data.question_id }
                                    : msg
                            ));
                        }
                    }).catch(err => {
                        console.warn('Failed to save question:', err);
                    });
                }
                
                // Only show confirmation message once when first requesting CS
                if (isFirstRequest) {
                    botResponse = {
                        id: Date.now() + Math.random(),
                        from: 'cs',
                        text: `Terima kasih! Chat room Anda sudah aktif. Tim Customer Service MOV Center akan merespons secepat mungkin! 💬`,
                        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                        isAutoAnswer: false,
                    };
                } else {
                    // For subsequent messages in active chat, no bot response needed
                    // The answer from CS will come through polling
                    botResponse = null;
                }
            } else {
                const autoAnswer = findAnswerByKeyword(userMessage);
                
                if (autoAnswer.found) {
                    // Auto-answer found
                    botResponse = {
                        id: chatMessages.length + 2,
                        from: 'bot',
                        text: autoAnswer.answer + '\n\n💡 Apakah jawaban ini membantu? Jika masih ada pertanyaan, ketik "Chat dengan CS" untuk berbicara langsung dengan tim CS kami!',
                        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                        isAutoAnswer: true,
                    };
                } else {
                    // No auto-answer found - save question to database and transfer to real CS
                    // Submit question to backend
                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
                    if (csrfToken && window.axios) {
                        window.axios.post(route('questions.store'), {
                            question: userMessage,
                            category: 'general',
                        }, {
                            headers: {
                                'X-CSRF-TOKEN': csrfToken,
                                'Accept': 'application/json',
                            },
                        }).then((response) => {
                            if (response.data?.question_id) {
                                setLastQuestionId(response.data.question_id);
                                // Also set hasRequestedCS if not already set
                                if (!hasRequestedCS) {
                                    setHasRequestedCS(true);
                                }
                            }
                        }).catch(err => {
                            console.warn('Failed to save question:', err);
                        });
                    }
                    
                    botResponse = {
                        id: chatMessages.length + 2,
                        from: 'cs',
                        text: `Terima kasih atas pertanyaan Anda. Pertanyaan Anda telah dicatat dan Tim Customer Service MOV Center akan segera merespons.\n\n📞 Untuk bantuan lebih cepat, hubungi kami:\n• WhatsApp: ${contactInfo.whatsapp}\n• Email: ${contactInfo.email}\n• Telepon: ${contactInfo.phone}\n\n⏰ Jam Operasional: ${contactInfo.operationalHours}`,
                        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                        isAutoAnswer: false,
                    };
                }
            }
            
            // Only add bot response if it exists (avoid null responses and duplicates)
            if (botResponse) {
                setChatMessages((prev) => {
                    // Check for duplicate before adding
                    const isDuplicate = prev.some(msg => 
                        msg.from === botResponse.from &&
                        msg.text === botResponse.text &&
                        Math.abs(new Date(msg.time) - new Date(botResponse.time)) < 2000 // Within 2 seconds
                    );
                    
                    if (isDuplicate) {
                        return prev;
                    }
                    
                    return [...prev, botResponse];
                });
            }
        }, 1500);
    };

    // Auto scroll to bottom when new message (only within chat container, prevent page scroll)
    useEffect(() => {
        if (chatEndRef.current) {
            const chatContainer = chatEndRef.current.closest('.overflow-y-auto');
            if (chatContainer) {
                // Scroll only within chat container, not the whole page
                chatContainer.scrollTo({
                    top: chatContainer.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }
    }, [chatMessages, isTyping]);

    // Show flash messages
    useEffect(() => {
        if (flash?.success) {
            alert(flash.success);
        }
    }, [flash]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Cleanup if needed
        };
    }, []);

    // Check for answers from CS (polling every 2 seconds if user has requested CS)
    useEffect(() => {
        if (!hasRequestedCS) return;

        let mounted = true;
        const processedAnswerIds = new Set(); // Track which answers we've already shown

        const checkForAnswers = () => {
            if (!mounted) return;
            
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
            if (!csrfToken || !window.axios) return;

            window.axios.get(route('questions.my-questions'), {
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
            }).then(response => {
                if (!mounted) return;
                
                if (response.data?.success && response.data?.questions) {
                    const questions = response.data?.questions || [];
                    
                    // Find questions with answers that we haven't shown yet
                    questions.forEach(question => {
                        // Check if question has answer (any status including pending)
                        if (question.answer && question.answer.trim()) {
                            
                            // Create unique key for this answer using question ID and answer text hash
                            const answerTextHash = question.answer.substring(0, 50); // Use first 50 chars for uniqueness
                            const answerKey = `${question.id}_${answerTextHash}`;
                            
                            // Check if we already processed this answer
                            if (processedAnswerIds.has(answerKey)) {
                                return; // Skip if already shown
                            }

                            // Check if this question belongs to current user
                            const isMyQuestion = lastQuestionId === question.id || 
                                chatMessages.some(msg => msg.questionId === question.id) ||
                                !lastQuestionId; // If no lastQuestionId, show all answered questions

                            if (isMyQuestion) {
                                // Mark as processed
                                processedAnswerIds.add(answerKey);
                                
                                // Add answer to chat (regardless of status - pending, answered, or closed)
                                const answerMessage = {
                                    id: Date.now() + Math.random(),
                                    from: 'cs',
                                    text: question.answer,
                                    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                                    isAutoAnswer: false,
                                    questionId: question.id,
                                    answeredAt: question.answered_at,
                                    readAt: question.read_at,
                                };
                                
                                // Mark as read when customer sees the answer
                                if (question.answer && question.answered_at && !question.read_at) {
                                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
                                    if (csrfToken && window.axios) {
                                        window.axios.post(route('questions.mark-as-read', question.id), {}, {
                                            headers: {
                                                'X-CSRF-TOKEN': csrfToken,
                                                'Accept': 'application/json',
                                            },
                                        }).catch(err => {
                                            console.warn('Failed to mark as read:', err);
                                        });
                                    }
                                }
                                
                                setChatMessages(prev => {
                                    // Double check to avoid duplicates
                                    const alreadyExists = prev.some(msg => 
                                        msg.from === 'cs' && 
                                        msg.questionId === question.id &&
                                        msg.text === question.answer
                                    );
                                    
                                    if (alreadyExists) {
                                        return prev;
                                    }
                                    
                                    return [...prev, answerMessage];
                                });
                            }
                        }
                    });
                }
            }).catch(err => {
                if (mounted) {
                    console.warn('Failed to check for answers:', err);
                }
            });
        };

        // Check immediately, then every 1.5 seconds (faster polling for real-time feel)
        checkForAnswers();
        const interval = setInterval(checkForAnswers, 1500);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [hasRequestedCS, lastQuestionId, chatMessages]);

    // For K-Petani, show chat room interface
    if (isKPetani) {
        return (
            <AuthenticatedLayout>
                <Head title="MOV Center - Chat Room" />
                <AnimatedBackground />
                
                <div className="min-h-screen py-6 md:py-8 px-4 sm:px-6 lg:px-8 relative">
                    <div className="max-w-7xl mx-auto">
                        {/* Back Button */}
                        <div className="mb-4">
                            <BackButton href="/dashboard" />
                        </div>

                        {/* Header */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                {/* Logo MOV dengan Mangga Headphone */}
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="relative"
                                >
                                    <img 
                                        src="/mov-logo.png" 
                                        alt="MOV Logo" 
                                        className="h-12 w-auto object-contain drop-shadow-lg"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            const fallback = e.target.nextElementSibling;
                                            if (fallback) fallback.style.display = 'block';
                                        }}
                                    />
                                    <div style={{ display: 'none' }}>
                                        <ApplicationLogo showText={true} className="h-12" />
                                    </div>
                                </motion.div>
                            </div>
                            <h1 className="text-3xl md:text-4xl font-heading text-gray-900 mb-2">
                                MOV Center - Chat Room
                            </h1>
                            <p className="text-gray-600 font-body">
                                Kelola dan jawab chat dari Petani dan Guest
                            </p>
                        </motion.div>

                        {/* Tabs */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6"
                        >
                            <div className="flex gap-2 p-1 bg-white/80 backdrop-blur-lg rounded-xl shadow-lg border border-gray-200/50 max-w-md">
                                <button
                                    onClick={() => setActiveTab('guest-chat')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                                        activeTab === 'guest-chat'
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    Guest Chat
                                </button>
                                <button
                                    onClick={() => setActiveTab('faq')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                                        activeTab === 'faq'
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <FileQuestion className="w-4 h-4" />
                                    FAQ
                                </button>
                            </div>
                        </motion.div>

                        {/* Tab Content */}
                        <AnimatePresence mode="wait">
                            {activeTab === 'guest-chat' ? (
                                <motion.div
                                    key="guest-chat"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <GuestChatRoom guestPrivateChats={guestPrivateChats} />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="faq"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <FAQManagement faqs={faqs || []} categories={categories || []} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

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
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mb-6 flex justify-center"
                        >
                            {/* Logo MOV dengan Mangga Headphone */}
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="relative"
                            >
                                <img 
                                    src="/mov-logo.png" 
                                    alt="MOV Logo" 
                                    className="h-24 md:h-32 w-auto object-contain drop-shadow-2xl"
                                    onError={(e) => {
                                        // Fallback ke ApplicationLogo jika logo tidak ditemukan
                                        e.target.style.display = 'none';
                                        const fallback = e.target.nextElementSibling;
                                        if (fallback) fallback.style.display = 'block';
                                    }}
                                />
                                <div style={{ display: 'none' }}>
                                    <ApplicationLogo showText={true} className="h-16 md:h-20" />
                                </div>
                            </motion.div>
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
                            <div className="flex items-center gap-3 flex-wrap">
                                <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm px-4 py-1.5 shadow-lg border-0">
                                    <Sparkles className="w-3 h-3 mr-1.5" />
                                    {isKPetani ? 'K-Petani Support' : 'Petani Support'}
                                </Badge>
                                <Link
                                    href={route('chat.index')}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-heading flex items-center gap-2 shadow-lg"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    Chat Grup & Pribadi
                                </Link>
                                {isKPetani && (
                                    <Link
                                        href={route('questions.index')}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-heading flex items-center gap-2 shadow-lg"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        Kelola Pertanyaan
                                    </Link>
                                )}
                            </div>
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
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                                            <Phone className="w-5 h-5 text-white" />
                                        </div>
                                        Informasi Kontak
                                    </h3>
                                    {isKPetani && (
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setIsEditingContact(!isEditingContact)}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg transition-colors"
                                        >
                                            {isEditingContact ? (
                                                <>
                                                    <X className="w-4 h-4" />
                                                    Batal
                                                </>
                                            ) : (
                                                <>
                                                    <Edit className="w-4 h-4" />
                                                    Edit
                                                </>
                                            )}
                                        </motion.button>
                                    )}
                                </div>
                                
                                {isEditingContact && isKPetani ? (
                                    <form onSubmit={handleSaveContact} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                WhatsApp CS
                                            </label>
                                            <Input
                                                type="text"
                                                value={contactFormData.whatsapp}
                                                onChange={(e) => setContactFormData({ ...contactFormData, whatsapp: e.target.value })}
                                                placeholder="+62 811-2019-210"
                                                className="w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Telepon
                                            </label>
                                            <Input
                                                type="text"
                                                value={contactFormData.phone}
                                                onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                                                placeholder="+62 811-2019-210"
                                                className="w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email
                                            </label>
                                            <Input
                                                type="email"
                                                value={contactFormData.email}
                                                onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                                                placeholder="movproject03@gmail.com"
                                                className="w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Jam Operasional
                                            </label>
                                            <Input
                                                type="text"
                                                value={contactFormData.operational_hours}
                                                onChange={(e) => setContactFormData({ ...contactFormData, operational_hours: e.target.value })}
                                                placeholder="Senin - Jumat: 08:00 - 17:00 WIB"
                                                className="w-full"
                                            />
                                        </div>
                                        <div className="flex items-center justify-end gap-3 pt-4">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setIsEditingContact(false)}
                                            >
                                                Batal
                                            </Button>
                                            <Button
                                                type="submit"
                                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                            >
                                                <Save className="w-4 h-4 mr-2" />
                                                Simpan
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
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
                                )}
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

                                {/* Chat Messages - Modern Chat Style */}
                                <div className="bg-[#e5ddd5] bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23d4d4d4%22 fill-opacity=%220.4%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] rounded-2xl p-4 mb-5 h-80 overflow-y-auto space-y-1 custom-scrollbar">
                                    <AnimatePresence>
                                        {(() => {
                                            // Group messages by date and sender
                                            let currentDate = null;
                                            const groupedMessages = [];
                                            
                                            chatMessages.forEach((msg, index) => {
                                                const msgDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                                                
                                                // Add date separator if date changed
                                                if (currentDate !== msgDate) {
                                                    currentDate = msgDate;
                                                    groupedMessages.push({
                                                        type: 'date-separator',
                                                        date: msgDate,
                                                        id: `date-${msgDate}-${index}`,
                                                    });
                                                }
                                                
                                                // Check if should show avatar (first message of group or different sender)
                                                const prevMsg = index > 0 ? chatMessages[index - 1] : null;
                                                // Simple grouping: show avatar if different sender or first message
                                                const showAvatar = !prevMsg || prevMsg.from !== msg.from;
                                                
                                                groupedMessages.push({
                                                    ...msg,
                                                    showAvatar,
                                                    isConsecutive: prevMsg && prevMsg.from === msg.from,
                                                });
                                            });
                                            
                                            return groupedMessages.map((item, idx) => {
                                                if (item.type === 'date-separator') {
                                                    return (
                                                        <div key={item.id} className="flex justify-center my-4">
                                                            <div className="bg-white/80 px-3 py-1 rounded-full text-xs text-gray-600 font-medium">
                                                                {item.date}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                
                                                const isUser = item.from === 'user';
                                                const isCS = item.from === 'cs';
                                                const isBot = item.from === 'bot';
                                                
                                                return (
                                                    <motion.div
                                                        key={item.id}
                                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        transition={{ duration: 0.2, delay: idx * 0.02 }}
                                                        className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2 ${item.isConsecutive ? 'mt-0.5' : 'mt-2'}`}
                                                    >
                                                        {/* Avatar - only show for first message in group */}
                                                        {item.showAvatar && !isUser && (
                                                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mb-1">
                                                                {isCS ? (
                                                                    <User className="w-4 h-4 text-white" />
                                                                ) : (
                                                                    <MessageCircle className="w-4 h-4 text-white" />
                                                                )}
                                                            </div>
                                                        )}
                                                        {!item.showAvatar && !isUser && <div className="w-8 h-8 flex-shrink-0" />}
                                                        
                                                        <motion.div
                                                            whileHover={{ scale: 1.01 }}
                                                            className={`max-w-[75%] md:max-w-[65%] ${
                                                                isUser
                                                                    ? 'bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-2xl rounded-br-sm shadow-sm'
                                                                    : isCS
                                                                    ? 'bg-white text-gray-900 rounded-2xl rounded-bl-sm shadow-sm'
                                                                    : 'bg-white text-gray-900 rounded-2xl rounded-bl-sm shadow-sm'
                                                            } px-3 py-2`}
                                                        >
                                                            {/* Badge for bot/cs */}
                                                            {(isBot || isCS) && (
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    {isBot && item.isAutoAnswer && (
                                                                        <span className="text-[10px] text-purple-600 font-semibold">🤖 Auto-Answer</span>
                                                                    )}
                                                                    {isCS && (
                                                                        <span className="text-[10px] text-blue-600 font-semibold">👤 Customer Service</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                            
                                                            <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                                                isUser ? 'text-white' : 'text-gray-900'
                                                            }`}>
                                                                {item.text}
                                                            </p>
                                                            
                                                            <div className={`flex items-center justify-end gap-1 mt-1 ${
                                                                isUser ? 'text-white/80' : 'text-gray-500'
                                                            }`}>
                                                                <span className="text-[11px]">{item.time}</span>
                                                                {isUser && (
                                                                    // WhatsApp-style checkmarks: single = sent, double gray = delivered, double blue = read
                                                                    <div className="flex items-center ml-1">
                                                                        {item.readAt ? (
                                                                            // Double check blue (read)
                                                                            <svg className="w-4 h-4 text-blue-300" fill="currentColor" viewBox="0 0 16 15">
                                                                                <path d="M15.854.854a.5.5 0 0 0-.708-.708L7.707 7.293 4.854 4.44a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l8-8Z"/>
                                                                                <path d="M0 14.5V16h1.5l9-9L9 5.5 0 14.5Z"/>
                                                                            </svg>
                                                                        ) : item.answeredAt ? (
                                                                            // Double check gray (delivered)
                                                                            <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 16 15">
                                                                                <path d="M15.854.854a.5.5 0 0 0-.708-.708L7.707 7.293 4.854 4.44a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l8-8Z"/>
                                                                                <path d="M0 14.5V16h1.5l9-9L9 5.5 0 14.5Z"/>
                                                                            </svg>
                                                                        ) : (
                                                                            // Single check (sent)
                                                                            <svg className="w-3.5 h-3.5 text-white/60" fill="currentColor" viewBox="0 0 16 15">
                                                                                <path d="M15.854.854a.5.5 0 0 0-.708-.708L7.707 7.293 4.854 4.44a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l8-8Z"/>
                                                                            </svg>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                        
                                                        {/* Avatar for sent messages - only show for first message in group */}
                                                        {isUser && item.showAvatar && (
                                                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mb-1">
                                                                <User className="w-4 h-4 text-white" />
                                                            </div>
                                                        )}
                                                        {isUser && !item.showAvatar && <div className="w-8 h-8 flex-shrink-0" />}
                                                    </motion.div>
                                                );
                                            });
                                        })()}
                                    </AnimatePresence>
                                    
                                    {isTyping && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="flex justify-start items-end gap-2"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mb-1">
                                                <MessageCircle className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="bg-white rounded-lg rounded-tl-none shadow-sm px-3 py-2">
                                                <div className="flex gap-1">
                                                    <motion.div
                                                        animate={{ y: [0, -4, 0] }}
                                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                                                        className="w-2 h-2 bg-gray-400 rounded-full"
                                                    />
                                                    <motion.div
                                                        animate={{ y: [0, -4, 0] }}
                                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                                                        className="w-2 h-2 bg-gray-400 rounded-full"
                                                    />
                                                    <motion.div
                                                        animate={{ y: [0, -4, 0] }}
                                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                                                        className="w-2 h-2 bg-gray-400 rounded-full"
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Input - WhatsApp Style */}
                                <div 
                                    className="flex gap-2 bg-white rounded-2xl p-2 border border-gray-200"
                                    onKeyDown={(e) => {
                                        // Prevent any form submission or page scroll
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }
                                    }}
                                >
                                    <Input
                                        id="chat-input"
                                        placeholder="Ketik pesan..."
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleSendMessage(e);
                                                // Keep focus in chat area
                                                setTimeout(() => {
                                                    const chatContainer = document.querySelector('.overflow-y-auto');
                                                    if (chatContainer) {
                                                        chatContainer.scrollTop = chatContainer.scrollHeight;
                                                    }
                                                }, 100);
                                            }
                                        }}
                                        className="text-sm md:text-base flex-1 h-10 border-0 focus:ring-0 focus:outline-none bg-transparent"
                                    />
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <Button
                                            type="button"
                                            onClick={(e) => handleSendMessage(e)}
                                            className="bg-green-500 hover:bg-green-600 text-white h-10 w-10 p-0 rounded-full shadow-md"
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
