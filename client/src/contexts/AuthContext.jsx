import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { connectSocket, disconnectSocket, joinUserRoom } from "@/lib/socket";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = useCallback((userData, accessToken) => {
    localStorage.setItem("accessToken", accessToken);
    setUser(userData);
    setIsAuthenticated(true);
    const s = connectSocket();
    joinUserRoom(userData._id);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (_) {}
    localStorage.removeItem("accessToken");
    setUser(null);
    setIsAuthenticated(false);
    disconnectSocket();
    queryClient.clear();
  }, []);

  // Restore session on mount
  useEffect(() => {
    const restore = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await authApi.getMe();
        const userData = res.data.data;
        setUser(userData);
        setIsAuthenticated(true);
        const s = connectSocket();
        joinUserRoom(userData._id);
      } catch {
        localStorage.removeItem("accessToken");
      } finally {
        setIsLoading(false);
      }
    };
    restore();

    // Listen for forced logout (401 on refresh)
    const handleForceLogout = () => {
      setUser(null);
      setIsAuthenticated(false);
      disconnectSocket();
    };
    window.addEventListener("auth:logout", handleForceLogout);
    return () => window.removeEventListener("auth:logout", handleForceLogout);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
