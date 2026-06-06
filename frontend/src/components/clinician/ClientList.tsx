"use client";

import { ClientProfile } from "@/types";
import { User, Calendar, FileText, ChevronRight } from "lucide-react";

interface ClientListProps {
  clients: ClientProfile[];
  onSelectClient: (client: ClientProfile) => void;
}

export default function ClientList({ clients, onSelectClient }: ClientListProps) {
  return (
    <div className="bg-wg-background rounded-2xl shadow-sm border border-wg-charcoal/5 overflow-hidden">
      <div className="p-4 border-b border-wg-charcoal/5 bg-wg-charcoal/5">
        <h2 className="font-serif font-bold text-wg-charcoal flex items-center gap-2">
          <User size={18} />
          Your Clients
        </h2>
      </div>
      <ul className="divide-y divide-wg-charcoal/5">
        {clients.map((client) => (
          <li 
            key={client.id}
            className="hover:bg-wg-secondary/30 transition-colors cursor-pointer"
            onClick={() => onSelectClient(client)}
          >
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-wg-primary/20 flex items-center justify-center text-wg-primary font-bold">
                  {client.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-medium text-wg-charcoal">{client.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-wg-charcoal/60 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      Last: {client.last_session ? new Date(client.last_session).toLocaleDateString() : 'Never'}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText size={12} />
                      {client.assignments_count} Assignments
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {client.pending_submissions > 0 && (
                  <span className="bg-wg-accent/20 text-wg-accent px-2 py-1 rounded-full text-xs font-bold">
                    {client.pending_submissions} to review
                  </span>
                )}
                <ChevronRight size={18} className="text-wg-charcoal/30" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
