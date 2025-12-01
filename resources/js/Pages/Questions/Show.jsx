import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Textarea } from '@/Components/ui/textarea';
import { Label } from '@/Components/ui/label';
import { 
    MessageCircle, User, Mail, Calendar, CheckCircle2, 
    Clock, Save, ArrowLeft, Trash2
} from 'lucide-react';
import AnimatedBackground from '@/Components/AnimatedBackground';
import BackButton from '@/Components/BackButton';

export default function QuestionsShow({ question }) {
    const answerForm = useForm({
        answer: question.answer || '',
        status: question.status || 'answered',
    });

    const handleSubmitAnswer = (e) => {
        e.preventDefault();
        answerForm.put(route('questions.update', question.id), {
            preserveScroll: true,
            onSuccess: () => {
                // Success handled by flash message
            },
        });
    };

    const handleDelete = () => {
        if (confirm('Apakah Anda yakin ingin menghapus pertanyaan ini?')) {
            router.delete(route('questions.destroy', question.id), {
                onSuccess: () => {
                    router.visit(route('questions.index'));
                },
            });
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
            case 'answered':
                return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle2 className="w-3 h-3 mr-1" />Terjawab</Badge>;
            case 'closed':
                return <Badge className="bg-gray-100 text-gray-700 border-gray-300">Ditutup</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Pertanyaan #${question.id} - MOV Center`} />
            <AnimatedBackground />
            
            <div className="min-h-screen py-6 md:py-8 px-4 sm:px-6 lg:px-8 relative">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Back Button */}
                    <div className="mb-4">
                        <Link
                            href={route('questions.index')}
                            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-body"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Kembali ke Daftar Pertanyaan
                        </Link>
                    </div>

                    {/* Question Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h1 className="text-2xl font-heading text-gray-900">
                                    Pertanyaan #{question.id}
                                </h1>
                                <div className="flex items-center gap-2">
                                    {getStatusBadge(question.status)}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleDelete}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Questioner Info */}
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-500" />
                                        <div>
                                            <p className="text-xs text-gray-500 font-body">Penanya</p>
                                            <p className="text-sm font-heading text-gray-900">
                                                {question.user?.name || question.name || 'Guest'}
                                            </p>
                                        </div>
                                    </div>
                                    {(question.user?.email || question.email) && (
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-gray-500" />
                                            <div>
                                                <p className="text-xs text-gray-500 font-body">Email</p>
                                                <p className="text-sm font-body text-gray-900">
                                                    {question.user?.email || question.email}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-500" />
                                        <div>
                                            <p className="text-xs text-gray-500 font-body">Tanggal</p>
                                            <p className="text-sm font-body text-gray-900">
                                                {new Date(question.created_at).toLocaleDateString('id-ID', { 
                                                    day: 'numeric', 
                                                    month: 'long', 
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    {question.category && (
                                        <div>
                                            <p className="text-xs text-gray-500 font-body">Kategori</p>
                                            <Badge variant="outline" className="text-xs mt-1">
                                                {question.category}
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Question */}
                            <div className="mb-6">
                                <Label className="text-sm font-heading text-gray-700 mb-2">Pertanyaan</Label>
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-gray-900 font-body whitespace-pre-wrap">
                                        {question.question}
                                    </p>
                                </div>
                            </div>

                            {/* Answer Form */}
                            <form onSubmit={handleSubmitAnswer} className="space-y-4">
                                <div>
                                    <Label htmlFor="answer" className="text-sm font-heading text-gray-700 mb-2">
                                        Jawaban
                                    </Label>
                                    <Textarea
                                        id="answer"
                                        value={answerForm.data.answer}
                                        onChange={(e) => answerForm.setData('answer', e.target.value)}
                                        placeholder="Tulis jawaban untuk pertanyaan ini..."
                                        rows={8}
                                        className="font-body"
                                        required
                                    />
                                    {answerForm.errors.answer && (
                                        <p className="text-xs text-red-600 mt-1 font-body">
                                            {answerForm.errors.answer}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="status" className="text-sm font-heading text-gray-700 mb-2">
                                        Status
                                    </Label>
                                    <select
                                        id="status"
                                        value={answerForm.data.status}
                                        onChange={(e) => answerForm.setData('status', e.target.value)}
                                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 font-body"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="answered">Terjawab</option>
                                        <option value="closed">Ditutup</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Button
                                        type="submit"
                                        disabled={answerForm.processing}
                                        className="bg-green-600 hover:bg-green-700 font-heading"
                                    >
                                        {answerForm.processing ? (
                                            <span className="flex items-center gap-2 font-body">
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                                                />
                                                Menyimpan...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2">
                                                <Save className="w-4 h-4" />
                                                Simpan Jawaban
                                            </span>
                                        )}
                                    </Button>
                                    <Link
                                        href={route('questions.index')}
                                        className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-body"
                                    >
                                        Batal
                                    </Link>
                                </div>
                            </form>

                            {/* Previous Answer (if exists and different from current) */}
                            {question.answer && question.answered_at && (
                                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        <p className="text-sm font-heading text-green-800">
                                            Dijawab pada {new Date(question.answered_at).toLocaleDateString('id-ID', { 
                                                day: 'numeric', 
                                                month: 'long', 
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    {question.answered_by && (
                                        <p className="text-xs text-gray-600 font-body mb-2">
                                            Oleh: {question.answered_by?.name || 'K-Petani'}
                                        </p>
                                    )}
                                </div>
                            )}
                        </Card>
                    </motion.div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}


