import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { getAuditLogs } from '../audit/service';

const router = Router();

/**
 * GET /api/audit-logs
 * Retrieve audit logs (clinician only — HIPAA compliance).
 * Supports filtering by userId, action, and pagination.
 */
router.get('/', authenticate, requireRole('clinician'), async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string | undefined;
    const action = req.query.action as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await getAuditLogs(userId, action, limit, offset);

    res.json({
      data: logs,
      total: logs.length,
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;