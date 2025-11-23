import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Set CSRF token for all axios requests
const token = document.head.querySelector('meta[name="csrf-token"]');
if (token) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token.content;
}

// Interceptor to refresh CSRF token on 419 errors
window.axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // If we get a 419 error (CSRF token mismatch), refresh the token and retry
        if (error.response?.status === 419 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            // Get fresh CSRF token
            const freshToken = document.querySelector('meta[name="csrf-token"]')?.content;
            if (freshToken) {
                window.axios.defaults.headers.common['X-CSRF-TOKEN'] = freshToken;
                originalRequest.headers['X-CSRF-TOKEN'] = freshToken;
                
                // Retry the original request
                return window.axios(originalRequest);
            }
        }
        
        return Promise.reject(error);
    }
);
