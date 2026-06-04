export type AssignmentStatus = 'pending' | 'submitted' | 'reviewed' | 'overdue';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'clinician';
}

export interface ClientProfile {
  id: string;
  name: string;
  email: string;
  last_session?: string;
  assignments_count: number;
  pending_submissions: number;
}

export interface Assignment {
  id: string;
  clinician_id: string;
  client_id: string;
  title: string;
  description: string;
  prompt: string;
  status: AssignmentStatus;
  due_date: string;
  created_at: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  client_id: string;
  content: string;
  submitted_at: string;
  review?: string;
  reviewed_at?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  userId: string;
  details: string;
}
