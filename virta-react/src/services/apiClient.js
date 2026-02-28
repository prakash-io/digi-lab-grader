import axios from "axios";

// Get API URL - uses environment variable or falls back to localhost for development
const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    return "http://localhost:3001";
};

const apiClient = axios.create({
    baseURL: getApiUrl(),
    withCredentials: true, // Crucial for sending/receiving httpOnly cookies
});

// Optionally add an interceptor for global error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // If the server says we're unauthorized, we might want to auto-logout
        if (error.response && error.response.status === 401) {
            // Logic handled via Context instead here to prevent circular deps, 
            // but this is where token refresh would go if you had it.
        }
        return Promise.reject(error);
    }
);

export const api = apiClient;
