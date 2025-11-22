import { useEffect, useState } from 'react';

/**
 * Custom hook to calculate top offset for fixed positioned elements
 * based on header visibility and position
 */
export function useHeaderOffset() {
    const [topOffset, setTopOffset] = useState(16); // Default: 1rem (top-4)

    useEffect(() => {
        const updateTopOffset = () => {
            // Find the header element (desktop or mobile)
            let header = null;
            
            // Try desktop header first (hidden md:block fixed top-0)
            const desktopSelectors = [
                '.hidden.md\\:block.fixed.top-0',
                '[class*="hidden"][class*="md:block"].fixed.top-0',
                'div.fixed.top-0.left-0.right-0.z-\\[100\\]',
            ];
            
            for (const selector of desktopSelectors) {
                header = document.querySelector(selector);
                if (header) break;
            }
            
            // If desktop header not found, try mobile header
            if (!header) {
                const mobileSelectors = [
                    '.md\\:hidden.fixed.top-0',
                    '[class*="md:hidden"].fixed.top-0',
                ];
                
                for (const selector of mobileSelectors) {
                    header = document.querySelector(selector);
                    if (header) break;
                }
            }
            
            // Alternative: find by z-index and position
            if (!header) {
                const allFixedElements = document.querySelectorAll('.fixed.top-0');
                for (const el of allFixedElements) {
                    const zIndex = window.getComputedStyle(el).zIndex;
                    if (zIndex === '100' || zIndex === '100px') {
                        header = el;
                        break;
                    }
                }
            }
            
            if (header) {
                const headerRect = header.getBoundingClientRect();
                const headerHeight = headerRect.height;
                const headerTop = headerRect.top;
                
                // If header is visible (top >= 0), add header height + padding
                // If header is hidden (top < 0), use default padding
                if (headerTop >= 0) {
                    // Header is visible, position toast below header
                    setTopOffset(headerHeight + 16); // header height + 1rem padding
                } else {
                    // Header is hidden, use default padding
                    setTopOffset(16);
                }
            } else {
                // Fallback if header not found
                setTopOffset(16);
            }
        };

        // Initial calculation
        updateTopOffset();

        // Update on scroll, resize, and animation frame
        const handleScroll = () => {
            requestAnimationFrame(updateTopOffset);
        };

        const handleResize = () => {
            requestAnimationFrame(updateTopOffset);
        };

        // Use MutationObserver to detect header visibility changes (for framer-motion animations)
        const observer = new MutationObserver(() => {
            requestAnimationFrame(updateTopOffset);
        });

        // Find header using same logic as updateTopOffset
        let headerToObserve = null;
        const desktopSelectors = [
            '.hidden.md\\:block.fixed.top-0',
            '[class*="hidden"][class*="md:block"].fixed.top-0',
            'div.fixed.top-0.left-0.right-0.z-\\[100\\]',
        ];
        
        for (const selector of desktopSelectors) {
            headerToObserve = document.querySelector(selector);
            if (headerToObserve) break;
        }
        
        if (!headerToObserve) {
            const mobileSelectors = [
                '.md\\:hidden.fixed.top-0',
                '[class*="md:hidden"].fixed.top-0',
            ];
            
            for (const selector of mobileSelectors) {
                headerToObserve = document.querySelector(selector);
                if (headerToObserve) break;
            }
        }
        
        // Alternative: find by z-index
        if (!headerToObserve) {
            const allFixedElements = document.querySelectorAll('.fixed.top-0');
            for (const el of allFixedElements) {
                const zIndex = window.getComputedStyle(el).zIndex;
                if (zIndex === '100' || zIndex === '100px') {
                    headerToObserve = el;
                    break;
                }
            }
        }
        
        if (headerToObserve) {
            observer.observe(headerToObserve, {
                attributes: true,
                attributeFilter: ['style', 'class'],
                childList: false,
                subtree: false,
            });
        }

        // Use IntersectionObserver to detect when header enters/leaves viewport
        const intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    requestAnimationFrame(updateTopOffset);
                });
            },
            {
                threshold: [0, 1],
                rootMargin: '0px',
            }
        );

        if (headerToObserve) {
            intersectionObserver.observe(headerToObserve);
        }

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleResize);
        
        // Also check periodically for smooth animations
        const interval = setInterval(() => {
            requestAnimationFrame(updateTopOffset);
        }, 100);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleResize);
            observer.disconnect();
            intersectionObserver.disconnect();
            clearInterval(interval);
        };
    }, []);

    return topOffset;
}

