export type AssignmentStatus = 'pending' | 'completed' | 'overdue';

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
  response_text: string;
  submitted_at: string;
}
