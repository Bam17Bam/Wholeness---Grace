import { Assignment } from '@/types';

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
    status: 'pending',
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
    status: 'completed',
    due_date: new Date(Date.now() - 86400000).toISOString(), // yesterday
    created_at: new Date(Date.now() - 172800000).toISOString(),
  }
];
