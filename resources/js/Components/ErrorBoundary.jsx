import React from 'react';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="max-w-md w-full"
                    >
                        <Card className="p-8 bg-white/90 backdrop-blur-xl border-2 border-red-200/50 shadow-2xl">
                            <div className="text-center">
                                <motion.div
                                    animate={{ 
                                        rotate: [0, 10, -10, 0],
                                        scale: [1, 1.1, 1]
                                    }}
                                    transition={{ 
                                        duration: 2, 
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"
                                >
                                    <AlertTriangle className="w-10 h-10 text-white" />
                                </motion.div>
                                
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    Oops! Terjadi Kesalahan
                                </h2>
                                <p className="text-gray-600 mb-6">
                                    Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi atau kembali ke halaman utama.
                                </p>
                                
                                {process.env.NODE_ENV === 'development' && this.state.error && (
                                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                                        <p className="text-sm font-semibold text-red-800 mb-2">Error Details:</p>
                                        <p className="text-xs text-red-700 font-mono break-all">
                                            {this.state.error.toString()}
                                        </p>
                                    </div>
                                )}
                                
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <Button
                                        onClick={this.handleReset}
                                        className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Coba Lagi
                                    </Button>
                                    <Link href="/dashboard">
                                        <Button
                                            variant="outline"
                                            className="border-2 border-green-500 text-green-600 hover:bg-green-50"
                                        >
                                            <Home className="w-4 h-4 mr-2" />
                                            Kembali ke Dashboard
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

