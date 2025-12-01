import { useEffect, useRef } from 'react';

export default function DetectionCanvas({ 
    imageUrl, 
    detections = [], 
    imageWidth, 
    imageHeight,
    className = ''
}) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !imageUrl || detections.length === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            const container = containerRef.current;
            if (!container) return;

            const displayWidth = Math.min(container.offsetWidth, imageWidth || img.width);
            const scale = displayWidth / (imageWidth || img.width);
            const displayHeight = (imageHeight || img.height) * scale;

            canvas.width = displayWidth;
            canvas.height = displayHeight;

            // Clear canvas
            ctx.clearRect(0, 0, displayWidth, displayHeight);

            // Draw detections
            detections.forEach((det, index) => {
                const x = det.x * scale;
                const y = det.y * scale;
                const w = det.w * scale;
                const h = det.h * scale;

                // Get color based on maturity
                let color = '#FF6B6B';
                if (det.maturity >= 75) color = '#4ECDC4'; // Green for ripe
                else if (det.maturity >= 50) color = '#FFA07A'; // Yellow for half-ripe
                else if (det.maturity > 0) color = '#FF6B6B'; // Orange for unripe

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
        };

        img.src = imageUrl;
    }, [imageUrl, detections, imageWidth, imageHeight]);

    if (!imageUrl) return null;

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <img 
                src={imageUrl} 
                alt="Detection result" 
                className="w-full h-auto rounded-lg"
                style={{ maxWidth: '100%' }}
            />
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 pointer-events-none"
                style={{ maxWidth: '100%' }}
            />
        </div>
    );
}

