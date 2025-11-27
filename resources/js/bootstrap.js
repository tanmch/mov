import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Function to get fresh CSRF token
const getCsrfToken = () => {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    return metaTag ? metaTag.content : '';
};

// Function to refresh CSRF token from server
const refreshCsrfToken = async () => {
    try {
        // Get fresh token from meta tag (updated by Inertia on page visits)
        const newToken = getCsrfToken();
        if (newToken) {
            window.axios.defaults.headers.common['X-CSRF-TOKEN'] = newToken;
            return newToken;
        }
    } catch (error) {
        console.error('Failed to refresh CSRF token:', error);
    }
    return null;
};

// Set initial CSRF token
const initialToken = getCsrfToken();
if (initialToken) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = initialToken;
}

// Request interceptor - always use fresh token
window.axios.interceptors.request.use(
    (config) => {
        // Always get fresh token from meta tag before each request
        const freshToken = getCsrfToken();
        if (freshToken) {
            config.headers['X-CSRF-TOKEN'] = freshToken;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle 419 errors
window.axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // If we get a 419 error (CSRF token mismatch), refresh and retry
        if (error.response?.status === 419 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            // Try to refresh CSRF token
            const newToken = await refreshCsrfToken();
            
            if (newToken) {
                // Update request headers with new token
                originalRequest.headers['X-CSRF-TOKEN'] = newToken;
                
                // Retry the original request
                return window.axios(originalRequest);
            } else {
                // If refresh fails, reload the page to get fresh session
                console.warn('CSRF token refresh failed, reloading page...');
                window.location.reload();
                return Promise.reject(error);
            }
        }
        
        return Promise.reject(error);
    }
);

// Auto-refresh CSRF token every 2 minutes to prevent expiration
// This ensures token is always fresh before session expires
setInterval(async () => {
    const token = getCsrfToken();
    if (token && window.axios) {
        window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
    }
}, 2 * 60 * 1000); // 2 minutes
