import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/apiClient";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated on mount via HTTP Only Cookie
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("/api/auth/verify");

        if (response.data.success) {
          const userData = response.data.user;

          setUser(userData);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (e) {
      console.error("Logout error", e);
    }
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = async (updatedUserData) => {
    try {
      const storedToken = localStorage.getItem("token");
      if (!storedToken) {
        throw new Error("No token found");
      }

      // Update user in state
      setUser(updatedUserData);

      // In a real app, you would make an API call here to update the user on the server
      // For now, we'll just update the local state
      // Example API call:
      // const response = await fetch("http://localhost:3001/api/auth/update-profile", {
      //   method: "PUT",
      //   headers: {
      //     "Content-Type": "application/json",
      //     Authorization: `Bearer ${storedToken}`,
      //   },
      //   body: JSON.stringify(updatedUserData),
      // });

      return updatedUserData;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

