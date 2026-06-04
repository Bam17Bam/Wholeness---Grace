import { v4 as uuidv4 } from 'uuid';
import { query } from '../database';
import { getEncryptionService } from '../encryption/service';

export interface Submission {
  id: string;
  assignmentId: string;
  clientId: string;
  content: string;
  isDraft: boolean;
  submittedAt: Date | null;
  wordCount: number | null;
  updatedAt: Date;
}

export interface CreateSubmissionInput {
  assignmentId: string;
  clientId: string;
  content: string;
  isDraft?: boolean;
}

export interface SubmissionReview {
  id: string;
  submissionId: string;
  clinicianId: string;
  feedback: string | null;
  reviewedAt: Date;
}

export async function createSubmission(input: CreateSubmissionInput): Promise<Submission> {
  const id = uuidv4();
  const encryption = getEncryptionService();
  const encryptedContent = encryption.encrypt(input.content);
  const wordCount = input.content.split(/\s+/).filter(Boolean).length;
  const isDraft = input.isDraft !== undefined ? input.isDraft : false;

  const submittedAt = isDraft ? null : new Date();

  await query(
    `INSERT INTO submissions (id, assignment_id, client_id, content, is_draft, submitted_at, word_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, input.assignmentId, input.clientId, encryptedContent, isDraft, submittedAt, wordCount]
  );

  // If submitting (not draft), update assignment status
  if (!isDraft) {
    await query(
      `UPDATE assignments SET status = 'submitted', updated_at = NOW() WHERE id = $1 AND client_id = $2`,
      [input.assignmentId, input.clientId]
    );
  }

  return {
    id,
    assignmentId: input.assignmentId,
    clientId: input.clientId,
    content: input.content,
    isDraft,
    submittedAt,
    wordCount,
    updatedAt: new Date(),
  };
}

export async function getSubmissionById(id: string): Promise<Submission | null> {
  const rows = await query(
    `SELECT id, assignment_id, client_id, content, is_draft, submitted_at, word_count, updated_at
     FROM submissions WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) return null;

  const encryption = getEncryptionService();
  const row = rows[0];

  return {
    id: row.id,
    assignmentId: row.assignment_id,
    clientId: row.client_id,
    content: encryption.decrypt(row.content),
    isDraft: row.is_draft,
    submittedAt: row.submitted_at,
    wordCount: row.word_count,
    updatedAt: row.updated_at,
  };
}

export async function getSubmissionByAssignment(
  assignmentId: string,
  clientId?: string
): Promise<Submission | null> {
  const conditions: string[] = ['assignment_id = $1'];
  const params: any[] = [assignmentId];
  let idx = 2;

  if (clientId) {
    conditions.push(`client_id = $${idx++}`);
    params.push(clientId);
  }

  const rows = await query(
    `SELECT id, assignment_id, client_id, content, is_draft, submitted_at, word_count, updated_at
     FROM submissions WHERE ${conditions.join(' AND ')}
     ORDER BY updated_at DESC LIMIT 1`,
    params
  );

  if (rows.length === 0) return null;

  const encryption = getEncryptionService();
  const row = rows[0];

  return {
    id: row.id,
    assignmentId: row.assignment_id,
    clientId: row.client_id,
    content: encryption.decrypt(row.content),
    isDraft: row.is_draft,
    submittedAt: row.submitted_at,
    wordCount: row.word_count,
    updatedAt: row.updated_at,
  };
}

export async function getSubmissionsForAssignment(
  assignmentId: string,
  limit: number = 10,
  offset: number = 0
): Promise<Submission[]> {
  const rows = await query(
    `SELECT id, assignment_id, client_id, content, is_draft, submitted_at, word_count, updated_at
     FROM submissions WHERE assignment_id = $1
     ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
    [assignmentId, limit, offset]
  );

  const encryption = getEncryptionService();
  return rows.map((row: any) => ({
    id: row.id,
    assignmentId: row.assignment_id,
    clientId: row.client_id,
    content: encryption.decrypt(row.content),
    isDraft: row.is_draft,
    submittedAt: row.submitted_at,
    wordCount: row.word_count,
    updatedAt: row.updated_at,
  }));
}

export async function updateSubmission(
  id: string,
  clientId: string,
  content: string,
  isDraft?: boolean
): Promise<Submission | null> {
  const existing = await getSubmissionById(id);
  if (!existing || existing.clientId !== clientId) return null;

  const encryption = getEncryptionService();
  const encryptedContent = encryption.encrypt(content);
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const submit = isDraft !== undefined ? !isDraft : false;

  await query(
    `UPDATE submissions SET content = $1, is_draft = $2, word_count = $3,
            submitted_at = CASE WHEN $4 THEN NOW() ELSE submitted_at END,
            updated_at = NOW()
     WHERE id = $5`,
    [encryptedContent, isDraft ?? existing.isDraft, wordCount, submit, id]
  );

  return getSubmissionById(id);
}

export async function createSubmissionReview(
  submissionId: string,
  clinicianId: string,
  feedback: string
): Promise<SubmissionReview> {
  const id = uuidv4();

  await query(
    `INSERT INTO submission_reviews (id, submission_id, clinician_id, feedback)
     VALUES ($1, $2, $3, $4)`,
    [id, submissionId, clinicianId, feedback]
  );

  // Update assignment status to reviewed
  await query(
    `UPDATE assignments SET status = 'reviewed', updated_at = NOW()
     WHERE id = (SELECT assignment_id FROM submissions WHERE id = $1)`,
    [submissionId]
  );

  return {
    id,
    submissionId,
    clinicianId,
    feedback,
    reviewedAt: new Date(),
  };
}

export async function getSubmissionReview(
  submissionId: string
): Promise<SubmissionReview | null> {
  const rows = await query(
    `SELECT id, submission_id, clinician_id, feedback, reviewed_at
     FROM submission_reviews WHERE submission_id = $1
     ORDER BY reviewed_at DESC LIMIT 1`,
    [submissionId]
  );

  if (rows.length === 0) return null;

  return {
    id: rows[0].id,
    submissionId: rows[0].submission_id,
    clinicianId: rows[0].clinician_id,
    feedback: rows[0].feedback,
    reviewedAt: rows[0].reviewed_at,
  };
}