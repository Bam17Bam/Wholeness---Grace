"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Layout, Clock, CheckCircle, Quote } from "lucide-react";
import { api } from "@/lib/api-client";
import { AssignmentCard } from "@/components/client/AssignmentCard";
import { Assignment } from "@/types";
import { BottomNav } from "@/components/client/BottomNav";

export default function ClientDashboard() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    setIsDataLoading(true);
    try {
      const response = await api.get("/assignments");
      setAssignments(response.data);
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
    } finally {
      setIsDataLoading(false);
    }
  };

  if (isLoading || !user || isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wg-background">
        <div className="animate-pulse text-wg-primary font-serif italic">Loading...</div>
      </div>
    );
  }

  const pendingCount = assignments.filter(a => a.status === 'pending').length;
  const completedCount = assignments.filter(a => a.status === 'submitted' || a.status === 'reviewed').length;
  const totalCount = assignments.length;

  return (
    <div className="min-h-screen bg-wg-secondary pb-24 md:pb-10 p-6 md:p-10">
      <header className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-serif font-bold text-wg-charcoal">
            Welcome, {user.name}
          </h1>
          <p className="text-wg-charcoal/60 italic font-serif">"Practicing wholeness, one step at a time"</p>
        </div>
        <button
          onClick={logout}
          className="hidden md:flex items-center gap-2 px-4 py-2 text-wg-error hover:bg-wg-error/5 rounded-lg transition-all text-sm font-medium"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </header>
      
      <main className="max-w-5xl mx-auto space-y-10">
        {/* Daily Inspiration */}
        <section className="bg-wg-background p-8 rounded-3xl border border-wg-primary/10 shadow-sm relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-5 text-wg-primary">
            <Quote size={120} />
          </div>
          <div className="relative z-10 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-wg-primary">Daily Inspiration</h2>
            <p className="text-xl font-serif italic text-wg-charcoal/80 leading-relaxed">
              "For I know the plans I have for you," declares the LORD, "plans to prosper you and not to harm you, plans to give you hope and a future."
            </p>
            <p className="text-sm text-wg-charcoal/40">— Jeremiah 29:11</p>
          </div>
        </section>

        {/* This Week's Progress */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-wg-charcoal/40">This Week's Progress</h2>
          <div className="bg-wg-background p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-end mb-4">
              <span className="text-lg font-serif font-bold text-wg-charcoal">
                {completedCount} of {totalCount} steps completed
              </span>
              <span className="text-wg-primary font-bold">{Math.round((completedCount/totalCount)*100)}%</span>
            </div>
            <div className="h-3 w-full bg-wg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-wg-primary transition-all duration-1000 ease-out" 
                style={{ width: `${(completedCount/totalCount)*100}%` }}
              />
            </div>
          </div>
        </section>

        {/* Active Homework */}
        <section className="space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-wg-charcoal/40">Active Homework</h2>
          
          {assignments.filter(a => a.status === 'pending' || a.status === 'overdue').length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assignments
                .filter(a => a.status === 'pending' || a.status === 'overdue')
                .map(assignment => (
                  <AssignmentCard key={assignment.id} assignment={assignment} />
                ))
              }
            </div>
          ) : (
            <div className="bg-wg-background/50 p-12 rounded-2xl border border-dashed border-gray-300 text-center text-wg-charcoal/40 italic">
              <CheckCircle size={40} className="mx-auto mb-3 opacity-20" />
              <p>All caught up! Nothing due right now.</p>
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
