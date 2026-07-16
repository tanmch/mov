import { useState, useEffect, useRef } from 'react';
import { getLocalStorage, setLocalStorageDebounced } from '@/utils/localStorage';

export function useChatNotifications() {
    const [notifications, setNotifications] = useState([]);
    const [latestNotification, setLatestNotification] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const previousNotificationIdsRef = useRef(new Set());
    const shownNotificationIdsRef = useRef((() => {
        // Load shown notifications from localStorage
        const saved = getLocalStorage('shownChatNotifications', []);
        return Array.isArray(saved) ? new Set(saved) : new Set();
    })());
    const pollingIntervalRef = useRef(null);
    const [isPageVisible, setIsPageVisible] = useState(true);

    // Detect page visibility
    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsPageVisible(!document.hidden);
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Mark notification as shown and read
    const markNotificationAsShown = async (notificationId) => {
        if (!notificationId) return;
        
        // Add to shown set
        shownNotificationIdsRef.current.add(notificationId);
        
        // Save to localStorage (keep only last 100 to prevent bloat)
        const shownIds = Array.from(shownNotificationIdsRef.current).slice(-100);
        setLocalStorageDebounced('shownChatNotifications', shownIds);
        
        // Mark as read in backend
        try {
            await window.axios.post(route('notifications.mark-read', notificationId));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const loadChatNotifications = async () => {
        if (!isPageVisible) return; // Skip if page is hidden
        
        try {
            const response = await window.axios.get(route('chat.notifications'));
            if (response.data.success) {
                const newNotifications = response.data.notifications || [];
                setUnreadCount(response.data.count || 0);

                // Filter out notifications that have already been shown
                const unshownNotifications = newNotifications.filter(n => 
                    !shownNotificationIdsRef.current.has(n.id)
                );

                // Check for new notifications (not in previous set AND not shown)
                const currentIds = new Set(newNotifications.map(n => n.id));
                const newIds = unshownNotifications
                    .filter(n => !previousNotificationIdsRef.current.has(n.id))
                    .map(n => n.id);

                if (newIds.length > 0) {
                    // Find the latest new notification
                    const latestNew = unshownNotifications.find(n => newIds.includes(n.id));
                    if (latestNew) {
                        setLatestNotification(latestNew);
                        // Mark as shown immediately
                        markNotificationAsShown(latestNew.id);
                        // Auto-clear after 5 seconds
                        setTimeout(() => {
                            setLatestNotification(null);
                        }, 5000);
                    }
                }

                previousNotificationIdsRef.current = currentIds;
                setNotifications(newNotifications);
            }
        } catch (error) {
            console.error('Failed to load chat notifications:', error);
        }
    };

    useEffect(() => {
        // Load immediately (but don't show notifications that were already shown)
        loadChatNotifications();

        // Poll every 8 seconds when page is visible (increased to reduce load)
        // Poll every 15 seconds when page is hidden
        const getPollingInterval = () => isPageVisible ? 8000 : 15000;
        
        const startPolling = () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
            const interval = getPollingInterval();
            pollingIntervalRef.current = setInterval(() => {
                if (isPageVisible) {
                    loadChatNotifications();
                }
            }, interval);
        };

        startPolling();

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [isPageVisible]);

    const clearLatestNotification = () => {
        setLatestNotification(null);
    };

    return {
        notifications,
        latestNotification,
        unreadCount,
        clearLatestNotification,
        refreshNotifications: loadChatNotifications,
    };
}

