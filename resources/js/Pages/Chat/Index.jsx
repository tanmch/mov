import { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { 
    MessageCircle, Users, User, Send, Search, 
    Phone, Mail, Clock, CheckCircle2, LogOut,
    ArrowLeft, Settings, Plus, X, Sparkles, MoreVertical, Trash2, Loader2
} from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import BackButton from '@/Components/BackButton';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { useRole } from '@/hooks/useRole';
import { usePage } from '@inertiajs/react';
import { useChatNotifications } from '@/hooks/useChatNotifications';
import ChatNotificationToast from '@/Components/ChatNotificationToast';
import { debounce } from '@/utils/debounce';

export default function ChatIndex({ contactInfo, defaultGroup, userGroups, privateChats }) {
    const { userRole, isPetani } = useRole();
    const { auth } = usePage().props;
    const currentUser = auth?.user || null;
    const [activeTab, setActiveTab] = useState('group'); // 'group' or 'private'
    const [selectedGroup, setSelectedGroup] = useState(defaultGroup);
    const [selectedPrivateChat, setSelectedPrivateChat] = useState(null);
    const [groupMessages, setGroupMessages] = useState([]);
    const [privateMessages, setPrivateMessages] = useState([]);
    const [message, setMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [showChatMenu, setShowChatMenu] = useState(false);
    const messagesContainerRef = useRef(null);
    const chatEndRef = useRef(null);
    const menuRef = useRef(null);
    const pollingIntervalRef = useRef(null);
    const isLoadingRef = useRef(false);
    
    // Chat notifications
    const { latestNotification: latestChatNotification, clearLatestNotification: clearChatNotification } = useChatNotifications();

    // Optimized polling with visibility and activity detection
    const [isPageVisible, setIsPageVisible] = useState(true);
    const [lastActivity, setLastActivity] = useState(Date.now());

    // Detect page visibility
    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsPageVisible(!document.hidden);
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Track user activity (excluding scroll to prevent refresh on scroll)
    useEffect(() => {
        const handleActivity = () => setLastActivity(Date.now());
        // Remove 'scroll' from events to prevent refresh when scrolling
        const events = ['mousedown', 'mousemove', 'keypress', 'touchstart', 'click', 'keydown'];
        events.forEach(event => window.addEventListener(event, handleActivity));
        return () => events.forEach(event => window.removeEventListener(event, handleActivity));
    }, []);

    // Calculate polling interval based on visibility and activity
    const getPollingInterval = () => {
        if (!isPageVisible) return 30000; // 30 seconds when tab is hidden
        const timeSinceActivity = Date.now() - lastActivity;
        if (timeSinceActivity > 60000) return 20000; // 20 seconds if inactive > 1 minute
        if (timeSinceActivity > 30000) return 15000; // 15 seconds if inactive > 30s
        return 8000; // 8 seconds when active (increased to reduce server load)
    };

    // Load group messages with optimized polling and request deduplication
    useEffect(() => {
        if (selectedGroup?.id && activeTab === 'group') {
            loadGroupMessages();
            
            const startPolling = () => {
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                }
                const interval = getPollingInterval();
                pollingIntervalRef.current = setInterval(() => {
                    if (isPageVisible && !isLoadingRef.current) {
                        loadGroupMessages();
                    }
                }, interval);
            };

            startPolling();
            // Update interval less frequently (every 15 seconds) and only when activity changes significantly
            const updateInterval = setInterval(() => {
                const newInterval = getPollingInterval();
                const currentInterval = pollingIntervalRef.current ? 
                    (pollingIntervalRef.current._interval || 8000) : 8000;
                
                // Only update if interval changed significantly (more than 2 seconds difference)
                if (Math.abs(newInterval - currentInterval) > 2000) {
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = setInterval(() => {
                            if (isPageVisible && !isLoadingRef.current) {
                                loadGroupMessages();
                            }
                        }, newInterval);
                    }
                }
            }, 15000); // Check every 15 seconds

            return () => {
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                clearInterval(updateInterval);
            };
        }
    }, [selectedGroup?.id, activeTab, isPageVisible]); // Removed lastActivity from dependencies

    // Load private messages with optimized polling and request deduplication
    useEffect(() => {
        if (selectedPrivateChat?.id && activeTab === 'private') {
            loadPrivateMessages();
            
            const startPolling = () => {
                if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                }
                const interval = getPollingInterval();
                pollingIntervalRef.current = setInterval(() => {
                    if (isPageVisible && !isLoadingRef.current) {
                        loadPrivateMessages();
                    }
                }, interval);
            };

            startPolling();
            // Update interval less frequently (every 15 seconds) and only when activity changes significantly
            const updateInterval = setInterval(() => {
                const newInterval = getPollingInterval();
                const currentInterval = pollingIntervalRef.current ? 
                    (pollingIntervalRef.current._interval || 8000) : 8000;
                
                // Only update if interval changed significantly (more than 2 seconds difference)
                if (Math.abs(newInterval - currentInterval) > 2000) {
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = setInterval(() => {
                            if (isPageVisible && !isLoadingRef.current) {
                                loadPrivateMessages();
                            }
                        }, newInterval);
                    }
                }
            }, 15000); // Check every 15 seconds

            return () => {
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                clearInterval(updateInterval);
            };
        }
    }, [selectedPrivateChat?.id, activeTab, isPageVisible]); // Removed lastActivity from dependencies

    // Auto scroll
    useEffect(() => {
        if (chatEndRef.current && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [groupMessages, privateMessages]);

    const loadGroupMessages = async () => {
        if (!selectedGroup?.id || isLoadingRef.current) return; // Prevent concurrent requests
        isLoadingRef.current = true;
        setIsLoadingMessages(true);
        try {
            const response = await window.axios.get(route('chat.group.messages', selectedGroup.id));
            if (response.data.success) {
                // Ensure serverMessages is always an array
                const serverMessages = Array.isArray(response.data.messages) ? response.data.messages : [];
                
                // Merge with optimistic messages (keep optimistic messages that haven't been confirmed yet)
                setGroupMessages(prev => {
                    const currentMessages = Array.isArray(prev) ? prev : [];
                    const optimisticMessages = currentMessages.filter(m => m.is_optimistic);
                    
                    // Remove optimistic messages that are now confirmed by server (by checking if message text and sender match)
                    const unconfirmedOptimistic = optimisticMessages.filter(optMsg => {
                        // Check if this optimistic message has been confirmed by server
                        const isConfirmed = serverMessages.some(srvMsg => 
                            srvMsg.message === optMsg.message && 
                            srvMsg.sender_id === optMsg.sender_id &&
                            Math.abs(new Date(srvMsg.created_at) - new Date(optMsg.created_at)) < 10000 // 10 seconds window
                        );
                        return !isConfirmed; // Keep only unconfirmed optimistic messages
                    });
                    
                    // Combine server messages with unconfirmed optimistic messages
                    // Server messages should come first, then unconfirmed optimistic
                    const merged = [...serverMessages, ...unconfirmedOptimistic];
                    
                    // Debug log to check if messages are being loaded
                    if (serverMessages.length > 0) {
                        console.log(`Loaded ${serverMessages.length} group messages from server`);
                    }
                    
                    return merged;
                });
            } else {
                console.error('Failed to load group messages: response not successful', response.data);
            }
        } catch (error) {
            console.error('Failed to load group messages:', error);
        } finally {
            setIsLoadingMessages(false);
            isLoadingRef.current = false;
        }
    };

    const loadPrivateMessages = async () => {
        if (!selectedPrivateChat?.id || isLoadingRef.current) return; // Prevent concurrent requests
        isLoadingRef.current = true;
        setIsLoadingMessages(true);
        try {
            const response = await window.axios.get(route('chat.private.messages', selectedPrivateChat.id));
            if (response.data.success) {
                // Ensure serverMessages is always an array
                const serverMessages = Array.isArray(response.data.messages) ? response.data.messages : [];
                // Merge with optimistic messages (keep optimistic messages that haven't been confirmed yet)
                setPrivateMessages(prev => {
                    const currentMessages = Array.isArray(prev) ? prev : [];
                    const optimisticMessages = currentMessages.filter(m => m.is_optimistic);
                    // Remove optimistic messages that are now confirmed by server (by checking if message text matches)
                    const confirmedOptimistic = optimisticMessages.filter(optMsg => 
                        !serverMessages.some(srvMsg => 
                            srvMsg.message === optMsg.message && 
                            srvMsg.sender_id === optMsg.sender_id &&
                            Math.abs(new Date(srvMsg.created_at) - new Date(optMsg.created_at)) < 5000
                        )
                    );
                    // Combine server messages with unconfirmed optimistic messages
                    return [...serverMessages, ...confirmedOptimistic];
                });
            }
        } catch (error) {
            console.error('Failed to load private messages:', error);
        } finally {
            setIsLoadingMessages(false);
            isLoadingRef.current = false;
        }
    };

    const handleSendGroupMessage = async (e) => {
        e.preventDefault();
        if (!message.trim() || !selectedGroup?.id || isLoading) return; // Prevent double submission

        setIsLoading(true);
        const messageText = message.trim();
        setMessage(''); // Clear immediately to prevent double send

        // Optimistic update - add message immediately to UI
        const optimisticMessage = {
            id: `temp-${Date.now()}`,
            sender_id: currentUser?.id,
            sender_name: currentUser?.name || 'Anda',
            sender_email: currentUser?.email,
            message: messageText,
            message_type: 'text',
            created_at: new Date().toISOString(),
            is_read: false,
            is_optimistic: true, // Mark as optimistic
        };
        setGroupMessages(prev => {
            const current = Array.isArray(prev) ? prev : [];
            return [...current, optimisticMessage];
        });

        try {
            const response = await window.axios.post(route('chat.group.send', selectedGroup.id), {
                message: messageText,
            });
            
            // Reload messages immediately to get the real message from server
            // This will replace the optimistic message with the real one
            // Use a shorter delay to ensure message appears quickly
            setTimeout(() => {
                loadGroupMessages();
            }, 300);
        } catch (error) {
            console.error('Failed to send message:', error);
            // Remove optimistic message on error
            setGroupMessages(prev => {
                const current = Array.isArray(prev) ? prev : [];
                return current.filter(m => !m.is_optimistic || m.message !== messageText);
            });
            setMessage(messageText); // Restore message on error
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendPrivateMessage = async (e) => {
        e.preventDefault();
        if (!message.trim() || !selectedPrivateChat?.id || isLoading) return; // Prevent double submission

        setIsLoading(true);
        const messageText = message.trim();
        setMessage(''); // Clear immediately to prevent double send

        // Optimistic update - add message immediately to UI
        const optimisticMessage = {
            id: `temp-${Date.now()}`,
            sender_id: currentUser?.id,
            sender_name: currentUser?.name || 'Anda',
            sender_email: currentUser?.email,
            message: messageText,
            message_type: 'text',
            created_at: new Date().toISOString(),
            is_read: false,
            is_optimistic: true, // Mark as optimistic
        };
        setPrivateMessages(prev => [...prev, optimisticMessage]);

        try {
            const response = await window.axios.post(route('chat.private.send', selectedPrivateChat.id), {
                message: messageText,
            });
            
            // Reload messages immediately to get the real message from server
            // This will replace the optimistic message with the real one
            setTimeout(() => {
                loadPrivateMessages();
            }, 500);
        } catch (error) {
            console.error('Failed to send message:', error);
            // Remove optimistic message on error
            setPrivateMessages(prev => prev.filter(m => !m.is_optimistic));
            setMessage(messageText); // Restore message on error
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartPrivateChat = async (userId, userEmail, userName) => {
        try {
            const response = await window.axios.post(route('chat.private.get-or-create'), {
                user_id: userId,
                email: userEmail,
            });
            
            if (response.data.success) {
                const chatId = response.data.chat_id;
                const existingChat = privateChats?.find(pc => pc.id === chatId);
                if (existingChat) {
                    setSelectedPrivateChat(existingChat);
                } else {
                    setSelectedPrivateChat({
                        id: chatId,
                        other_user: response.data.other_user,
                    });
                }
                setActiveTab('private');
                setShowNewChatModal(false);
                setUserSearchQuery('');
                setAvailableUsers([]);
            }
        } catch (error) {
            console.error('Failed to start private chat:', error);
        }
    };

    // Load available users for new chat
    const loadAvailableUsers = async () => {
        if (!userSearchQuery.trim()) {
            setAvailableUsers([]);
            return;
        }

        setIsLoadingUsers(true);
        try {
            const response = await window.axios.get(route('chat.available-users'), {
                params: {
                    search: userSearchQuery,
                }
            });
            
            if (response.data.success) {
                setAvailableUsers(response.data.users || []);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            setAvailableUsers([]);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    // Debounce user search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (showNewChatModal) {
                loadAvailableUsers();
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [userSearchQuery, showNewChatModal]);

    // Close menu when clicking outside or when chat changes
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowChatMenu(false);
            }
        };

        if (showChatMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showChatMenu]);

    // Close menu when chat changes
    useEffect(() => {
        setShowChatMenu(false);
    }, [selectedPrivateChat, selectedGroup]);

    const currentMessages = activeTab === 'group' ? groupMessages : privateMessages;
    const currentChat = activeTab === 'group' ? selectedGroup : selectedPrivateChat;

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Filter chats based on debounced search, excluding default group to prevent duplication
    const filteredGroups = userGroups?.filter(group => 
        group.id !== defaultGroup?.id && // Exclude default group
        (group.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        group.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
    ) || [];

    const filteredPrivateChats = privateChats?.filter(chat => 
        chat.other_user?.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        chat.other_user?.email?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        chat.last_message?.message?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    ) || [];

    return (
        <AuthenticatedLayout>
            <Head title="MOV Center - Chat" />
            <AnimatedBackground />
            
            <div className="min-h-screen py-4 md:py-6 px-2 sm:px-4 lg:px-6 relative">
                <div className="max-w-7xl mx-auto">
                    {/* Modern Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 md:mb-6"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3 md:gap-4">
                                <motion.div
                                    whileHover={{ scale: 1.05, rotate: 5 }}
                                    className="relative"
                                >
                                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                                        <MessageCircle className="w-6 h-6 md:w-7 md:h-7 text-white" />
                                    </div>
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"
                                    />
                                </motion.div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                        MOV Center
                                    </h1>
                                    <p className="text-xs md:text-sm text-gray-600 font-medium">
                                        {activeTab === 'group' ? 'Grup Diskusi' : 'Pesan Pribadi'}
                                    </p>
                                </div>
                            </div>
                            <Badge className="hidden md:flex items-center gap-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 shadow-lg">
                                <Sparkles className="w-3 h-3" />
                                {isPetani ? 'Petani' : 'K-Petani'}
                            </Badge>
                        </div>
                    </motion.div>

                    {/* Main Chat Container - Modern Design */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
                        {/* Sidebar - Chat List - Glassmorphism */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="lg:col-span-4 space-y-3 md:space-y-4"
                        >
                            {/* Tabs - Modern Design */}
                            <div className="flex gap-2 p-1 bg-white/80 backdrop-blur-lg rounded-xl shadow-lg border border-gray-200/50">
                                <button
                                    onClick={() => setActiveTab('group')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                                        activeTab === 'group'
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <Users className="w-4 h-4" />
                                    <span className="hidden sm:inline">Grup</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('private')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                                        activeTab === 'private'
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <User className="w-4 h-4" />
                                    <span className="hidden sm:inline">Pribadi</span>
                                </button>
                            </div>

                            {/* New Chat Button */}
                            {activeTab === 'private' && (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowNewChatModal(true)}
                                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Chat Baru</span>
                                </motion.button>
                            )}

                            {/* Search - Modern */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Cari chat..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-11 pr-4 py-2.5 bg-white/90 backdrop-blur-lg border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>

                            {/* Chat List - Glassmorphism Card */}
                            <Card className="p-0 overflow-hidden bg-white/80 backdrop-blur-xl border-gray-200/50 shadow-xl rounded-2xl">
                                <div className="overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
                                    {activeTab === 'group' ? (
                                        <div>
                                            {/* Default Group */}
                                            <motion.div
                                                whileHover={{ x: 4 }}
                                                onClick={() => setSelectedGroup(defaultGroup)}
                                                className={`p-4 cursor-pointer border-b border-gray-100 transition-all ${
                                                    selectedGroup?.id === defaultGroup?.id 
                                                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-500' 
                                                        : 'hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md">
                                                        <Users className="w-6 h-6 text-white" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm text-gray-900 truncate">
                                                            {defaultGroup?.name || 'Grup MOV Center'}
                                                        </p>
                                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                                            {defaultGroup?.description || 'Grup diskusi umum'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>

                                            {/* Other Groups */}
                                            {filteredGroups.map((group) => (
                                                <motion.div
                                                    key={group.id}
                                                    whileHover={{ x: 4 }}
                                                    onClick={() => setSelectedGroup(group)}
                                                    className={`p-4 cursor-pointer border-b border-gray-100 transition-all ${
                                                        selectedGroup?.id === group.id 
                                                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-500' 
                                                            : 'hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-md">
                                                            <Users className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-sm text-gray-900 truncate">
                                                                {group.name}
                                                            </p>
                                                            <p className="text-xs text-gray-500 truncate mt-0.5">
                                                                {group.description || 'Grup chat'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div>
                                            {filteredPrivateChats.length > 0 ? (
                                                filteredPrivateChats.map((chat) => (
                                                    <motion.div
                                                        key={chat.id}
                                                        whileHover={{ x: 4 }}
                                                        onClick={() => setSelectedPrivateChat(chat)}
                                                        className={`p-4 cursor-pointer border-b border-gray-100 transition-all ${
                                                            selectedPrivateChat?.id === chat.id 
                                                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-500' 
                                                                : 'hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-md">
                                                                <User className="w-6 h-6 text-white" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-sm text-gray-900 truncate">
                                                                    {chat.other_user?.name || 'User'}
                                                                </p>
                                                                {chat.last_message && (
                                                                    <p className="text-xs text-gray-500 truncate mt-0.5">
                                                                        {chat.last_message.message}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center">
                                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-3">
                                                        <User className="w-8 h-8 text-gray-400" />
                                                    </div>
                                                    <p className="text-sm text-gray-500 mb-4 font-medium">
                                                        Belum ada chat pribadi
                                                    </p>
                                                    <Button
                                                        onClick={() => setShowNewChatModal(true)}
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-green-500 text-green-600 hover:bg-green-50"
                                                    >
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Mulai Chat Baru
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>

                        {/* Main Chat Area - Modern WhatsApp-like Design */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="lg:col-span-8"
                        >
                            {currentChat ? (
                                <Card className="p-0 overflow-hidden bg-gradient-to-br from-[#e5ddd5] via-[#e5ddd5] to-[#d4c5b7] rounded-2xl shadow-2xl border-0 h-[calc(100vh-200px)] flex flex-col">
                                    {/* Chat Header - Modern */}
                                    <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white p-4 md:p-5 shadow-lg">
                                        <div className="flex items-center gap-3 md:gap-4">
                                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-white/20 backdrop-blur-lg flex items-center justify-center flex-shrink-0 shadow-md">
                                                {activeTab === 'group' ? (
                                                    <Users className="w-6 h-6 md:w-7 md:h-7 text-white" />
                                                ) : (
                                                    <User className="w-6 h-6 md:w-7 md:h-7 text-white" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-base md:text-lg truncate">
                                                    {activeTab === 'group' 
                                                        ? (currentChat.name || 'Grup MOV Center')
                                                        : (currentChat.other_user?.name || 'User')
                                                    }
                                                </p>
                                                {activeTab === 'group' && currentChat.description && (
                                                    <p className="text-xs md:text-sm text-white/90 truncate mt-0.5">
                                                        {currentChat.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="relative" ref={menuRef}>
                                                <button 
                                                    onClick={() => setShowChatMenu(!showChatMenu)}
                                                    className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                                                >
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>
                                                
                                                {showChatMenu && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                        className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50"
                                                    >
                                                        {activeTab === 'private' && selectedPrivateChat && (
                                                            <button
                                                                onClick={() => {
                                                                    setShowChatMenu(false);
                                                                    if (confirm('Apakah Anda yakin ingin menghapus chat ini?')) {
                                                                        handleDeleteChat(selectedPrivateChat.id);
                                                                    }
                                                                }}
                                                                className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Hapus Chat
                                                            </button>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Messages - WhatsApp Style */}
                                    <div 
                                        ref={messagesContainerRef}
                                        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 custom-scrollbar"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4d4d4' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                                        }}
                                    >
                                        {isLoadingMessages && currentMessages.length === 0 ? (
                                            // Loading skeleton
                                            <div className="space-y-3">
                                                {[...Array(5)].map((_, i) => (
                                                    <motion.div
                                                        key={i}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: i * 0.1 }}
                                                        className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'} items-end gap-2`}
                                                    >
                                                        {i % 2 === 0 && (
                                                            <div className="w-8 h-8 rounded-full bg-gray-300 animate-pulse" />
                                                        )}
                                                        <div className={`max-w-[75%] md:max-w-[65%] px-4 py-3 rounded-2xl ${
                                                            i % 2 === 0 
                                                                ? 'bg-white rounded-bl-sm' 
                                                                : 'bg-gradient-to-br from-green-500 to-emerald-600 rounded-br-sm'
                                                        } animate-pulse`}>
                                                            <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                                                            <div className="h-3 bg-gray-200 rounded w-20" />
                                                        </div>
                                                        {i % 2 !== 0 && (
                                                            <div className="w-8 h-8 rounded-full bg-gray-300 animate-pulse" />
                                                        )}
                                                    </motion.div>
                                                ))}
                                            </div>
                                        ) : (
                                            <AnimatePresence>
                                                {currentMessages && currentMessages.length > 0 ? currentMessages.map((msg) => {
                                                const isMe = currentUser && (
                                                    (msg.sender_id && msg.sender_id === currentUser.id) || 
                                                    (msg.sender_email && msg.sender_email === currentUser.email)
                                                );
                                                
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
                                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md">
                                                                <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                                            </div>
                                                        )}
                                                        <div className={`max-w-[75%] md:max-w-[65%] px-4 py-2.5 rounded-2xl shadow-md ${
                                                            isMe
                                                                ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-br-sm'
                                                                : 'bg-white text-gray-900 rounded-bl-sm'
                                                        }`}>
                                                            {!isMe && (
                                                                <p className="text-xs font-bold mb-1 text-gray-700">
                                                                    {msg.sender_name || 'User'}
                                                                </p>
                                                            )}
                                                            <p className={`text-sm md:text-base ${isMe ? 'text-white' : 'text-gray-900'} leading-relaxed`}>
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
                                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md">
                                                                <User className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                );
                                            }) : (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="text-center py-12"
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
                                                        className="w-20 h-20 rounded-full bg-white/50 backdrop-blur-lg flex items-center justify-center mx-auto mb-4 shadow-lg"
                                                    >
                                                        <MessageCircle className="w-10 h-10 text-gray-400" />
                                                    </motion.div>
                                                    <p className="text-gray-600 font-medium text-lg mb-1">Belum ada pesan</p>
                                                    <p className="text-sm text-gray-500">Mulai percakapan sekarang!</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>

                                    {/* Input - Modern */}
                                    <form 
                                        onSubmit={activeTab === 'group' ? handleSendGroupMessage : handleSendPrivateMessage}
                                        className="bg-white/95 backdrop-blur-lg p-3 md:p-4 border-t border-gray-200"
                                    >
                                        <div className="flex gap-2 md:gap-3">
                                            <Input
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                placeholder="Ketik pesan..."
                                                disabled={isLoading}
                                                className="flex-1 py-2.5 md:py-3 px-4 rounded-xl border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        if (activeTab === 'group') {
                                                            handleSendGroupMessage(e);
                                                        } else {
                                                            handleSendPrivateMessage(e);
                                                        }
                                                    }
                                                }}
                                            />
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                type="submit"
                                                disabled={!message.trim() || isLoading}
                                                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white p-2.5 md:p-3 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                <Send className="w-5 h-5" />
                                            </motion.button>
                                        </div>
                                    </form>
                                </Card>
                            ) : (
                                <Card className="p-12 md:p-16 text-center bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border-gray-200/50 h-[calc(100vh-200px)] flex items-center justify-center">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                    >
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mx-auto mb-6 shadow-lg">
                                            <MessageCircle className="w-12 h-12 text-green-600" />
                                        </div>
                                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                                            {activeTab === 'group' 
                                                ? 'Pilih Grup untuk Mulai Chat'
                                                : 'Pilih Chat Pribadi atau Mulai Chat Baru'
                                            }
                                        </h3>
                                        <p className="text-gray-600 font-medium">
                                            Pilih dari daftar di sebelah kiri untuk memulai percakapan
                                        </p>
                                    </motion.div>
                                </Card>
                            )}
                        </motion.div>
                    </div>

                    {/* New Chat Modal - Enhanced */}
                    <AnimatePresence>
                        {showNewChatModal && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                                onClick={() => {
                                    setShowNewChatModal(false);
                                    setUserSearchQuery('');
                                    setAvailableUsers([]);
                                }}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden border border-gray-200"
                                >
                                    {/* Header */}
                                    <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-green-500 to-emerald-600">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xl font-bold text-white">Mulai Chat Baru</h3>
                                            <button
                                                onClick={() => {
                                                    setShowNewChatModal(false);
                                                    setUserSearchQuery('');
                                                    setAvailableUsers([]);
                                                }}
                                                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                                            >
                                                <X className="w-5 h-5 text-white" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Search */}
                                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                            <Input
                                                type="text"
                                                placeholder="Cari nama atau email..."
                                                value={userSearchQuery}
                                                onChange={(e) => setUserSearchQuery(e.target.value)}
                                                className="pl-12 pr-4 py-3 bg-white rounded-xl border-gray-300 focus:ring-2 focus:ring-green-500"
                                            />
                                        </div>
                                    </div>

                                    {/* User List */}
                                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                        {isLoadingUsers ? (
                                            <div className="text-center py-12">
                                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent mx-auto mb-4"></div>
                                                <p className="text-sm text-gray-500 font-medium">Mencari...</p>
                                            </div>
                                        ) : availableUsers.length > 0 ? (
                                            <div className="space-y-2">
                                                {availableUsers.map((user) => (
                                                    <motion.div
                                                        key={user.id}
                                                        whileHover={{ scale: 1.02, x: 4 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        onClick={() => handleStartPrivateChat(user.id, user.email, user.name)}
                                                        className="p-4 rounded-xl hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 cursor-pointer transition-all border border-gray-200 hover:border-green-300 hover:shadow-md"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md">
                                                                <User className="w-6 h-6 text-white" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-bold text-sm text-gray-900 truncate">
                                                                    {user.name}
                                                                </p>
                                                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                                                    {user.email}
                                                                </p>
                                                                {user.role && (
                                                                    <Badge className="mt-2 text-xs bg-green-100 text-green-700 border-green-300">
                                                                        {user.role === 'k-petani' ? 'K-Petani' : user.role === 'petani' ? 'Petani' : user.role}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        ) : userSearchQuery.trim() ? (
                                            <div className="text-center py-12">
                                                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                                    <User className="w-8 h-8 text-gray-400" />
                                                </div>
                                                <p className="text-sm text-gray-500 font-medium">
                                                    Tidak ada user ditemukan
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12">
                                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mx-auto mb-4">
                                                    <Search className="w-8 h-8 text-green-600" />
                                                </div>
                                                <p className="text-sm text-gray-500 font-medium">
                                                    Ketik nama atau email untuk mencari user
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Chat Notification Toast */}
            <ChatNotificationToast
                notification={latestChatNotification}
                onClose={clearChatNotification}
                onClick={() => {
                    if (latestChatNotification?.data?.chat_id) {
                        if (latestChatNotification.data.is_group) {
                            setActiveTab('group');
                            setSelectedGroup({ id: latestChatNotification.data.chat_id });
                        } else {
                            setActiveTab('private');
                            // Find and select the private chat
                            const chat = privateChats.find(c => c.id === latestChatNotification.data.chat_id);
                            if (chat) {
                                setSelectedPrivateChat(chat);
                            }
                        }
                    }
                }}
            />
        </AuthenticatedLayout>
    );
}
