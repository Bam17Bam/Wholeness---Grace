"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ChevronLeft, History as HistoryIcon, Search, Calendar, ChevronRight } from "lucide-react";
import { api } from "@/lib/api-client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Assignment } from "@/types";
import { BottomNav } from "@/components/client/BottomNav";
import Link from "next/link";

export default function HistoryPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDataLoading, setIsDataLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    setIsDataLoading(true);
    try {
      // Fetch both submitted and reviewed assignments
      const [submitted, reviewed] = await Promise.all([
        api.get("/assignments?status=submitted"),
        api.get("/assignments?status=reviewed")
      ]);
      setAssignments([...submitted.data, ...reviewed.data]);
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsDataLoading(false);
    }
  };

  const filtered = assignments.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (a.description && a.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading || !user || isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wg-background">
        <div className="animate-pulse text-wg-primary font-serif italic">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-wg-secondary pb-24 md:pb-10 p-6 md:p-10">
      <header className="max-w-5xl mx-auto mb-10">
        <button
          onClick={() => router.push('/client')}
          className="flex items-center gap-2 text-wg-charcoal/50 hover:text-wg-charcoal mb-8 transition-all font-medium group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>Dashboard</span>
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-wg-primary/10 text-wg-primary rounded-full shadow-sm">
              <HistoryIcon size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-wg-charcoal">Homework History</h1>
              <p className="text-wg-charcoal/60">Your journey toward wholeness, documented.</p>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-wg-charcoal/30" size={18} />
            <input
              type="text"
              placeholder="Search past assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-wg-background border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-wg-primary/10 focus:border-wg-primary/50 transition-all text-sm shadow-sm"
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map(assignment => (
              <Link 
                key={assignment.id} 
                href={`/client/homework/${assignment.id}`}
                className="bg-wg-background p-6 rounded-2xl border border-gray-100 flex items-center justify-between hover:border-wg-primary/30 hover:shadow-md transition-all group"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="hidden md:block p-3 bg-wg-secondary rounded-xl text-wg-charcoal/30 group-hover:text-wg-primary/50 transition-colors">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-wg-charcoal mb-1">{assignment.title}</h3>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={assignment.status} />
                      <span className="text-xs text-wg-charcoal/40 font-medium">
                        Completed on {new Date(assignment.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-2 bg-wg-secondary rounded-full group-hover:bg-wg-primary group-hover:text-white transition-all text-wg-charcoal/30">
                  <ChevronRight size={20} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-wg-background/50 p-16 rounded-3xl border border-dashed border-gray-300 text-center text-wg-charcoal/40 italic">
            <p className="text-lg">
              {searchTerm ? 'No homework matches your search.' : 'Your history will appear here once you complete your first exercise.'}
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
