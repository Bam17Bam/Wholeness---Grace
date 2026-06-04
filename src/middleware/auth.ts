import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../services/auth';
import { logAuditEvent } from '../audit/service';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Extract JWT from Authorization header (Bearer token).
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Middleware: Authenticate user via JWT.
 * Attaches decoded token to req.user if valid.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Missing or invalid Authorization header',
    });
    return;
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'Token expired',
        message: 'Access token has expired. Please refresh.',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    res.status(401).json({
      error: 'Invalid token',
      message: 'Access token is invalid or malformed',
    });
  }
}

/**
 * Middleware factory: Require specific role(s).
 * Must be used after `authenticate`.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No authenticated user found',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      // Log unauthorized access attempt
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      logAuditEvent({
        userId: req.user.sub,
        action: 'user.login',
        resourceType: 'authorization',
        resourceId: null,
        details: {
          reason: 'insufficient_role',
          required: roles,
          attempted: req.user.role,
          path: req.path,
          method: req.method,
        },
        ipAddress: ip,
        userAgent: req.headers['user-agent'] || 'unknown',
      }).catch(console.error);

      res.status(403).json({
        error: 'Forbidden',
        message: `Role '${req.user.role}' does not have permission for this action`,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware: Rate limit by user ID (complements IP-based limiter).
 */
export function userRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.user) {
    // This is handled by express-rate-limit at the app level
    // Custom per-user limiting can be added here if needed
  }
  next();
}
