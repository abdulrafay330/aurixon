// ========================================================================
// BOUNDARY QUESTIONS ROUTES
// Scope determination (Scope 1, 2, 3 boundaries)
// ========================================================================

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import {
  createOrUpdateBoundaryQuestions,
  getBoundaryQuestions,
  getBoundarySummary,
} from '../controllers/boundaryController.js';

const router = Router({ mergeParams: true });

// Middleware: Require authentication
router.use(authMiddleware);
router.use(requireRole(['viewer', 'editor', 'company_admin', 'internal_admin']));

/**
 * POST /api/companies/:companyId/reporting-periods/:periodId/boundary-questions
 * Create or update boundary questions (EDITOR+ only)
 */
router.post(
  '/boundary-questions',
  requireRole(['editor', 'company_admin', 'internal_admin']),
  createOrUpdateBoundaryQuestions
);

/**
 * GET /api/companies/:companyId/reporting-periods/:periodId/boundary-questions
 * Get boundary questions
 */
router.get('/boundary-questions', getBoundaryQuestions);

/**
 * GET /api/companies/:companyId/reporting-periods/:periodId/boundary-summary
 * Get summary of enabled scopes/modules
 */
router.get('/boundary-summary', getBoundarySummary);

export default router;
