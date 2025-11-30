import { useRef, useEffect, useState, useCallback } from 'react';
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

    // Helper function to get maturity label in Indonesian
    const getMaturityLabel = (det) => {
        const statusMap = {
            'Unripe': 'Muda',
            'Half-Ripe': 'Setengah Matang',
            'Ripe': 'Matang',
            'OverRipe': 'Terlalu Matang',
            'Not_Mango': 'Bukan Mangga'
        };
        return statusMap[det.className] || det.className;
    };

    // Function to draw detections on canvas
    const drawDetections = useCallback(() => {
        if (!canvasRef.current || !videoRef.current) return;
        
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');
        
        // Wait for video to be ready
        if (video.readyState < video.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
            return;
        }
        
        // Match canvas size to video display size
        const videoRect = video.getBoundingClientRect();
        if (videoRect.width === 0 || videoRect.height === 0) {
            return;
        }
        
        // Set canvas size
        canvas.width = videoRect.width;
        canvas.height = videoRect.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Filter valid detections (termasuk Not_Mango untuk ditampilkan)
        const validDetections = currentDetections.filter(det => 
            det.x !== undefined && det.y !== undefined && det.w !== undefined && det.h !== undefined
        );
        
        if (validDetections.length === 0) {
            return;
        }
        
        // Calculate scale factors - handle object-contain scaling
        const videoAspect = video.videoWidth / video.videoHeight;
        const displayAspect = videoRect.width / videoRect.height;
        
        let scaleX, scaleY, offsetX = 0, offsetY = 0;
        
        if (videoAspect > displayAspect) {
            // Video is wider - fit to width
            scaleX = videoRect.width / video.videoWidth;
            scaleY = scaleX;
            offsetY = (videoRect.height - video.videoHeight * scaleY) / 2;
        } else {
            // Video is taller - fit to height
            scaleY = videoRect.height / video.videoHeight;
            scaleX = scaleY;
            offsetX = (videoRect.width - video.videoWidth * scaleX) / 2;
        }

        validDetections.forEach((det, index) => {
            // Pastikan koordinat valid dan dalam range yang wajar
            if (isNaN(det.x) || isNaN(det.y) || isNaN(det.w) || isNaN(det.h) || 
                det.w <= 0 || det.h <= 0) {
                return; // Skip invalid detection
            }

            // Skip deteksi dengan koordinat yang tidak masuk akal (sangat besar)
            // Koordinat seharusnya dalam range 0 sampai video size
            if (det.x > video.videoWidth * 1000 || det.y > video.videoHeight * 1000 || 
                det.w > video.videoWidth * 1000 || det.h > video.videoHeight * 1000) {
                if (process.env.NODE_ENV === 'development') {
                    console.warn('⚠️ Skipping detection with invalid coordinates:', {
                        original: { x: det.x, y: det.y, w: det.w, h: det.h },
                        videoSize: { width: video.videoWidth, height: video.videoHeight }
                    });
                }
                return; // Skip deteksi dengan koordinat yang tidak masuk akal
            }

            // Normalize coordinates - handle koordinat yang agak besar dari model
            let normalizedX = det.x;
            let normalizedY = det.y;
            let normalizedW = det.w;
            let normalizedH = det.h;

            // Jika koordinat lebih besar dari video size, clamp ke video size
            // Tapi jangan ubah jika koordinat masih dalam range yang wajar (misalnya 2x video size)
            if (det.x > video.videoWidth * 2 || det.y > video.videoHeight * 2 || 
                det.w > video.videoWidth * 2 || det.h > video.videoHeight * 2) {
                // Coba normalize dengan mencari faktor skala yang tepat
                const maxCoord = Math.max(det.x, det.y, det.w, det.h);
                const maxVideoSize = Math.max(video.videoWidth, video.videoHeight);
                
                // Hitung faktor skala
                if (maxCoord > maxVideoSize * 2) {
                    const scaleFactor = maxCoord / maxVideoSize;
                    if (scaleFactor > 2) {
                        normalizedX = det.x / scaleFactor;
                        normalizedY = det.y / scaleFactor;
                        normalizedW = det.w / scaleFactor;
                        normalizedH = det.h / scaleFactor;
                    }
                }
            }

            // Clamp koordinat ke ukuran video yang valid
            // Pastikan width dan height tidak terlalu kecil (minimal 30px) dan tidak terlalu besar
            normalizedX = Math.max(0, Math.min(normalizedX, video.videoWidth - 30));
            normalizedY = Math.max(0, Math.min(normalizedY, video.videoHeight - 30));
            normalizedW = Math.max(30, Math.min(normalizedW, video.videoWidth - normalizedX));
            normalizedH = Math.max(30, Math.min(normalizedH, video.videoHeight - normalizedY));

            // Scale coordinates from original image size to display size
            const x = normalizedX * scaleX + offsetX;
            const y = normalizedY * scaleY + offsetY;
            const w = normalizedW * scaleX;
            const h = normalizedH * scaleY;

            // Pastikan koordinat scaled valid
            if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
                return; // Skip invalid scaled coordinates
            }

            // Debug log untuk memastikan koordinat benar (hanya di development)
            if (process.env.NODE_ENV === 'development' && index === 0) {
                console.log('🔍 Detection coordinates:', {
                    'Original': { x: det.x, y: det.y, w: det.w, h: det.h },
                    'Normalized': { x: normalizedX, y: normalizedY, w: normalizedW, h: normalizedH },
                    'Scaled (display)': { x, y, w, h },
                    'Video size': { width: video.videoWidth, height: video.videoHeight },
                    'Canvas size': { width: canvas.width, height: canvas.height },
                    'Scale factors': { scaleX, scaleY, offsetX, offsetY }
                });
            }

            // Skip Not_Mango - jangan tampilkan bounding box dan label untuk Not_Mango
            if (det.className === 'Not_Mango' || det.className === 'Nota_Mango') {
                return; // Skip drawing for Not_Mango
            }

            // Get color based on maturity - gunakan warna yang lebih terang dan kontras
            let color = '#FF6B6B'; // Default: Muda (red)
            if (det.maturity >= 75) {
                color = '#FF69B4'; // Matang (pink/magenta) - seperti di gambar
            } else if (det.maturity >= 50) {
                color = '#FFA07A'; // Setengah Matang (orange)
            } else if (det.maturity > 0) {
                color = '#FF6B6B'; // Muda (red)
            }

            // Draw bounding box with thicker line dan stroke untuk kontras
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.setLineDash([]);
            // Tambahkan shadow untuk depth
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.strokeRect(x, y, w, h);
            ctx.restore();

            // Draw label with maturity status - label harus mengikuti posisi bounding box
            const maturityLabel = getMaturityLabel(det);
            const confidenceValue = det.confidence !== undefined ? det.confidence : (det.conf !== undefined ? det.conf : 0);
            const confidence = (confidenceValue * 100).toFixed(0);
            const label = `${maturityLabel} ${confidence}%`;
            
            ctx.font = 'bold 16px Arial, sans-serif';
            const textMetrics = ctx.measureText(label);
            const textWidth = textMetrics.width;
            const labelHeight = 50;
            const padding = 10;
            const spacing = 5; // Jarak antara label dan bounding box (0 agar label lebih dekat ke atas)

            // Hitung posisi label - SELALU di atas bounding box, seperti label hijau manual
            const labelWidth = textWidth + padding * 3;
            
            // Posisi label: di atas kiri bounding box, MENGIKUTI OBJEK
            // labelX HARUS mengikuti posisi x dari bounding box (sama seperti label hijau)
            let labelX = x; // Mulai dari posisi x bounding box (kiri atas)
            
            // labelY HARUS di ATAS bounding box (y - labelHeight - spacing)
            // Ini adalah posisi default - label SELALU di atas objek, seperti label hijau
            // Posisi label = posisi atas bounding box dikurangi tinggi label dan spacing
            // Kurangi sedikit lagi (2px) agar label lebih ke atas
            let labelY = y - labelHeight - spacing - 3; // Posisi di ATAS bounding box, sedikit lebih ke atas

            // Hanya pindahkan ke bawah jika BENAR-BENAR tidak muat di atas
            // Cek apakah posisi atas bounding box (y) kurang dari tinggi label + spacing
            // Hanya pindahkan jika y benar-benar sangat kecil (kurang dari labelHeight)
            if (y < labelHeight) {
                // Hanya jika bounding box sudah sangat dekat dengan atas canvas (kurang dari tinggi label)
                // Baru pindahkan ke bawah bounding box
                labelY = y + h + spacing;
            } else {
                // Jika masih muat di atas, pastikan label tidak keluar dari canvas atas
                // Biarkan sedikit keluar (hingga -5px) untuk fleksibilitas
                if (labelY < -5) {
                    labelY = 0; // Clamp ke 0 jika terlalu keluar
                }
            }

            // Sesuaikan posisi horizontal jika label terlalu ke kanan
            // Tapi tetap usahakan mengikuti posisi bounding box (seperti label hijau)
            if (labelX + labelWidth > canvas.width) {
                // Coba pindahkan ke kiri, tapi tetap dekat dengan bounding box
                labelX = Math.max(0, x + w - labelWidth);
                // Jika masih tidak muat, baru pindahkan lebih ke kiri
                if (labelX + labelWidth > canvas.width) {
                    labelX = Math.max(0, canvas.width - labelWidth);
                }
            }

            // Pastikan label tidak terlalu ke kiri - minimal 0px dari edge
            if (labelX < 0) {
                labelX = 0;
            }

            // Pastikan label dalam bounds vertikal - hanya clamp jika perlu
            if (labelY < 0) {
                labelY = 0; // Minimal 0px dari atas
            }
            if (labelY + labelHeight > canvas.height) {
                labelY = Math.max(0, canvas.height - labelHeight);
            }

            // Debug log untuk posisi label (hanya di development)
            if (process.env.NODE_ENV === 'development' && index === 0) {
                console.log('🏷️ Label position:', {
                    'Bounding box': { x, y, w, h },
                    'Label position': { x: labelX, y: labelY, width: labelWidth, height: labelHeight },
                    'Label above bbox?': labelY < y ? 'YES ✅' : 'NO ❌',
                    'Label Y vs Bbox Y': { labelY, bboxY: y, difference: y - labelY },
                    'Label text': label
                });
            }

            // Draw rounded rectangle background dengan stroke untuk kontras lebih baik
            ctx.save();
            ctx.fillStyle = color;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const radius = 6;
            const rectX = labelX;
            const rectY = labelY;
            const rectW = labelWidth;
            const rectH = labelHeight;
            ctx.moveTo(rectX + radius, rectY);
            ctx.lineTo(rectX + rectW - radius, rectY);
            ctx.quadraticCurveTo(rectX + rectW, rectY, rectX + rectW, rectY + radius);
            ctx.lineTo(rectX + rectW, rectY + rectH - radius);
            ctx.quadraticCurveTo(rectX + rectW, rectY + rectH, rectX + rectW - radius, rectY + rectH);
            ctx.lineTo(rectX + radius, rectY + rectH);
            ctx.quadraticCurveTo(rectX, rectY + rectH, rectX, rectY + rectH - radius);
            ctx.lineTo(rectX, rectY + radius);
            ctx.quadraticCurveTo(rectX, rectY, rectX + radius, rectY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke(); // Tambahkan stroke hitam untuk kontras

            // Draw label text dengan stroke untuk readability
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';
            // Draw text dengan stroke untuk kontras
            ctx.strokeText(label, labelX + padding, labelY + labelHeight / 2);
            ctx.fillText(label, labelX + padding, labelY + labelHeight / 2);
            ctx.restore();
        });
    }, [currentDetections]);

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
                    
                    if (result && result.detections && result.detections.length > 0) {
                        setCurrentDetections(result.detections);
                    } else {
                        setCurrentDetections([]);
                    }
                } catch (err) {
                    console.error('Detection error:', err);
                } finally {
                    setIsDetecting(false);
                }
            }

            // Draw detections on canvas - always draw to keep labels updated
            drawDetections();
            
            animationFrameRef.current = requestAnimationFrame(detectFrame);
        };

        animationFrameRef.current = requestAnimationFrame(detectFrame);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isStreaming, isModelLoaded, currentDetections, detectFromImage, isDetecting, drawDetections]);

    // Redraw detections when currentDetections changes
    useEffect(() => {
        if (isStreaming && videoRef.current && currentDetections.length > 0) {
            // Small delay to ensure video is ready
            const timer = setTimeout(() => {
                drawDetections();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [currentDetections, isStreaming, drawDetections]);


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

    // Helper function to draw bounding boxes on image
    const drawBoundingBoxesOnImage = (image, detections) => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const img = new Image();
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                // Draw original image
                ctx.drawImage(img, 0, 0);
                
                // Filter valid detections (termasuk Not_Mango untuk ditampilkan)
                const validDetections = detections.filter(det => 
                    det.x !== undefined && det.y !== undefined && det.w !== undefined && det.h !== undefined
                );
                
                if (validDetections.length > 0) {
                    validDetections.forEach((det) => {
                        // Skip Not_Mango - jangan tampilkan bounding box dan label untuk Not_Mango
                        if (det.className === 'Not_Mango' || det.className === 'Nota_Mango') {
                            return; // Skip drawing for Not_Mango
                        }

                        const x = det.x;
                        const y = det.y;
                        const w = det.w;
                        const h = det.h;

                        // Get color based on maturity
                        let color = '#FF6B6B'; // Default: Muda (red)
                        if (det.maturity >= 75) {
                            color = '#4ECDC4'; // Matang (teal)
                        } else if (det.maturity >= 50) {
                            color = '#FFA07A'; // Setengah Matang (orange)
                        } else if (det.maturity > 0) {
                            color = '#FF6B6B'; // Muda (red)
                        }

                        // Draw bounding box with thicker line
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 4;
                        ctx.setLineDash([]);
                        ctx.strokeRect(x, y, w, h);

                        // Draw label with maturity status
                        const maturityLabel = getMaturityLabel(det);
                        const confidence = (det.confidence * 100).toFixed(0);
                        const label = `${maturityLabel} ${confidence}%`;
                        
                        ctx.font = 'bold 18px Arial, sans-serif';
                        const textMetrics = ctx.measureText(label);
                        const textWidth = textMetrics.width;
                        const labelHeight = 30;
                        const padding = 10;

                        // Draw rounded rectangle background
                        const labelX = Math.max(0, Math.min(x, canvas.width - textWidth - padding * 2));
                        const labelY = Math.max(labelHeight, y);

                        ctx.fillStyle = color;
                        ctx.beginPath();
                        const radius = 6;
                        const rectX = labelX;
                        const rectY = labelY - labelHeight;
                        const rectW = textWidth + padding * 2;
                        const rectH = labelHeight;
                        ctx.moveTo(rectX + radius, rectY);
                        ctx.lineTo(rectX + rectW - radius, rectY);
                        ctx.quadraticCurveTo(rectX + rectW, rectY, rectX + rectW, rectY + radius);
                        ctx.lineTo(rectX + rectW, rectY + rectH - radius);
                        ctx.quadraticCurveTo(rectX + rectW, rectY + rectH, rectX + rectW - radius, rectY + rectH);
                        ctx.lineTo(rectX + radius, rectY + rectH);
                        ctx.quadraticCurveTo(rectX, rectY + rectH, rectX, rectY + rectH - radius);
                        ctx.lineTo(rectX, rectY + radius);
                        ctx.quadraticCurveTo(rectX, rectY, rectX + radius, rectY);
                        ctx.closePath();
                        ctx.fill();

                        // Draw label text
                        ctx.fillStyle = '#FFFFFF';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(label, labelX + padding, labelY - labelHeight / 2);
                    });
                }
                
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.9);
            };
            
            if (typeof image === 'string') {
                img.src = image;
            } else {
                img.src = URL.createObjectURL(image);
            }
        });
    };

    const capturePhoto = async () => {
        if (!videoRef.current || !isStreaming) return;

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        // Get valid detections (termasuk Not_Mango untuk ditampilkan)
        const validDetections = currentDetections.filter(det => 
            det.x !== undefined && det.y !== undefined && det.w !== undefined && det.h !== undefined
        );
        
        // Draw bounding boxes on captured image
        if (validDetections.length > 0) {
            validDetections.forEach((det) => {
                // Skip Not_Mango - jangan tampilkan bounding box dan label untuk Not_Mango
                if (det.className === 'Not_Mango' || det.className === 'Nota_Mango') {
                    return; // Skip drawing for Not_Mango
                }

                const x = det.x;
                const y = det.y;
                const w = det.w;
                const h = det.h;

                // Get color based on maturity
                let color = '#FF6B6B'; // Default: Muda (red)
                if (det.maturity >= 75) {
                    color = '#4ECDC4'; // Matang (teal)
                } else if (det.maturity >= 50) {
                    color = '#FFA07A'; // Setengah Matang (orange)
                } else if (det.maturity > 0) {
                    color = '#FF6B6B'; // Muda (red)
                }

                // Draw bounding box with thicker line
                ctx.strokeStyle = color;
                ctx.lineWidth = 4;
                ctx.setLineDash([]);
                ctx.strokeRect(x, y, w, h);

                // Draw label with maturity status
                const maturityLabel = getMaturityLabel(det);
                const confidence = (det.confidence * 100).toFixed(0);
                const label = `${maturityLabel} ${confidence}%`;
                
                ctx.font = 'bold 18px Arial, sans-serif';
                const textMetrics = ctx.measureText(label);
                const textWidth = textMetrics.width;
                const labelHeight = 30;
                const padding = 10;

                // Draw rounded rectangle background
                const labelX = Math.max(0, Math.min(x, canvas.width - textWidth - padding * 2));
                const labelY = Math.max(labelHeight, y);

                ctx.fillStyle = color;
                ctx.beginPath();
                const radius = 6;
                const rectX = labelX;
                const rectY = labelY - labelHeight;
                const rectW = textWidth + padding * 2;
                const rectH = labelHeight;
                ctx.moveTo(rectX + radius, rectY);
                ctx.lineTo(rectX + rectW - radius, rectY);
                ctx.quadraticCurveTo(rectX + rectW, rectY, rectX + rectW, rectY + radius);
                ctx.lineTo(rectX + rectW, rectY + rectH - radius);
                ctx.quadraticCurveTo(rectX + rectW, rectY + rectH, rectX + rectW - radius, rectY + rectH);
                ctx.lineTo(rectX + radius, rectY + rectH);
                ctx.quadraticCurveTo(rectX, rectY + rectH, rectX, rectY + rectH - radius);
                ctx.lineTo(rectX, rectY + radius);
                ctx.quadraticCurveTo(rectX, rectY, rectX + radius, rectY);
                ctx.closePath();
                ctx.fill();

                // Draw label text
                ctx.fillStyle = '#FFFFFF';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, labelX + padding, labelY - labelHeight / 2);
            });
        }
        
        canvas.toBlob((blob) => {
            if (blob && onCapture) {
                const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                // Kirim semua detections termasuk Not_Mango
                onCapture(file, currentDetections);
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
                        <div className="absolute top-4 left-4 z-10 bg-green-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg border-2 border-green-400/50">
                            {validMangoDetections.length} mangga terdeteksi
                        </div>
                    )}
                    
                    {/* Detection Status - moved to top with better visibility */}
                    {validMangoDetections.length > 0 && !isDetecting && (
                        <div className="absolute top-16 left-4 z-10 bg-blue-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg border-2 border-blue-400/50">
                            Deteksi real-time aktif
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
                            onLoadedMetadata={() => {
                                // Redraw when video metadata is loaded
                                setTimeout(() => {
                                    if (currentDetections.length > 0) {
                                        drawDetections();
                                    }
                                }, 200);
                            }}
                            onResize={() => {
                                // Redraw when video resizes
                                if (currentDetections.length > 0) {
                                    drawDetections();
                                }
                            }}
                        />
                        
                        {/* Detection Canvas Overlay */}
                        <canvas
                            ref={canvasRef}
                            className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
                            style={{ 
                                imageRendering: 'auto',
                                mixBlendMode: 'normal',
                                objectFit: 'contain'
                            }}
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

                    {/* Instructions - only show when no detections */}
                    {validMangoDetections.length === 0 && (
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg border border-white/20">
                            Posisikan mangga di dalam frame - Deteksi otomatis
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

