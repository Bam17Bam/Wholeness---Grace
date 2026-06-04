/**
 * Database seed script.
 * Creates demo data for development and testing.
 *
 * Run with: npx tsx src/migrations/seed.ts
 * Requires: database running and migrations applied
 */
import { query } from '../database';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import { getEncryptionService } from '../encryption/service';

async function seed(): Promise<void> {
  console.log('Seeding database with demo data...\n');
  const enc = getEncryptionService();

  // ─── USERS ──────────────────────────────────────────────────

  const clinicianId = uuidv4();
  const client1Id = uuidv4();
  const client2Id = uuidv4();
  const client3Id = uuidv4();

  const demoPassword = await bcrypt.hash('demo123', 12);

  // Clinician
  await query(
    `INSERT INTO users (id, email, email_hash, password_hash, role, display_name, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      clinicianId,
      enc.encrypt('demo@wholeness.com'),
      require('crypto').createHash('sha256').update('demo@wholeness.com').digest('hex'),
      demoPassword,
      'clinician',
      enc.encrypt('Dr. Grace Thompson'),
      true,
    ]
  );
  console.log('  ✓ Clinician created: demo@wholeness.com / demo123');

  // Client 1 — Sarah
  await query(
    `INSERT INTO users (id, email, email_hash, password_hash, role, display_name, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      client1Id,
      enc.encrypt('sarah@example.com'),
      require('crypto').createHash('sha256').update('sarah@example.com').digest('hex'),
      demoPassword,
      'client',
      enc.encrypt('Sarah Jenkins'),
      true,
    ]
  );
  console.log('  ✓ Client created: sarah@example.com / demo123');

  // Client 2 — Michael
  await query(
    `INSERT INTO users (id, email, email_hash, password_hash, role, display_name, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      client2Id,
      enc.encrypt('michael@example.com'),
      require('crypto').createHash('sha256').update('michael@example.com').digest('hex'),
      demoPassword,
      'client',
      enc.encrypt('Michael Rivera'),
      true,
    ]
  );
  console.log('  ✓ Client created: michael@example.com / demo123');

  // Client 3 — Emily
  await query(
    `INSERT INTO users (id, email, email_hash, password_hash, role, display_name, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      client3Id,
      enc.encrypt('emily@example.com'),
      require('crypto').createHash('sha256').update('emily@example.com').digest('hex'),
      demoPassword,
      'client',
      enc.encrypt('Emily Chen'),
      true,
    ]
  );
  console.log('  ✓ Client created: emily@example.com / demo123');

  // ─── CLINICIAN ASSIGNMENTS ──────────────────────────────────

  const ca1Id = uuidv4();
  const ca2Id = uuidv4();
  const ca3Id = uuidv4();

  await query(
    `INSERT INTO clinician_assignments (id, clinician_id, client_id, is_active)
     VALUES ($1, $2, $3, $4), ($5, $6, $7, $8), ($9, $10, $11, $12)`,
    [ca1Id, clinicianId, client1Id, true, ca2Id, clinicianId, client2Id, true, ca3Id, clinicianId, client3Id, true]
  );
  console.log('  ✓ 3 clinician-client assignments created');

  // ─── HOME WORK TEMPLATES ────────────────────────────────────

  const template1Id = uuidv4();
  const template2Id = uuidv4();
  const template3Id = uuidv4();

  await query(
    `INSERT INTO homework_templates (id, clinician_id, title, description, prompt_text, prompt_type, repeat_option)
     VALUES
       ($1, $2, $3, $4, $5, $6, $7),
       ($8, $9, $10, $11, $12, $13, $14),
       ($15, $16, $17, $18, $19, $20, $21)`,
    [
      template1Id, clinicianId,
      'Morning Gratitude Reflection', 'A daily gratitude practice to start the day with intention.',
      'List three things you are grateful for today. Take a moment to sit with each one and notice how it feels in your body.',
      'reflection', 'daily',

      template2Id, clinicianId,
      'Anxiety Check-In', 'Weekly check-in to track anxiety patterns and triggers.',
      'On a scale of 1-10, what was your average anxiety level this week? What situations or thoughts triggered anxiety? What coping strategies helped?',
      'journal', 'weekly',

      template3Id, clinicianId,
      'Self-Compassion Exercise', 'A guided self-compassion writing exercise.',
      'Think of a recent challenge. Write a letter to yourself from the perspective of a compassionate friend. What would they say to encourage you without judgment?',
      'reflection', 'once',
    ]
  );
  console.log('  ✓ 3 homework templates created');

  // ─── ASSIGNMENTS ────────────────────────────────────────────

  const assign1Id = uuidv4();
  const assign2Id = uuidv4();
  const assign3Id = uuidv4();
  const assign4Id = uuidv4();
  const assign5Id = uuidv4();

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000);
  const yesterday = new Date(now.getTime() - 86400000);
  const twoDaysAgo = new Date(now.getTime() - 172800000);
  const threeDaysAgo = new Date(now.getTime() - 259200000);
  const lastWeek = new Date(now.getTime() - 604800000);

  // Assignment 1 — pending
  await query(
    `INSERT INTO assignments (id, client_id, clinician_id, template_id, title, prompt_text, prompt_type, clinician_note, due_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      assign1Id, client1Id, clinicianId, template1Id,
      'Morning Gratitude Reflection',
      'List three things you are grateful for today. Take a moment to sit with each one and notice how it feels in your body.',
      'reflection',
      enc.encrypt('Sarah, I think this exercise will help ground your mornings. Try to do it before checking your phone.'),
      tomorrow, 'pending',
    ]
  );
  console.log('  ✓ Assignment 1 created (pending, due tomorrow)');

  // Assignment 2 — submitted
  await query(
    `INSERT INTO assignments (id, client_id, clinician_id, template_id, title, prompt_text, prompt_type, due_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      assign2Id, client1Id, clinicianId, template2Id,
      'Anxiety Check-In',
      'On a scale of 1-10, what was your average anxiety level this week? What situations or thoughts triggered anxiety? What coping strategies helped?',
      'journal', twoDaysAgo, 'submitted',
    ]
  );
  console.log('  ✓ Assignment 2 created (submitted)');

  // Assignment 3 — reviewed
  await query(
    `INSERT INTO assignments (id, client_id, clinician_id, template_id, title, prompt_text, prompt_type, clinician_note, due_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      assign3Id, client2Id, clinicianId, template3Id,
      'Self-Compassion Exercise',
      'Think of a recent challenge. Write a letter to yourself from the perspective of a compassionate friend.',
      'reflection',
      enc.encrypt('Michael, this is a powerful one. Take your time with it.'),
      threeDaysAgo, 'reviewed',
    ]
  );
  console.log('  ✓ Assignment 3 created (reviewed)');

  // Assignment 4 — pending (for client 3)
  await query(
    `INSERT INTO assignments (id, client_id, clinician_id, title, prompt_text, prompt_type, due_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      assign4Id, client3Id, clinicianId,
      'Weekly Mood Tracker',
      'Describe your overall mood this week. What were the highlights? What were the challenges? Rate your average mood 1-10.',
      'journal', tomorrow, 'pending',
    ]
  );
  console.log('  ✓ Assignment 4 created (pending)');

  // Assignment 5 — overdue
  await query(
    `INSERT INTO assignments (id, client_id, clinician_id, title, prompt_text, prompt_type, due_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      assign5Id, client2Id, clinicianId,
      'Breathing Exercise Log',
      'Practice box breathing (4-4-4-4) twice daily. Log your sessions and note any changes in your stress levels.',
      'checklist', lastWeek, 'overdue',
    ]
  );
  console.log('  ✓ Assignment 5 created (overdue)');

  // ─── SUBMISSIONS ────────────────────────────────────────────

  const sub1Id = uuidv4();
  const sub2Id = uuidv4();
  const sub3Id = uuidv4();

  // Submission 1 (for assignment 2 — submitted)
  await query(
    `INSERT INTO submissions (id, assignment_id, client_id, content, is_draft, submitted_at, word_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      sub1Id, assign2Id, client1Id,
      enc.encrypt('This week my anxiety averaged around a 6/10. Work presentations triggered the most anxiety, especially the one on Wednesday. I noticed my chest tightening and my mind racing beforehand. The breathing exercises helped — I used the 4-7-8 technique before the presentation and it brought me down to about a 4. Walking during lunch also helped clear my head. Next week I want to try incorporating morning meditation.'),
      false, twoDaysAgo, 72,
    ]
  );
  console.log('  ✓ Submission 1 created (for assignment 2)');

  // Submission 2 (for assignment 3 — reviewed, so submission exists)
  await query(
    `INSERT INTO submissions (id, assignment_id, client_id, content, is_draft, submitted_at, word_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      sub2Id, assign3Id, client2Id,
      enc.encrypt('Dear Michael, I see you struggling with the pressure to be perfect at work. It\'s okay to make mistakes — that\'s how we grow. Remember that your worth is not determined by your productivity. You are enough exactly as you are. Be kind to yourself during this transition. You\'ve handled difficult things before and you will handle this too.'),
      false, threeDaysAgo, 64,
    ]
  );
  console.log('  ✓ Submission 2 created (for assignment 3)');

  // Submission 3 — draft (for assignment 1, client 1 started)
  await query(
    `INSERT INTO submissions (id, assignment_id, client_id, content, is_draft, word_count)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      sub3Id, assign1Id, client1Id,
      enc.encrypt('1. The warm sunlight coming through my window this morning. 2. My sister\'s thoughtful text message. 3.'),
      true, 14,
    ]
  );
  console.log('  ✓ Submission 3 created (draft, for assignment 1)');

  // ─── SUBMISSION REVIEWS ─────────────────────────────────────

  await query(
    `INSERT INTO submission_reviews (id, submission_id, clinician_id, feedback, reviewed_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      uuidv4(), sub2Id, clinicianId,
      'Michael, this is beautiful work. You showed real self-compassion and vulnerability here. I\'d love for you to read this letter to yourself out loud before our next session. Let\'s explore how we can carry this compassionate voice into your daily life.',
      new Date(now.getTime() - 86400000), // yesterday
    ]
  );
  console.log('  ✓ Submission review created');

  // ─── AUDIT LOGS ─────────────────────────────────────────────

  const auditActions = [
    { userId: clinicianId, action: 'user.login', resourceType: 'user', resourceId: clinicianId, ipAddress: enc.encrypt('192.168.1.10'), createdAt: twoDaysAgo },
    { userId: client1Id, action: 'user.login', resourceType: 'user', resourceId: client1Id, ipAddress: enc.encrypt('192.168.1.20'), createdAt: twoDaysAgo },
    { userId: clinicianId, action: 'user.login', resourceType: 'user', resourceId: clinicianId, ipAddress: enc.encrypt('192.168.1.10'), createdAt: yesterday },
    { userId: clinicianId, action: 'client.viewed', resourceType: 'client', resourceId: client1Id, ipAddress: enc.encrypt('192.168.1.10'), createdAt: yesterday },
    { userId: clinicianId, action: 'assignment.created', resourceType: 'assignment', resourceId: assign1Id, ipAddress: enc.encrypt('192.168.1.10'), createdAt: yesterday },
    { userId: client1Id, action: 'submission.created', resourceType: 'submission', resourceId: sub1Id, ipAddress: enc.encrypt('192.168.1.20'), createdAt: twoDaysAgo },
    { userId: clinicianId, action: 'user.logout', resourceType: 'user', resourceId: clinicianId, ipAddress: enc.encrypt('192.168.1.10'), createdAt: yesterday },
    { userId: client2Id, action: 'user.login', resourceType: 'user', resourceId: client2Id, ipAddress: enc.encrypt('192.168.1.30'), createdAt: threeDaysAgo },
  ];

  for (const log of auditActions) {
    await query(
      `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        uuidv4(), log.userId, log.action, log.resourceType, log.resourceId,
        JSON.stringify({ source: 'seed-data' }),
        log.ipAddress,
        'Seed-Script/1.0',
        log.createdAt,
      ]
    );
  }
  console.log('  ✓ 8 audit log entries created');

  console.log('\n✅ Seed complete!');
  console.log('   ────────────────────────────────────────────');
  console.log('   Clinician: demo@wholeness.com / demo123');
  console.log('   Clients:   sarah@example.com / demo123');
  console.log('             michael@example.com / demo123');
  console.log('              emily@example.com / demo123');
  console.log('   ────────────────────────────────────────────');
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });