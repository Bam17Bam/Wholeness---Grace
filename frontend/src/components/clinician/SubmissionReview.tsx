"use client";

import { useState } from "react";
import { Submission, Assignment } from "@/types";
import { MessageSquare, CheckCircle, ChevronLeft, Calendar, User } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { api } from "@/lib/api-client";

interface SubmissionReviewProps {
  submission: Submission;
  assignment: Assignment;
  clientName: string;
  onBack: () => void;
  onReviewSubmit: (review: string) => void;
}

export default function SubmissionReview({ 
  submission, 
  assignment, 
  clientName, 
  onBack, 
  onReviewSubmit 
}: SubmissionReviewProps) {
  const [review, setReview] = useState(submission.review || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post(`/submissions/${submission.id}/review`, {
        feedback: review,
      });
      onReviewSubmit(review);
    } catch (error) {
      console.error("Failed to submit review:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-wg-charcoal/50 hover:text-wg-charcoal transition-colors font-medium mb-4"
      >
        <ChevronLeft size={20} />
        <span>Back to Client</span>
      </button>

      <div className="bg-wg-background rounded-2xl p-8 shadow-sm border border-wg-charcoal/5 space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start gap-4 pb-6 border-b border-wg-charcoal/5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <StatusBadge status={assignment.status} />
              <span className="text-xs font-bold text-wg-charcoal/30 uppercase tracking-widest">Assignment</span>
            </div>
            <h2 className="text-2xl font-serif font-bold text-wg-charcoal">{assignment.title}</h2>
            <div className="flex items-center gap-4 text-sm text-wg-charcoal/60">
              <span className="flex items-center gap-1">
                <User size={14} />
                {clientName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                Submitted {new Date(submission.submitted_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-wg-primary mb-3">The Prompt</h3>
            <div className="bg-wg-secondary/30 p-4 rounded-xl text-wg-charcoal/80 italic border-l-4 border-wg-primary/20">
              {assignment.prompt}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-wg-primary mb-3">Client Submission</h3>
            <div className="bg-wg-background border border-wg-charcoal/10 p-6 rounded-2xl text-wg-charcoal whitespace-pre-wrap leading-relaxed shadow-inner min-h-[150px]">
              {submission.content}
            </div>
          </section>

          <section className="pt-6 border-t border-wg-charcoal/5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-wg-accent mb-4 flex items-center gap-2">
              <MessageSquare size={14} />
              Your Review & Feedback
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your thoughts, encouragement, or follow-up questions..."
                className="w-full p-4 rounded-2xl border border-wg-charcoal/10 focus:outline-none focus:ring-2 focus:ring-wg-accent/50 min-h-[120px] transition-all"
                disabled={assignment.status === 'reviewed'}
              />
              
              {assignment.status !== 'reviewed' ? (
                <button
                  type="submit"
                  disabled={isSubmitting || !review.trim()}
                  className="bg-wg-accent text-white px-8 py-3 rounded-xl font-bold hover:bg-wg-accent/90 transition-all flex items-center gap-2 shadow-md disabled:opacity-50 disabled:grayscale"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      <span>Complete Review</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2 text-wg-success font-medium bg-wg-success/10 p-4 rounded-xl">
                  <CheckCircle size={20} />
                  <span>This submission has been reviewed.</span>
                </div>
              )}
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
