import React from 'react';
import { AssignmentStatus } from '@/types';

interface StatusBadgeProps {
  status: AssignmentStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles = {
    pending: 'bg-wg-accent/10 text-wg-accent border-wg-accent/20',
    submitted: 'bg-wg-primary/10 text-wg-primary border-wg-primary/20',
    reviewed: 'bg-wg-success/10 text-wg-success border-wg-success/20',
    overdue: 'bg-wg-error/10 text-wg-error border-wg-error/20',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};
