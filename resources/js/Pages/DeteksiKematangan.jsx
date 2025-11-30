import { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Camera, Upload, Trash2, CheckCircle, Clock, Sparkles, Loader, RefreshCw, X, MapPin, Save, Settings, Sliders, AlertTriangle } from 'lucide-react';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import AnimatedBackground from '@/Components/AnimatedBackground';
import SkeletonLoader, { SkeletonList } from '@/Components/ui/SkeletonLoader';
import EmptyState from '@/Components/ui/EmptyState';
import LoadingOverlay from '@/Components/ui/LoadingOverlay';
import BackButton from '@/Components/BackButton';
import { useMangoDetection } from '@/hooks/useMangoDetection';
import CameraCapture from '@/Components/CameraCapture';

export default function DeteksiKematangan({ blokOptions = [], detectionHistory: initialHistory = [] }) {
    const { auth, flash } = usePage().props;
    const userRole = auth?.user?.role;
    const router = usePage().router;
    const fileInputRef = useRef(null);
    const [isDetecting, setIsDetecting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [showBlokModal, setShowBlokModal] = useState(false);
    const [selectedBlokId, setSelectedBlokId] = useState('');
    const [pendingFile, setPendingFile] = useState(null);
    const [pendingDetections, setPendingDetections] = useState(null);
    const [currentImage, setCurrentImage] = useState(null);
    const [currentDetections, setCurrentDetections] = useState([]);
    const [detectionHistory, setDetectionHistory] = useState(initialHistory || []);
    const [notification, setNotification] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, id: null }); // type: 'single' | 'all'

    const { 
        loadModel, 
        detectFromFile, 
        detectFromImage, 
        isLoading: isModelLoading, 
        isModelLoaded, 
        error: modelError,
        confidenceThreshold,
        classThresholds,
        iouThreshold,
        setConfidenceThreshold,
        setClassThreshold,
        setIouThreshold
    } = useMangoDetection();

    useEffect(() => {
        // Load model on mount
        loadModel().catch(err => {
            console.error('Failed to load model:', err);
        });
        
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    // Show notification from flash message
    useEffect(() => {
        if (flash?.success) {
            setNotification({
                type: 'success',
                message: flash.success,
            });
            setTimeout(() => setNotification(null), 5000);
        }
    }, [flash]);

    // Helper function to draw bounding boxes and labels on image
    const drawBoundingBoxesOnImage = async (imageFile, detections) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();
            
            reader.onload = (e) => {
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    
                    // Draw original image
                    ctx.drawImage(img, 0, 0);
                    
                    // Filter valid detections (termasuk Not_Mango untuk ditampilkan)
                    const validDetections = detections.filter(det => 
                        det.x !== undefined && det.y !== undefined && det.w !== undefined && det.h !== undefined
                    );
                    
                    // Draw bounding boxes and labels
                    validDetections.forEach((det) => {
                        // Skip Not_Mango - jangan tampilkan bounding box dan label untuk Not_Mango
                        if (det.className === 'Not_Mango' || det.className === 'Nota_Mango') {
                            return; // Skip drawing for Not_Mango
                        }

                        const x = det.x;
                        const y = det.y;
                        const w = det.w;
                        const h = det.h;
                        
                        // Get color based on maturity - sama seperti di CameraCapture
                        let color = '#FF6B6B'; // Default: Muda (red)
                        if (det.maturity >= 75) {
                            color = '#FF69B4'; // Matang (pink/magenta) - seperti di gambar
                        } else if (det.maturity >= 50) {
                            color = '#FFA07A'; // Setengah Matang (orange)
                        } else if (det.maturity > 0) {
                            color = '#FF6B6B'; // Muda (red)
                        }
                        
                        // Draw bounding box
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 4;
                        ctx.setLineDash([]);
                        ctx.strokeRect(x, y, w, h);
                        
                        // Draw label with maturity status
                        const maturityLabel = getMaturityLabel(det);
                        const confidenceValue = det.confidence !== undefined ? det.confidence : (det.conf !== undefined ? det.conf : 0);
                        const confidence = (confidenceValue * 100).toFixed(0);
                        const label = `${maturityLabel} ${confidence}%`;
                        
                        ctx.font = 'bold 18px Arial, sans-serif';
                        const textMetrics = ctx.measureText(label);
                        const textWidth = textMetrics.width;
                        const labelHeight = 30;
                        const padding = 10;
                        const spacing = 2;
                        
                        // Calculate label position - SELALU di atas bounding box, seperti di kamera
                        const labelWidth = textWidth + padding * 2;
                        let labelX = x; // Mulai dari posisi x bounding box
                        let labelY = y - labelHeight - spacing - 3; // Posisi di ATAS bounding box, sedikit lebih ke atas
                        
                        // Hanya pindahkan ke bawah jika BENAR-BENAR tidak muat di atas
                        if (y < labelHeight) {
                            // Hanya jika bounding box sudah sangat dekat dengan atas canvas
                            labelY = y + h + spacing;
                        } else {
                            // Jika masih muat di atas, pastikan label tidak keluar dari canvas atas
                            if (labelY < -5) {
                                labelY = 0; // Clamp ke 0 jika terlalu keluar
                            }
                        }
                        
                        // Sesuaikan posisi horizontal jika label terlalu ke kanan
                        if (labelX + labelWidth > canvas.width) {
                            labelX = Math.max(0, x + w - labelWidth);
                            if (labelX + labelWidth > canvas.width) {
                                labelX = Math.max(0, canvas.width - labelWidth);
                            }
                        }
                        
                        // Pastikan label tidak terlalu ke kiri
                        if (labelX < 0) {
                            labelX = 0;
                        }
                        
                        // Pastikan label dalam bounds vertikal
                        if (labelY < 0) {
                            labelY = 0;
                        }
                        if (labelY + labelHeight > canvas.height) {
                            labelY = Math.max(0, canvas.height - labelHeight);
                        }
                        
                        // Draw rounded rectangle background
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        const radius = 6;
                        const rectX = labelX;
                        const rectY = labelY;
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
                        ctx.strokeStyle = '#000000';
                        ctx.lineWidth = 2;
                        ctx.textBaseline = 'middle';
                        ctx.strokeText(label, labelX + padding, labelY + labelHeight / 2);
                        ctx.fillText(label, labelX + padding, labelY + labelHeight / 2);
                    });
                    
                    // Convert canvas to blob
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create image blob'));
                        }
                    }, 'image/jpeg', 0.9);
                };
                
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target.result;
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(imageFile);
        });
    };

    // Helper function to get maturity label
    const getMaturityLabel = (det) => {
        const statusMap = {
            'Unripe': 'Muda',
            'Half-Ripe': 'Setengah Matang',
            'Ripe': 'Matang',
            'OverRipe': 'Terlalu Matang',
            'Not_Mango': 'Bukan Mangga',
            'Nota_Mango': 'Bukan Mangga'
        };
        return statusMap[det.className] || det.status || 'Tidak Diketahui';
    };

    const handleFileSelect = async (file) => {
        if (!file) return;
        
        // Validate image type
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validImageTypes.includes(file.type.toLowerCase())) {
            alert('Silakan pilih file gambar yang valid (JPEG, PNG, atau WebP)');
            return;
        }

        try {
            setIsDetecting(true);
            
            const result = await detectFromFile(file);
            
            if (result && result.detections && result.detections.length > 0) {
                // Filter untuk cek apakah ada mangga yang benar-benar terdeteksi (bukan Not_Mango)
                const mangoDetections = result.detections.filter(det => 
                    det.className !== 'Not_Mango' && det.className !== 'Nota_Mango'
                );
                
                // Draw bounding boxes and labels on image (termasuk Not_Mango)
                const labeledImageBlob = await drawBoundingBoxesOnImage(file, result.detections);
                const labeledImageUrl = URL.createObjectURL(labeledImageBlob);
                
                // Get the best detection (highest confidence)
                const bestDetection = result.detections.reduce((best, current) => 
                    current.confidence > best.confidence ? current : best
                );
                
                const newDetection = {
                    id: Date.now(),
                    imageUrl: labeledImageUrl, // Use labeled image URL
                    maturity: bestDetection.maturity,
                    status: bestDetection.status,
                    confidence: bestDetection.confidence,
                    className: bestDetection.className,
                    recommendation: getRecommendation(bestDetection.maturity, bestDetection.status),
                    timestamp: 'Baru saja',
                    detections: result.detections,
                    imageWidth: result.imageWidth,
                    imageHeight: result.imageHeight,
                };
                
                setCurrentImage(labeledImageUrl); // Set labeled image
                setCurrentDetections(result.detections);
                setDetectionHistory([newDetection, ...detectionHistory]);
                
                // Store labeled image blob and detections for saving to database
                const labeledImageFile = new File([labeledImageBlob], file.name, { type: 'image/jpeg' });
                setPendingFile(labeledImageFile); // Store labeled image file
                setPendingDetections(result.detections);
                
                // Show blok selection modal
                setShowBlokModal(true);
            } else {
                alert('Tidak ada objek yang terdeteksi dalam gambar. Pastikan gambar terdapat objek yang jelas.');
            }
        } catch (error) {
            console.error('Detection error:', error);
            alert('Gagal melakukan deteksi: ' + error.message);
        } finally {
            setIsDetecting(false);
        }
    };

    const handleUploadImage = () => {
        fileInputRef.current?.click();
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
        // Reset input
        e.target.value = '';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDeleteDetection = async (id) => {
        // Buka modal konfirmasi
        setDeleteModal({ isOpen: true, type: 'single', id });
    };

    const confirmDeleteDetection = async () => {
        const { id } = deleteModal;
        if (!id) return;

        try {
            const response = await window.axios.delete(route('detections.destroy', id));
            if (response.data.success) {
                setDetectionHistory(detectionHistory.filter((d) => d.id !== id));
                if (currentImage && detectionHistory.find(d => d.id === id)?.imageUrl === currentImage) {
                    setCurrentImage(null);
                    setCurrentDetections([]);
                }
                setNotification({
                    type: 'success',
                    message: 'Riwayat deteksi berhasil dihapus',
                });
                setTimeout(() => setNotification(null), 3000);
            }
            setDeleteModal({ isOpen: false, type: null, id: null });
        } catch (error) {
            console.error('Error deleting detection:', error);
            setNotification({
                type: 'error',
                message: 'Gagal menghapus riwayat deteksi',
            });
            setTimeout(() => setNotification(null), 3000);
            setDeleteModal({ isOpen: false, type: null, id: null });
        }
    };

    const handleDeleteAllDetections = async () => {
        // Buka modal konfirmasi
        setDeleteModal({ isOpen: true, type: 'all', id: null });
    };

    const confirmDeleteAllDetections = async () => {
        try {
            const response = await window.axios.delete(route('detections.destroyAll'));
            if (response.data.success) {
                setDetectionHistory([]);
                setCurrentImage(null);
                setCurrentDetections([]);
                setNotification({
                    type: 'success',
                    message: 'Semua riwayat deteksi berhasil dihapus',
                });
                setTimeout(() => setNotification(null), 3000);
            }
            setDeleteModal({ isOpen: false, type: null, id: null });
        } catch (error) {
            console.error('Error deleting all detections:', error);
            setNotification({
                type: 'error',
                message: 'Gagal menghapus semua riwayat deteksi',
            });
            setTimeout(() => setNotification(null), 3000);
            setDeleteModal({ isOpen: false, type: null, id: null });
        }
    };

    const handleCameraCapture = async (file, detections) => {
        if (detections && detections.length > 0) {
            // Draw bounding boxes and labels on captured image (termasuk Not_Mango)
            const labeledImageBlob = await drawBoundingBoxesOnImage(file, detections);
            const labeledImageUrl = URL.createObjectURL(labeledImageBlob);
            
            const bestDetection = detections.reduce((best, current) => 
                current.confidence > best.confidence ? current : best
            );
            
            const newDetection = {
                id: Date.now(),
                imageUrl: labeledImageUrl, // Use labeled image URL
                maturity: bestDetection.maturity,
                status: bestDetection.status,
                confidence: bestDetection.confidence,
                className: bestDetection.className,
                recommendation: getRecommendation(bestDetection.maturity, bestDetection.status),
                timestamp: 'Baru saja',
                detections: detections,
            };
            
            setCurrentDetections(detections);
            setCurrentImage(labeledImageUrl); // Set labeled image
            setDetectionHistory([newDetection, ...detectionHistory]);
            
            // Store labeled image blob and detections for saving to database
            const labeledImageFile = new File([labeledImageBlob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setPendingFile(labeledImageFile); // Store labeled image file
            setPendingDetections(detections);
            
            setShowCamera(false);
            // Show blok selection modal
            setShowBlokModal(true);
        } else {
            alert('Tidak ada objek yang terdeteksi. Pastikan kamera mengarah ke objek yang jelas.');
        }
    };

    const handleSaveDetection = async () => {
        if (!selectedBlokId || !pendingFile || !pendingDetections) {
            alert('Silakan pilih blok terlebih dahulu');
            return;
        }

        try {
            setIsDetecting(true);
            
            // Validate required data
            if (!selectedBlokId) {
                alert('Silakan pilih blok terlebih dahulu');
                setIsDetecting(false);
                return;
            }
            
            if (!pendingFile) {
                alert('File gambar tidak ditemukan');
                setIsDetecting(false);
                return;
            }
            
            if (!pendingDetections || !Array.isArray(pendingDetections) || pendingDetections.length === 0) {
                alert('Data deteksi tidak valid');
                setIsDetecting(false);
                return;
            }
            
            const formData = new FormData();
            // Ensure blok_id is an integer
            const blokIdInt = parseInt(selectedBlokId, 10);
            if (isNaN(blokIdInt)) {
                alert('Blok ID tidak valid');
                setIsDetecting(false);
                return;
            }
            formData.append('blok_id', blokIdInt);
            formData.append('image', pendingFile);
            formData.append('detections', JSON.stringify(pendingDetections));
            
            // Debug: Log what we're sending
            console.log('Sending detection data:', {
                blok_id: blokIdInt,
                blok_id_type: typeof blokIdInt,
                image: pendingFile?.name,
                image_type: pendingFile?.type,
                image_size: pendingFile?.size,
                detections_count: pendingDetections?.length,
                detections_preview: pendingDetections?.slice(0, 1),
            });

            // Use axios which is already configured with CSRF token
            const response = await window.axios.post(route('detections.store'), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                // Show success notification
                const notificationMessage = response.data.message || 'Hasil deteksi berhasil disimpan!';
                setNotification({
                    type: 'success',
                    message: notificationMessage,
                });
                
                // Get saved detection data from response
                const savedDetection = response.data.detection;
                const serverImageUrl = response.data.image_url || savedDetection?.image_url;
                
                // Update detection history dengan URL dari server (jika ada)
                if (serverImageUrl && detectionHistory.length > 0) {
                    // Update the most recent detection with server URL
                    const updatedHistory = detectionHistory.map((det, index) => {
                        if (index === 0 && det.id === Date.now()) { // Most recent temporary detection
                            return {
                                ...det,
                                imageUrl: serverImageUrl, // Gunakan URL dari server
                                id: savedDetection?.id || det.id, // Gunakan ID dari server jika ada
                            };
                        }
                        return det;
                    });
                    setDetectionHistory(updatedHistory);
                }
                
                // Clear pending data
                setPendingFile(null);
                setPendingDetections(null);
                setSelectedBlokId('');
                setShowBlokModal(false);
                
                // Auto-hide notification after 5 seconds
                setTimeout(() => {
                    setNotification(null);
                }, 5000);
                
                // Reload page to update dashboard and get fresh data from server
                setTimeout(() => {
                    router.reload({ only: [] });
                }, 2000);
            } else {
                alert(response.data.message || 'Gagal menyimpan hasil deteksi');
            }
        } catch (error) {
            console.error('Save error:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            
            // Show detailed error message
            let errorMessage = 'Gagal menyimpan hasil deteksi';
            
            if (error.response?.data?.errors) {
                // Laravel validation errors
                const errors = error.response.data.errors;
                const errorList = Object.entries(errors)
                    .map(([field, messages]) => {
                        const msgArray = Array.isArray(messages) ? messages : [messages];
                        return `${field}: ${msgArray.join(', ')}`;
                    })
                    .join('\n');
                errorMessage = `Validasi gagal:\n${errorList}`;
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            // Show error in console for debugging
            console.error('Final error message:', errorMessage);
            
            alert(errorMessage);
        } finally {
            setIsDetecting(false);
        }
    };

    const getRecommendation = (maturity, status) => {
        if (maturity >= 75) {
            return 'Siap dipanen dalam 1-2 hari. Buah sudah matang optimal.';
        } else if (maturity >= 50) {
            return 'Tunggu 5-7 hari lagi. Buah masih dalam proses pematangan.';
        } else {
            return 'Masih memerlukan 2-3 minggu. Buah masih muda, perlu perawatan lebih lanjut.';
        }
    };

    const getMaturityColor = (maturity) => {
        if (maturity >= 75) return 'text-green-600 bg-green-100 border-green-200';
        if (maturity >= 50) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
        return 'text-orange-600 bg-orange-100 border-orange-200';
    };

    const getStatusColor = (maturity) => {
        if (maturity >= 75) return 'bg-gradient-to-r from-green-500 to-emerald-500';
        if (maturity >= 50) return 'bg-gradient-to-r from-yellow-500 to-amber-500';
        return 'bg-gradient-to-r from-orange-500 to-red-500';
    };


    return (
        <AuthenticatedLayout>
            <Head title="Deteksi Kematangan" />
            
            <div className="min-h-screen relative overflow-hidden">
                <AnimatedBackground />
                <LoadingOverlay show={isDetecting} message="Menganalisis kematangan dengan AI..." />
                <div className="relative p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
                    {/* Back Button */}
                    <div className="mb-4">
                        <BackButton href="/dashboard" />
                    </div>
                    
                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
                    >
                        <div className="flex items-center gap-3">
                            <motion.div
                                animate={{ rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                                className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg"
                            >
                                <Camera className="w-6 h-6 text-white" />
                            </motion.div>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                                    Deteksi Kematangan 🥭
                                </h1>
                                <p className="text-sm text-gray-600">Upload gambar buah untuk analisis AI</p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setIsLoading(true)}
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </motion.div>

                    {/* Upload Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Card 
                            className={`p-6 md:p-8 bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-50 border-2 border-dashed shadow-xl transition-all ${
                                isDragging 
                                    ? 'border-yellow-500 bg-gradient-to-br from-yellow-100 via-orange-100 to-amber-100 scale-105' 
                                    : 'border-yellow-400'
                            }`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="text-center">
                                <motion.div
                                    animate={{ 
                                        scale: isDetecting ? [1, 1.1, 1] : 1,
                                        rotate: isDetecting ? [0, 10, -10, 0] : 0
                                    }}
                                    transition={{ duration: 1, repeat: isDetecting ? Infinity : 0 }}
                                    className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
                                >
                                    {isDetecting ? (
                                        <Loader className="w-10 h-10 text-white animate-spin" />
                                    ) : (
                                        <Camera className="w-10 h-10 text-white" />
                                    )}
                                </motion.div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Gambar Mangga</h3>
                                <p className="text-sm text-gray-600 mb-6">
                                    Ambil foto buah mangga untuk analisis kematangan menggunakan AI
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    onChange={handleFileInputChange}
                                    className="hidden"
                                />
                                <div className="flex gap-3 justify-center">
                                    <Button
                                        onClick={handleUploadImage}
                                        disabled={isDetecting || !isModelLoaded}
                                        className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 flex items-center gap-2 shadow-lg"
                                    >
                                        <Upload className="w-4 h-4" />
                                        {isDetecting ? 'Mendeteksi...' : isModelLoading ? 'Memuat Model...' : 'Upload Gambar'}
                                    </Button>
                                    <Button 
                                        onClick={() => setShowCamera(true)}
                                        disabled={!isModelLoaded}
                                        variant="outline" 
                                        className="border-2 border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                                    >
                                        <Camera className="w-4 h-4 mr-2" />
                                        {isModelLoading ? 'Memuat Model...' : 'Buka Kamera'}
                                    </Button>
                                </div>
                                {modelError && (
                                    <p className="mt-4 text-sm text-red-600 text-center">
                                        Error: {modelError}
                                    </p>
                                )}
                                {!isModelLoaded && !isModelLoading && (
                                    <p className="mt-4 text-sm text-yellow-600 text-center">
                                        Model AI sedang dimuat...
                                    </p>
                                )}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Threshold Settings */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-blue-200/50 shadow-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <Sliders className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Pengaturan Akurasi Deteksi</h3>
                                    <p className="text-xs text-gray-600">Atur threshold sebelum melakukan deteksi</p>
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                {/* Threshold Per Kelas */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <Label className="text-base font-bold text-gray-900">
                                            Threshold Confidence Per Kelas
                                        </Label>
                                        <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 border-indigo-200">
                                            {Object.keys(classThresholds || {}).length} kelas
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-gray-600 bg-indigo-50 p-2 rounded-lg border border-indigo-200 mb-4">
                                        <strong>Penjelasan:</strong> Setiap kelas memiliki threshold sendiri untuk akurasi yang lebih baik. 
                                        Semakin rendah nilai, semakin sensitif deteksi untuk kelas tersebut.
                                    </p>
                                    
                                    {/* Unripe */}
                                    {classThresholds && 'Unripe' in classThresholds && (
                                        <div className="space-y-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="threshold-unripe" className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                                    Unripe (Muda)
                                                </Label>
                                                <span className="text-sm font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-lg">
                                                    {classThresholds.Unripe?.toFixed(2) || '0.15'}
                                                </span>
                                            </div>
                                            <input
                                                id="threshold-unripe"
                                                type="range"
                                                min="0.01"
                                                max="0.5"
                                                step="0.01"
                                                value={classThresholds.Unripe || 0.15}
                                                onChange={(e) => setClassThreshold('Unripe', parseFloat(e.target.value))}
                                                className="w-full h-2 bg-gradient-to-r from-orange-200 to-orange-300 rounded-lg appearance-none cursor-pointer slider"
                                                style={{
                                                    background: `linear-gradient(to right, #f97316 0%, #f97316 ${((classThresholds.Unripe || 0.15) / 0.5) * 100}%, #fed7aa ${((classThresholds.Unripe || 0.15) / 0.5) * 100}%, #fed7aa 100%)`
                                                }}
                                            />
                                        </div>
                                    )}
                                    
                                    {/* Half-Ripe */}
                                    {classThresholds && 'Half-Ripe' in classThresholds && (
                                        <div className="space-y-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="threshold-half-ripe" className="text-sm font-semibold text-yellow-700 flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                                                    Half-Ripe (Setengah Matang)
                                                </Label>
                                                <span className="text-sm font-bold text-yellow-600 bg-yellow-100 px-3 py-1 rounded-lg">
                                                    {classThresholds['Half-Ripe']?.toFixed(2) || '0.20'}
                                                </span>
                                            </div>
                                            <input
                                                id="threshold-half-ripe"
                                                type="range"
                                                min="0.01"
                                                max="0.5"
                                                step="0.01"
                                                value={classThresholds['Half-Ripe'] || 0.20}
                                                onChange={(e) => setClassThreshold('Half-Ripe', parseFloat(e.target.value))}
                                                className="w-full h-2 bg-gradient-to-r from-yellow-200 to-yellow-300 rounded-lg appearance-none cursor-pointer slider"
                                                style={{
                                                    background: `linear-gradient(to right, #eab308 0%, #eab308 ${((classThresholds['Half-Ripe'] || 0.20) / 0.5) * 100}%, #fef08a ${((classThresholds['Half-Ripe'] || 0.20) / 0.5) * 100}%, #fef08a 100%)`
                                                }}
                                            />
                                        </div>
                                    )}
                                    
                                    {/* Ripe */}
                                    {classThresholds && 'Ripe' in classThresholds && (
                                        <div className="space-y-2 p-3 bg-green-50 rounded-lg border border-green-200">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="threshold-ripe" className="text-sm font-semibold text-green-700 flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                                    Ripe (Matang)
                                                </Label>
                                                <span className="text-sm font-bold text-green-600 bg-green-100 px-3 py-1 rounded-lg">
                                                    {classThresholds.Ripe?.toFixed(2) || '0.25'}
                                                </span>
                                            </div>
                                            <input
                                                id="threshold-ripe"
                                                type="range"
                                                min="0.01"
                                                max="0.5"
                                                step="0.01"
                                                value={classThresholds.Ripe || 0.25}
                                                onChange={(e) => setClassThreshold('Ripe', parseFloat(e.target.value))}
                                                className="w-full h-2 bg-gradient-to-r from-green-200 to-green-300 rounded-lg appearance-none cursor-pointer slider"
                                                style={{
                                                    background: `linear-gradient(to right, #22c55e 0%, #22c55e ${((classThresholds.Ripe || 0.25) / 0.5) * 100}%, #bbf7d0 ${((classThresholds.Ripe || 0.25) / 0.5) * 100}%, #bbf7d0 100%)`
                                                }}
                                            />
                                        </div>
                                    )}
                                    
                                    {/* OverRipe */}
                                    {classThresholds && 'OverRipe' in classThresholds && (
                                        <div className="space-y-2 p-3 bg-red-50 rounded-lg border border-red-200">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="threshold-overripe" className="text-sm font-semibold text-red-700 flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                                    OverRipe (Terlalu Matang)
                                                </Label>
                                                <span className="text-sm font-bold text-red-600 bg-red-100 px-3 py-1 rounded-lg">
                                                    {classThresholds.OverRipe?.toFixed(2) || '0.20'}
                                                </span>
                                            </div>
                                            <input
                                                id="threshold-overripe"
                                                type="range"
                                                min="0.01"
                                                max="0.5"
                                                step="0.01"
                                                value={classThresholds.OverRipe || 0.20}
                                                onChange={(e) => setClassThreshold('OverRipe', parseFloat(e.target.value))}
                                                className="w-full h-2 bg-gradient-to-r from-red-200 to-red-300 rounded-lg appearance-none cursor-pointer slider"
                                                style={{
                                                    background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${((classThresholds.OverRipe || 0.20) / 0.5) * 100}%, #fecaca ${((classThresholds.OverRipe || 0.20) / 0.5) * 100}%, #fecaca 100%)`
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* IoU Threshold */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="iou-threshold" className="text-sm font-semibold text-gray-700">
                                            IoU Threshold (Non-Maximum Suppression)
                                        </Label>
                                        <span className="text-sm font-bold text-purple-600 bg-purple-100 px-3 py-1 rounded-lg">
                                            {iouThreshold.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <input
                                            id="iou-threshold"
                                            type="range"
                                            min="0.1"
                                            max="0.9"
                                            step="0.05"
                                            value={iouThreshold}
                                            onChange={(e) => setIouThreshold(parseFloat(e.target.value))}
                                            className="w-full h-2 bg-gradient-to-r from-purple-200 to-pink-200 rounded-lg appearance-none cursor-pointer slider"
                                            style={{
                                                background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${((iouThreshold - 0.1) / 0.8) * 100}%, #fce7f3 ${((iouThreshold - 0.1) / 0.8) * 100}%, #fce7f3 100%)`
                                            }}
                                        />
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>0.1 (Lebih Banyak Bbox)</span>
                                            <span>0.9 (Lebih Sedikit Bbox)</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600 bg-purple-50 p-2 rounded-lg border border-purple-200">
                                        <strong>Penjelasan:</strong> Mengontrol penghapusan bounding box yang tumpang tindih. 
                                        Semakin rendah, semakin banyak bbox yang dipertahankan. Semakin tinggi, hanya bbox terbaik yang dipertahankan.
                                    </p>
                                </div>

                                {/* Quick Presets */}
                                <div className="pt-4 border-t border-gray-200">
                                    <Label className="text-sm font-semibold text-gray-700 mb-3 block">Preset Cepat (Semua Kelas):</Label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setClassThreshold('Unripe', 0.10);
                                                setClassThreshold('Half-Ripe', 0.15);
                                                setClassThreshold('Ripe', 0.20);
                                                setClassThreshold('OverRipe', 0.15);
                                                setIouThreshold(0.4);
                                            }}
                                            className="text-xs border-blue-200 hover:bg-blue-50"
                                        >
                                            Sensitif
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setClassThreshold('Unripe', 0.15);
                                                setClassThreshold('Half-Ripe', 0.20);
                                                setClassThreshold('Ripe', 0.25);
                                                setClassThreshold('OverRipe', 0.20);
                                                setIouThreshold(0.5);
                                            }}
                                            className="text-xs border-green-200 hover:bg-green-50"
                                        >
                                            Default
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setClassThreshold('Unripe', 0.20);
                                                setClassThreshold('Half-Ripe', 0.25);
                                                setClassThreshold('Ripe', 0.30);
                                                setClassThreshold('OverRipe', 0.25);
                                                setIouThreshold(0.5);
                                            }}
                                            className="text-xs border-yellow-200 hover:bg-yellow-50"
                                        >
                                            Seimbang
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setClassThreshold('Unripe', 0.30);
                                                setClassThreshold('Half-Ripe', 0.35);
                                                setClassThreshold('Ripe', 0.40);
                                                setClassThreshold('OverRipe', 0.35);
                                                setIouThreshold(0.6);
                                            }}
                                            className="text-xs border-red-200 hover:bg-red-50"
                                        >
                                            Ketat
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Detection History */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card className="p-4 md:p-6 bg-white/80 backdrop-blur-sm border-2 border-gray-200/50 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Riwayat Deteksi</h3>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                                        {detectionHistory.length} hasil
                                    </Badge>
                                    {detectionHistory.length > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleDeleteAllDetections}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Hapus Semua
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {isLoading ? (
                                <SkeletonLoader type="list" count={3} />
                            ) : detectionHistory.length > 0 ? (
                                <div className="space-y-4">
                                    <AnimatePresence>
                                        {detectionHistory.map((result, index) => (
                                            <motion.div
                                                key={result.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -20 }}
                                                transition={{ delay: index * 0.1 }}
                                                whileHover={{ scale: 1.01, y: -2 }}
                                            >
                                                <Card className="p-4 sm:p-6 border-2 border-gray-200/50 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-white via-gray-50/30 to-white overflow-hidden">
                                                    {/* Image Preview - gambar di atas dengan bounding box dan label */}
                                                    <motion.div
                                                        whileHover={{ scale: 1.02 }}
                                                        className="w-full mb-4 bg-gradient-to-br from-yellow-100 via-orange-50 to-amber-50 rounded-2xl p-2 sm:p-3 shadow-lg overflow-hidden"
                                                    >
                                                        {result.imageUrl ? (
                                                            <img 
                                                                src={result.imageUrl} 
                                                                alt="Detection result dengan labeling" 
                                                                className="w-full h-auto max-h-96 sm:max-h-[500px] object-contain rounded-xl"
                                                                title="Gambar dengan bounding box dan label kematangan"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-64 flex items-center justify-center">
                                                                <span className="text-8xl">🥭</span>
                                                            </div>
                                                        )}
                                                    </motion.div>

                                                    {/* Details - keterangan di bawah gambar */}
                                                    <div className="space-y-4">
                                                        {/* Header dengan status dan tombol delete */}
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex-1">
                                                                <Badge className={`${getMaturityColor(result.maturity)} border-2 mb-2 shadow-md text-sm sm:text-base px-3 py-1.5`}>
                                                                    {result.status} - {result.maturity}%
                                                                </Badge>
                                                                <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-2 mt-1">
                                                                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                                    <span className="font-medium">{result.timestamp}</span>
                                                                </p>
                                                            </div>
                                                            <motion.button
                                                                whileHover={{ scale: 1.1, rotate: 5 }}
                                                                whileTap={{ scale: 0.9 }}
                                                                onClick={() => handleDeleteDetection(result.id)}
                                                                className="p-2 sm:p-2.5 hover:bg-red-50 rounded-xl transition-all duration-200 border border-red-200 hover:border-red-300 shadow-sm hover:shadow-md"
                                                            >
                                                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                                                            </motion.button>
                                                        </div>

                                                        {/* Progress Bar */}
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between text-xs sm:text-sm">
                                                                <span className="font-semibold text-gray-700">Tingkat Kematangan</span>
                                                                <span className="font-bold text-gray-900">{result.maturity}%</span>
                                                            </div>
                                                            <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner border border-gray-300/50">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${result.maturity}%` }}
                                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                                    className={`h-full ${getStatusColor(result.maturity)} rounded-full shadow-md relative overflow-hidden`}
                                                                >
                                                                    <motion.div
                                                                        animate={{ 
                                                                            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                                                                        }}
                                                                        transition={{ 
                                                                            duration: 2, 
                                                                            repeat: Infinity, 
                                                                            ease: "linear" 
                                                                        }}
                                                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                                                    />
                                                                </motion.div>
                                                            </div>
                                                        </div>

                                                        {/* Recommendation */}
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            transition={{ delay: index * 0.1 + 0.3 }}
                                                            className="flex items-start gap-3 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4 sm:p-5 rounded-2xl border-2 border-green-200/60 shadow-md hover:shadow-lg transition-shadow duration-300"
                                                        >
                                                            <div className="flex-shrink-0">
                                                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                                                                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                                                </div>
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className="text-xs sm:text-sm md:text-base text-green-800 font-semibold leading-relaxed">
                                                                    {result.recommendation}
                                                                </p>
                                                            </div>
                                                        </motion.div>
                                                    </div>
                                                </Card>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <EmptyState
                                    icon={Camera}
                                    title="Belum Ada Hasil Deteksi"
                                    message="Upload gambar mangga untuk memulai analisis kematangan dengan AI."
                                    actionLabel="Upload Gambar"
                                    onAction={handleUploadImage}
                                />
                            )}
                        </Card>
                    </motion.div>

                    {/* Info Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="p-4 md:p-6 bg-blue-50 border-2 border-blue-200 shadow-xl">
                            <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-blue-600" />
                                Tips Deteksi Akurat
                            </h4>
                            <ul className="text-sm text-gray-700 space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    <span>Ambil foto dengan pencahayaan yang cukup</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    <span>Pastikan buah terlihat jelas dan tidak blur</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    <span>Foto dari berbagai sisi untuk hasil lebih akurat</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-blue-600">•</span>
                                    <span>Hindari bayangan pada buah</span>
                                </li>
                            </ul>
                        </Card>
                    </motion.div>
                </div>

                {/* Camera Capture Modal */}
                {showCamera && (
                    <CameraCapture
                        isOpen={showCamera}
                        onClose={() => setShowCamera(false)}
                        onCapture={handleCameraCapture}
                        isModelLoaded={isModelLoaded}
                    />
                )}

                {/* Blok Selection Modal */}
                {showBlokModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-green-600" />
                                    Pilih Blok Kebun
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setShowBlokModal(false);
                                        setPendingFile(null);
                                        setPendingDetections(null);
                                        setSelectedBlokId('');
                                    }}
                                    className="h-8 w-8 p-0"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="blok" className="text-sm font-medium text-gray-700 mb-2 block">
                                        Blok Kebun <span className="text-red-500">*</span>
                                    </Label>
                                    <select
                                        id="blok"
                                        value={selectedBlokId}
                                        onChange={(e) => setSelectedBlokId(e.target.value)}
                                        className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg sm:rounded-xl focus:border-green-500 focus:ring-2 sm:focus:ring-4 focus:ring-green-500/20 bg-gradient-to-br from-white to-green-50/30 text-gray-900 font-medium shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%23334155%22%20d%3D%22M6%209L1%204h10z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px] sm:bg-[length:12px] bg-[right_8px_center] sm:bg-[right_12px_center] bg-no-repeat pr-8 sm:pr-10"
                                        required
                                    >
                                        <option value="" className="text-gray-500">Pilih Blok...</option>
                                        {blokOptions.map((blok) => (
                                            <option key={blok.value} value={blok.value} className="text-gray-900 bg-white">
                                                {blok.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {pendingDetections && pendingDetections.length > 0 && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                        <p className="text-sm text-green-700 font-medium mb-1">
                                            Hasil Deteksi:
                                        </p>
                                        <p className="text-xs text-green-600">
                                            {pendingDetections.length} mangga terdeteksi
                                            {pendingDetections[0]?.status && ` - Status: ${pendingDetections[0].status}`}
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowBlokModal(false);
                                            setPendingFile(null);
                                            setPendingDetections(null);
                                            setSelectedBlokId('');
                                        }}
                                        className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium"
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        onClick={handleSaveDetection}
                                        disabled={!selectedBlokId || isDetecting}
                                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                    >
                                        {isDetecting ? (
                                            <>
                                                <Loader className="w-4 h-4 mr-2 animate-spin" />
                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Simpan
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteModal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header dengan gradient merah */}
                            <div className="bg-gradient-to-r from-red-500 via-red-600 to-rose-600 p-6 text-white">
                                <div className="flex items-center gap-4">
                                    <motion.div
                                        animate={{ 
                                            scale: [1, 1.1, 1],
                                            rotate: [0, -10, 10, 0]
                                        }}
                                        transition={{ 
                                            duration: 0.5,
                                            repeat: Infinity,
                                            repeatDelay: 2
                                        }}
                                        className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"
                                    >
                                        <AlertTriangle className="w-8 h-8" />
                                    </motion.div>
                                    <div>
                                        <h3 className="text-xl font-bold">
                                            {deleteModal.type === 'all' ? 'Hapus Semua Deteksi' : 'Hapus Deteksi'}
                                        </h3>
                                        <p className="text-sm text-red-100 mt-1">
                                            Tindakan ini tidak dapat dibatalkan
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <div className="mb-6">
                                    <p className="text-gray-700 text-base leading-relaxed">
                                        {deleteModal.type === 'all' ? (
                                            <>
                                                Apakah Anda yakin ingin menghapus <span className="font-bold text-red-600">semua riwayat deteksi</span>? 
                                                Semua data yang telah disimpan akan hilang secara permanen.
                                            </>
                                        ) : (
                                            <>
                                                Apakah Anda yakin ingin menghapus <span className="font-bold text-red-600">riwayat deteksi ini</span>? 
                                                Data yang telah disimpan akan hilang secara permanen.
                                            </>
                                        )}
                                    </p>
                                </div>

                                {/* Warning Box */}
                                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-red-800 mb-1">
                                                Peringatan
                                            </p>
                                            <p className="text-xs text-red-700">
                                                Tindakan ini tidak dapat dibatalkan. Pastikan Anda benar-benar ingin menghapus data ini.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => setDeleteModal({ isOpen: false, type: null, id: null })}
                                        className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-medium py-2.5"
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        onClick={deleteModal.type === 'all' ? confirmDeleteAllDetections : confirmDeleteDetection}
                                        className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-medium py-2.5 shadow-lg hover:shadow-xl transition-all"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Ya, Hapus
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Notification Toast */}
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100]"
                    >
                        <Card className={`p-4 shadow-2xl ${
                            notification.type === 'success' 
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                                : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                        }`}>
                            <div className="flex items-center gap-3">
                                {notification.type === 'success' ? (
                                    <CheckCircle className="w-5 h-5" />
                                ) : (
                                    <X className="w-5 h-5" />
                                )}
                                <p className="font-medium">{notification.message}</p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setNotification(null)}
                                    className="ml-2 h-6 w-6 p-0 text-white hover:bg-white/20"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

