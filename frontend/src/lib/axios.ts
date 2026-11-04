import axios from 'axios';

// In development (npm run dev at :5173):
//   - Vite proxies /api → http://127.0.0.1:8000 so we use a relative path
// In production (served from 127.0.0.1:8000 after npm run build):
//   - The app is served from the same origin, so relative path still works perfectly
const baseURL = '/api/v1';

export const apiClient = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Automatically redirect to login on 401
apiClient.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
