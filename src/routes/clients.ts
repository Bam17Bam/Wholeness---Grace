import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../middleware/auth';
import { getClinicianClients, getUnassignedClients, assignClientToClinician, removeClientFromClinician, getClientById } from '../models/client';
import { logAuditEvent } from '../audit/service';

const router = Router();

/**
 * GET /api/clients
 * List all clients assigned to the authenticated clinician.
 * Supports ?search and ?unassigned query params.
 */
router.get('/', authenticate, requireRole('clinician'), async (req: Request, res: Response) => {
  try {
    const unassigned = req.query.unassigned === 'true';
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    let clients;
    if (unassigned) {
      clients = await getUnassignedClients(req.user!.sub, limit, offset);
    } else {
      clients = await getClinicianClients(req.user!.sub, limit, offset);
    }

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logAuditEvent({
      userId: req.user!.sub,
      action: 'client.viewed',
      resourceType: 'client',
      resourceId: null,
      details: { count: clients.length, unassigned },
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || 'unknown',
    }).catch(console.error);

    res.json({ data: clients, total: clients.length });
  } catch (error: any) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/clients
 * Assign a client to the authenticated clinician.
 */
router.post('/', authenticate, requireRole('clinician'), async (req: Request, res: Response) => {
  const schema = z.object({
    clientId: z.string().uuid('Invalid client ID'),
  });

  try {
    const { clientId } = schema.parse(req.body);

    // Verify the client exists and is actually a client role
    const client = await getClientById(clientId);
    if (!client) {
      res.status(404).json({ error: 'Not found', message: 'Client not found' });
      return;
    }

    const assignment = await assignClientToClinician(req.user!.sub, clientId);

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logAuditEvent({
      userId: req.user!.sub,
      action: 'client.created',
      resourceType: 'clinician_assignment',
      resourceId: assignment.id,
      details: { clientId },
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
    console.error('Error assigning client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/clients/:id
 * Remove a client from the clinician's roster.
 */
router.delete('/:id', authenticate, requireRole('clinician'), async (req: Request, res: Response) => {
  try {
    await removeClientFromClinician(req.user!.sub, req.params.id);

    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logAuditEvent({
      userId: req.user!.sub,
      action: 'client.created',
      resourceType: 'clinician_assignment',
      resourceId: null,
      details: { clientId: req.params.id, action: 'removed' },
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || 'unknown',
    }).catch(console.error);

    res.json({ message: 'Client removed successfully' });
  } catch (error) {
    console.error('Error removing client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/clients/:id
 * Get a specific client's profile (clinician only).
 */
router.get('/:id', authenticate, requireRole('clinician'), async (req: Request, res: Response) => {
  try {
    const client = await getClientById(req.params.id);
    if (!client) {
      res.status(404).json({ error: 'Not found', message: 'Client not found' });
      return;
    }

    res.json({ data: client });
  } catch (error) {
    console.error('Error fetching client:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;