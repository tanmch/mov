import { useState, useEffect } from 'react';

/**
 * Hook to fetch article preview image from URL
 * Uses Open Graph image or fallback to screenshot service
 */
export function useArticleImage(url, fallbackEmoji = '📄') {
    const [imageUrl, setImageUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!url) {
            setImageUrl(null);
            setIsLoading(false);
            return;
        }

        let isMounted = true;
        let timeoutId = null;

        const fetchImage = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Try to get Open Graph image from backend
                try {
                    const controller = new AbortController();
                    timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

                    const response = await fetch(`/api/v1/articles/preview-image?url=${encodeURIComponent(url)}`, {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                        },
                        signal: controller.signal,
                    });

                    if (timeoutId) clearTimeout(timeoutId);

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.imageUrl) {
                            // Test if image loads with timeout
                            const img = new Image();
                            
                            const imageLoadPromise = new Promise((resolve, reject) => {
                                const imageTimeout = setTimeout(() => {
                                    reject(new Error('Image load timeout'));
                                }, 15000); // 15 second timeout for image load

                                img.onload = () => {
                                    clearTimeout(imageTimeout);
                                    if (isMounted) {
                                        setImageUrl(data.imageUrl);
                                        setIsLoading(false);
                                    }
                                    resolve();
                                };
                                img.onerror = (err) => {
                                    clearTimeout(imageTimeout);
                                    // Don't log CORS errors
                                    if (!err.message || !err.message.includes('CORS')) {
                                        console.warn('Image failed to load:', data.imageUrl);
                                    }
                                    reject(new Error('Image failed to load'));
                                };
                                // Try to load image
                                try {
                                    img.src = data.imageUrl;
                                } catch (e) {
                                    clearTimeout(imageTimeout);
                                    reject(e);
                                }
                            });

                            await imageLoadPromise;
                            return; // Success, exit early
                        } else {
                            // Backend found no image, but that's okay - will show emoji fallback
                            if (isMounted) {
                                setImageUrl(null);
                                setIsLoading(false);
                            }
                            return;
                        }
                    } else {
                        // Backend error, but continue to show emoji fallback
                        if (isMounted) {
                            setImageUrl(null);
                            setIsLoading(false);
                        }
                        return;
                    }
                } catch (err) {
                    if (timeoutId) clearTimeout(timeoutId);
                    // Silently handle errors - will show emoji fallback
                    if (isMounted) {
                        setImageUrl(null);
                        setIsLoading(false);
                    }
                }

                // Fallback: Use screenshot service (skip if backend already tried)
                // Note: Screenshot service might have CORS issues, so we'll just set to null
                // and let the component handle the fallback
                if (isMounted) {
                    setImageUrl(null);
                    setIsLoading(false);
                }
            } catch (err) {
                console.warn('Failed to fetch article image:', err);
                if (isMounted) {
                    setError(err.message);
                    setImageUrl(null);
                    setIsLoading(false);
                }
            }
        };

        fetchImage();

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [url]);

    return {
        imageUrl,
        isLoading,
        error,
        hasImage: !!imageUrl,
        fallbackEmoji,
    };
}

