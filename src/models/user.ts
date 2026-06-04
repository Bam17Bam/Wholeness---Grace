import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { query } from '../database';
import { getEncryptionService } from '../encryption/service';

export type UserRole = 'clinician' | 'client';

export interface User {
  id: string;
  email: string;
  emailHash: string;
  passwordHash: string;
  role: UserRole;
  displayName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  role: UserRole;
  displayName: string;
}

export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  isActive: boolean;
  createdAt: Date;
}

function hashEmail(email: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
}

export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  const encryption = getEncryptionService();
  const id = uuidv4();
  const emailHash = hashEmail(input.email);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const encryptedEmail = encryption.encrypt(input.email);
  const encryptedName = encryption.encrypt(input.displayName);

  await query(
    `INSERT INTO users (id, email, email_hash, password_hash, role, display_name, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      encryptedEmail,
      emailHash,
      passwordHash,
      input.role,
      encryptedName,
      true,
    ]
  );

  return {
    id,
    email: input.email,
    role: input.role,
    displayName: input.displayName,
    isActive: true,
    createdAt: new Date(),
  };
}

export async function findUserByEmail(
  email: string
): Promise<User | null> {
  const emailHash = hashEmail(email);
  const rows = await query(
    'SELECT id, email, email_hash, password_hash, role, display_name, is_active, created_at, updated_at FROM users WHERE email_hash = $1 AND is_active = true',
    [emailHash]
  );

  if (rows.length === 0) {
    return null;
  }

  const encryption = getEncryptionService();
  const row = rows[0];

  return {
    id: row.id,
    email: encryption.decrypt(row.email),
    emailHash: row.email_hash,
    passwordHash: row.password_hash,
    role: row.role as UserRole,
    displayName: encryption.decrypt(row.display_name),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  const rows = await query(
    'SELECT id, email, role, display_name, is_active, created_at FROM users WHERE id = $1 AND is_active = true',
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  const encryption = getEncryptionService();
  const row = rows[0];

  return {
    id: row.id,
    email: encryption.decrypt(row.email),
    role: row.role as UserRole,
    displayName: encryption.decrypt(row.display_name),
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}
