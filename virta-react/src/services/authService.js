import { api } from "./apiClient";

export const authService = {
  async signup(username, email, password, userType = 'student') {
    try {
      const response = await api.post("/api/auth/signup", {
        username,
        email,
        password,
        userType,
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || `Signup failed: ${error.response.status}`);
      }
      throw new Error("Network error: Unable to connect to server");
    }
  },

  async login(username, password) {
    try {
      const response = await api.post("/api/auth/login", {
        username,
        password,
      });

      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || `Login failed: ${error.response.status}`);
      }
      throw new Error("Network error: Unable to connect to server");
    }
  },

  // Token is verified via HTTP Only cookie now, no token parameter needed
  async verifyToken() {
    try {
      const response = await api.get("/api/auth/verify");
      return response.data;
    } catch (error) {
      if (error.response) {
        throw new Error(error.response.data.message || `Token verification failed`);
      }
      throw new Error("Network error: Unable to connect to server");
    }
  },
};
