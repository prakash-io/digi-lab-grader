import axios from "axios";

// Create an instance of axios that always sends and receives cookies
export const api = axios.create({
    baseURL: "http://localhost:3001", // Backend URL
    withCredentials: true, // Crucial for sending/receiving httpOnly cookies
});

// Optionally add an interceptor for global error handling
api.interceptors.response.use(
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
