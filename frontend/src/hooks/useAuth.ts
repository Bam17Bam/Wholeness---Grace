"use client";

import { useAuthContext } from "@/lib/auth-context";

export function useAuth() {
  const { user, isLoading, login, logout } = useAuthContext();
  
  return {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
    isClinician: user?.role === "clinician",
    isClient: user?.role === "client",
  };
}
