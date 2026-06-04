import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import {
  createAssignment,
  getAssignmentById,
  getAssignmentsForClinician,
  getAssignmentsForClient,
  updateAssignment,
} from '../models/assignment';
import { logAuditEvent } from '../audit/service';
import { getClinicianByClientId } from '../models/client';

const router = Router();

// Validation schemas
const createSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  templateId: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(200),
  promptText: z.string().min(1, 'Prompt text is required').max(5000),
  promptType: z.enum(['free_text', 'journal', 'reflection', 'checklist', 'scale']).optional(),
  clinicianNote: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  promptText: z.string().min(1).max(5000).optional(),
  promptType: z.enum(['free_text', 'journal', 'reflection', 'checklist', 'scale']).optional(),
  clinicianNote: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  status: z.enum(['pending', 'in_progress', 'submitted', 'reviewed', 'overdue']).optional(),
});

/**
 * GET /api/assignments
 * List assignments. Clinicians see their created assignments,
 * clients see assignments assigned to them.
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const clientId = req.query.clientId as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    let assignments;
    if (req.user!.role === 'clinician') {
      assignments = await getAssignmentsForClinician(
        req.user!.sub,
        status as any,
        clientId,
        limit,
        offset
      );
    } else {
      assignments = await getAssignmentsForClient(
        req.user!.sub,
        status as any,
        limit,
        offset
      );
    }

    logAuditEvent({
      userId: req.user!.sub,
      action: 'assignment.viewed',
      resourceType: 'assignment',
      resourceId: null,
      details: { count: assignments.length, status, role: req.user!.role },
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || 'unknown',
    }).catch(console.error);

    res.json({ data: assignments, total: assignments.length });
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/assignments
 * Create a new homework assignment (clinician only).
 */
router.post('/', authenticate, requireRole('clinician'), async (req: Request, res: Response) => {
  try {
    const input = createSchema.parse(req.body);

    const assignment = await createAssignment({
      ...input,
      clinicianId: req.user!.sub,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    });

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logAuditEvent({
      userId: req.user!.sub,
      action: 'assignment.created',
      resourceType: 'assignment',
      resourceId: assignment.id,
      details: { clientId: input.clientId, title: input.title },
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || 'unknown',
    }).catch(console.error);

    res.status(201).json({ data: assignment });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message })),
      });
      return;
    }
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/assignments/:id
 * Get a single assignment by ID.
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) {
      res.status(404).json({ error: 'Not found', message: 'Assignment not found' });
      return;
    }

    // Authorization check: clinician can view their own; client can view their own
    if (req.user!.role === 'clinician' && assignment.clinicianId !== req.user!.sub) {
      res.status(403).json({ error: 'Forbidden', message: 'Not your assignment' });
      return;
    }
    if (req.user!.role === 'client' && assignment.clientId !== req.user!.sub) {
      res.status(403).json({ error: 'Forbidden', message: 'Not your assignment' });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logAuditEvent({
      userId: req.user!.sub,
      action: 'assignment.viewed',
      resourceType: 'assignment',
      resourceId: assignment.id,
      details: {},
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || 'unknown',
    }).catch(console.error);

    res.json({ data: assignment });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/assignments/:id
 * Update an assignment (clinician only, must own it).
 */
router.put('/:id', authenticate, requireRole('clinician'), async (req: Request, res: Response) => {
  try {
    const input = updateSchema.parse(req.body);

    const assignment = await updateAssignment(
      req.params.id,
      req.user!.sub,
      {
        ...input,
        dueDate: input.dueDate !== undefined
          ? (input.dueDate ? new Date(input.dueDate) : null)
          : undefined,
      }
    );

    if (!assignment) {
      res.status(404).json({ error: 'Not found', message: 'Assignment not found or not yours' });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logAuditEvent({
      userId: req.user!.sub,
      action: 'assignment.updated',
      resourceType: 'assignment',
      resourceId: assignment.id,
      details: { updates: Object.keys(input) },
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || 'unknown',
    }).catch(console.error);

    res.json({ data: assignment });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message })),
      });
      return;
    }
    console.error('Error updating assignment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;