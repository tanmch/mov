import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Circle, Loader } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { useMangoDetection } from '@/hooks/useMangoDetection';

export default function CameraCapture({ onCapture, onClose, isOpen, isModelLoaded }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const animationFrameRef = useRef(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState(null);
    const [currentDetections, setCurrentDetections] = useState([]);
    const [isDetecting, setIsDetecting] = useState(false);
    
    const { detectFromImage } = useMangoDetection();
    const lastDetectionTime = useRef(0);

    // Filter out "Not_Mango" detections - hanya hitung mangga yang benar-benar terdeteksi
    const validMangoDetections = currentDetections.filter(det => 
        det.className !== 'Not_Mango' && det.className !== 'Nota_Mango'
    );

    useEffect(() => {
        if (isOpen && isModelLoaded) {
            startCamera();
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [isOpen, isModelLoaded]);

    // Real-time detection loop
    useEffect(() => {
        if (!isStreaming || !isModelLoaded || !videoRef.current) return;

        const detectFrame = async () => {
            const video = videoRef.current;
            if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
                animationFrameRef.current = requestAnimationFrame(detectFrame);
                return;
            }

            const now = Date.now();
            // Detect every 500ms (2 FPS untuk performa)
            if (now - lastDetectionTime.current > 500 && !isDetecting) {
                lastDetectionTime.current = now;
                setIsDetecting(true);

                try {
                    // Capture current frame
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0);
                    
                    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    const result = await detectFromImage(imageDataUrl);
                    
                    if (result && result.detections) {
                        setCurrentDetections(result.detections);
                    }
                } catch (err) {
                    console.error('Detection error:', err);
                } finally {
                    setIsDetecting(false);
                }
            }

            // Draw detections on canvas overlay - hanya gambar mangga yang valid
            const validDetections = currentDetections.filter(det => 
                det.className !== 'Not_Mango' && det.className !== 'Nota_Mango'
            );
            
            if (canvasRef.current && video && validDetections.length > 0) {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                
                // Match canvas size to video display size
                const videoRect = video.getBoundingClientRect();
                const scaleX = videoRect.width / video.videoWidth;
                const scaleY = videoRect.height / video.videoHeight;
                
                canvas.width = videoRect.width;
                canvas.height = videoRect.height;
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                validDetections.forEach((det) => {
                    const x = det.x * scaleX;
                    const y = det.y * scaleY;
                    const w = det.w * scaleX;
                    const h = det.h * scaleY;

                    // Get color based on maturity
                    let color = '#FF6B6B';
                    if (det.maturity >= 75) color = '#4ECDC4';
                    else if (det.maturity >= 50) color = '#FFA07A';
                    else if (det.maturity > 0) color = '#FF6B6B';

                    // Draw bounding box
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 3;
                    ctx.strokeRect(x, y, w, h);

                    // Draw label background
                    const label = `${det.className} ${(det.confidence * 100).toFixed(1)}%`;
                    ctx.font = 'bold 14px Arial';
                    const textWidth = ctx.measureText(label).width;
                    const labelHeight = 20;

                    ctx.fillStyle = color;
                    ctx.fillRect(x, Math.max(0, y - labelHeight), textWidth + 10, labelHeight);

                    // Draw label text
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(label, x + 5, Math.max(labelHeight - 5, y - 5));
                });
            } else if (canvasRef.current) {
                // Clear canvas if no detections
                const ctx = canvasRef.current.getContext('2d');
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
            
            animationFrameRef.current = requestAnimationFrame(detectFrame);
        };

        animationFrameRef.current = requestAnimationFrame(detectFrame);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isStreaming, isModelLoaded, currentDetections, detectFromImage, isDetecting]);


    const startCamera = async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment',
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
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        setCurrentDetections([]);
    };

    const capturePhoto = () => {
        if (!videoRef.current || !isStreaming) return;

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        // Draw detections on captured image - hanya gambar mangga yang valid
        const validDetections = currentDetections.filter(det => 
            det.className !== 'Not_Mango' && det.className !== 'Nota_Mango'
        );
        
        if (validDetections.length > 0) {
            validDetections.forEach((det) => {
                const x = det.x;
                const y = det.y;
                const w = det.w;
                const h = det.h;

                let color = '#FF6B6B';
                if (det.maturity >= 75) color = '#4ECDC4';
                else if (det.maturity >= 50) color = '#FFA07A';
                else if (det.maturity > 0) color = '#FF6B6B';

                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.strokeRect(x, y, w, h);

                const label = `${det.className} ${(det.confidence * 100).toFixed(1)}%`;
                ctx.font = 'bold 16px Arial';
                const textWidth = ctx.measureText(label).width;

                ctx.fillStyle = color;
                ctx.fillRect(x, Math.max(0, y - 20), textWidth + 10, 20);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(label, x + 5, y - 5);
            });
        }
        
        canvas.toBlob((blob) => {
            if (blob && onCapture) {
                const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                // Hanya kirim detections yang valid (bukan Not_Mango)
                const validDetections = currentDetections.filter(det => 
                    det.className !== 'Not_Mango' && det.className !== 'Nota_Mango'
                );
                onCapture(file, validDetections);
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

                    {/* Detection Status */}
                    {isDetecting && (
                        <div className="absolute top-4 left-4 z-10 bg-blue-500/80 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2">
                            <Loader className="w-3 h-3 animate-spin" />
                            Mendeteksi...
                        </div>
                    )}

                    {/* Detection Count - hanya tampilkan jika ada mangga yang valid */}
                    {validMangoDetections.length > 0 && !isDetecting && (
                        <div className="absolute top-4 left-4 z-10 bg-green-500/80 text-white px-3 py-1.5 rounded-full text-xs font-semibold">
                            {validMangoDetections.length} mangga terdeteksi
                        </div>
                    )}

                    {/* Video Feed with Detection Overlay */}
                    <div className="relative w-full aspect-video bg-black">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-contain"
                        />
                        
                        {/* Detection Canvas Overlay */}
                        <canvas
                            ref={canvasRef}
                            className="absolute top-0 left-0 w-full h-full pointer-events-none"
                        />
                        
                        {/* Overlay Grid */}
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute inset-0 border-4 border-white/30 rounded-lg m-4"></div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm z-20">
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
                            className="w-16 h-16 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed relative"
                        >
                            <Circle className="w-12 h-12 text-gray-800" fill="currentColor" />
                            {validMangoDetections.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    {validMangoDetections.length}
                                </span>
                            )}
                        </motion.button>
                    </div>

                    {/* Instructions */}
                    <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 text-white text-center">
                        <p className="text-sm opacity-80">
                            {validMangoDetections.length > 0 
                                ? `Deteksi real-time aktif - ${validMangoDetections.length} mangga terdeteksi`
                                : 'Posisikan mangga di dalam frame - Deteksi otomatis'}
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

