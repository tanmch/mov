/**
 * Optimized localStorage utilities with debouncing
 */

// Debounce timers storage
const debounceTimers = {};

/**
 * Debounced localStorage setItem
 * @param {string} key - localStorage key
 * @param {any} value - Value to store (will be JSON stringified)
 * @param {number} delay - Debounce delay in ms (default: 500ms)
 */
export const setLocalStorageDebounced = (key, value, delay = 500) => {
    // Clear existing timer
    if (debounceTimers[key]) {
        clearTimeout(debounceTimers[key]);
    }

    // Set new timer
    debounceTimers[key] = setTimeout(() => {
        try {
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            localStorage.setItem(key, stringValue);
            delete debounceTimers[key];
        } catch (error) {
            console.error(`Error saving to localStorage (${key}):`, error);
            // Handle quota exceeded error
            if (error.name === 'QuotaExceededError') {
                console.warn('LocalStorage quota exceeded. Clearing old data...');
                // Clear old data (keep only last 7 days)
                clearOldLocalStorageData();
            }
        }
    }, delay);
};

/**
 * Get item from localStorage with error handling
 * @param {string} key - localStorage key
 * @param {any} defaultValue - Default value if key doesn't exist
 * @returns {any} Parsed value or defaultValue
 */
export const getLocalStorage = (key, defaultValue = null) => {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return defaultValue;
        try {
            return JSON.parse(item);
        } catch {
            return item; // Return as string if not valid JSON
        }
    } catch (error) {
        console.error(`Error reading from localStorage (${key}):`, error);
        return defaultValue;
    }
};

/**
 * Remove item from localStorage
 * @param {string} key - localStorage key
 */
export const removeLocalStorage = (key) => {
    try {
        localStorage.removeItem(key);
        // Clear debounce timer if exists
        if (debounceTimers[key]) {
            clearTimeout(debounceTimers[key]);
            delete debounceTimers[key];
        }
    } catch (error) {
        console.error(`Error removing from localStorage (${key}):`, error);
    }
};

/**
 * Clear old localStorage data (older than specified days)
 * @param {number} daysToKeep - Number of days to keep (default: 7)
 */
export const clearOldLocalStorageData = (daysToKeep = 7) => {
    try {
        const now = Date.now();
        const cutoffTime = now - (daysToKeep * 24 * 60 * 60 * 1000);
        
        // Keys that contain timestamp data
        const timestampKeys = [
            'dashboardTrendData',
            'dashboardNotifications',
            'monitoringSensorChartData'
        ];

        timestampKeys.forEach(key => {
            try {
                const data = getLocalStorage(key, []);
                if (Array.isArray(data)) {
                    const filtered = data.filter(item => {
                        const timestamp = item.timestamp || item.time || 0;
                        return timestamp >= cutoffTime;
                    });
                    if (filtered.length < data.length) {
                        localStorage.setItem(key, JSON.stringify(filtered));
                        console.log(`Cleaned ${data.length - filtered.length} old items from ${key}`);
                    }
                }
            } catch (error) {
                console.error(`Error cleaning ${key}:`, error);
            }
        });
    } catch (error) {
        console.error('Error clearing old localStorage data:', error);
    }
};

/**
 * Get localStorage size in bytes (approximate)
 * @returns {number} Size in bytes
 */
export const getLocalStorageSize = () => {
    try {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                    total += localStorage[key].length + key.length;
            }
        }
        return total;
    } catch (error) {
        console.error('Error calculating localStorage size:', error);
        return 0;
    }
};

/**
 * Clear all debounce timers (useful for cleanup)
 */
export const clearAllDebounceTimers = () => {
    Object.keys(debounceTimers).forEach(key => {
        clearTimeout(debounceTimers[key]);
        delete debounceTimers[key];
    });
};

