import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Circle } from 'lucide-react';
import { Button } from '@/Components/ui/button';

export default function CameraCapture({ onCapture, onClose, isOpen }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [isOpen]);

    const startCamera = async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment', // Use back camera on mobile
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                setIsStreaming(true);
            }
        } catch (err) {
            console.error('Error accessing camera:', err);
            setError('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setIsStreaming(false);
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !isStreaming) return;

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
            if (blob && onCapture) {
                const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                onCapture(file);
            }
        }, 'image/jpeg', 0.9);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl"
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Video Feed */}
                    <div className="relative w-full aspect-video bg-black">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-contain"
                        />
                        
                        {/* Overlay Grid */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute inset-0 border-4 border-white/30 rounded-lg m-4"></div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Controls */}
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
                        <Button
                            onClick={onClose}
                            variant="outline"
                            className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                        >
                            Batal
                        </Button>
                        
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={capturePhoto}
                            disabled={!isStreaming}
                            className="w-16 h-16 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Circle className="w-12 h-12 text-gray-800" fill="currentColor" />
                        </motion.button>
                    </div>

                    {/* Instructions */}
                    <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 text-white text-center">
                        <p className="text-sm opacity-80">Posisikan mangga di dalam frame dan tekan tombol untuk mengambil foto</p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

