import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Badge } from '@/Components/ui/badge';
import { Textarea } from '@/Components/ui/textarea';
import { 
    MessageCircle, Send, Clock, CheckCircle2, User, Mail, 
    Search, RefreshCw, X, Plus, Edit, Trash2, Save, XCircle, FileQuestion
} from 'lucide-react';
import { router, useForm } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';

export default function FAQManagement({ faqs: faqsProp = [], categories: categoriesProp = [] }) {
    const [faqs, setFaqs] = useState(faqsProp || []);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    
    const addForm = useForm({
        question: '',
        answer: '',
        category: '',
        order: 0,
        is_active: true,
    });

    const editForm = useForm({
        question: '',
        answer: '',
        category: '',
        order: 0,
        is_active: true,
    });

    // Update FAQs when prop changes
    useEffect(() => {
        setFaqs(faqsProp || []);
    }, [faqsProp]);

    // Filter FAQs
    const filteredFaqs = faqs.filter(faq => {
        const matchesSearch = !searchQuery || 
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || faq.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    // Sort by order, then by created_at
    const sortedFaqs = [...filteredFaqs].sort((a, b) => {
        if (a.order !== b.order) {
            return a.order - b.order;
        }
        return new Date(b.created_at) - new Date(a.created_at);
    });

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['faqs', 'categories'],
            preserveScroll: true,
            onFinish: () => {
                setIsRefreshing(false);
            },
        });
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!addForm.data.question.trim() || !addForm.data.answer.trim()) return;

        addForm.post(route('faqs.store'), {
            preserveScroll: true,
            onSuccess: (page) => {
                setShowAddModal(false);
                addForm.reset();
                router.reload({
                    only: ['faqs', 'categories'],
                    preserveScroll: true,
                });
            },
        });
    };

    const handleEdit = (faq) => {
        setEditingId(faq.id);
        editForm.setData({
            question: faq.question,
            answer: faq.answer,
            category: faq.category || '',
            order: faq.order || 0,
            is_active: faq.is_active ?? true,
        });
    };

    const handleUpdate = async (id, e) => {
        e.preventDefault();
        if (!editForm.data.question.trim() || !editForm.data.answer.trim()) return;

        editForm.put(route('faqs.update', id), {
            preserveScroll: true,
            onSuccess: (page) => {
                setEditingId(null);
                editForm.reset();
                router.reload({
                    only: ['faqs', 'categories'],
                    preserveScroll: true,
                });
            },
        });
    };

    const handleDelete = async (id) => {
        if (!confirm('Apakah Anda yakin ingin menghapus FAQ ini?')) return;

        router.delete(route('faqs.destroy', id), {
            preserveScroll: true,
            onSuccess: () => {
                router.reload({
                    only: ['faqs', 'categories'],
                    preserveScroll: true,
                });
            },
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        editForm.reset();
    };

    const categories = categoriesProp || [];

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Sidebar - Filters */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">FAQ Management</h3>
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
                        
                        {/* Search */}
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Cari FAQ..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 text-sm"
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Kategori
                            </label>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                            >
                                <option value="all">Semua Kategori</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Add Button */}
                        <Button
                            onClick={() => setShowAddModal(true)}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Tambah FAQ
                        </Button>

                        {/* Stats */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                                <span className="font-semibold">{filteredFaqs.length}</span> FAQ ditemukan
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {faqs.filter(f => f.is_active).length} aktif
                            </p>
                        </div>
                    </Card>
                </div>

                {/* Main Content - FAQ List */}
                <div className="lg:col-span-3">
                    {sortedFaqs.length === 0 ? (
                        <Card className="p-12 text-center">
                            <FileQuestion className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-medium">
                                {searchQuery || categoryFilter !== 'all' 
                                    ? 'Tidak ada FAQ ditemukan'
                                    : 'Belum ada FAQ. Tambah FAQ baru untuk mulai.'
                                }
                            </p>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {sortedFaqs.map((faq) => (
                                <motion.div
                                    key={faq.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    whileHover={{ scale: 1.01 }}
                                >
                                    <Card className={`p-5 border-2 transition-all ${
                                        !faq.is_active ? 'border-gray-200 bg-gray-50 opacity-75' : 'border-gray-200 hover:border-green-300'
                                    }`}>
                                        {editingId === faq.id ? (
                                            // Edit Mode
                                            <form onSubmit={(e) => handleUpdate(faq.id, e)} className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Pertanyaan
                                                    </label>
                                                    <Input
                                                        value={editForm.data.question}
                                                        onChange={(e) => editForm.setData('question', e.target.value)}
                                                        placeholder="Masukkan pertanyaan..."
                                                        className="w-full"
                                                        required
                                                    />
                                                    {editForm.errors.question && (
                                                        <p className="text-xs text-red-600 mt-1">{editForm.errors.question}</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Jawaban
                                                    </label>
                                                    <Textarea
                                                        value={editForm.data.answer}
                                                        onChange={(e) => editForm.setData('answer', e.target.value)}
                                                        placeholder="Masukkan jawaban..."
                                                        rows={4}
                                                        className="w-full"
                                                        required
                                                    />
                                                    {editForm.errors.answer && (
                                                        <p className="text-xs text-red-600 mt-1">{editForm.errors.answer}</p>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Kategori
                                                        </label>
                                                        <Input
                                                            value={editForm.data.category}
                                                            onChange={(e) => editForm.setData('category', e.target.value)}
                                                            placeholder="Kategori (opsional)"
                                                            className="w-full"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Urutan
                                                        </label>
                                                        <Input
                                                            type="number"
                                                            value={editForm.data.order}
                                                            onChange={(e) => editForm.setData('order', parseInt(e.target.value) || 0)}
                                                            min="0"
                                                            className="w-full"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id={`active-${faq.id}`}
                                                        checked={editForm.data.is_active}
                                                        onChange={(e) => editForm.setData('is_active', e.target.checked)}
                                                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                                    />
                                                    <label htmlFor={`active-${faq.id}`} className="text-sm text-gray-700">
                                                        Aktif (ditampilkan untuk guest)
                                                    </label>
                                                </div>

                                                <div className="flex gap-2">
                                                    <Button
                                                        type="submit"
                                                        disabled={editForm.processing}
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                    >
                                                        {editForm.processing ? (
                                                            <motion.div
                                                                animate={{ rotate: 360 }}
                                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                                                            />
                                                        ) : (
                                                            <>
                                                                <Save className="w-4 h-4 mr-2" />
                                                                Simpan
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={handleCancelEdit}
                                                        disabled={editForm.processing}
                                                    >
                                                        <X className="w-4 h-4 mr-2" />
                                                        Batal
                                                    </Button>
                                                </div>
                                            </form>
                                        ) : (
                                            // View Mode
                                            <>
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h4 className="text-lg font-bold text-gray-900">
                                                                {faq.question}
                                                            </h4>
                                                            {!faq.is_active && (
                                                                <Badge className="bg-gray-500 text-white text-xs">
                                                                    Nonaktif
                                                                </Badge>
                                                            )}
                                                            {faq.category && (
                                                                <Badge className="bg-green-100 text-green-700 text-xs">
                                                                    {faq.category}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                                            {faq.answer}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                                        <span>Urutan: {faq.order}</span>
                                                        {faq.created_by && (
                                                            <span>Dibuat oleh: {faq.creator?.name || 'K-Petani'}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(faq)}
                                                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                                        >
                                                            <Edit className="w-4 h-4 mr-1" />
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelete(faq.id)}
                                                            className="text-red-600 border-red-300 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-1" />
                                                            Hapus
                                                        </Button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add FAQ Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => {
                            setShowAddModal(false);
                            addForm.reset();
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200"
                        >
                            {/* Header */}
                            <div className="p-5 border-b border-gray-200 bg-gradient-to-r from-green-500 to-emerald-600">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-white">Tambah FAQ Baru</h3>
                                    <button
                                        onClick={() => {
                                            setShowAddModal(false);
                                            addForm.reset();
                                        }}
                                        className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleAdd} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Pertanyaan <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        value={addForm.data.question}
                                        onChange={(e) => addForm.setData('question', e.target.value)}
                                        placeholder="Masukkan pertanyaan..."
                                        className="w-full"
                                        required
                                    />
                                    {addForm.errors.question && (
                                        <p className="text-xs text-red-600 mt-1">{addForm.errors.question}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Jawaban <span className="text-red-500">*</span>
                                    </label>
                                    <Textarea
                                        value={addForm.data.answer}
                                        onChange={(e) => addForm.setData('answer', e.target.value)}
                                        placeholder="Masukkan jawaban..."
                                        rows={6}
                                        className="w-full"
                                        required
                                    />
                                    {addForm.errors.answer && (
                                        <p className="text-xs text-red-600 mt-1">{addForm.errors.answer}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Kategori
                                        </label>
                                        <Input
                                            value={addForm.data.category}
                                            onChange={(e) => addForm.setData('category', e.target.value)}
                                            placeholder="Kategori (opsional)"
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Urutan
                                        </label>
                                        <Input
                                            type="number"
                                            value={addForm.data.order}
                                            onChange={(e) => addForm.setData('order', parseInt(e.target.value) || 0)}
                                            min="0"
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={addForm.data.is_active}
                                        onChange={(e) => addForm.setData('is_active', e.target.checked)}
                                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                    />
                                    <label htmlFor="is_active" className="text-sm text-gray-700">
                                        Aktif (ditampilkan untuk guest)
                                    </label>
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button
                                        type="submit"
                                        disabled={addForm.processing}
                                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                                    >
                                        {addForm.processing ? (
                                            <motion.div
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mx-auto"
                                            />
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Simpan FAQ
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowAddModal(false);
                                            addForm.reset();
                                        }}
                                        disabled={addForm.processing}
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Batal
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

