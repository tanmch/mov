import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Textarea } from '@/Components/ui/textarea';
import { 
    MessageCircle, Send, Clock, CheckCircle2, User, Mail, 
    Search, ArrowLeft, Save, XCircle, RefreshCw, X
} from 'lucide-react';
import { router, useForm, usePage } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';

export default function ChatRoom({ questions: questionsProp = [] }) {
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [questions, setQuestions] = useState(questionsProp || []);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const chatEndRef = useRef(null);
    const { flash } = usePage().props;

    const answerForm = useForm({
        answer: '',
        status: 'answered', // Default to 'answered' when CS replies
    });
    
    // State for new chat notifications
    const [newChatNotification, setNewChatNotification] = useState(null);
    const previousQuestionsCount = useRef(questions.length);

    // Filter questions
    const filteredQuestions = questions.filter(q => {
        const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
        const matchesSearch = !searchQuery || 
            q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (q.user_name && q.user_name.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesStatus && matchesSearch;
    });

    // Sort: pending first, then by date
    const sortedQuestions = [...filteredQuestions].sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.created_at) - new Date(a.created_at);
    });

    // Manual refresh function
    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['questions'],
            preserveScroll: true,
            onFinish: () => {
                setIsRefreshing(false);
            },
        });
    };

    // Update questions when prop changes
    useEffect(() => {
        setQuestions(questionsProp || []);
    }, [questionsProp]);

    // Select first pending question on load or when questions change
    useEffect(() => {
        const filtered = questions.filter(q => {
            const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
            const matchesSearch = !searchQuery || 
                q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (q.user_name && q.user_name.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesStatus && matchesSearch;
        });

        const sorted = [...filtered].sort((a, b) => {
            if (a.status === 'pending' && b.status !== 'pending') return -1;
            if (a.status !== 'pending' && b.status === 'pending') return 1;
            return new Date(b.created_at) - new Date(a.created_at);
        });

        if (sorted.length > 0) {
            // If no question selected or selected question is not in the list anymore
            if (!selectedQuestion || !sorted.find(q => q.id === selectedQuestion.id)) {
                const firstPending = sorted.find(q => q.status === 'pending');
                if (firstPending) {
                    setSelectedQuestion(firstPending);
                    answerForm.setData('status', firstPending.status || 'answered');
                    // Keep answer field empty for new message
                } else {
                    setSelectedQuestion(sorted[0]);
                    answerForm.setData('status', sorted[0].status || 'answered');
                    // Keep answer field empty for new message
                }
            }
        }
    }, [questions, filterStatus, searchQuery]);

    // Update form status when question changes (but keep answer field empty for new message)
    useEffect(() => {
        if (selectedQuestion) {
            // Only update status, keep answer field empty so CS can type new message
            answerForm.setData('status', selectedQuestion.status || 'answered');
            // Don't set answer field - it should remain empty for new messages
        }
    }, [selectedQuestion]);

    // Auto scroll to bottom
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedQuestion, answerForm.data.answer]);

    const handleSubmitAnswer = (e) => {
        e.preventDefault();
        if (!selectedQuestion) return;
        if (!answerForm.data.answer.trim()) return; // Don't submit empty answers

        const answerText = answerForm.data.answer.trim();
        
        answerForm.put(route('questions.update', selectedQuestion.id), {
            preserveScroll: true,
            onSuccess: (page) => {
                // Clear input field immediately after successful send
                answerForm.setData('answer', '');
                
                // Update local state - append new answer to existing answer
                const separator = "\n\n---\n";
                const timestampedAnswer = `[Jawaban CS: ${new Date().toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}]\n${answerText}`;
                const newAnswer = selectedQuestion.answer 
                    ? selectedQuestion.answer + separator + timestampedAnswer
                    : timestampedAnswer;
                
                // Always set status to 'answered' when CS replies (unless explicitly set to 'pending' or 'closed')
                const finalStatus = answerForm.data.status === 'pending' || answerForm.data.status === 'closed' 
                    ? answerForm.data.status 
                    : 'answered';
                
                const updatedQuestion = {
                    ...selectedQuestion,
                    answer: newAnswer,
                    status: finalStatus, // Auto set to 'answered' when CS replies
                    // Only set answered_at if status is not 'pending'
                    answered_at: finalStatus !== 'pending' ? new Date().toISOString() : null,
                    read_at: null, // Reset read_at when CS sends new answer
                };
                
                setQuestions(prev => prev.map(q => 
                    q.id === selectedQuestion.id ? updatedQuestion : q
                ));
                
                // Update selected question
                setSelectedQuestion(updatedQuestion);
                
                // Auto scroll to bottom
                setTimeout(() => {
                    if (chatEndRef.current) {
                        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 100);
                
                // Polling will handle refresh automatically, no need to reload here
            },
            onError: () => {
                // On error, keep the input so user can retry
            },
        });
    };

    // Handle Enter key to submit (Shift+Enter for new line)
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmitAnswer(e);
        }
    };

    // Real-time polling for new questions (every 1.5 seconds) - silent reload without loading indicator
    useEffect(() => {
        let intervalId = null;
        let isPolling = false;
        
        const pollQuestions = () => {
            // Prevent multiple simultaneous requests
            if (isPolling) {
                return;
            }
            
            isPolling = true;
            
            // Silent reload without showing loading indicator
            router.reload({
                only: ['questions'],
                preserveScroll: true,
                preserveState: true,
                onSuccess: (page) => {
                    // Check for new questions
                    const newQuestions = page.props.questions || [];
                    const currentPendingCount = newQuestions.filter(q => q.status === 'pending').length;
                    const previousPendingCount = questions.filter(q => q.status === 'pending').length;
                    
                    // Show notification if new pending chat arrives
                    if (currentPendingCount > previousPendingCount) {
                        const newPendingQuestions = newQuestions.filter(q => 
                            q.status === 'pending' && 
                            !questions.some(oldQ => oldQ.id === q.id)
                        );
                        
                        if (newPendingQuestions.length > 0) {
                            const newQuestion = newPendingQuestions[0];
                            setNewChatNotification({
                                id: Date.now(),
                                message: `Chat baru dari ${newQuestion.user_name || 'Guest'}`,
                                user: newQuestion.user_name || 'Guest',
                                questionId: newQuestion.id,
                            });
                            
                            // Auto-hide after 5 seconds
                            setTimeout(() => {
                                setNewChatNotification(null);
                            }, 5000);
                        }
                    }
                    
                    isPolling = false;
                },
                onFinish: () => {
                    // Update questions state after successful reload
                    if (page.props.questions) {
                        setQuestions(page.props.questions);
                    }
                    
                    isPolling = false;
                },
                onError: () => {
                    isPolling = false;
                },
            });
        };
        
        // Start polling immediately, then every 1.5 seconds
        pollQuestions();
        intervalId = setInterval(pollQuestions, 1500);

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, []);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
            case 'answered':
                return <Badge className="bg-green-100 text-green-700 border-green-300 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Terjawab</Badge>;
            case 'closed':
                return <Badge className="bg-gray-100 text-gray-700 border-gray-300 text-xs"><XCircle className="w-3 h-3 mr-1" />Ditutup</Badge>;
            default:
                return null;
        }
    };

    const pendingCount = questions.filter(q => q.status === 'pending').length;

    return (
        <>
            {/* New Chat Notification Toast */}
            {newChatNotification && (
                <motion.div
                    initial={{ opacity: 0, y: -50, x: 0 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    className="fixed top-4 right-4 z-[9999] max-w-md"
                >
                    <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="bg-gradient-to-br from-green-500 to-emerald-600 text-white p-4 rounded-2xl shadow-2xl border-2 border-white/20 cursor-pointer"
                        onClick={() => {
                            // Select the new question
                            const newQuestion = questions.find(q => q.id === newChatNotification.questionId);
                            if (!newQuestion) {
                                // If not found in current state, reload questions
                                router.reload({
                                    only: ['questions'],
                                    preserveScroll: true,
                                    onSuccess: (page) => {
                                        const updatedQuestions = page.props.questions || [];
                                        setQuestions(updatedQuestions);
                                        const foundQuestion = updatedQuestions.find(q => q.id === newChatNotification.questionId);
                                        if (foundQuestion) {
                                            setSelectedQuestion(foundQuestion);
                                            setNewChatNotification(null);
                                        }
                                    },
                                });
                            } else {
                                setSelectedQuestion(newQuestion);
                                setNewChatNotification(null);
                            }
                        }}
                    >
                        <div className="flex items-start gap-3">
                            <motion.div
                                animate={{ 
                                    scale: [1, 1.2, 1],
                                    rotate: [0, 10, -10, 0]
                                }}
                                transition={{ duration: 1, repeat: Infinity }}
                                className="text-2xl flex-shrink-0"
                            >
                                💬
                            </motion.div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold mb-1">Chat Baru Masuk!</p>
                                <p className="text-xs text-white/90">{newChatNotification.message}</p>
                                <p className="text-xs text-white/70 mt-1">Klik untuk membuka chat</p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setNewChatNotification(null);
                                }}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Left Sidebar - Questions List */}
            <div className="lg:col-span-1 flex flex-col border-r border-gray-200 pr-4">
                {/* Header */}
                <div className="mb-4">
                    <div className="mb-3">
                        {/* Logo MOV dengan Mangga Headphone */}
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="relative"
                        >
                            <img 
                                src="/mov-logo.png" 
                                alt="MOV Logo" 
                                className="h-10 w-auto object-contain drop-shadow-lg"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    const fallback = e.target.nextElementSibling;
                                    if (fallback) fallback.style.display = 'block';
                                }}
                            />
                            <div style={{ display: 'none' }}>
                                <ApplicationLogo showText={true} className="h-10" />
                            </div>
                        </motion.div>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-heading text-gray-900">Chat Room</h3>
                        <div className="flex items-center gap-2">
                            {pendingCount > 0 && (
                                <Badge className="bg-red-500 text-white">
                                    {pendingCount} Pending
                                </Badge>
                            )}
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
                    </div>
                    
                    {/* Search */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Cari chat..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 text-sm font-body"
                        />
                    </div>

                    {/* Filter */}
                    <div className="flex gap-2">
                        <Button
                            variant={filterStatus === 'all' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterStatus('all')}
                            className="text-xs font-body"
                        >
                            Semua
                        </Button>
                        <Button
                            variant={filterStatus === 'pending' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterStatus('pending')}
                            className="text-xs font-body"
                        >
                            Pending
                        </Button>
                        <Button
                            variant={filterStatus === 'answered' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFilterStatus('answered')}
                            className="text-xs font-body"
                        >
                            Terjawab
                        </Button>
                    </div>
                </div>

                {/* Questions List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {sortedQuestions.length === 0 ? (
                        <Card className="p-6 text-center">
                            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 font-body">
                                Tidak ada chat
                            </p>
                        </Card>
                    ) : (
                        sortedQuestions.map((question) => (
                            <motion.div
                                key={question.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                whileHover={{ scale: 1.02 }}
                                onClick={() => {
                                    setSelectedQuestion(question);
                                    answerForm.setData('status', question.status || 'answered');
                                    // Keep answer field empty for new message
                                }}
                            >
                                <Card 
                                    className={`p-4 cursor-pointer transition-all ${
                                        selectedQuestion?.id === question.id
                                            ? 'border-2 border-green-500 bg-green-50'
                                            : question.status === 'pending'
                                            ? 'border-2 border-yellow-300 hover:border-yellow-400'
                                            : 'border-2 border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-heading text-gray-900 truncate">
                                                {question.user_name || 'Guest'}
                                            </p>
                                            <p className="text-xs text-gray-500 font-body truncate">
                                                {question.user_email || ''}
                                            </p>
                                        </div>
                                        {getStatusBadge(question.status)}
                                    </div>
                                    <p className="text-xs text-gray-600 font-body line-clamp-2 mb-2">
                                        {question.question}
                                    </p>
                                    <div className="flex items-center justify-between text-xs text-gray-400 font-body">
                                        <span>
                                            {new Date(question.created_at).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                        {question.status === 'pending' && (
                                            <Badge className="bg-red-500 text-white text-xs px-2 py-0.5">
                                                Baru
                                            </Badge>
                                        )}
                                    </div>
                                </Card>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Side - Chat View */}
            <div className="lg:col-span-2 flex flex-col">
                {selectedQuestion ? (
                    <>
                        {/* Chat Header - WhatsApp Style */}
                        <Card className="p-4 mb-4 bg-green-600 text-white border-0 shadow-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                                        <User className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-heading text-white text-lg">
                                                {selectedQuestion.user_name || 'Guest'}
                                            </p>
                                            {getStatusBadge(selectedQuestion.status)}
                                        </div>
                                        {selectedQuestion.user_email && (
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-3 h-3 text-white/80" />
                                                <p className="text-xs text-white/80 font-body">
                                                    {selectedQuestion.user_email}
                                                </p>
                                            </div>
                                        )}
                                        <p className="text-xs text-white/70 font-body mt-1">
                                            {new Date(selectedQuestion.created_at).toLocaleDateString('id-ID', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Chat Messages - Modern Chat Style */}
                        <Card className="flex-1 flex flex-col mb-4 p-0 overflow-hidden bg-[#e5ddd5] bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23d4d4d4%22 fill-opacity=%220.4%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] rounded-2xl">
                            <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                                {(() => {
                                    // Parse all messages and create a unified timeline
                                    const allMessages = [];
                                    
                                    // Parse customer messages
                                    const customerMessages = selectedQuestion.question.split(/\n\n---\n/).filter(msg => msg.trim());
                                    customerMessages.forEach((msg, idx) => {
                                        const timestampMatch = msg.match(/\[Pertanyaan baru: (\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2})\]/);
                                        let messageText = msg.trim();
                                        let messageDate = selectedQuestion.created_at;
                                        let messageTime = new Date(selectedQuestion.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                                        
                                        if (timestampMatch) {
                                            const [, dateStr, timeStr] = timestampMatch;
                                            messageText = msg.replace(/\[Pertanyaan baru: \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}\]\n?/, '').trim();
                                            // Parse date: DD/MM/YYYY HH:MM
                                            const [day, month, year] = dateStr.split('/');
                                            const [hour, minute] = timeStr.split(':');
                                            messageDate = new Date(year, month - 1, day, hour, minute).toISOString();
                                            messageTime = timeStr;
                                        }
                                        
                                        allMessages.push({
                                            id: `customer-${idx}`,
                                            from: 'customer',
                                            text: messageText,
                                            time: messageTime,
                                            date: messageDate,
                                            timestamp: new Date(messageDate).getTime(),
                                        });
                                    });
                                    
                                    // Parse CS messages
                                    if (selectedQuestion.answer) {
                                        const csMessages = selectedQuestion.answer.split(/\n\n---\n/).filter(msg => msg.trim());
                                        csMessages.forEach((msg, idx) => {
                                            const timestampMatch = msg.match(/\[Jawaban CS: (\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2})\]/);
                                            let messageText = msg.trim();
                                            let messageDate = selectedQuestion.answered_at || new Date().toISOString();
                                            let messageTime = selectedQuestion.answered_at 
                                                ? new Date(selectedQuestion.answered_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                                : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                                            
                                            if (timestampMatch) {
                                                const [, dateStr, timeStr] = timestampMatch;
                                                messageText = msg.replace(/\[Jawaban CS: \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}\]\n?/, '').trim();
                                                // Parse date: DD/MM/YYYY HH:MM
                                                const [day, month, year] = dateStr.split('/');
                                                const [hour, minute] = timeStr.split(':');
                                                messageDate = new Date(year, month - 1, day, hour, minute).toISOString();
                                                messageTime = timeStr;
                                            }
                                            
                                            allMessages.push({
                                                id: `cs-${idx}`,
                                                from: 'cs',
                                                text: messageText,
                                                time: messageTime,
                                                date: messageDate,
                                                timestamp: new Date(messageDate).getTime(),
                                                isLast: idx === csMessages.length - 1,
                                            });
                                        });
                                    }
                                    
                                    // Sort by timestamp
                                    allMessages.sort((a, b) => a.timestamp - b.timestamp);
                                    
                                    // Group messages and add date separators
                                    const groupedMessages = [];
                                    let currentDate = null;
                                    
                                    allMessages.forEach((msg, idx) => {
                                        const msgDate = new Date(msg.date);
                                        const dateStr = msgDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                                        
                                        // Add date separator if date changed
                                        if (currentDate !== dateStr) {
                                            currentDate = dateStr;
                                            groupedMessages.push({
                                                type: 'date-separator',
                                                date: dateStr,
                                                id: `date-${dateStr}`,
                                            });
                                        }
                                        
                                        // Check if should show avatar (first message of group or different sender)
                                        const prevMsg = idx > 0 ? allMessages[idx - 1] : null;
                                        const showAvatar = !prevMsg || 
                                            prevMsg.from !== msg.from || 
                                            (msg.timestamp - prevMsg.timestamp) > 300000; // 5 minutes
                                        
                                        groupedMessages.push({
                                            ...msg,
                                            showAvatar,
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
                                        
                                        const isCustomer = item.from === 'customer';
                                        const prevItem = idx > 0 ? groupedMessages[idx - 1] : null;
                                        const isConsecutive = prevItem && 
                                            prevItem.from === item.from && 
                                            !prevItem.type &&
                                            (item.timestamp - prevItem.timestamp) < 300000; // 5 minutes
                                        
                                        return (
                                            <div 
                                                key={item.id} 
                                                className={`flex ${isCustomer ? 'justify-start' : 'justify-end'} items-end gap-2 ${isConsecutive ? 'mt-0.5' : 'mt-2'}`}
                                            >
                                                {/* Avatar - only show for first message in group */}
                                                {item.showAvatar && (
                                                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mb-1">
                                                        <User className="w-4 h-4 text-white" />
                                                    </div>
                                                )}
                                                {!item.showAvatar && <div className="w-8 h-8 flex-shrink-0" />}
                                                
                                                <motion.div
                                                    whileHover={{ scale: 1.01 }}
                                                    className={`max-w-[75%] md:max-w-[65%] ${
                                                        isCustomer
                                                            ? 'bg-white rounded-2xl rounded-bl-sm shadow-sm'
                                                            : 'bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-2xl rounded-br-sm shadow-sm'
                                                    } px-3 py-2`}
                                                >
                                                    <p className={`text-sm leading-relaxed font-body whitespace-pre-wrap break-words ${
                                                        isCustomer ? 'text-gray-900' : 'text-white'
                                                    }`}>
                                                        {item.text}
                                                    </p>
                                                    <div className={`flex items-center justify-end gap-1 mt-1 ${
                                                        isCustomer ? 'text-gray-500' : 'text-white/80'
                                                    }`}>
                                                        <span className="text-[11px]">{item.time}</span>
                                                        {/* Checkmarks only for CS messages and only on last message */}
                                                        {!isCustomer && item.isLast && (
                                                            <div className="flex items-center ml-1">
                                                                {selectedQuestion.read_at ? (
                                                                    <svg className="w-4 h-4 text-blue-300" fill="currentColor" viewBox="0 0 16 15">
                                                                        <path d="M15.854.854a.5.5 0 0 0-.708-.708L7.707 7.293 4.854 4.44a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l8-8Z"/>
                                                                        <path d="M0 14.5V16h1.5l9-9L9 5.5 0 14.5Z"/>
                                                                    </svg>
                                                                ) : selectedQuestion.answered_at ? (
                                                                    <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 16 15">
                                                                        <path d="M15.854.854a.5.5 0 0 0-.708-.708L7.707 7.293 4.854 4.44a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l8-8Z"/>
                                                                        <path d="M0 14.5V16h1.5l9-9L9 5.5 0 14.5Z"/>
                                                                    </svg>
                                                                ) : (
                                                                    <svg className="w-3.5 h-3.5 text-white/60" fill="currentColor" viewBox="0 0 16 15">
                                                                        <path d="M15.854.854a.5.5 0 0 0-.708-.708L7.707 7.293 4.854 4.44a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0l8-8Z"/>
                                                                    </svg>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            </div>
                                        );
                                    });
                                })()}

                                <div ref={chatEndRef} />
                            </div>

                            {/* Answer Form - WhatsApp Style */}
                            <form onSubmit={handleSubmitAnswer} className="bg-white rounded-2xl p-2 border border-gray-200 space-y-2">
                                {answerForm.errors.answer && (
                                    <p className="text-xs text-red-600 px-2 font-body">
                                        {answerForm.errors.answer}
                                    </p>
                                )}
                                
                                <div className="flex gap-2">
                                    <Textarea
                                        value={answerForm.data.answer}
                                        onChange={(e) => answerForm.setData('answer', e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Tulis jawaban Anda di sini..."
                                        rows={3}
                                        className="flex-1 text-sm font-body border-0 focus:ring-0 focus:outline-none bg-transparent resize-none"
                                        required
                                    />
                                    <div className="flex flex-col gap-2">
                                        <Button
                                            type="submit"
                                            disabled={answerForm.processing || !answerForm.data.answer.trim()}
                                            className="bg-green-500 hover:bg-green-600 text-white h-10 w-10 p-0 rounded-full shadow-md"
                                        >
                                            {answerForm.processing ? (
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                                                />
                                            ) : (
                                                <Send className="w-5 h-5" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-2 px-2">
                                    <select
                                        value={answerForm.data.status}
                                        onChange={(e) => answerForm.setData('status', e.target.value)}
                                        className="px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-500/20 bg-white font-body"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="answered">Terjawab</option>
                                        <option value="closed">Ditutup</option>
                                    </select>
                                    <p className="text-[10px] text-gray-500 font-body">
                                        💡 <kbd className="px-1 py-0.5 bg-gray-100 rounded border border-gray-300 text-[10px]">Enter</kbd> kirim, <kbd className="px-1 py-0.5 bg-gray-100 rounded border border-gray-300 text-[10px]">Shift+Enter</kbd> baris baru
                                    </p>
                                </div>
                            </form>
                        </Card>
                    </>
                ) : (
                    <Card className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-body">
                                Pilih chat untuk melihat dan menjawab
                            </p>
                        </div>
                    </Card>
                )}
            </div>
        </div>
        </>
    );
}

