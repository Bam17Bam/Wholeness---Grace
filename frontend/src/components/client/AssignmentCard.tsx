import React from 'react';
import { Assignment } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Calendar, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface AssignmentCardProps {
  assignment: Assignment;
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({ assignment }) => {
  const dueDate = new Date(assignment.due_date).toLocaleDateString();

  return (
    <div className="bg-wg-background p-5 rounded-xl shadow-sm border border-gray-100 hover:border-wg-primary/30 transition-all group">
      <div className="flex justify-between items-start mb-3">
        <StatusBadge status={assignment.status} />
        <div className="flex items-center gap-1.5 text-xs text-wg-charcoal/50">
          <Calendar size={14} />
          <span>Due {dueDate}</span>
        </div>
      </div>
      
      <h3 className="text-lg font-serif font-semibold text-wg-charcoal mb-1">
        {assignment.title}
      </h3>
      <p className="text-sm text-wg-charcoal/70 line-clamp-2 mb-4">
        {assignment.description}
      </p>
      
      <Link 
        href={`/client/homework/${assignment.id}`}
        className="flex items-center justify-between w-full py-2 px-4 rounded-lg bg-wg-secondary text-wg-charcoal text-sm font-medium group-hover:bg-wg-primary group-hover:text-white transition-all"
      >
        <span>{assignment.status === 'submitted' || assignment.status === 'reviewed' ? 'View Response' : 'Start Exercise'}</span>
        <ChevronRight size={16} />
      </Link>
    </div>
  );
};
