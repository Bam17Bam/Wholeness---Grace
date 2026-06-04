import { v4 as uuidv4 } from 'uuid';
import { query } from '../database';
import { getEncryptionService } from '../encryption/service';

export type PromptType = 'free_text' | 'journal' | 'reflection' | 'checklist' | 'scale';
export type AssignmentStatus = 'pending' | 'in_progress' | 'submitted' | 'reviewed' | 'overdue';

export interface Assignment {
  id: string;
  clientId: string;
  clinicianId: string;
  templateId: string | null;
  title: string;
  promptText: string;
  promptType: PromptType;
  clinicianNote: string | null;
  dueDate: Date | null;
  status: AssignmentStatus;
  assignedAt: Date;
  updatedAt: Date;
}

export interface CreateAssignmentInput {
  clientId: string;
  clinicianId: string;
  templateId?: string;
  title: string;
  promptText: string;
  promptType?: PromptType;
  clinicianNote?: string;
  dueDate?: Date;
}

export interface UpdateAssignmentInput {
  title?: string;
  promptText?: string;
  promptType?: PromptType;
  clinicianNote?: string;
  dueDate?: Date | null;
  status?: AssignmentStatus;
}

export async function createAssignment(input: CreateAssignmentInput): Promise<Assignment> {
  const id = uuidv4();
  const encryption = getEncryptionService();
  const encryptedNote = input.clinicianNote
    ? encryption.encrypt(input.clinicianNote)
    : null;

  await query(
    `INSERT INTO assignments (id, client_id, clinician_id, template_id, title, prompt_text, prompt_type, clinician_note, due_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
    [
      id,
      input.clientId,
      input.clinicianId,
      input.templateId || null,
      input.title,
      input.promptText,
      input.promptType || 'free_text',
      encryptedNote,
      input.dueDate || null,
    ]
  );

  return {
    id,
    clientId: input.clientId,
    clinicianId: input.clinicianId,
    templateId: input.templateId || null,
    title: input.title,
    promptText: input.promptText,
    promptType: input.promptType || 'free_text',
    clinicianNote: input.clinicianNote || null,
    dueDate: input.dueDate || null,
    status: 'pending',
    assignedAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function getAssignmentById(id: string): Promise<Assignment | null> {
  const rows = await query(
    `SELECT id, client_id, clinician_id, template_id, title, prompt_text, prompt_type,
            clinician_note, due_date, status, assigned_at, updated_at
     FROM assignments WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) return null;

  const encryption = getEncryptionService();
  const row = rows[0];

  return {
    id: row.id,
    clientId: row.client_id,
    clinicianId: row.clinician_id,
    templateId: row.template_id,
    title: row.title,
    promptText: row.prompt_text,
    promptType: row.prompt_type,
    clinicianNote: row.clinician_note ? encryption.decrypt(row.clinician_note) : null,
    dueDate: row.due_date,
    status: row.status,
    assignedAt: row.assigned_at,
    updatedAt: row.updated_at,
  };
}

export async function getAssignmentsForClinician(
  clinicianId: string,
  status?: AssignmentStatus,
  clientId?: string,
  limit: number = 50,
  offset: number = 0
): Promise<Assignment[]> {
  const conditions: string[] = ['clinician_id = $1'];
  const params: any[] = [clinicianId];
  let idx = 2;

  if (status) {
    conditions.push(`status = $${idx++}`);
    params.push(status);
  }

  if (clientId) {
    conditions.push(`client_id = $${idx++}`);
    params.push(clientId);
  }

  const rows = await query(
    `SELECT id, client_id, clinician_id, template_id, title, prompt_text, prompt_type,
            clinician_note, due_date, status, assigned_at, updated_at
     FROM assignments
     WHERE ${conditions.join(' AND ')}
     ORDER BY assigned_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  const encryption = getEncryptionService();
  return rows.map((row: any) => ({
    id: row.id,
    clientId: row.client_id,
    clinicianId: row.clinician_id,
    templateId: row.template_id,
    title: row.title,
    promptText: row.prompt_text,
    promptType: row.prompt_type,
    clinicianNote: row.clinician_note ? encryption.decrypt(row.clinician_note) : null,
    dueDate: row.due_date,
    status: row.status,
    assignedAt: row.assigned_at,
    updatedAt: row.updated_at,
  }));
}

export async function getAssignmentsForClient(
  clientId: string,
  status?: AssignmentStatus,
  limit: number = 50,
  offset: number = 0
): Promise<Assignment[]> {
  const conditions: string[] = ['client_id = $1'];
  const params: any[] = [clientId];
  let idx = 2;

  if (status) {
    conditions.push(`status = $${idx++}`);
    params.push(status);
  }

  const rows = await query(
    `SELECT id, client_id, clinician_id, template_id, title, prompt_text, prompt_type,
            clinician_note, due_date, status, assigned_at, updated_at
     FROM assignments
     WHERE ${conditions.join(' AND ')}
     ORDER BY assigned_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return rows.map((row: any) => ({
    id: row.id,
    clientId: row.client_id,
    clinicianId: row.clinician_id,
    templateId: row.template_id,
    title: row.title,
    promptText: row.prompt_text,
    promptType: row.prompt_type,
    clinicianNote: null, // Never expose clinician notes to clients
    dueDate: row.due_date,
    status: row.status,
    assignedAt: row.assigned_at,
    updatedAt: row.updated_at,
  }));
}

export async function updateAssignment(
  id: string,
  clinicianId: string,
  input: UpdateAssignmentInput
): Promise<Assignment | null> {
  const existing = await getAssignmentById(id);
  if (!existing || existing.clinicianId !== clinicianId) return null;

  const sets: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (input.title !== undefined) {
    sets.push(`title = $${idx++}`);
    params.push(input.title);
  }
  if (input.promptText !== undefined) {
    sets.push(`prompt_text = $${idx++}`);
    params.push(input.promptText);
  }
  if (input.promptType !== undefined) {
    sets.push(`prompt_type = $${idx++}`);
    params.push(input.promptType);
  }
  if (input.clinicianNote !== undefined) {
    const encryption = getEncryptionService();
    sets.push(`clinician_note = $${idx++}`);
    params.push(encryption.encrypt(input.clinicianNote));
  }
  if (input.dueDate !== undefined) {
    sets.push(`due_date = $${idx++}`);
    params.push(input.dueDate);
  }
  if (input.status !== undefined) {
    sets.push(`status = $${idx++}`);
    params.push(input.status);
  }

  if (sets.length === 0) return existing;

  sets.push(`updated_at = NOW()`);
  params.push(id);

  await query(
    `UPDATE assignments SET ${sets.join(', ')} WHERE id = $${idx}`,
    params
  );

  return getAssignmentById(id);
}