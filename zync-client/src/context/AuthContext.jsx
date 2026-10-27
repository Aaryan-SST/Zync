import { createContext, useContext, useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { getCurrentUser, loginUser, registerUser, logoutUser } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false); // 1. Add connection state
  const socketRef = useRef(null);

  // Initial session restoration check
  useEffect(() => {
    getCurrentUser()
      .then((res) => {
        if (res.data?.user) {
          setUser(res.data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Socket.io connection lifecycle tied to authenticated user session
  useEffect(() => {
    if (user) {
      // Derive socket server URL directly from VITE_API_BASE_URL by stripping /api
      let socketUrl;
      if (import.meta.env.VITE_SOCKET_URL) {
        socketUrl = import.meta.env.VITE_SOCKET_URL;
      } else if (import.meta.env.VITE_API_BASE_URL) {
        socketUrl = import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, "");
      } else {
        socketUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:5000";
      }

      const newSocket = io(socketUrl, {
        withCredentials: true,
        transports: ["websocket", "polling"],
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      // 2. Update isConnected state on socket events
      newSocket.on("connect", () => {
        console.log("[socket] Connected to real-time server with id:", newSocket.id);
        setIsConnected(true);
      });

      newSocket.on("disconnect", () => {
        console.log("[socket] Disconnected");
        setIsConnected(false);
      });

      newSocket.on("connect_error", (err) => {
        console.warn("[socket] Connection error:", err.message);
        setIsConnected(false);
      });

      return () => {
        newSocket.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      };
    } else {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [user]);

  const login = async (credentials) => {
    const res = await loginUser(credentials);
    const authedUser = res.data?.user;
    setUser(authedUser);
    return authedUser;
  };

  const register = async (userData) => {
    const res = await registerUser(userData);
    const authedUser = res.data?.user;
    setUser(authedUser);
    return authedUser;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn("Logout request error:", err.message);
    } finally {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        socket,
        isConnected, // 3. Export isConnected in context
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}