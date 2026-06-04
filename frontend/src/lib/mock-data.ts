import { Assignment, ClientProfile, AuditLog, Submission } from '@/types';

export const MOCK_CLIENTS: ClientProfile[] = [
  {
    id: 'mock-id',
    name: 'Jane Doe',
    email: 'jane@example.com',
    last_session: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    assignments_count: 5,
    pending_submissions: 2,
  },
  {
    id: 'client-2',
    name: 'John Smith',
    email: 'john@example.com',
    last_session: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
    assignments_count: 3,
    pending_submissions: 0,
  }
];

export const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: '1',
    clinician_id: 'c1',
    client_id: 'mock-id',
    title: 'Daily Gratitude',
    description: 'Reflect on three things you are grateful for today.',
    prompt: 'What are three things you are grateful for today and why?',
    status: 'pending',
    due_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    clinician_id: 'c1',
    client_id: 'mock-id',
    title: 'Breathing Exercise',
    description: 'Practice 4-7-8 breathing for 5 minutes.',
    prompt: 'How did you feel before and after the breathing exercise?',
    status: 'submitted',
    due_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    clinician_id: 'c1',
    client_id: 'mock-id',
    title: 'Self-Compassion Letter',
    description: 'Write a short letter to yourself from the perspective of a kind friend.',
    prompt: 'Paste your self-compassion letter here.',
    status: 'reviewed',
    due_date: new Date(Date.now() - 86400000).toISOString(), // yesterday
    created_at: new Date(Date.now() - 172800000).toISOString(),
  }
];

export const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: 's1',
    assignment_id: '2',
    client_id: 'mock-id',
    content: 'I felt much calmer after the exercise. My heart rate slowed down.',
    submitted_at: new Date().toISOString(),
  },
  {
    id: 's2',
    assignment_id: '3',
    client_id: 'mock-id',
    content: 'Dear me, you are doing your best. It is okay to be human...',
    submitted_at: new Date(Date.now() - 90000000).toISOString(),
    review: 'This is a beautiful reflection, Jane. I can see the progress you are making in being kinder to yourself.',
    reviewed_at: new Date(Date.now() - 80000000).toISOString(),
  }
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log1',
    timestamp: new Date().toISOString(),
    action: 'assignment.created',
    userId: 'c1',
    details: 'Created assignment "Daily Gratitude" for Jane Doe',
  },
  {
    id: 'log2',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    action: 'submission.viewed',
    userId: 'c1',
    details: 'Viewed submission for "Breathing Exercise" by Jane Doe',
  }
];
