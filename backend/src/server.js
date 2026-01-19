// ========================================================================
// MAIN EXPRESS SERVER
// AURIXON Backend API
// ========================================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/authRoutes.js';
import companyRoutes from './routes/companyRoutes.js';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errors.js';

// Import database utilities
import { testConnection } from './utils/db.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ========================================================================
// MIDDLEWARE
// ========================================================================

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
}));

// Request logging (simple)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ========================================================================
// DATABASE CONNECTION TEST
// ========================================================================

// Test database connection on startup
const dbReady = await testConnection();
if (!dbReady) {
  console.error('[CRITICAL] Cannot connect to database');
  console.error('[ERROR] Please ensure DATABASE_URL is configured and PostgreSQL is running');
  console.error('[ERROR] DATABASE_URL:', process.env.DATABASE_URL);
  process.exit(1);
}

console.log('[DB] Connected successfully');

// ========================================================================
// HEALTH CHECK
// ========================================================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  });
});

// ========================================================================
// API ROUTES
// ========================================================================

app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);

// ========================================================================
// ERROR HANDLING
// ========================================================================

app.use(notFoundHandler);
app.use(errorHandler);

// ========================================================================
// START SERVER
// ========================================================================

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                  AURIXON BACKEND API                          ║
║                                                                ║
║  Environment:        ${NODE_ENV.padEnd(39)}║
║  Port:               ${String(PORT).padEnd(39)}║
║  URL:                http://localhost:${String(PORT).padEnd(25)}║
║                                                                ║
║  Available endpoints:                                          ║
║  - POST   /api/auth/register                                 ║
║  - POST   /api/auth/login                                    ║
║  - POST   /api/auth/company/signup                           ║
║  - GET    /api/auth/me                                       ║
║  - GET    /api/companies/:companyId                          ║
║  - PUT    /api/companies/:companyId                          ║
║  - GET    /api/companies/:companyId/users                    ║
║  - POST   /api/companies/:companyId/users                    ║
║  - PUT    /api/companies/:companyId/users/:userId            ║
║  - DELETE /api/companies/:companyId/users/:userId            ║
║                                                                ║
║  Database: PostgreSQL (raw SQL queries)                       ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
