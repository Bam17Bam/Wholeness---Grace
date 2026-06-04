import { query } from '../database';
import { getEncryptionService } from '../encryption/service';

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.created'
  | 'user.password_changed'
  | 'client.created'
  | 'client.viewed'
  | 'assignment.created'
  | 'assignment.viewed'
  | 'assignment.updated'
  | 'assignment.submitted'
  | 'submission.created'
  | 'submission.viewed'
  | 'submission.reviewed'
  | 'audit_log.viewed';

export interface AuditLogEntry {
  id?: string;
  userId: string | null;
  action: AuditAction;
  resourceType: string;
  resourceId: string | null;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt?: string;
}

/**
 * HIPAA-compliant audit logging service.
 * All PHI access and mutations are logged with immutable records.
 * IP addresses are encrypted at the field level.
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const encryption = getEncryptionService();
  const encryptedIp = encryption.encrypt(entry.ipAddress);

  await query(
    `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      entry.userId,
      entry.action,
      entry.resourceType,
      entry.resourceId,
      JSON.stringify(entry.details),
      encryptedIp,
      entry.userAgent,
    ]
  );
}

export async function getAuditLogs(
  userId?: string,
  action?: string,
  limit: number = 100,
  offset: number = 0
): Promise<any[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (userId) {
    conditions.push(`user_id = $${paramIndex++}`);
    params.push(userId);
  }

  if (action) {
    conditions.push(`action = $${paramIndex++}`);
    params.push(action);
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const rows = await query(
    `SELECT id, user_id, action, resource_type, resource_id, details, created_at
     FROM audit_logs
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return rows.map((row: any) => ({
    ...row,
    // Decrypt IP only for authorized viewers (done at the service layer)
    details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
  }));
}
