"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/lib/types";
import { api } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    const storedToken = localStorage.getItem("artha_token");
    
    Promise.resolve().then(() => {
      if (!mounted) return;
      if (storedToken) {
        setToken(storedToken);
        api.auth
          .me()
          .then((userData) => {
            if (mounted) {
              setUser(userData);
            }
          })
          .catch(() => {
            if (mounted) {
              localStorage.removeItem("artha_token");
              setToken(null);
              setUser(null);
            }
          })
          .finally(() => {
            if (mounted) {
              setIsLoading(false);
            }
          });
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (newToken: string) => {
    localStorage.setItem("artha_token", newToken);
    setToken(newToken);
    try {
      const userData = await api.auth.me();
      setUser(userData);
    } catch {
      // If me fails, keep token
    }
  };

  const logout = () => {
    localStorage.removeItem("artha_token");
    localStorage.removeItem("artha_active_store_id");
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const userData = await api.auth.me();
      setUser(userData);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        refreshUser,
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
