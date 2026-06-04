/**
 * Database migration script.
 * Creates all tables required for the Wholeness and Grace application.
 *
 * Run with: npx tsx src/migrations/run.ts
 */
import { query } from '../database';

async function runMigrations(): Promise<void> {
  console.log('Running database migrations...');

  // ============================================================
  // USERS (single table — role determines clinician vs client)
  // ============================================================
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id              UUID PRIMARY KEY,
      email           TEXT NOT NULL UNIQUE,
      email_hash      TEXT NOT NULL UNIQUE,
      password_hash   TEXT NOT NULL,
      role            TEXT NOT NULL CHECK (role IN ('clinician', 'client')),
      display_name    TEXT NOT NULL,
      is_active       BOOLEAN NOT NULL DEFAULT TRUE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('  ✓ users table created');

  await query(`CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users (email_hash);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);`);

  // ============================================================
  // CLINICIAN ASSIGNMENTS (which clinicians manage which clients)
  // ============================================================
  await query(`
    CREATE TABLE IF NOT EXISTS clinician_assignments (
      id              UUID PRIMARY KEY,
      clinician_id    UUID NOT NULL REFERENCES users(id),
      client_id       UUID NOT NULL REFERENCES users(id),
      is_active       BOOLEAN NOT NULL DEFAULT TRUE,
      assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(clinician_id, client_id)
    );
  `);
  console.log('  ✓ clinician_assignments table created');

  await query(`CREATE INDEX IF NOT EXISTS idx_ca_clinician ON clinician_assignments (clinician_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_ca_client ON clinician_assignments (client_id);`);

  // ============================================================
  // HOMEWORK TEMPLATES (reusable exercises)
  // ============================================================
  await query(`
    CREATE TABLE IF NOT EXISTS homework_templates (
      id              UUID PRIMARY KEY,
      clinician_id    UUID NOT NULL REFERENCES users(id),
      title           TEXT NOT NULL,
      description     TEXT,
      prompt_text     TEXT NOT NULL,
      prompt_type     TEXT NOT NULL DEFAULT 'free_text'
                      CHECK (prompt_type IN ('free_text','journal','reflection','checklist','scale')),
      repeat_option   TEXT DEFAULT 'once'
                      CHECK (repeat_option IN ('once','daily','weekly')),
      is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('  ✓ homework_templates table created');

  await query(`CREATE INDEX IF NOT EXISTS idx_ht_clinician ON homework_templates (clinician_id);`);

  // ============================================================
  // ASSIGNMENTS (concrete homework assigned to a client)
  // ============================================================
  await query(`
    CREATE TABLE IF NOT EXISTS assignments (
      id              UUID PRIMARY KEY,
      client_id       UUID NOT NULL REFERENCES users(id),
      clinician_id    UUID NOT NULL REFERENCES users(id),
      template_id     UUID REFERENCES homework_templates(id),
      title           TEXT NOT NULL,
      prompt_text     TEXT NOT NULL,
      prompt_type     TEXT NOT NULL DEFAULT 'free_text'
                      CHECK (prompt_type IN ('free_text','journal','reflection','checklist','scale')),
      clinician_note  TEXT,
      due_date        TIMESTAMPTZ,
      status          TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','in_progress','submitted','reviewed','overdue')),
      assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('  ✓ assignments table created');

  await query(`CREATE INDEX IF NOT EXISTS idx_assign_client ON assignments (client_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_assign_clinician ON assignments (clinician_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_assign_status ON assignments (status);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_assign_due ON assignments (due_date);`);

  // ============================================================
  // SUBMISSIONS (client responses to assignments)
  // ============================================================
  await query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id              UUID PRIMARY KEY,
      assignment_id   UUID NOT NULL REFERENCES assignments(id),
      client_id       UUID NOT NULL REFERENCES users(id),
      content         TEXT NOT NULL,
      is_draft        BOOLEAN NOT NULL DEFAULT FALSE,
      submitted_at    TIMESTAMPTZ,
      word_count      INTEGER,
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('  ✓ submissions table created');

  await query(`CREATE INDEX IF NOT EXISTS idx_sub_assignment ON submissions (assignment_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sub_client ON submissions (client_id);`);

  // ============================================================
  // SUBMISSION REVIEWS (clinician feedback)
  // ============================================================
  await query(`
    CREATE TABLE IF NOT EXISTS submission_reviews (
      id              UUID PRIMARY KEY,
      submission_id   UUID NOT NULL REFERENCES submissions(id),
      clinician_id    UUID NOT NULL REFERENCES users(id),
      feedback        TEXT,
      reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('  ✓ submission_reviews table created');

  await query(`CREATE INDEX IF NOT EXISTS idx_sr_submission ON submission_reviews (submission_id);`);

  // ============================================================
  // SESSIONS (refresh token tracking)
  // ============================================================
  await query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id              UUID PRIMARY KEY,
      user_id         UUID NOT NULL REFERENCES users(id),
      refresh_token   TEXT NOT NULL UNIQUE,
      user_agent      TEXT,
      ip_address      TEXT,
      expires_at      TIMESTAMPTZ NOT NULL,
      is_revoked      BOOLEAN NOT NULL DEFAULT FALSE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('  ✓ sessions table created');

  await query(`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (refresh_token);`);

  // ============================================================
  // AUDIT LOGS (immutable, append-only for HIPAA compliance)
  // ============================================================
  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id              UUID PRIMARY KEY,
      user_id         UUID REFERENCES users(id),
      action          TEXT NOT NULL,
      resource_type   TEXT NOT NULL,
      resource_id     UUID,
      details         JSONB,
      ip_address      TEXT,
      user_agent      TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('  ✓ audit_logs table created');

  await query(`CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs (user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs (created_at);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs (resource_type, resource_id);`);

  // ============================================================
  // ENCRYPTION KEYS (key rotation support)
  // ============================================================
  await query(`
    CREATE TABLE IF NOT EXISTS encryption_keys (
      id              UUID PRIMARY KEY,
      key_purpose     TEXT NOT NULL UNIQUE,
      key_data        BYTEA NOT NULL,
      is_active       BOOLEAN NOT NULL DEFAULT TRUE,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      rotated_at      TIMESTAMPTZ
    );
  `);
  console.log('  ✓ encryption_keys table created');

  console.log('\nAll migrations completed successfully!');
}

runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
