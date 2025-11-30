import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { 
    MessageCircle, Search, Filter, CheckCircle2, Clock, 
    XCircle, AlertCircle, User, Mail, Calendar, Edit, Trash2,
    ArrowRight
} from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import BackButton from '@/Components/BackButton';

export default function QuestionsIndex({ questions, filters, stats }) {
    const [selectedStatus, setSelectedStatus] = useState(filters?.status || 'all');
    const [searchQuery, setSearchQuery] = useState('');

    const statusOptions = [
        { value: 'all', label: 'Semua', icon: MessageCircle, count: stats?.total || 0 },
        { value: 'pending', label: 'Pending', icon: Clock, count: stats?.pending || 0, color: 'bg-yellow-100 text-yellow-700' },
        { value: 'answered', label: 'Terjawab', icon: CheckCircle2, count: stats?.answered || 0, color: 'bg-green-100 text-green-700' },
    ];

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
            case 'answered':
                return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle2 className="w-3 h-3 mr-1" />Terjawab</Badge>;
            case 'closed':
                return <Badge className="bg-gray-100 text-gray-700 border-gray-300"><XCircle className="w-3 h-3 mr-1" />Ditutup</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const getPriorityBadge = (priority) => {
        switch (priority) {
            case 'high':
                return <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">Tinggi</Badge>;
            case 'medium':
                return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">Sedang</Badge>;
            case 'low':
                return <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">Rendah</Badge>;
            default:
                return null;
        }
    };

    const filteredQuestions = questions.data.filter(q => {
        const matchesStatus = selectedStatus === 'all' || q.status === selectedStatus;
        const matchesSearch = !searchQuery || 
            q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (q.answer && q.answer.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (q.user?.name && q.user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (q.name && q.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesStatus && matchesSearch;
    });

    const handleStatusFilter = (status) => {
        setSelectedStatus(status);
        router.get(route('questions.index'), { status }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Manajemen Pertanyaan - MOV Center" />
            <AnimatedBackground />
            
            <div className="min-h-screen py-6 md:py-8 px-4 sm:px-6 lg:px-8 relative">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Back Button */}
                    <div className="mb-4">
                        <BackButton href="/dashboard" />
                    </div>

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between mb-6"
                    >
                        <div>
                            <h1 className="text-3xl md:text-4xl font-heading text-gray-900 mb-2">
                                Manajemen Pertanyaan
                            </h1>
                            <p className="text-gray-600 font-body">
                                Kelola dan jawab pertanyaan dari Petani dan Guest
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className="bg-green-100 text-green-700 border-green-300">
                                <MessageCircle className="w-4 h-4 mr-1" />
                                {stats?.pending || 0} Pending
                            </Badge>
                        </div>
                    </motion.div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {statusOptions.map((option, index) => {
                            const Icon = option.icon;
                            return (
                                <motion.div
                                    key={option.value}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card 
                                        className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                                            selectedStatus === option.value 
                                                ? 'border-2 border-green-500 bg-green-50' 
                                                : 'border-2 border-gray-200 hover:border-green-300'
                                        }`}
                                        onClick={() => handleStatusFilter(option.value)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${option.color || 'bg-green-100'}`}>
                                                    <Icon className={`w-5 h-5 ${option.color?.includes('text-') ? '' : 'text-green-600'}`} />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600 font-body">{option.label}</p>
                                                    <p className="text-2xl font-heading text-gray-900">{option.count}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Search and Filters */}
                    <Card className="p-4 mb-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Cari pertanyaan atau jawaban..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 font-body"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Questions List */}
                    <div className="space-y-4">
                        {filteredQuestions.length === 0 ? (
                            <Card className="p-12 text-center">
                                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-600 font-body">
                                    {searchQuery 
                                        ? 'Tidak ada pertanyaan yang cocok dengan pencarian Anda'
                                        : selectedStatus === 'pending'
                                        ? 'Tidak ada pertanyaan yang menunggu jawaban'
                                        : 'Belum ada pertanyaan'}
                                </p>
                            </Card>
                        ) : (
                            filteredQuestions.map((question, index) => (
                                <motion.div
                                    key={question.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card className="p-6 hover:shadow-lg transition-all border-2 border-gray-200 hover:border-green-300">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-3">
                                                    {getStatusBadge(question.status)}
                                                    {getPriorityBadge(question.priority)}
                                                    {question.category && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {question.category}
                                                        </Badge>
                                                    )}
                                                </div>
                                                
                                                <div className="mb-3">
                                                    <p className="text-gray-900 font-body line-clamp-2">
                                                        {question.question}
                                                    </p>
                                                </div>

                                                {question.answer && (
                                                    <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                                        <p className="text-sm font-heading text-green-800 mb-1">Jawaban:</p>
                                                        <p className="text-sm text-gray-700 font-body line-clamp-2">
                                                            {question.answer}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-4 text-xs text-gray-500 font-body">
                                                    <div className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        <span>{question.user?.name || question.name || 'Guest'}</span>
                                                    </div>
                                                    {question.user?.email || question.email ? (
                                                        <div className="flex items-center gap-1">
                                                            <Mail className="w-3 h-3" />
                                                            <span>{question.user?.email || question.email}</span>
                                                        </div>
                                                    ) : null}
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        <span>{new Date(question.created_at).toLocaleDateString('id-ID', { 
                                                            day: 'numeric', 
                                                            month: 'long', 
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}</span>
                                                    </div>
                                                    {question.answered_by && (
                                                        <div className="flex items-center gap-1 text-green-600">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            <span>Dijawab oleh {question.answered_by?.name || 'K-Petani'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <Link
                                                    href={route('questions.show', question.id)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-heading"
                                                >
                                                    {question.status === 'pending' ? (
                                                        <>
                                                            <Edit className="w-4 h-4" />
                                                            Jawab
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ArrowRight className="w-4 h-4" />
                                                            Lihat
                                                        </>
                                                    )}
                                                </Link>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {questions.links && questions.links.length > 3 && (
                        <div className="flex justify-center gap-2">
                            {questions.links.map((link, index) => (
                                <Link
                                    key={index}
                                    href={link.url || '#'}
                                    className={`px-4 py-2 rounded-lg transition-colors font-body ${
                                        link.active
                                            ? 'bg-green-600 text-white'
                                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                                    } ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}


