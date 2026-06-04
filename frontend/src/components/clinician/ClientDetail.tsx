"use client";

import { useState } from "react";
import { ClientProfile, Assignment, Submission } from "@/types";
import { 
  ChevronLeft, 
  Plus, 
  Clock, 
  CheckCircle, 
  FileText, 
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MOCK_ASSIGNMENTS, MOCK_SUBMISSIONS } from "@/lib/mock-data";

interface ClientDetailProps {
  client: ClientProfile;
  onBack: () => void;
  onAssignNew: () => void;
  onViewSubmission: (assignment: Assignment, submission: Submission) => void;
}

export default function ClientDetail({ 
  client, 
  onBack, 
  onAssignNew, 
  onViewSubmission 
}: ClientDetailProps) {
  // In a real app, these would be fetched based on client.id
  const assignments = MOCK_ASSIGNMENTS.filter(a => a.client_id === client.id);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-wg-charcoal/50 hover:text-wg-charcoal transition-colors font-medium"
      >
        <ChevronLeft size={20} />
        <span>Back to All Clients</span>
      </button>

      <div className="bg-wg-background rounded-3xl p-8 shadow-sm border border-wg-charcoal/5">
        <header className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10 pb-6 border-b border-wg-charcoal/5">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-wg-primary/20 flex items-center justify-center text-wg-primary text-2xl font-bold">
              {client.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-3xl font-serif font-bold text-wg-charcoal">{client.name}</h2>
              <p className="text-wg-charcoal/60">{client.email}</p>
            </div>
          </div>
          <button
            onClick={onAssignNew}
            className="w-full md:w-auto bg-wg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-wg-primary/90 transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <Plus size={20} />
            <span>Assign Homework</span>
          </button>
        </header>

        <section className="space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-wg-charcoal/40">Assignment History</h3>
          
          <div className="grid grid-cols-1 gap-4">
            {assignments.length > 0 ? (
              assignments.map((assignment) => {
                const submission = MOCK_SUBMISSIONS.find(s => s.assignment_id === assignment.id);
                const isActionable = assignment.status === 'submitted';

                return (
                  <div 
                    key={assignment.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isActionable 
                        ? 'border-wg-accent/30 bg-wg-accent/5 ring-1 ring-wg-accent/10 shadow-sm' 
                        : 'border-wg-charcoal/5 bg-wg-background hover:bg-wg-secondary/20'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${
                        assignment.status === 'reviewed' ? 'bg-wg-success/10 text-wg-success' :
                        assignment.status === 'submitted' ? 'bg-wg-accent/10 text-wg-accent' :
                        'bg-wg-secondary text-wg-charcoal/30'
                      }`}>
                        <FileText size={24} />
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-wg-charcoal text-lg">{assignment.title}</h4>
                        <div className="flex flex-wrap items-center gap-3 mt-1">
                          <StatusBadge status={assignment.status} />
                          <span className="text-xs text-wg-charcoal/40 font-medium flex items-center gap-1">
                            <Clock size={12} />
                            Due {new Date(assignment.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {submission ? (
                        <button
                          onClick={() => onViewSubmission(assignment, submission)}
                          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                            isActionable
                              ? 'bg-wg-accent text-white hover:bg-wg-accent/90 shadow-sm'
                              : 'bg-wg-secondary text-wg-charcoal/60 hover:bg-wg-charcoal/10'
                          }`}
                        >
                          <MessageSquare size={16} />
                          <span>{isActionable ? 'Review Now' : 'View Work'}</span>
                        </button>
                      ) : (
                        <div className="px-4 py-2 rounded-xl text-xs font-medium text-wg-charcoal/40 bg-wg-charcoal/5 border border-wg-charcoal/5 flex items-center gap-2">
                          <AlertCircle size={14} />
                          <span>Not yet started</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 bg-wg-secondary/20 rounded-2xl border border-dashed border-wg-charcoal/10">
                <p className="text-wg-charcoal/40 italic">No assignments created for this client yet.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
