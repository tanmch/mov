import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Textarea } from '@/Components/ui/textarea';
import { 
    MessageCircle, Send, Clock, CheckCircle2, User, Mail, 
    Search, RefreshCw, X, Users, Sparkles, Trash2
} from 'lucide-react';
import { usePage, router } from '@inertiajs/react';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import ChatNotificationToast from '@/Components/ChatNotificationToast';

export default function GuestChatRoom({ guestPrivateChats: guestPrivateChatsProp }) {
    // Ensure guestPrivateChatsProp is always an array
    const initialChats = Array.isArray(guestPrivateChatsProp) ? guestPrivateChatsProp : [];
    const [guestPrivateChats, setGuestPrivateChats] = useState(initialChats);
    
    // Update state when prop changes
    useEffect(() => {
        const validChats = Array.isArray(guestPrivateChatsProp) ? guestPrivateChatsProp : [];
        setGuestPrivateChats(validChats);
        
        // Debug log
        if (process.env.NODE_ENV === 'development') {
            console.log('GuestChatRoom: guestPrivateChatsProp updated', validChats.length, validChats);
        }
    }, [guestPrivateChatsProp]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesContainerRef = useRef(null);
    const chatEndRef = useRef(null);
    const { auth } = usePage().props;
    const currentUser = auth?.user;
    
    // Chat notifications
    const { latestNotification: latestChatNotification, clearLatestNotification: clearChatNotification } = useChatNotifications();

    // Load guest private chats
    const loadGuestChats = async () => {
        try {
            router.reload({
                only: ['guestPrivateChats'],
                preserveScroll: true,
                onSuccess: (page) => {
                    const chats = page.props.guestPrivateChats || [];
                    // Ensure it's always an array
                    const validChats = Array.isArray(chats) ? chats : [];
                    setGuestPrivateChats(validChats);
                    
                    // Debug log
                    if (process.env.NODE_ENV === 'development') {
                        console.log('Guest chats loaded:', validChats.length, validChats);
                    }
                },
            });
        } catch (error) {
            console.error('Failed to load guest chats:', error);
        }
    };

    // Load messages for selected chat and auto-take if not taken
    const loadMessages = async () => {
        if (!selectedChat?.id) return;
        
        try {
            // Auto-take chat if not taken yet and current user is K-Petani
            if (currentUser?.role === 'k-petani' && selectedChat && !selectedChat.is_taken) {
                try {
                    const takeResponse = await window.axios.post(route('chat.guest.take', selectedChat.id));
                    if (takeResponse.data.success) {
                        // Update selectedChat state to reflect taken status
                        setSelectedChat(prev => ({
                            ...prev,
                            is_taken: true,
                            is_taken_by_me: true,
                            taken_by_id: currentUser.id,
                            taken_by: {
                                id: currentUser.id,
                                name: currentUser.name,
                                email: currentUser.email,
                            },
                        }));
                    }
                    // Reload guest chats to get updated status
                    await loadGuestChats();
                } catch (takeError) {
                    // If already taken by another K-Petani, that's okay - just continue
                    console.warn('Chat already taken or error taking chat:', takeError);
                }
            }
            
            const response = await window.axios.get(route('chat.private.messages', selectedChat.id));
            if (response.data.success) {
                // Ensure messages is always an array
                const serverMessages = Array.isArray(response.data.messages) ? response.data.messages : [];
                
                // Debug log
                if (process.env.NODE_ENV === 'development') {
                    console.log('Messages loaded for chat:', selectedChat.id, serverMessages.length, serverMessages);
                    console.log('Response data:', response.data);
                }
                
                setMessages(serverMessages);
            } else {
                // Log error response
                console.error('Failed to load messages:', response.data);
                if (response.data.message && response.data.message.includes('ditangani oleh K-Petani lain')) {
                    // Chat is taken by another K-Petani - reload guest chats to get updated info
                    await loadGuestChats();
                }
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
            // If error is 403 (taken by another), reload guest chats
            if (error.response?.status === 403) {
                await loadGuestChats();
                // Update selectedChat to reflect that it's taken by another
                if (error.response?.data?.taken_by) {
                    setSelectedChat(prev => ({
                        ...prev,
                        is_taken: true,
                        is_taken_by_me: false,
                        taken_by: error.response.data.taken_by,
                    }));
                }
            }
        }
    };

    // Auto refresh messages every 2 seconds
    useEffect(() => {
        if (selectedChat?.id) {
            loadMessages();
            const interval = setInterval(loadMessages, 2000);
            return () => clearInterval(interval);
        }
    }, [selectedChat?.id]);

    // Auto refresh guest chats every 3 seconds
    useEffect(() => {
        loadGuestChats();
        const interval = setInterval(loadGuestChats, 3000);
        return () => clearInterval(interval);
    }, []);

    // Don't auto-select first chat - let K-Petani choose manually
    // useEffect removed - K-Petani must select a guest chat manually

    // Auto scroll
    useEffect(() => {
        if (chatEndRef.current && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages]);

    // Filter guest chats - ensure guestPrivateChats is always an array
    const filteredGuestChats = Array.isArray(guestPrivateChats) ? guestPrivateChats.filter(chat => 
        chat.guest_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.guest_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.last_message?.message?.toLowerCase().includes(searchQuery.toLowerCase())
    ) : [];

    // Filter messages - ensure messages is always an array
    const filteredMessages = Array.isArray(messages) ? messages.filter(msg => 
        msg.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.sender_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.sender_email?.toLowerCase().includes(searchQuery.toLowerCase())
    ) : [];

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim() || !selectedChat?.id || !currentUser) return;
        
        // Check if chat is taken by another K-Petani
        if (selectedChat?.is_taken && !selectedChat?.is_taken_by_me) {
            alert(`Chat ini sedang ditangani oleh ${selectedChat.taken_by?.name || 'K-Petani lain'}. Anda tidak dapat mengirim pesan.`);
            return;
        }

        setIsLoading(true);
        const messageText = message.trim();
        setMessage('');

        try {
            const response = await window.axios.post(route('chat.private.send', selectedChat.id), {
                message: messageText,
            });
            
            // Update selectedChat to ensure it reflects taken status
            if (response.data.success && !selectedChat.is_taken) {
                setSelectedChat(prev => ({
                    ...prev,
                    is_taken: true,
                    is_taken_by_me: true,
                    taken_by_id: currentUser.id,
                    taken_by: {
                        id: currentUser.id,
                        name: currentUser.name,
                        email: currentUser.email,
                    },
                }));
            }
            
            // Reload messages immediately to show the new message
            await loadMessages();
            
            // Force reload guest chats to get updated data (including taken status and last_message)
            await loadGuestChats();
            
            // Also refresh after a short delay to ensure data is synced
            setTimeout(() => {
                loadGuestChats();
                loadMessages(); // Reload messages again to ensure all messages are shown
            }, 500);
        } catch (error) {
            console.error('Failed to send message:', error);
            if (error.response?.status === 403) {
                alert('Chat ini sedang ditangani oleh K-Petani lain. Anda tidak dapat mengirim pesan.');
                await loadGuestChats(); // Reload to get updated status
            }
            setMessage(messageText);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        loadGuestChats();
        if (selectedChat?.id) {
            loadMessages();
        }
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const handleDeleteGuestChat = async (chatId) => {
        try {
            const response = await window.axios.delete(route('chat.guest.delete', chatId));
            if (response.data.success) {
                // Clear selected chat if it was deleted
                if (selectedChat?.id === chatId) {
                    setSelectedChat(null);
                    setMessages([]);
                }
                // Reload guest chats
                router.reload({
                    only: ['guestPrivateChats'],
                    preserveScroll: true,
                });
            }
        } catch (error) {
            console.error('Failed to delete guest chat:', error);
            alert('Gagal menghapus guest chat. Silakan coba lagi.');
        }
    };

    const guestCount = filteredGuestChats.length;
    const unreadCount = Array.isArray(guestPrivateChats) ? guestPrivateChats.filter(chat => 
        chat.last_message && !chat.last_message.is_read && chat.last_message.sender_email !== currentUser?.email
    ).length : 0;
    
    // Debug: Log guest chats on mount and when they change
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log('GuestChatRoom - Current guest chats:', {
                total: guestPrivateChats.length,
                filtered: filteredGuestChats.length,
                chats: guestPrivateChats,
            });
        }
    }, [guestPrivateChats, filteredGuestChats]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-250px)]">
            {/* Left Sidebar - Guest List */}
            <div className="lg:col-span-1 flex flex-col">
                <Card className="p-4 mb-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-gray-900">Guest Chat</h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="h-8 w-8 p-0"
                            title="Refresh"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <Badge className="bg-green-600 text-white">
                            <Users className="w-3 h-3 mr-1" />
                            {guestCount} Guest{guestCount !== 1 ? 's' : ''}
                        </Badge>
                        {unreadCount > 0 && (
                            <Badge className="bg-red-500 text-white">
                                {unreadCount} Baru
                            </Badge>
                        )}
                    </div>
                    
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Cari chat..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 text-sm"
                        />
                    </div>
                </Card>

                {/* Guest List */}
                <Card className="flex-1 overflow-hidden p-0">
                    <div className="overflow-y-auto h-full custom-scrollbar p-2">
                        {filteredGuestChats.length === 0 ? (
                            <div className="p-8 text-center">
                                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">
                                    Belum ada chat dari guest
                                </p>
                            </div>
                        ) : (
                            filteredGuestChats.map((chat) => {
                                const isTaken = chat.is_taken || false;
                                const isTakenByMe = chat.is_taken_by_me || false;
                                const isTakenByOther = isTaken && !isTakenByMe;
                                
                                return (
                                    <motion.div
                                        key={chat.id}
                                        whileHover={{ scale: 1.02, x: 4 }}
                                        className={`p-3 mb-2 rounded-lg border transition-all ${
                                            selectedChat?.id === chat.id
                                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
                                                : isTakenByOther
                                                ? 'bg-gray-50 border-gray-300 opacity-75'
                                                : 'bg-white border-gray-200 hover:border-green-300 hover:bg-green-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div 
                                                onClick={() => {
                                                    if (!isTakenByOther) {
                                                        setSelectedChat(chat);
                                                    }
                                                }}
                                                className={`flex items-center gap-3 flex-1 min-w-0 ${
                                                    isTakenByOther ? 'cursor-not-allowed' : 'cursor-pointer'
                                                }`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                                                    isTakenByMe
                                                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 ring-2 ring-green-400'
                                                        : isTakenByOther
                                                        ? 'bg-gradient-to-br from-gray-400 to-gray-500'
                                                        : 'bg-gradient-to-br from-purple-500 to-pink-600'
                                                }`}>
                                                    <User className="w-5 h-5 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-sm text-gray-900 truncate">
                                                            {chat.guest_name || 'Guest'}
                                                        </p>
                                                        {isTakenByMe && (
                                                            <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0">
                                                                Anda
                                                            </Badge>
                                                        )}
                                                        {isTakenByOther && chat.taken_by && (
                                                            <Badge className="bg-gray-500 text-white text-[10px] px-1.5 py-0">
                                                                {chat.taken_by.name}
                                                            </Badge>
                                                        )}
                                                        {!isTaken && (
                                                            <Badge className="bg-yellow-500 text-white text-[10px] px-1.5 py-0 animate-pulse">
                                                                Baru
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {chat.guest_email}
                                                    </p>
                                                    {chat.last_message && (
                                                        <p className="text-xs text-gray-400 mt-1 truncate">
                                                            {chat.last_message.message}
                                                        </p>
                                                    )}
                                                    {isTakenByOther && (
                                                        <p className="text-xs text-orange-600 mt-1 font-semibold">
                                                            ⚠️ Ditangani oleh {chat.taken_by?.name || 'K-Petani lain'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm('Apakah Anda yakin ingin menghapus chat guest ini?')) {
                                                        handleDeleteGuestChat(chat.id);
                                                    }
                                                }}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Hapus guest chat"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                </Card>
            </div>

            {/* Main Chat Area */}
            <div className="lg:col-span-3 flex flex-col">
                {!selectedChat ? (
                    /* Empty State - No Chat Selected */
                    <Card className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-2 border-green-200 rounded-2xl shadow-xl">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            className="text-center"
                        >
                            <motion.div
                                animate={{ 
                                    scale: [1, 1.1, 1],
                                    rotate: [0, 5, -5, 0]
                                }}
                                transition={{ 
                                    duration: 2, 
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                className="w-24 h-24 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl"
                            >
                                <MessageCircle className="w-12 h-12 text-white" />
                            </motion.div>
                            <h3 className="text-2xl font-extrabold text-gray-900 mb-3 bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                                Pilih Guest untuk Memulai Chat
                            </h3>
                            <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                Silakan pilih guest dari daftar di sebelah kiri untuk mulai berkomunikasi. 
                                Chat yang belum ditangani akan otomatis menjadi milik Anda saat dibuka.
                            </p>
                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
                                    💡 Tips
                                </Badge>
                                <span>Klik pada guest chat untuk mulai membalas</span>
                            </div>
                        </motion.div>
                    </Card>
                ) : (
                    <Card className="flex-1 flex flex-col p-0 overflow-hidden bg-gradient-to-br from-[#e5ddd5] via-[#e5ddd5] to-[#d4c5b7] rounded-2xl shadow-xl border-0">
                        {/* Chat Header */}
                        <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white p-4 shadow-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-lg flex items-center justify-center flex-shrink-0 shadow-md">
                                        <Users className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-lg">
                                                {selectedChat?.guest_name || 'Guest'}
                                            </p>
                                            {selectedChat?.is_taken_by_me && (
                                                <Badge className="bg-green-400 text-white text-xs">
                                                    Anda Menangani
                                                </Badge>
                                            )}
                                            {selectedChat?.is_taken && !selectedChat?.is_taken_by_me && selectedChat?.taken_by && (
                                                <Badge className="bg-orange-400 text-white text-xs">
                                                    {selectedChat.taken_by.name}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-white/90">
                                            {selectedChat?.guest_email || ''}
                                        </p>
                                        {selectedChat?.is_taken && !selectedChat?.is_taken_by_me && selectedChat?.taken_by && (
                                            <p className="text-xs text-yellow-200 mt-1">
                                                ⚠️ Chat ini sedang ditangani oleh {selectedChat.taken_by.name}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <Badge className="bg-white/20 text-white border-white/30">
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    {guestCount} Guest Online
                                </Badge>
                            </div>
                        </div>

                    {/* Messages */}
                    <div 
                        ref={messagesContainerRef}
                        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4d4d4' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                        }}
                    >
                        <AnimatePresence>
                            {filteredMessages.length > 0 ? (
                                filteredMessages.map((msg) => {
                                    const isMe = currentUser && (
                                        (msg.sender_id && msg.sender_id === currentUser.id) || 
                                        (msg.sender_email && msg.sender_email === currentUser.email)
                                    );
                                    const isGuest = !msg.sender_id;
                                    
                                    return (
                                        <motion.div
                                            key={msg.id}
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}
                                        >
                                            {!isMe && (
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                                                    isGuest 
                                                        ? 'bg-gradient-to-br from-purple-500 to-pink-600' 
                                                        : 'bg-gradient-to-br from-green-500 to-emerald-600'
                                                }`}>
                                                    <User className="w-5 h-5 text-white" />
                                                </div>
                                            )}
                                            <div className={`max-w-[75%] md:max-w-[65%] px-4 py-2.5 rounded-2xl shadow-md ${
                                                isMe
                                                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-br-sm'
                                                    : 'bg-white text-gray-900 rounded-bl-sm'
                                            }`}>
                                                {!isMe && (
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="text-xs font-bold text-gray-700">
                                                            {msg.sender_name || 'Guest'}
                                                        </p>
                                                        {isGuest && (
                                                            <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0">
                                                                Guest
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}
                                                <p className={`text-sm md:text-base ${isMe ? 'text-white' : 'text-gray-900'} leading-relaxed whitespace-pre-wrap break-words`}>
                                                    {msg.message}
                                                </p>
                                                <div className="flex items-center justify-end gap-1 mt-1">
                                                    <p className={`text-[10px] md:text-xs ${isMe ? 'text-white/80' : 'text-gray-500'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    {isMe && (
                                                        <CheckCircle2 className="w-3 h-3 text-white/80" />
                                                    )}
                                                </div>
                                            </div>
                                            {isMe && (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md">
                                                    <User className="w-5 h-5 text-white" />
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center py-12"
                                >
                                    <div className="w-20 h-20 rounded-full bg-white/50 backdrop-blur-lg flex items-center justify-center mx-auto mb-4 shadow-lg">
                                        <MessageCircle className="w-10 h-10 text-gray-400" />
                                    </div>
                                    <p className="text-gray-600 font-medium">Belum ada pesan</p>
                                    <p className="text-sm text-gray-500 mt-1">Mulai percakapan dengan guest</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input */}
                    <form 
                        onSubmit={handleSendMessage}
                        className="bg-white/95 backdrop-blur-lg p-3 md:p-4 border-t border-gray-200"
                    >
                        <div className="flex gap-2 md:gap-3">
                            <Textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder={
                                    selectedChat?.is_taken && !selectedChat?.is_taken_by_me
                                        ? `Chat ditangani oleh ${selectedChat.taken_by?.name || 'K-Petani lain'} - Tidak dapat mengirim pesan`
                                        : "Balas pesan guest..."
                                }
                                disabled={
                                    !selectedChat || 
                                    (selectedChat?.is_taken && !selectedChat?.is_taken_by_me) ||
                                    isLoading
                                }
                                rows={2}
                                className="flex-1 py-2.5 md:py-3 px-4 rounded-xl border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                            />
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                type="submit"
                                disabled={
                                    !message.trim() || 
                                    isLoading || 
                                    !selectedChat ||
                                    (selectedChat?.is_taken && !selectedChat?.is_taken_by_me)
                                }
                                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white p-3 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all self-end"
                            >
                                {isLoading ? (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                                    />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                            </motion.button>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2 text-center">
                            💡 <kbd className="px-1 py-0.5 bg-gray-100 rounded border border-gray-300 text-[10px]">Enter</kbd> kirim, <kbd className="px-1 py-0.5 bg-gray-100 rounded border border-gray-300 text-[10px]">Shift+Enter</kbd> baris baru
                        </p>
                    </form>
                    </Card>
                )}
            </div>

            {/* Chat Notification Toast */}
            <ChatNotificationToast
                notification={latestChatNotification}
                onClose={clearChatNotification}
                onClick={() => {
                    if (latestChatNotification?.data?.chat_id) {
                        // Find and select the guest chat
                        const chat = guestPrivateChats.find(c => c.id === latestChatNotification.data.chat_id);
                        if (chat) {
                            setSelectedChat(chat);
                        }
                    }
                }}
            />
        </div>
    );
}

