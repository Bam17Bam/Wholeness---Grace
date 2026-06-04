"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Users, ClipboardList, ShieldCheck, Plus, CheckCircle, Clock, ChevronLeft } from "lucide-react";
import ClientList from "@/components/clinician/ClientList";
import AssignmentForm from "@/components/clinician/AssignmentForm";
import ClientDetail from "@/components/clinician/ClientDetail";
import SubmissionReview from "@/components/clinician/SubmissionReview";
import { MOCK_CLIENTS, MOCK_AUDIT_LOGS } from "@/lib/mock-data";
import { ClientProfile, Assignment, Submission } from "@/types";

type Tab = 'clients' | 'audit';

export default function ClinicianDashboard() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('clients');
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState<{assignment: Assignment, submission: Submission} | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
    if (!isLoading && user && user.role !== 'clinician') {
      router.push("/client");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-wg-secondary flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-wg-primary/30 border-t-wg-primary rounded-full animate-spin" />
      </div>
    );
  }

  const handleAssignSuccess = () => {
    setShowAssignForm(false);
    // In a real app, we would refresh data here
  };

  const handleReviewSubmit = (review: string) => {
    console.log("Submitting review:", review);
    setViewingSubmission(null);
    // In a real app, refresh data
  };

  const renderContent = () => {
    if (activeTab === 'audit') {
      return (
        <div className="bg-wg-background rounded-2xl shadow-sm border border-wg-charcoal/5 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-wg-charcoal/5 text-wg-charcoal/60 text-xs uppercase tracking-widest">
                <th className="px-6 py-4 font-bold">Timestamp</th>
                <th className="px-6 py-4 font-bold">Action</th>
                <th className="px-6 py-4 font-bold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-wg-charcoal/5 text-sm">
              {MOCK_AUDIT_LOGS.map(log => (
                <tr key={log.id} className="hover:bg-wg-secondary/30 transition-colors">
                  <td className="px-6 py-4 text-wg-charcoal/50 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-wg-primary/10 text-wg-primary px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-wg-charcoal font-medium">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Clients Tab Views
    if (viewingSubmission && selectedClient) {
      return (
        <SubmissionReview 
          assignment={viewingSubmission.assignment}
          submission={viewingSubmission.submission}
          clientName={selectedClient.name}
          onBack={() => setViewingSubmission(null)}
          onReviewSubmit={handleReviewSubmit}
        />
      );
    }

    if (showAssignForm && selectedClient) {
      return (
        <div className="max-w-2xl">
          <button
            onClick={() => setShowAssignForm(false)}
            className="flex items-center gap-2 text-wg-charcoal/50 hover:text-wg-charcoal transition-colors font-medium mb-6"
          >
            <ChevronLeft size={20} />
            <span>Back to {selectedClient.name}</span>
          </button>
          <AssignmentForm 
            clientId={selectedClient.id}
            clientName={selectedClient.name}
            onSuccess={handleAssignSuccess}
            onCancel={() => setShowAssignForm(false)}
          />
        </div>
      );
    }

    if (selectedClient) {
      return (
        <ClientDetail 
          client={selectedClient}
          onBack={() => setSelectedClient(null)}
          onAssignNew={() => setShowAssignForm(true)}
          onViewSubmission={(assignment, submission) => setViewingSubmission({assignment, submission})}
        />
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-wg-background p-6 rounded-2xl shadow-sm border border-wg-charcoal/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-wg-primary/10 flex items-center justify-center text-wg-primary">
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-wg-charcoal">12</p>
                <p className="text-sm text-wg-charcoal/60 font-medium uppercase tracking-wider">Completed Today</p>
              </div>
            </div>
            <div className="bg-wg-background p-6 rounded-2xl shadow-sm border border-wg-charcoal/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-wg-accent/10 flex items-center justify-center text-wg-accent">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-wg-charcoal">3</p>
                <p className="text-sm text-wg-charcoal/60 font-medium uppercase tracking-wider">Pending Review</p>
              </div>
            </div>
          </div>

          <ClientList 
            clients={MOCK_CLIENTS} 
            onSelectClient={(client) => setSelectedClient(client)}
          />
        </div>

        <div className="space-y-6">
          <div className="bg-wg-primary text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-serif font-bold text-xl mb-2">Practice Reminder</h3>
              <p className="text-white/80 text-sm italic">"Let all that you do be done in love." — 1 Corinthians 16:14</p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
              <ClipboardList size={100} />
            </div>
          </div>

          <div className="bg-wg-background p-6 rounded-2xl shadow-sm border border-wg-charcoal/5">
            <h3 className="font-bold text-wg-charcoal mb-4 flex items-center gap-2">
              <Clock size={18} className="text-wg-primary" />
              Recent Activity
            </h3>
            <div className="space-y-4">
              {MOCK_AUDIT_LOGS.slice(0, 3).map(log => (
                <div key={log.id} className="text-xs border-l-2 border-wg-primary/30 pl-3 py-1">
                  <p className="text-wg-charcoal font-medium">{log.details}</p>
                  <p className="text-wg-charcoal/40 mt-1">{new Date(log.timestamp).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-wg-secondary flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="w-full md:w-64 bg-wg-background border-r border-wg-charcoal/5 flex flex-col">
        <div className="p-6 border-b border-wg-charcoal/5">
          <h1 className="text-xl font-serif font-bold text-wg-primary">Wholeness & Grace</h1>
          <p className="text-[10px] uppercase tracking-widest text-wg-charcoal/40 font-bold mt-1">Clinician Portal</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => { setActiveTab('clients'); setSelectedClient(null); setShowAssignForm(false); setViewingSubmission(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'clients' ? 'bg-wg-primary text-white shadow-md' : 'text-wg-charcoal/60 hover:bg-wg-secondary'}`}
          >
            <Users size={20} />
            <span className="font-medium">Clients</span>
          </button>
          <button 
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'audit' ? 'bg-wg-primary text-white shadow-md' : 'text-wg-charcoal/60 hover:bg-wg-secondary'}`}
          >
            <ShieldCheck size={20} />
            <span className="font-medium">Security Audit</span>
          </button>
        </nav>

        <div className="p-4 border-t border-wg-charcoal/5">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-wg-accent/20 flex items-center justify-center text-wg-accent text-xs font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-wg-charcoal truncate">{user.name}</p>
              <p className="text-[10px] text-wg-charcoal/50 truncate uppercase">{user.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-wg-error hover:bg-wg-error/5 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-serif font-bold text-wg-charcoal">
              {activeTab === 'clients' ? 'Client Management' : 'Audit Logs'}
            </h2>
            <p className="text-wg-charcoal/60">
              {activeTab === 'clients' ? 'Track progress and assign supportive exercises.' : 'HIPAA-compliant activity monitoring.'}
            </p>
          </div>
          
          {activeTab === 'clients' && !selectedClient && (
            <button className="bg-wg-primary/10 text-wg-primary px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-wg-primary/20 transition-all border border-wg-primary/20">
              <Plus size={18} />
              <span>Add New Client</span>
            </button>
          )}
        </header>

        {renderContent()}
      </main>
    </div>
  );
}
