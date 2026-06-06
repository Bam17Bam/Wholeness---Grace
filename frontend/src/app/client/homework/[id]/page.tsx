"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ChevronLeft, Send, Save, CheckCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import { Assignment } from "@/types";

export default function HomeworkDetailPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [response, setResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && params.id) {
      fetchAssignment();
    }
  }, [user, params.id]);

  const fetchAssignment = async () => {
    setIsDataLoading(true);
    try {
      const response = await api.get(`/assignments/${params.id}`);
      setAssignment(response.data);
    } catch (error) {
      console.error("Failed to fetch assignment:", error);
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post("/submissions", {
        assignmentId: assignment?.id,
        content: response,
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error("Failed to submit homework:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || isDataLoading || !assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wg-background">
        <div className="animate-pulse text-wg-primary font-serif italic">Loading...</div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-wg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 rounded-full bg-wg-success/10 text-wg-success mb-6">
          <CheckCircle size={64} />
        </div>
        <h1 className="text-3xl font-serif font-bold text-wg-charcoal mb-2">Well done!</h1>
        <p className="text-wg-charcoal/60 max-w-md mb-4">
          Your response has been securely submitted. 
          Take a moment to breathe and acknowledge the work you've done today.
        </p>
        <p className="text-wg-primary font-serif italic mb-8 text-lg">"You're doing great!"</p>
        <button
          onClick={() => router.push('/client')}
          className="py-3 px-8 bg-wg-primary text-white rounded-full font-medium transition-all shadow-md hover:shadow-lg"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-wg-secondary pb-10">
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-wg-secondary z-50">
        <div 
          className="h-full bg-wg-primary transition-all duration-500 ease-out" 
          style={{ width: response.trim() ? '75%' : '25%' }}
        />
      </div>

      <div className="max-w-3xl mx-auto p-6 md:p-10 pt-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-wg-charcoal/50 hover:text-wg-charcoal mb-8 transition-all font-medium group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back</span>
        </button>

        <article className="bg-wg-background rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 md:p-12 border-b border-gray-50 bg-wg-primary/5">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-wg-primary bg-wg-primary/10 px-3 py-1 rounded-full">
                Step 2 of 4
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-wg-charcoal mb-3">
              {assignment.title}
            </h1>
            <p className="text-wg-charcoal/70 text-lg leading-relaxed">{assignment.description}</p>
          </div>

          <div className="p-8 md:p-12 space-y-10">
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-wg-charcoal/40 mb-6">
                Reflection Prompt
              </h2>
              <div className="bg-wg-secondary/50 p-8 rounded-2xl border border-wg-primary/10 italic text-wg-charcoal/80 text-xl font-serif leading-relaxed">
                "{assignment.prompt}"
              </div>
            </section>

            <form onSubmit={handleSubmit} className="space-y-8">
              <section>
                <div className="flex justify-between items-center mb-6">
                  <label className="text-sm font-bold uppercase tracking-wider text-wg-charcoal/40">
                    Your Response
                  </label>
                  {response && (
                    <span className="text-xs text-wg-success flex items-center gap-1 font-medium">
                      <CheckCircle size={12} /> Draft saved
                    </span>
                  )}
                </div>
                <textarea
                  required
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  className="w-full min-h-[350px] p-8 rounded-2xl border border-gray-200 focus:outline-none focus:ring-4 focus:ring-wg-primary/10 focus:border-wg-primary/50 transition-all font-sans text-wg-charcoal text-lg leading-relaxed resize-none"
                  placeholder="Take your time to reflect and write here..."
                />
              </section>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !response.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-4 px-8 bg-wg-primary text-white rounded-2xl font-bold hover:bg-wg-primary/90 transition-all disabled:opacity-50 shadow-md hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Send size={18} />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Response'}</span>
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 py-4 px-8 bg-wg-background text-wg-charcoal border border-gray-200 rounded-2xl font-bold hover:bg-wg-secondary transition-all"
                >
                  <Save size={18} />
                  <span>Save Draft</span>
                </button>
              </div>
              <p className="text-center text-xs text-wg-charcoal/30 pt-4 font-medium tracking-wide">
                SECURE & ENCRYPTED FOR YOUR PRIVACY
              </p>
            </form>
          </div>
        </article>
      </div>
    </div>
  );
}
