import { useState, useRef, useEffect } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { 
    MessageCircle, Phone, Mail, User, Send, HeadphonesIcon, 
    FileQuestion, BookOpen, Lightbulb, Settings, ShieldCheck,
    Sparkles, Zap, Clock, CheckCircle2, LogIn, UserPlus, Trash2, LogOut
} from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import AnimatedBackground from '@/Components/AnimatedBackground';

export default function GuestIndex({ contactInfo: contactInfoProp }) {
    // Load guest session from localStorage on mount
    const loadGuestSession = () => {
        try {
            const saved = localStorage.getItem('guest_chat_session');
            if (saved) {
                const session = JSON.parse(saved);
                return {
                    name: session.name || '',
                    email: session.email || '',
                    privateChatId: session.privateChatId || null,
                    isSet: !!(session.name && session.email),
                };
            }
        } catch (error) {
            console.error('Failed to load guest session:', error);
        }
        return { name: '', email: '', privateChatId: null, isSet: false };
    };

    const savedSession = loadGuestSession();
    
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
    const [lastQuestionId, setLastQuestionId] = useState(null);
    const [guestName, setGuestName] = useState(savedSession.name);
    const [guestEmail, setGuestEmail] = useState(savedSession.email);
    const [isNameEmailSet, setIsNameEmailSet] = useState(savedSession.isSet);
    const [privateChatId, setPrivateChatId] = useState(savedSession.privateChatId);
    const [privateMessages, setPrivateMessages] = useState([]);
    const [faqs, setFaqs] = useState([]);
    const [faqCategories, setFaqCategories] = useState([]);
    const [selectedFaqCategory, setSelectedFaqCategory] = useState('all');
    const messagesContainerRef = useRef(null);

    // Save guest session to localStorage
    const saveGuestSession = (name, email, chatId) => {
        try {
            localStorage.setItem('guest_chat_session', JSON.stringify({
                name,
                email,
                privateChatId: chatId,
                timestamp: Date.now(),
            }));
        } catch (error) {
            console.error('Failed to save guest session:', error);
        }
    };

    // Clear guest session (logout)
    const clearGuestSession = () => {
        try {
            localStorage.removeItem('guest_chat_session');
            setGuestName('');
            setGuestEmail('');
            setIsNameEmailSet(false);
            setPrivateChatId(null);
            setPrivateMessages([]);
            setChatMessages([{
                id: 1,
                from: 'bot',
                text: 'Halo! Selamat datang di MOV Center. Ada yang bisa kami bantu?',
                time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            }]);
            setHasRequestedCS(false);
            setLastQuestionId(null);
        } catch (error) {
            console.error('Failed to clear guest session:', error);
        }
    };

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

    // Get or create private chat with K-Petani (only if not already exists)
    useEffect(() => {
        if (isNameEmailSet && guestName && guestEmail && !privateChatId) {
            getOrCreatePrivateChat();
        }
    }, [isNameEmailSet, guestName, guestEmail, privateChatId]);

    // Load private messages when privateChatId is available
    useEffect(() => {
        if (privateChatId && guestEmail) {
            loadPrivateMessages();
            // Poll for new messages every 2 seconds
            const interval = setInterval(loadPrivateMessages, 2000);
            return () => clearInterval(interval);
        }
    }, [privateChatId, guestEmail]);

    const getOrCreatePrivateChat = async () => {
        try {
            const response = await window.axios.post(route('chat.guest.private.get-or-create'), {
                name: guestName,
                email: guestEmail,
            });
            if (response.data.success) {
                const chatId = response.data.chat_id;
                setPrivateChatId(chatId);
                saveGuestSession(guestName, guestEmail, chatId);
            }
        } catch (error) {
            console.error('Failed to get or create private chat:', error);
        }
    };

    const loadPrivateMessages = async () => {
        if (!privateChatId) return;
        try {
            const response = await window.axios.get(route('chat.guest.private.messages', privateChatId), {
                params: {
                    email: guestEmail,
                }
            });
            if (response.data.success) {
                const messages = response.data.messages || [];
                // Convert to chatMessages format - use message ID from database to avoid duplicates
                const formattedMessages = messages.map(msg => ({
                    id: `msg-${msg.id}`, // Use database ID to ensure uniqueness
                    from: msg.sender_email === guestEmail ? 'user' : (msg.sender_id ? 'cs' : 'bot'),
                    text: msg.message,
                    time: new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                    sender_name: msg.sender_name,
                    sender_email: msg.sender_email,
                    db_id: msg.id, // Store original DB ID
                }));
                setPrivateMessages(formattedMessages);
                // Clear chatMessages to avoid duplicates - only use privateMessages
                setChatMessages([{
                    id: 1,
                    from: 'bot',
                    text: 'Halo! Selamat datang di MOV Center. Ada yang bisa kami bantu?',
                    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                }]);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    // Auto scroll to bottom
    useEffect(() => {
        if (chatEndRef.current && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [privateMessages, chatMessages]);

    const handleSetNameEmail = (e) => {
        e.preventDefault();
        if (guestName.trim() && guestEmail.trim()) {
            setIsNameEmailSet(true);
            saveGuestSession(guestName.trim(), guestEmail.trim(), null);
        }
    };

    // Help Categories - Same as CustomerService
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

    // Load FAQs from API - Load immediately on mount and when category changes
    useEffect(() => {
        loadFAQs();
    }, [selectedFaqCategory]);

    const loadFAQs = async () => {
        try {
            const response = await window.axios.get(route('faqs.public'), {
                params: {
                    category: selectedFaqCategory,
                }
            });
            if (response.data.success) {
                setFaqs(response.data.faqs || []);
                setFaqCategories(response.data.categories || []);
            }
        } catch (error) {
            console.error('Failed to load FAQs:', error);
        }
    };

    // Auto-answer bot function (simplified for guest)
    const findAnswerByKeyword = (userMessage) => {
        const messageLower = userMessage.toLowerCase();
        
        for (const faq of faqs) {
            const questionLower = faq.question.toLowerCase();
            const answerLower = faq.answer.toLowerCase();
            
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

    const handleSendMessage = async (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        
        if (!message.trim() || !isNameEmailSet) return;

        const userMessage = message.trim();
        setMessage('');
        setIsTyping(true);

        // Send to private chat with K-Petani
        if (privateChatId) {
            try {
                await window.axios.post(route('chat.guest.private.send'), {
                    message: userMessage,
                    name: guestName,
                    email: guestEmail,
                });
                // Reload messages from server to avoid duplicates
                await loadPrivateMessages();
                setIsTyping(false);
            } catch (error) {
                console.error('Failed to send message:', error);
                setIsTyping(false);
                // Show error message to user
                alert('Gagal mengirim pesan. Silakan coba lagi.');
            }
        } else {
            setIsTyping(false);
        }
    };

    const handleDeleteChat = async () => {
        if (!privateChatId) return;
        
        if (!confirm('Apakah Anda yakin ingin menghapus chat ini? Chat yang dihapus tidak dapat dikembalikan.')) {
            return;
        }

        try {
            const response = await window.axios.delete(route('chat.guest.private.delete', privateChatId), {
                data: {
                    email: guestEmail,
                }
            });
            if (response.data.success) {
                // Reset chat state
                setPrivateChatId(null);
                setPrivateMessages([]);
                setChatMessages([{
                    id: 1,
                    from: 'bot',
                    text: 'Chat telah dihapus. Silakan mulai chat baru jika diperlukan.',
                    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                }]);
                alert('Chat berhasil dihapus');
            }
        } catch (error) {
            console.error('Failed to delete chat:', error);
            alert('Gagal menghapus chat. Silakan coba lagi.');
        }

        // Try to find auto-answer
        setTimeout(() => {
            setIsTyping(false);
            
            let botResponse;
            
            if (wantsDirectCS || hasRequestedCS) {
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
                        name: guestName,
                        email: guestEmail,
                    }, {
                        headers: {
                            'X-CSRF-TOKEN': csrfToken,
                            'Accept': 'application/json',
                        },
                    }).then((response) => {
                        if (response.data?.question_id) {
                            setLastQuestionId(response.data.question_id);
                        }
                    }).catch(err => {
                        console.warn('Failed to save question:', err);
                    });
                }
                
                if (isFirstRequest) {
                    botResponse = {
                        id: Date.now() + Math.random(),
                        from: 'cs',
                        text: `Terima kasih! Chat room Anda sudah aktif. Tim Customer Service MOV Center akan merespons secepat mungkin! 💬`,
                        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                        isAutoAnswer: false,
                    };
                } else {
                    botResponse = null;
                }
            } else {
                const autoAnswer = findAnswerByKeyword(userMessage);
                
                if (autoAnswer.found) {
                    botResponse = {
                        id: Date.now() + Math.random(),
                        from: 'bot',
                        text: autoAnswer.answer + '\n\n💡 Apakah jawaban ini membantu? Jika masih ada pertanyaan, ketik "Chat dengan CS" untuk berbicara langsung dengan tim CS kami!',
                        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                        isAutoAnswer: true,
                    };
                } else {
                    // Save question to database
                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
                    if (csrfToken && window.axios) {
                        window.axios.post(route('questions.store'), {
                            question: userMessage,
                            category: 'general',
                            name: guestName,
                            email: guestEmail,
                        }, {
                            headers: {
                                'X-CSRF-TOKEN': csrfToken,
                                'Accept': 'application/json',
                            },
                        }).then((response) => {
                            if (response.data?.question_id) {
                                setLastQuestionId(response.data.question_id);
                                if (!hasRequestedCS) {
                                    setHasRequestedCS(true);
                                }
                            }
                        }).catch(err => {
                            console.warn('Failed to save question:', err);
                        });
                    }
                    
                    botResponse = {
                        id: Date.now() + Math.random(),
                        from: 'cs',
                        text: `Terima kasih atas pertanyaan Anda. Pertanyaan Anda telah dicatat dan Tim Customer Service MOV Center akan segera merespons.\n\n📞 Untuk bantuan lebih cepat, hubungi kami:\n• WhatsApp: ${contactInfo.whatsapp}\n• Email: ${contactInfo.email}\n• Telepon: ${contactInfo.phone}\n\n⏰ Jam Operasional: ${contactInfo.operationalHours}`,
                        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                        isAutoAnswer: false,
                    };
                }
            }
            
            if (botResponse) {
                setChatMessages((prev) => {
                    const isDuplicate = prev.some(msg => 
                        msg.from === botResponse.from &&
                        msg.text === botResponse.text &&
                        Math.abs(new Date(msg.time) - new Date(botResponse.time)) < 2000
                    );
                    
                    if (isDuplicate) {
                        return prev;
                    }
                    
                    return [...prev, botResponse];
                });
            }
        }, 1500);
    };

    // Check for answers from CS (polling)
    useEffect(() => {
        if (!hasRequestedCS || !lastQuestionId) return;

        let mounted = true;
        const processedAnswerIds = new Set();

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
                    
                    questions.forEach(question => {
                        if (question.answer && question.answer.trim()) {
                            const answerTextHash = question.answer.substring(0, 50);
                            const answerKey = `${question.id}_${answerTextHash}`;
                            
                            if (processedAnswerIds.has(answerKey)) {
                                return;
                            }

                            const isMyQuestion = lastQuestionId === question.id || 
                                chatMessages.some(msg => msg.questionId === question.id) ||
                                !lastQuestionId;

                            if (isMyQuestion) {
                                processedAnswerIds.add(answerKey);
                                
                                const answerMessage = {
                                    id: Date.now() + Math.random(),
                                    from: 'cs',
                                    text: question.answer,
                                    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                                    isAutoAnswer: false,
                                    questionId: question.id,
                                };
                                
                                setChatMessages(prev => {
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

        checkForAnswers();
        const interval = setInterval(checkForAnswers, 1500);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [hasRequestedCS, lastQuestionId, chatMessages]);

    if (!isNameEmailSet) {
        return (
            <>
                <Head title="MOV Center - Guest Access" />
                <AnimatedBackground />
                <div className="min-h-screen py-6 md:py-8 px-4 sm:px-6 lg:px-8 relative">
                    <div className="max-w-2xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center mb-8"
                        >
                            <ApplicationLogo className="h-16 md:h-20 mx-auto mb-4" />
                            <h1 className="text-3xl md:text-4xl font-extrabold mb-2 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                MOV Center
                            </h1>
                            <p className="text-gray-600">Masukkan nama dan email Anda untuk mulai chat</p>
                        </motion.div>

                        <Card className="p-6 md:p-8 bg-white/80 backdrop-blur-xl border-2 border-green-200/50 shadow-2xl relative overflow-hidden">
                            {/* Decorative background */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-2xl -ml-24 -mb-24"></div>
                            
                            <form onSubmit={handleSetNameEmail} className="space-y-5 relative z-10">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Nama
                                    </label>
                                    <Input
                                        type="text"
                                        value={guestName}
                                        onChange={(e) => setGuestName(e.target.value)}
                                        placeholder="Masukkan nama Anda"
                                        required
                                        className="w-full h-12 border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 rounded-xl bg-white/90 backdrop-blur-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Email
                                    </label>
                                    <Input
                                        type="email"
                                        value={guestEmail}
                                        onChange={(e) => setGuestEmail(e.target.value)}
                                        placeholder="Masukkan email Anda"
                                        required
                                        className="w-full h-12 border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 rounded-xl bg-white/90 backdrop-blur-sm"
                                    />
                                </div>
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Button
                                        type="submit"
                                        className="w-full h-12 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white font-semibold shadow-lg rounded-xl"
                                    >
                                        <MessageCircle className="w-5 h-5 mr-2" />
                                        Mulai Chat
                                    </Button>
                                </motion.div>
                                <div className="text-center mt-4">
                                    <p className="text-sm text-gray-600">
                                        Sudah punya akun?{' '}
                                        <Link href={route('login')} className="text-green-600 hover:text-green-700 font-semibold">
                                            Masuk
                                        </Link>
                                        {' atau '}
                                        <Link href={route('register')} className="text-green-600 hover:text-green-700 font-semibold">
                                            Daftar
                                        </Link>
                                    </p>
                                </div>
                            </form>
                        </Card>

                        {/* FAQ Section - Show even before guest enters name/email */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mt-8"
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
                                    {/* Category Filter */}
                                    {faqCategories.length > 0 && (
                                        <div className="mb-4">
                                            <select
                                                value={selectedFaqCategory}
                                                onChange={(e) => setSelectedFaqCategory(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                            >
                                                <option value="all">Semua Kategori</option>
                                                {faqCategories.map((cat) => (
                                                    <option key={cat} value={cat}>
                                                        {cat}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        {faqs.length > 0 ? faqs.map((faq, idx) => (
                                            <motion.details
                                                key={faq.id || idx}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.3 + idx * 0.05 }}
                                                className="group"
                                            >
                                                <summary className="cursor-pointer text-base font-semibold text-gray-800 p-4 bg-white rounded-xl hover:bg-blue-100 transition-all duration-300 list-none flex items-center justify-between border-2 border-transparent hover:border-blue-300 shadow-sm">
                                                    <span className="flex-1 pr-4">{faq.question}</span>
                                                    <div className="flex items-center gap-2">
                                                        {faq.category && (
                                                            <Badge className="bg-green-100 text-green-700 text-xs">
                                                                {faq.category}
                                                            </Badge>
                                                        )}
                                                        <motion.span
                                                            animate={{ rotate: 0 }}
                                                            className="text-blue-600 text-xl transition-transform duration-300 group-open:rotate-180"
                                                        >
                                                            ▼
                                                        </motion.span>
                                                    </div>
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
                                        )) : (
                                            <div className="text-center py-8">
                                                <FileQuestion className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                                <p className="text-sm text-gray-500">
                                                    Belum ada FAQ tersedia
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                </div>
            </>
        );
    }

    // Use only privateMessages to avoid duplicates - chatMessages only for initial bot message
    const allMessages = privateMessages.length > 0 
        ? privateMessages 
        : chatMessages; // Fallback to chatMessages if no private messages yet

    return (
        <>
            <Head title="MOV Center - Customer Service" />
            <AnimatedBackground />
            
            <div className="min-h-screen py-6 md:py-8 px-4 sm:px-6 lg:px-8 relative">
                <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
                    {/* Header with Login/Register/Logout buttons */}
                    <div className="flex items-center justify-between mb-4">
                        <div></div>
                        <div className="flex items-center gap-2">
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearGuestSession}
                                    className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Keluar
                                </Button>
                            </motion.div>
                            <Link href={route('login')}>
                                <Button variant="outline" size="sm">
                                    <LogIn className="w-4 h-4 mr-2" />
                                    Masuk
                                </Button>
                            </Link>
                            <Link href={route('register')}>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                    <UserPlus className="w-4 h-4 mr-2" />
                                    Daftar
                                </Button>
                            </Link>
                        </div>
                    </div>
                    
                    {/* Hero Header - Same as CustomerService */}
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
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="relative"
                            >
                                <img 
                                    src="/mov-logo.png" 
                                    alt="MOV Logo" 
                                    className="h-24 md:h-32 w-auto object-contain drop-shadow-2xl"
                                    onError={(e) => {
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
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm px-4 py-1.5 shadow-lg border-0">
                                <Sparkles className="w-3 h-3 mr-1.5" />
                                Guest Support
                            </Badge>
                            <p className="text-sm text-gray-500 mt-2">
                                Chat sebagai: <strong>{guestName}</strong> ({guestEmail})
                            </p>
                        </motion.div>
                    </motion.div>

                    {/* Contact Cards - Same as CustomerService */}
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

                    {/* Contact Details - Same as CustomerService */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="p-6 md:p-8 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-2 border-green-200/60 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-green-400/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-6">
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

                    {/* Help Categories - Same as CustomerService */}
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
                            {helpCategories.map((category, index) => (
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

                    {/* Live Chat - Enhanced with glassmorphism */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <Card className="p-6 md:p-8 bg-white/80 backdrop-blur-xl border-2 border-green-200/50 shadow-2xl relative overflow-hidden">
                            {/* Decorative background */}
                            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full blur-3xl -mr-48 -mt-48"></div>
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-2xl -ml-32 -mb-32"></div>
                            
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
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
                                        className="w-16 h-16 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl ring-4 ring-green-200/50"
                                    >
                                        <MessageCircle className="w-8 h-8 text-white" />
                                    </motion.div>
                                    <div className="flex-1">
                                        <h3 className="text-xl md:text-2xl font-extrabold text-gray-900 bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                                            Chat Langsung
                                        </h3>
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
                                                className="w-3 h-3 bg-green-500 rounded-full shadow-lg shadow-green-500/50"
                                            />
                                            <span className="text-sm text-gray-600 font-semibold">Tim kami online</span>
                                        </div>
                                    </div>
                                    {privateChatId && (
                                        <motion.button
                                            whileHover={{ scale: 1.1, rotate: 5 }}
                                            whileTap={{ scale: 0.9 }}
                                            onClick={handleDeleteChat}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shadow-sm"
                                            title="Hapus chat"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </motion.button>
                                    )}
                                </div>

                                {/* Chat Messages - Enhanced WhatsApp-like design */}
                                <div 
                                    ref={messagesContainerRef}
                                    className="bg-gradient-to-br from-[#e5ddd5] via-[#e5ddd5] to-[#d4c5b7] bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23d4d4d4%22 fill-opacity=%220.3%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] rounded-2xl p-4 md:p-6 mb-5 h-80 md:h-96 overflow-y-auto space-y-1 custom-scrollbar shadow-inner"
                                >
                                    <AnimatePresence>
                                        {(() => {
                                            let currentDate = null;
                                            const groupedMessages = [];
                                            
                                            allMessages.forEach((msg, index) => {
                                                const msgDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                                                
                                                if (currentDate !== msgDate) {
                                                    currentDate = msgDate;
                                                    groupedMessages.push({
                                                        type: 'date-separator',
                                                        date: msgDate,
                                                        id: `date-${msgDate}-${index}`,
                                                    });
                                                }
                                                
                                                const prevMsg = index > 0 ? allMessages[index - 1] : null;
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
                                                        {item.showAvatar && !isUser && (
                                                            <motion.div
                                                                whileHover={{ scale: 1.1 }}
                                                                className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 mb-1 shadow-lg ring-2 ring-white/50"
                                                            >
                                                                {isCS ? (
                                                                    <User className="w-5 h-5 text-white" />
                                                                ) : (
                                                                    <MessageCircle className="w-5 h-5 text-white" />
                                                                )}
                                                            </motion.div>
                                                        )}
                                                        {!item.showAvatar && !isUser && <div className="w-10 h-10 flex-shrink-0" />}
                                                        
                                                        <motion.div
                                                            whileHover={{ scale: 1.02 }}
                                                            className={`max-w-[75%] md:max-w-[65%] ${
                                                                isUser
                                                                    ? 'bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 text-white rounded-2xl rounded-br-sm shadow-lg'
                                                                    : isCS
                                                                    ? 'bg-white/95 backdrop-blur-sm text-gray-900 rounded-2xl rounded-bl-sm shadow-lg border border-gray-200/50'
                                                                    : 'bg-white/95 backdrop-blur-sm text-gray-900 rounded-2xl rounded-bl-sm shadow-lg border border-gray-200/50'
                                                            } px-4 py-3`}
                                                        >
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
                                                            </div>
                                                        </motion.div>
                                                        
                                                        {isUser && item.showAvatar && (
                                                            <motion.div
                                                                whileHover={{ scale: 1.1 }}
                                                                className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 mb-1 shadow-lg ring-2 ring-white/50"
                                                            >
                                                                <User className="w-5 h-5 text-white" />
                                                            </motion.div>
                                                        )}
                                                        {isUser && !item.showAvatar && <div className="w-10 h-10 flex-shrink-0" />}
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
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 mb-1 shadow-lg ring-2 ring-white/50">
                                                <MessageCircle className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="bg-white/95 backdrop-blur-sm rounded-2xl rounded-tl-none shadow-lg border border-gray-200/50 px-4 py-3">
                                                <div className="flex gap-1.5">
                                                    <motion.div
                                                        animate={{ y: [0, -6, 0] }}
                                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                                                        className="w-2.5 h-2.5 bg-green-500 rounded-full"
                                                    />
                                                    <motion.div
                                                        animate={{ y: [0, -6, 0] }}
                                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                                                        className="w-2.5 h-2.5 bg-emerald-500 rounded-full"
                                                    />
                                                    <motion.div
                                                        animate={{ y: [0, -6, 0] }}
                                                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                                                        className="w-2.5 h-2.5 bg-teal-500 rounded-full"
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Input - Enhanced WhatsApp Style with glassmorphism */}
                                <div 
                                    className="flex gap-2 bg-white/90 backdrop-blur-xl rounded-2xl p-2 md:p-3 border-2 border-green-200/50 shadow-lg"
                                    onKeyDown={(e) => {
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
                                                setTimeout(() => {
                                                    if (messagesContainerRef.current) {
                                                        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
                                                    }
                                                }, 100);
                                            }
                                        }}
                                        className="text-sm md:text-base flex-1 h-10 md:h-12 border-0 focus:ring-0 focus:outline-none bg-transparent placeholder:text-gray-400"
                                    />
                                    <motion.div
                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <Button
                                            type="button"
                                            onClick={(e) => handleSendMessage(e)}
                                            className="bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 hover:from-green-600 hover:via-emerald-700 hover:to-teal-700 text-white h-10 w-10 md:h-12 md:w-12 p-0 rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={!message.trim()}
                                        >
                                            <Send className="w-5 h-5" />
                                        </Button>
                                    </motion.div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* FAQ - Same as CustomerService */}
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
                                {/* Category Filter */}
                                {faqCategories.length > 0 && (
                                    <div className="mb-4">
                                        <select
                                            value={selectedFaqCategory}
                                            onChange={(e) => setSelectedFaqCategory(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                                        >
                                            <option value="all">Semua Kategori</option>
                                            {faqCategories.map((cat) => (
                                                <option key={cat} value={cat}>
                                                    {cat}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {faqs.length > 0 ? faqs.map((faq, idx) => (
                                        <motion.details
                                            key={faq.id || idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.7 + idx * 0.05 }}
                                            className="group"
                                        >
                                            <summary className="cursor-pointer text-base font-semibold text-gray-800 p-4 bg-white rounded-xl hover:bg-blue-100 transition-all duration-300 list-none flex items-center justify-between border-2 border-transparent hover:border-blue-300 shadow-sm">
                                                <span className="flex-1 pr-4">{faq.question}</span>
                                                <div className="flex items-center gap-2">
                                                    {faq.category && (
                                                        <Badge className="bg-green-100 text-green-700 text-xs">
                                                            {faq.category}
                                                        </Badge>
                                                    )}
                                                    <motion.span
                                                        animate={{ rotate: 0 }}
                                                        className="text-blue-600 text-xl transition-transform duration-300 group-open:rotate-180"
                                                    >
                                                        ▼
                                                    </motion.span>
                                                </div>
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
                                    )) : (
                                        <div className="text-center py-8">
                                            <FileQuestion className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">
                                                Belum ada FAQ tersedia
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Mitra Info - Same as CustomerService */}
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

                    {/* Quick Tips - Same as CustomerService */}
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
                                    <motion.li
                                        whileHover={{ x: 5 }}
                                        className="flex items-start gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-green-200/50"
                                    >
                                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        <span>Daftar akun untuk akses fitur lengkap dan chat pribadi</span>
                                    </motion.li>
                                </ul>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </>
    );
}
