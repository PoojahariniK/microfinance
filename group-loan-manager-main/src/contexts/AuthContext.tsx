import React, { createContext, useContext, useState, useCallback } from "react";

interface User {
  username: string;
  role: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("mf_user");
    return saved ? JSON.parse(saved) : null;
  });
const API_BASE = import.meta.env.VITE_API_BASE_URL;
  //  LOGIN (Backend)
  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) return false;

      const data = await res.json();

      const userData: User = {
        username: data.username,
        role: data.role,
        name: data.name,
      };

      setUser(userData);
      localStorage.setItem("mf_user", JSON.stringify(userData));

      return true;
    } catch (err) {
      console.error("Login error:", err);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    if (user) {
      try {
        await fetch(`${API_BASE}/api/users/logout`, {
          method: "POST",
          headers: {
            loggedInUser: user.username,
          },
        });
      } catch (err) {
        console.error("Logout error:", err);
      }
    }
    setUser(null);
    localStorage.removeItem("mf_user");
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be within AuthProvider");
  return ctx;
};