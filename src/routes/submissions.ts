import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import {
  createSubmission,
  getSubmissionById,
  getSubmissionsForAssignment,
  updateSubmission,
  createSubmissionReview,
  getSubmissionReview,
} from '../models/submission';
import { getAssignmentById } from '../models/assignment';
import { logAuditEvent } from '../audit/service';

const router = Router();

const createSubmissionSchema = z.object({
  assignmentId: z.string().uuid('Invalid assignment ID'),
  content: z.string().min(1, 'Content is required').max(50000),
  isDraft: z.boolean().optional(),
});

const updateSubmissionSchema = z.object({
  content: z.string().min(1, 'Content is required').max(50000),
  isDraft: z.boolean().optional(),
});

const reviewSchema = z.object({
  feedback: z.string().min(1, 'Feedback is required').max(10000),
});

/**
 * POST /api/submissions
 * Create a submission (client only, must own the assignment).
 */
router.post('/', authenticate, requireRole('client'), async (req: Request, res: Response) => {
  try {
    const input = createSubmissionSchema.parse(req.body);

    // Verify the assignment exists and belongs to this client
    const assignment = await getAssignmentById(input.assignmentId);
    if (!assignment) {
      res.status(404).json({ error: 'Not found', message: 'Assignment not found' });
      return;
    }
    if (assignment.clientId !== req.user!.sub) {
      res.status(403).json({ error: 'Forbidden', message: 'This assignment is not yours' });
      return;
    }

    const submission = await createSubmission({
      ...input,
      clientId: req.user!.sub,
    });

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logAuditEvent({
      userId: req.user!.sub,
      action: 'submission.created',
      resourceType: 'submission',
      resourceId: submission.id,
      details: { assignmentId: input.assignmentId, isDraft: submission.isDraft },
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || 'unknown',
    }).catch(console.error);

    res.status(201).json({ data: submission });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message })),
      });
      return;
    }
    console.error('Error creating submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/submissions/:id
 * Get a submission by ID.
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const submission = await getSubmissionById(req.params.id);
    if (!submission) {
      res.status(404).json({ error: 'Not found', message: 'Submission not found' });
      return;
    }

    // Authorization: client sees own, clinician sees if they assigned it
    const assignment = await getAssignmentById(submission.assignmentId);
    if (!assignment) {
      res.status(404).json({ error: 'Not found', message: 'Associated assignment not found' });
      return;
    }

    if (req.user!.role === 'client' && submission.clientId !== req.user!.sub) {
      res.status(403).json({ error: 'Forbidden', message: 'Not your submission' });
      return;
    }
    if (req.user!.role === 'clinician' && assignment.clinicianId !== req.user!.sub) {
      res.status(403).json({ error: 'Forbidden', message: 'Not your client\'s submission' });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logAuditEvent({
      userId: req.user!.sub,
      action: 'submission.viewed',
      resourceType: 'submission',
      resourceId: submission.id,
      details: {},
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || 'unknown',
    }).catch(console.error);

    res.json({ data: submission });
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/submissions/:id
 * Update a draft submission (client only).
 */
router.put('/:id', authenticate, requireRole('client'), async (req: Request, res: Response) => {
  try {
    const input = updateSubmissionSchema.parse(req.body);

    const submission = await updateSubmission(
      req.params.id,
      req.user!.sub,
      input.content,
      input.isDraft
    );

    if (!submission) {
      res.status(404).json({ error: 'Not found', message: 'Submission not found or not yours' });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logAuditEvent({
      userId: req.user!.sub,
      action: 'submission.created',
      resourceType: 'submission',
      resourceId: submission.id,
      details: { action: 'updated', isDraft: submission.isDraft },
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || 'unknown',
    }).catch(console.error);

    res.json({ data: submission });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message })),
      });
      return;
    }
    console.error('Error updating submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/submissions/assignment/:assignmentId
 * Get all submissions for an assignment (clinician only).
 */
router.get('/assignment/:assignmentId', authenticate, requireRole('clinician'), async (req: Request, res: Response) => {
  try {
    const assignment = await getAssignmentById(req.params.assignmentId);
    if (!assignment) {
      res.status(404).json({ error: 'Not found', message: 'Assignment not found' });
      return;
    }
    if (assignment.clinicianId !== req.user!.sub) {
      res.status(403).json({ error: 'Forbidden', message: 'Not your assignment' });
      return;
    }

    const submissions = await getSubmissionsForAssignment(req.params.assignmentId);
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    logAuditEvent({
      userId: req.user!.sub,
      action: 'submission.viewed',
      resourceType: 'submission',
      resourceId: null,
      details: { assignmentId: req.params.assignmentId, count: submissions.length },
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || 'unknown',
    }).catch(console.error);

    res.json({ data: submissions, total: submissions.length });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/submissions/:id/review
 * Review a submission (clinician only).
 */
router.post('/:id/review', authenticate, requireRole('clinician'), async (req: Request, res: Response) => {
  try {
    const { feedback } = reviewSchema.parse(req.body);

    const submission = await getSubmissionById(req.params.id);
    if (!submission) {
      res.status(404).json({ error: 'Not found', message: 'Submission not found' });
      return;
    }

    const assignment = await getAssignmentById(submission.assignmentId);
    if (!assignment || assignment.clinicianId !== req.user!.sub) {
      res.status(403).json({ error: 'Forbidden', message: 'Not your client\'s submission' });
      return;
    }

    const review = await createSubmissionReview(req.params.id, req.user!.sub, feedback);

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logAuditEvent({
      userId: req.user!.sub,
      action: 'submission.reviewed',
      resourceType: 'submission_review',
      resourceId: review.id,
      details: { submissionId: req.params.id },
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || 'unknown',
    }).catch(console.error);

    res.status(201).json({ data: review });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map((e: any) => ({ field: e.path.join('.'), message: e.message })),
      });
      return;
    }
    console.error('Error reviewing submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/submissions/:id/review
 * Get the review for a submission.
 */
router.get('/:id/review', authenticate, async (req: Request, res: Response) => {
  try {
    const submission = await getSubmissionById(req.params.id);
    if (!submission) {
      res.status(404).json({ error: 'Not found', message: 'Submission not found' });
      return;
    }

    // Check authorization
    const assignment = await getAssignmentById(submission.assignmentId);
    if (!assignment) {
      res.status(404).json({ error: 'Not found', message: 'Associated assignment not found' });
      return;
    }

    if (req.user!.role === 'client' && submission.clientId !== req.user!.sub) {
      res.status(403).json({ error: 'Forbidden', message: 'Not your submission' });
      return;
    }
    if (req.user!.role === 'clinician' && assignment.clinicianId !== req.user!.sub) {
      res.status(403).json({ error: 'Forbidden', message: 'Not your client\'s submission' });
      return;
    }

    const review = await getSubmissionReview(req.params.id);
    if (!review) {
      res.status(404).json({ error: 'Not found', message: 'Review not found' });
      return;
    }

    res.json({ data: review });
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;