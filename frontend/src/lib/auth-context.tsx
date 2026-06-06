"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

export type Role = "clinician" | "client";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, role: Role) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // For HIPAA compliance, we avoid storing sensitive session data in localStorage.
    // In a real app, the session would be restored by calling an /api/auth/me endpoint
    // which relies on a secure, HTTP-only refresh token cookie.
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role: Role) => {
    setIsLoading(true);
    try {
      const data = await api.post("/auth/login", { email, password });
      
      if (data.token) {
        api.setToken(data.token);
        // We'll also store the token in a cookie or memory
        // For this demo, let's just use the API client memory
      }
      
      setUser(data.user);
      
      if (data.user.role === "clinician") {
        router.push("/clinician");
      } else {
        router.push("/client");
      }
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    api.setToken(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
