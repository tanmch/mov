import { useState, useRef, useCallback } from 'react';

const CLASS_NAMES = ['Half-Ripe', 'Not_Mango', 'OverRipe', 'Ripe', 'Unripe'];
const MODEL_PATH = '/ml-models/best.onnx';
const INPUT_SIZE = 640;
const CONF_THRESHOLD = 0.25;

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
    const [model, setModel] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [error, setError] = useState(null);
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
            
            // Load ONNX Runtime Web
            if (typeof window !== 'undefined' && !window.ort) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/ort.min.js';
                script.async = true;
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            const session = await window.ort.InferenceSession.create(MODEL_PATH, {
                executionProviders: ['wasm']
            });

            modelRef.current = session;
            setModel(session);
            setIsModelLoaded(true);
            setIsLoading(false);
            return session;
        } catch (err) {
            console.error('Error loading model:', err);
            setError(err.message);
            setIsLoading(false);
            throw err;
        }
    }, []);

    // Preprocess image
    const preprocess = useCallback((img) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = INPUT_SIZE;
        canvas.height = INPUT_SIZE;
        
        const scale = Math.min(INPUT_SIZE / img.width, INPUT_SIZE / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (INPUT_SIZE - w) / 2;
        const y = (INPUT_SIZE - h) / 2;
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
        ctx.drawImage(img, x, y, w, h);
        
        const data = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
        const tensor = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
        
        for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
            tensor[i] = data[i * 4] / 255.0;
            tensor[i + INPUT_SIZE * INPUT_SIZE] = data[i * 4 + 1] / 255.0;
            tensor[i + 2 * INPUT_SIZE * INPUT_SIZE] = data[i * 4 + 2] / 255.0;
        }
        
        return { tensor, scale, x, y, origW: img.width, origH: img.height };
    }, []);

    // Postprocess output
    const postprocess = useCallback((output, scale, x, y, origW, origH) => {
        const detections = [];
        const data = output.data;
        const dims = output.dims;
        
        if (dims.length === 3) {
            if (dims[1] === 84 || dims[1] === (4 + CLASS_NAMES.length)) {
                const numDets = dims[2];
                const numFeats = dims[1];
                
                for (let i = 0; i < numDets; i++) {
                    const x_center = data[i] * INPUT_SIZE;
                    const y_center = data[numDets + i] * INPUT_SIZE;
                    const width = data[2 * numDets + i] * INPUT_SIZE;
                    const height = data[3 * numDets + i] * INPUT_SIZE;
                    
                    let maxConf = 0;
                    let maxClass = 0;
                    for (let j = 0; j < numFeats - 4; j++) {
                        const conf = data[(4 + j) * numDets + i];
                        if (conf > maxConf) {
                            maxConf = conf;
                            maxClass = j;
                        }
                    }
                    
                    if (maxConf > CONF_THRESHOLD) {
                        const boxX = (x_center - width / 2 - x) / scale;
                        const boxY = (y_center - height / 2 - y) / scale;
                        detections.push({
                            x: Math.max(0, boxX),
                            y: Math.max(0, boxY),
                            w: width / scale,
                            h: height / scale,
                            conf: maxConf,
                            cls: maxClass,
                            className: CLASS_NAMES[maxClass]
                        });
                    }
                }
            } else if (dims[2] === 6) {
                const numDets = dims[1];
                for (let i = 0; i < numDets; i++) {
                    const idx = i * 6;
                    const conf = data[idx + 4];
                    if (conf > CONF_THRESHOLD) {
                        const x_center = data[idx] * INPUT_SIZE;
                        const y_center = data[idx + 1] * INPUT_SIZE;
                        const width = data[idx + 2] * INPUT_SIZE;
                        const height = data[idx + 3] * INPUT_SIZE;
                        const cls = Math.round(data[idx + 5]);
                        
                        detections.push({
                            x: Math.max(0, (x_center - width / 2 - x) / scale),
                            y: Math.max(0, (y_center - height / 2 - y) / scale),
                            w: width / scale,
                            h: height / scale,
                            conf: conf,
                            cls: cls,
                            className: CLASS_NAMES[cls]
                        });
                    }
                }
            }
        }
        
        // NMS (Non-Maximum Suppression)
        detections.sort((a, b) => b.conf - a.conf);
        const filtered = [];
        for (const det of detections) {
            let overlap = false;
            for (const existing of filtered) {
                const iou = getIOU(det, existing);
                if (iou > 0.5) {
                    overlap = true;
                    break;
                }
            }
            if (!overlap) filtered.push(det);
        }
        
        // Filter out "Not_Mango" - selalu hapus Not_Mango dari hasil deteksi
        // cls === 1 adalah index untuk 'Not_Mango' dalam CLASS_NAMES array
        return filtered.filter(det => det.cls !== 1);
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

            const { tensor, scale, x, y, origW, origH } = preprocess(img);
            const inputTensor = new window.ort.Tensor('float32', tensor, [1, 3, INPUT_SIZE, INPUT_SIZE]);
            const results = await modelRef.current.run({ [modelRef.current.inputNames[0]]: inputTensor });
            const output = results[modelRef.current.outputNames[0]];
            const detections = postprocess(output, scale, x, y, origW, origH);

            // Process detections to get maturity info
            const processedDetections = detections.map(det => {
                const maturityInfo = getMaturityStatus(det.className, det.conf);
                return {
                    ...det,
                    ...maturityInfo,
                    confidence: det.conf,
                    imageUrl: img.src
                };
            });

            setIsLoading(false);
            return {
                detections: processedDetections,
                imageUrl: img.src,
                imageWidth: origW,
                imageHeight: origH
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

            const { tensor, scale, x, y, origW, origH } = preprocess(img);
            const inputTensor = new window.ort.Tensor('float32', tensor, [1, 3, INPUT_SIZE, INPUT_SIZE]);
            const results = await modelRef.current.run({ [modelRef.current.inputNames[0]]: inputTensor });
            const output = results[modelRef.current.outputNames[0]];
            const detections = postprocess(output, scale, x, y, origW, origH);

            const processedDetections = detections.map(det => {
                const maturityInfo = getMaturityStatus(det.className, det.conf);
                return {
                    ...det,
                    ...maturityInfo,
                    confidence: det.conf,
                    imageUrl: imageSrc
                };
            });

            setIsLoading(false);
            return {
                detections: processedDetections,
                imageUrl: imageSrc,
                imageWidth: origW,
                imageHeight: origH
            };
        } catch (err) {
            console.error('Detection error:', err);
            setError(err.message);
            setIsLoading(false);
            throw err;
        }
    }, [loadModel, preprocess, postprocess]);

    return {
        loadModel,
        detectFromFile,
        detectFromImage,
        isLoading,
        isModelLoaded,
        error,
        CLASS_NAMES
    };
}

