"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
      // This will be replaced with real API call to /api/auth/login
      // Simulated success for scaffolding
      const mockUser: User = {
        id: "mock-id-" + Math.random().toString(36).substr(2, 9),
        email,
        name: email.split('@')[0],
        role,
      };
      
      setUser(mockUser);
      
      if (role === "clinician") {
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
