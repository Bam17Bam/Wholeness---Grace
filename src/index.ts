import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import assignmentRoutes from './routes/assignments';
import submissionRoutes from './routes/submissions';
import auditLogRoutes from './routes/audit-logs';
import { testConnection } from './database';

const app = express();

// ─── Security Middleware ──────────────────────────────────────

// HTTP security headers (Helmet)
app.use(helmet());

// CORS — allow frontend origin and all origins in development
const corsOrigins = config.nodeEnv === 'development'
  ? ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174', '*']
  : config.frontendUrl;

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Request-Id'],
  })
);

// Body parsing with size limits (prevents large payload attacks)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting — global
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Please try again later',
  },
});
app.use(limiter);

// ─── Request ID ───────────────────────────────────────────────
app.use((req, res, next) => {
  const { v4: uuidv4 } = require('uuid');
  (req as any).requestId = uuidv4();
  res.setHeader('X-Request-Id', (req as any).requestId);
  next();
});

// ─── Routes ───────────────────────────────────────────────────

// Health check (no auth required)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Client management routes (clinician only)
app.use('/api/clients', clientRoutes);

// Assignment routes
app.use('/api/assignments', assignmentRoutes);

// Submission routes
app.use('/api/submissions', submissionRoutes);

// Audit log routes (clinician only)
app.use('/api/audit-logs', auditLogRoutes);

// ─── Error Handling ───────────────────────────────────────────

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler (must have 4 parameters)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', {
    requestId: (req as any).requestId,
    error: err.message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
  });

  // Never expose internal error details in production (HIPAA)
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : 'An unexpected error occurred',
    requestId: (req as any).requestId,
  });
});

// ─── Start Server ─────────────────────────────────────────────

async function start(): Promise<void> {
  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.warn('⚠  Database connection failed. Server will start but DB features will error.');
  }

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════╗
║     Wholeness and Grace — API Server        ║
║──────────────────────────────────────────────║
║  Environment: ${config.nodeEnv.padEnd(28)}║
║  Port:        ${String(config.port).padEnd(28)}║
║  Frontend:    ${config.frontendUrl.padEnd(28)}║
║  Database:    ${dbConnected ? '✅ Connected'.padEnd(28) : '❌ Disconnected'.padEnd(28)}║
╚══════════════════════════════════════════════╝
    `);
  });
}

start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
