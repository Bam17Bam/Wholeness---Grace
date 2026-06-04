"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Lock, Heart, User, Briefcase } from "lucide-react";
import type { Role } from "@/lib/auth-context";

export default function LoginPage() {
  const [role, setRole] = useState<Role>("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password, role);
    } catch (err) {
      setError("Invalid email or password. Please try again.");
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-wg-secondary">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-wg-primary text-white">
              <Heart size={32} />
            </div>
          </div>
          <h1 className="text-4xl font-serif font-bold text-wg-charcoal mb-2">
            Wholeness & Grace
          </h1>
          <p className="text-wg-charcoal/70 italic font-serif">
            "Between sessions, toward wholeness"
          </p>
        </div>

        <div className="bg-wg-background p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex p-1 bg-wg-secondary rounded-lg mb-8">
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
                role === "client"
                  ? "bg-wg-background text-wg-charcoal shadow-sm"
                  : "text-wg-charcoal/60 hover:text-wg-charcoal"
              }`}
              onClick={() => setRole("client")}
            >
              <User size={18} />
              <span>Client</span>
            </button>
            <button
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
                role === "clinician"
                  ? "bg-wg-background text-wg-charcoal shadow-sm"
                  : "text-wg-charcoal/60 hover:text-wg-charcoal"
              }`}
              onClick={() => setRole("clinician")}
            >
              <Briefcase size={18} />
              <span>Clinician</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-wg-charcoal mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-wg-primary/50 transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-wg-charcoal mb-1">
                Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-wg-primary/50 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-wg-error text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-wg-primary text-white rounded-lg font-medium hover:bg-wg-primary/90 transition-all disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-wg-charcoal/50 text-xs">
            <Lock size={14} />
            <span>HIPAA Compliant & End-to-End Encrypted</span>
          </div>
          <p className="text-wg-charcoal/60 text-sm">
            Homework for whole hearts
          </p>
        </div>
      </div>
    </div>
  );
}
