import { v4 as uuidv4 } from 'uuid';
import { query } from '../database';
import { getEncryptionService } from '../encryption/service';

export interface ClinicianAssignment {
  id: string;
  clinicianId: string;
  clientId: string;
  isActive: boolean;
  assignedAt: Date;
}

export interface ClientProfile {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  createdAt: Date;
}

export async function assignClientToClinician(
  clinicianId: string,
  clientId: string
): Promise<ClinicianAssignment> {
  const id = uuidv4();

  await query(
    `INSERT INTO clinician_assignments (id, clinician_id, client_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (clinician_id, client_id)
     DO UPDATE SET is_active = true, assigned_at = NOW()`,
    [id, clinicianId, clientId]
  );

  return {
    id,
    clinicianId,
    clientId,
    isActive: true,
    assignedAt: new Date(),
  };
}

export async function removeClientFromClinician(
  clinicianId: string,
  clientId: string
): Promise<void> {
  await query(
    `UPDATE clinician_assignments
     SET is_active = false
     WHERE clinician_id = $1 AND client_id = $2`,
    [clinicianId, clientId]
  );
}

export async function getClinicianClients(
  clinicianId: string,
  limit: number = 100,
  offset: number = 0
): Promise<ClientProfile[]> {
  const rows = await query(
    `SELECT u.id, u.email, u.display_name, u.is_active, u.created_at
     FROM users u
     INNER JOIN clinician_assignments ca ON ca.client_id = u.id
     WHERE ca.clinician_id = $1 AND ca.is_active = true AND u.role = 'client'
     ORDER BY u.created_at DESC
     LIMIT $2 OFFSET $3`,
    [clinicianId, limit, offset]
  );

  const encryption = getEncryptionService();
  return rows.map((row: any) => ({
    id: row.id,
    email: encryption.decrypt(row.email),
    displayName: encryption.decrypt(row.display_name),
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

export async function getUnassignedClients(
  clinicianId: string,
  limit: number = 100,
  offset: number = 0
): Promise<ClientProfile[]> {
  const rows = await query(
    `SELECT u.id, u.email, u.display_name, u.is_active, u.created_at
     FROM users u
     WHERE u.role = 'client' AND u.is_active = true
       AND u.id NOT IN (
         SELECT client_id FROM clinician_assignments
         WHERE clinician_id = $1 AND is_active = true
       )
     ORDER BY u.created_at DESC
     LIMIT $2 OFFSET $3`,
    [clinicianId, limit, offset]
  );

  const encryption = getEncryptionService();
  return rows.map((row: any) => ({
    id: row.id,
    email: encryption.decrypt(row.email),
    displayName: encryption.decrypt(row.display_name),
    isActive: row.is_active,
    createdAt: row.created_at,
  }));
}

export async function getClientById(id: string): Promise<ClientProfile | null> {
  const rows = await query(
    `SELECT id, email, display_name, is_active, created_at
     FROM users WHERE id = $1 AND role = 'client' AND is_active = true`,
    [id]
  );

  if (rows.length === 0) return null;

  const encryption = getEncryptionService();
  return {
    id: rows[0].id,
    email: encryption.decrypt(rows[0].email),
    displayName: encryption.decrypt(rows[0].display_name),
    isActive: rows[0].is_active,
    createdAt: rows[0].created_at,
  };
}

export async function getClinicianByClientId(
  clientId: string
): Promise<string | null> {
  const rows = await query(
    `SELECT clinician_id FROM clinician_assignments
     WHERE client_id = $1 AND is_active = true
     LIMIT 1`,
    [clientId]
  );

  return rows.length > 0 ? rows[0].clinician_id : null;
}