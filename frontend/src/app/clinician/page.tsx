"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Users } from "lucide-react";

export default function ClinicianDashboard() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return null; // Or a loading spinner
  }

  return (
    <div className="min-h-screen bg-wg-secondary p-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold text-wg-charcoal">
            Clinician Portal: {user?.name || "Clinician"}
          </h1>
          <p className="text-wg-charcoal/60">Supporting wholeness through compassion</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 text-wg-error hover:bg-wg-error/10 rounded-lg transition-all"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </header>
      
      <main>
        <div className="bg-wg-background p-12 rounded-2xl border border-dashed border-gray-300 text-center text-wg-charcoal/50">
          <Users size={48} className="mx-auto mb-4 opacity-20" />
          <p>Your clinician dashboard content will appear here.</p>
        </div>
      </main>
    </div>
  );
}
