import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createUser, findUserByEmail, verifyPassword } from '../models/user';
import {
  generateTokenPair,
  rotateRefreshToken,
  verifyRefreshToken,
} from '../services/auth';
import { authenticate, requireRole } from '../middleware/auth';
import { logAuditEvent } from '../audit/service';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  displayName: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name too long'),
  role: z.enum(['clinician', 'client'], {
    errorMap: () => ({ message: 'Role must be "clinician" or "client"' }),
  }),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * POST /api/auth/register
 * Create a new user account.
 * Rate-limited to prevent abuse.
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const input = registerSchema.parse(req.body);

    // Check if user already exists
    const existing = await findUserByEmail(input.email);
    if (existing) {
      res.status(409).json({
        error: 'Conflict',
        message: 'A user with this email already exists',
      });
      return;
    }

    // Create user
    const user = await createUser(input);
    const tokens = generateTokenPair(user.id, user.role);

    // Log registration
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logAuditEvent({
      userId: user.id,
      action: 'user.created',
      resourceType: 'user',
      resourceId: user.id,
      details: { role: user.role },
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || 'unknown',
    }).catch(console.error);

    res.status(201).json({
      user,
      ...tokens,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token pair.
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const input = loginSchema.parse(req.body);

    const user = await findUserByEmail(input.email);
    if (!user) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
      return;
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
      return;
    }

    const tokens = generateTokenPair(user.id, user.role);

    // Log successful login
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logAuditEvent({
      userId: user.id,
      action: 'user.login',
      resourceType: 'user',
      resourceId: user.id,
      details: {},
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || 'unknown',
    }).catch(console.error);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
      ...tokens,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/refresh
 * Exchange a valid refresh token for a new token pair.
 * Implements refresh token rotation for security.
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);

    // Verify and decode the refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Rotate: old token is consumed, new pair issued
    const tokens = rotateRefreshToken(refreshToken);

    res.json(tokens);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      });
      return;
    }

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'Refresh token expired',
        message: 'Please log in again',
        code: 'REFRESH_EXPIRED',
      });
      return;
    }

    res.status(401).json({
      error: 'Invalid refresh token',
      message: 'Refresh token is invalid or malformed',
    });
  }
});

/**
 * GET /api/auth/me
 * Return the currently authenticated user's profile.
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const { findUserById } = await import('../models/user');

  try {
    const user = await findUserById(req.user!.sub);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Log out (client-side token invalidation).
 * In production this would also revoke the refresh token in the DB.
 */
router.post('/logout', authenticate, (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  logAuditEvent({
    userId: req.user!.sub,
    action: 'user.logout',
    resourceType: 'user',
    resourceId: req.user!.sub,
    details: {},
    ipAddress: ip,
    userAgent: req.headers['user-agent'] || 'unknown',
  }).catch(console.error);

  res.json({ message: 'Logged out successfully' });
});

export default router;
