// hooks/useMangoDetection.js
import { useState, useRef, useCallback } from 'react';
import * as ort from 'onnxruntime-web';

const CLASS_NAMES = ['Half-Ripe', 'Not_Mango', 'OverRipe', 'Ripe', 'Unripe'];
const MODEL_PATH = '/ml-models/final2.onnx';
const INPUT_SIZE = 640;
const DEFAULT_CONF_THRESHOLD = 0.15;
const DEFAULT_IOU_THRESHOLD = 0.5;

// Default threshold per kelas untuk akurasi yang lebih baik
const DEFAULT_CLASS_THRESHOLDS = {
    'Unripe': 0.15,
    'Half-Ripe': 0.20,
    'Ripe': 0.25,
    'OverRipe': 0.20,
    'Not_Mango': 0.10,
};

// Map class names to maturity status
const getMaturityStatus = (className, confidence) => {
    const maturityMap = {
        'Unripe': { status: 'Muda', maturity: 20, color: 'orange' },
        'Half-Ripe': { status: 'Setengah Matang', maturity: 50, color: 'yellow' },
        'Ripe': { status: 'Matang', maturity: 85, color: 'green' },
        'OverRipe': { status: 'Terlalu Matang', maturity: 95, color: 'red' },
        'Not_Mango': { status: 'Bukan Mangga', maturity: 0, color: 'gray' }
    };
    
    return maturityMap[className] || { status: 'Tidak Diketahui', maturity: 0, color: 'gray' };
};

export function useMangoDetection() {
    const [isLoading, setIsLoading] = useState(false);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [confidenceThreshold, setConfidenceThreshold] = useState(DEFAULT_CONF_THRESHOLD); // Global threshold (fallback)
    const [classThresholds, setClassThresholds] = useState(DEFAULT_CLASS_THRESHOLDS); // Threshold per kelas
    const [iouThreshold, setIouThreshold] = useState(DEFAULT_IOU_THRESHOLD);
    
    const modelRef = useRef(null);

    // Load ONNX model
    const loadModel = useCallback(async () => {
        if (modelRef.current) {
            setIsModelLoaded(true);
            return modelRef.current;
        }

        try {
            setIsLoading(true);
            setError(null);
            
            const session = await ort.InferenceSession.create(MODEL_PATH, {
                executionProviders: ['wasm']
            });

            modelRef.current = session;
            setIsModelLoaded(true);
            setIsLoading(false);
            console.log('✅ Model loaded successfully');
            return session;
        } catch (err) {
            console.error('Error loading model:', err);
            setError(err.message);
            setIsLoading(false);
            throw err;
        }
    }, []);

    // Preprocess image - letterbox ke 640x640
    const preprocess = useCallback((img) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = INPUT_SIZE;
        canvas.height = INPUT_SIZE;
        
        // Letterbox dengan padding
        const scale = Math.min(INPUT_SIZE / img.width, INPUT_SIZE / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const offsetX = (INPUT_SIZE - w) / 2;
        const offsetY = (INPUT_SIZE - h) / 2;
        
        // Background hitam
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
        ctx.drawImage(img, offsetX, offsetY, w, h);
        
        // Convert ke tensor [1, 3, 640, 640] channel-first, normalized 0-1
        const data = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
        const tensor = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
        
        for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
            tensor[i] = data[i * 4] / 255.0; // R
            tensor[i + INPUT_SIZE * INPUT_SIZE] = data[i * 4 + 1] / 255.0; // G
            tensor[i + 2 * INPUT_SIZE * INPUT_SIZE] = data[i * 4 + 2] / 255.0; // B
        }
        
        return { 
            tensor, 
            scale, 
            offsetX, 
            offsetY, 
            origW: img.width, 
            origH: img.height 
        };
    }, []);

    // Calculate IoU
    const getIOU = (box1, box2) => {
        const x1 = Math.max(box1.x, box2.x);
        const y1 = Math.max(box1.y, box2.y);
        const x2 = Math.min(box1.x + box1.w, box2.x + box2.w);
        const y2 = Math.min(box1.y + box1.h, box2.y + box2.h);
        if (x2 < x1 || y2 < y1) return 0;
        const inter = (x2 - x1) * (y2 - y1);
        const area1 = box1.w * box1.h;
        const area2 = box2.w * box2.h;
        return inter / (area1 + area2 - inter);
    };

    // Postprocess output - mendukung berbagai format output YOLO
    const postprocess = useCallback((output, imageInfo, confThreshold, iouThres) => {
        const { scale, offsetX, offsetY, origW, origH } = imageInfo;
        const confT = confThreshold ?? confidenceThreshold; // Global threshold (fallback)
        const iouT = iouThres ?? iouThreshold;
        
        // Helper function untuk mendapatkan threshold berdasarkan kelas
        const getClassThreshold = (className) => {
            return classThresholds[className] ?? confT;
        };
        
        const detections = [];
        const data = output.data;
        const dims = output.dims;
        
        console.log('📊 Postprocess - Output dims:', dims);
        console.log('📊 Postprocess - Image info:', { scale, offsetX, offsetY, origW, origH });
        console.log('📊 Postprocess - Thresholds:', { confThreshold: confT, iouThreshold: iouT });
        
        const numClasses = CLASS_NAMES.length;
        
        // Deteksi format output otomatis
        if (dims.length === 3) {
            const [batch, dim1, dim2] = dims;
            
            // Format [1, N, C] atau [1, C, N] dimana C = 4 + numClasses
            let numDets, numFeats;
            let isTransposed = false;
            
            if (dim1 === 4 + numClasses || dim1 === 84) {
                // Format [1, C, N] - features di dim1
                numFeats = dim1;
                numDets = dim2;
            } else if (dim2 === 4 + numClasses || dim2 === 84) {
                // Format [1, N, C] - features di dim2
                numFeats = dim2;
                numDets = dim1;
                isTransposed = true;
            } else if (dim2 === 6) {
                // Format [1, numDets, 6] - [x, y, w, h, conf, cls]
                numDets = dim1;
                for (let i = 0; i < numDets; i++) {
                    const idx = i * 6;
                    const x_center_raw = data[idx];
                    const y_center_raw = data[idx + 1];
                    const width_raw = data[idx + 2];
                    const height_raw = data[idx + 3];
                    const conf = data[idx + 4];
                    const cls = Math.round(data[idx + 5]);
                    const className = CLASS_NAMES[cls] || CLASS_NAMES[0];
                    
                    // Gunakan threshold khusus untuk kelas ini
                    const classThreshold = getClassThreshold(className);
                    
                    if (conf > classThreshold) {
                        // Normalize jika perlu (jika <= 1 berarti normalized, > 1 berarti pixel space)
                        const x_center = x_center_raw <= 1 ? x_center_raw * INPUT_SIZE : x_center_raw;
                        const y_center = y_center_raw <= 1 ? y_center_raw * INPUT_SIZE : y_center_raw;
                        const width = width_raw <= 1 ? width_raw * INPUT_SIZE : width_raw;
                        const height = height_raw <= 1 ? height_raw * INPUT_SIZE : height_raw;
                        
                        // Convert center to corner (dalam 640x640 space)
                        const x0_640 = x_center - width / 2;
                        const y0_640 = y_center - height / 2;
                        
                        // Remove letterbox offset
                        const x0_noPad = x0_640 - offsetX;
                        const y0_noPad = y0_640 - offsetY;
                        
                        // Scale back to original image size
                        const boxX = x0_noPad / scale;
                        const boxY = y0_noPad / scale;
                        const boxW = width / scale;
                        const boxH = height / scale;
                        
                        // Clamp to image bounds
                        const clampedX = Math.max(0, Math.min(boxX, origW));
                        const clampedY = Math.max(0, Math.min(boxY, origH));
                        const clampedW = Math.min(boxW, origW - clampedX);
                        const clampedH = Math.min(boxH, origH - clampedY);
                        
                        detections.push({
                            x: clampedX,
                            y: clampedY,
                            w: clampedW,
                            h: clampedH,
                            conf: conf,
                            cls: cls,
                            className: CLASS_NAMES[cls] || CLASS_NAMES[0]
                        });
                    }
                }
            } else {
                console.warn('⚠️ Unknown output format:', dims);
                return [];
            }
            
            // Parse format [1, C, N] atau [1, N, C]
            if (numFeats && numDets) {
                for (let i = 0; i < numDets; i++) {
                    let x_center_raw, y_center_raw, width_raw, height_raw;
                    const classScores = [];
                    
                    if (isTransposed) {
                        // Format [1, N, C]
                        const idx = i * numFeats;
                        x_center_raw = data[idx];
                        y_center_raw = data[idx + 1];
                        width_raw = data[idx + 2];
                        height_raw = data[idx + 3];
                        
                        for (let j = 0; j < numClasses; j++) {
                            classScores.push(data[idx + 4 + j]);
                        }
                    } else {
                        // Format [1, C, N]
                        x_center_raw = data[i];
                        y_center_raw = data[numDets + i];
                        width_raw = data[2 * numDets + i];
                        height_raw = data[3 * numDets + i];
                        
                        for (let j = 0; j < numClasses; j++) {
                            classScores.push(data[(4 + j) * numDets + i]);
                        }
                    }
                    
                    // Find max class
                    let maxClassIndex = 0;
                    let maxClassScore = classScores[0];
                    for (let j = 1; j < classScores.length; j++) {
                        if (classScores[j] > maxClassScore) {
                            maxClassScore = classScores[j];
                            maxClassIndex = j;
                        }
                    }
                    
                    // Use maxClassScore as confidence
                    const conf = maxClassScore;
                    const className = CLASS_NAMES[maxClassIndex] || CLASS_NAMES[0];
                    
                    // Gunakan threshold khusus untuk kelas ini
                    const classThreshold = getClassThreshold(className);
                    
                    if (conf > classThreshold) {
                        // Normalize jika perlu
                        const x_center = x_center_raw <= 1 ? x_center_raw * INPUT_SIZE : x_center_raw;
                        const y_center = y_center_raw <= 1 ? y_center_raw * INPUT_SIZE : y_center_raw;
                        const width = width_raw <= 1 ? width_raw * INPUT_SIZE : width_raw;
                        const height = height_raw <= 1 ? height_raw * INPUT_SIZE : height_raw;
                        
                        // Convert center to corner (dalam 640x640 space)
                        const x0_640 = x_center - width / 2;
                        const y0_640 = y_center - height / 2;
                        
                        // Remove letterbox offset
                        const x0_noPad = x0_640 - offsetX;
                        const y0_noPad = y0_640 - offsetY;
                        
                        // Scale back to original image size
                        const boxX = x0_noPad / scale;
                        const boxY = y0_noPad / scale;
                        const boxW = width / scale;
                        const boxH = height / scale;
                        
                        // Clamp to image bounds
                        const clampedX = Math.max(0, Math.min(boxX, origW));
                        const clampedY = Math.max(0, Math.min(boxY, origH));
                        const clampedW = Math.min(boxW, origW - clampedX);
                        const clampedH = Math.min(boxH, origH - clampedY);
                        
                        detections.push({
                            x: clampedX,
                            y: clampedY,
                            w: clampedW,
                            h: clampedH,
                            conf: conf,
                            cls: maxClassIndex,
                            className: CLASS_NAMES[maxClassIndex] || CLASS_NAMES[0]
                        });
                    }
                }
            }
        } else {
            console.warn('⚠️ Unexpected output dimensions:', dims);
            return [];
        }
        
        // NMS (Non-Maximum Suppression)
        detections.sort((a, b) => b.conf - a.conf);
        const filtered = [];
        for (const det of detections) {
            let overlap = false;
            for (const existing of filtered) {
                const iou = getIOU(det, existing);
                if (iou > iouT) {
                    overlap = true;
                    break;
                }
            }
            if (!overlap) filtered.push(det);
        }
        
        // JANGAN filter Not_Mango untuk sementara (sesuai requirement)
        const finalDetections = filtered;
        
        console.log(`📊 Postprocess result: ${detections.length} raw -> ${filtered.length} after NMS`);
        if (finalDetections.length > 0) {
            const firstDet = finalDetections[0];
            console.log('📊 First final detection:', {
                '640x640 coords': {
                    x_center: (firstDet.x * scale + offsetX) * (INPUT_SIZE / origW),
                    y_center: (firstDet.y * scale + offsetY) * (INPUT_SIZE / origH),
                    width: firstDet.w * scale * (INPUT_SIZE / origW),
                    height: firstDet.h * scale * (INPUT_SIZE / origH)
                },
                'final coords': {
                    x: firstDet.x,
                    y: firstDet.y,
                    w: firstDet.w,
                    h: firstDet.h
                },
                className: firstDet.className,
                conf: firstDet.conf,
                cls: firstDet.cls
            });
        }
        
        return finalDetections;
    }, [confidenceThreshold, classThresholds, iouThreshold]);

    // Detect from image file
    const detectFromFile = useCallback(async (file) => {
        try {
            if (!modelRef.current) {
                await loadModel();
            }

            setIsLoading(true);
            setError(null);

            const img = await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error('Gagal memuat gambar'));
                image.src = URL.createObjectURL(file);
            });

            const imageInfo = preprocess(img);
            const inputTensor = new ort.Tensor('float32', imageInfo.tensor, [1, 3, INPUT_SIZE, INPUT_SIZE]);
            const results = await modelRef.current.run({ [modelRef.current.inputNames[0]]: inputTensor });
            const output = results[modelRef.current.outputNames[0]];
            const detections = postprocess(output, imageInfo);

            // Process detections to get maturity info
            const processedDetections = detections.map((det) => {
                const maturityInfo = getMaturityStatus(det.className, det.conf);
                return {
                    ...det,
                    ...maturityInfo,
                    confidence: det.conf, // Alias untuk compatibility
                    imageUrl: img.src
                };
            });

            console.log(`✅ Processed ${processedDetections.length} detections from file`);
            
            setIsLoading(false);
            return {
                detections: processedDetections,
                imageUrl: img.src,
                imageWidth: imageInfo.origW,
                imageHeight: imageInfo.origH
            };
        } catch (err) {
            console.error('Detection error:', err);
            setError(err.message);
            setIsLoading(false);
            throw err;
        }
    }, [loadModel, preprocess, postprocess]);

    // Detect from image URL or base64
    const detectFromImage = useCallback(async (imageSrc) => {
        try {
            if (!modelRef.current) {
                await loadModel();
            }

            setIsLoading(true);
            setError(null);

            const img = await new Promise((resolve, reject) => {
                const image = new Image();
                image.crossOrigin = 'anonymous';
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error('Gagal memuat gambar'));
                image.src = imageSrc;
            });

            const imageInfo = preprocess(img);
            const inputTensor = new ort.Tensor('float32', imageInfo.tensor, [1, 3, INPUT_SIZE, INPUT_SIZE]);
            const results = await modelRef.current.run({ [modelRef.current.inputNames[0]]: inputTensor });
            const output = results[modelRef.current.outputNames[0]];
            const detections = postprocess(output, imageInfo);

            // Process detections to get maturity info
            const processedDetections = detections.map((det) => {
                const maturityInfo = getMaturityStatus(det.className, det.conf);
                return {
                    ...det,
                    ...maturityInfo,
                    confidence: det.conf, // Alias untuk compatibility
                    imageUrl: imageSrc
                };
            });

            console.log(`✅ Processed ${processedDetections.length} detections from image`);
            
            setIsLoading(false);
            return {
                detections: processedDetections,
                imageUrl: imageSrc,
                imageWidth: imageInfo.origW,
                imageHeight: imageInfo.origH
            };
        } catch (err) {
            console.error('Detection error:', err);
            setError(err.message);
            setIsLoading(false);
            throw err;
        }
    }, [loadModel, preprocess, postprocess]);

    // Setter functions untuk threshold
    const setConfThreshold = useCallback((value) => {
        setConfidenceThreshold(value);
        console.log('[MangoDetection] Confidence threshold updated:', value);
    }, []);

    const setIouThres = useCallback((value) => {
        setIouThreshold(value);
        console.log('[MangoDetection] IoU threshold updated:', value);
    }, []);
    
    // Setter untuk threshold per kelas
    const setClassThreshold = useCallback((className, value) => {
        setClassThresholds(prev => {
            const updated = { ...prev, [className]: value };
            console.log('[MangoDetection] Class threshold updated:', { className, value, all: updated });
            return updated;
        });
    }, []);
    
    // Setter untuk semua class thresholds sekaligus
    const setAllClassThresholds = useCallback((thresholds) => {
        setClassThresholds(thresholds);
        console.log('[MangoDetection] All class thresholds updated:', thresholds);
    }, []);

    return {
        loadModel,
        detectFromFile,
        detectFromImage,
        isLoading,
        isModelLoaded,
        error,
        CLASS_NAMES,
        confidenceThreshold,
        classThresholds,
        iouThreshold,
        setConfidenceThreshold: setConfThreshold,
        setClassThreshold,
        setAllClassThresholds,
        setIouThreshold: setIouThres
    };
}
