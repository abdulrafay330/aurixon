// ========================================================================
// BOUNDARY QUESTIONS CONTROLLER
// Manages scope determination (Scope 1, 2, 3 boundary questions)
// ========================================================================

import { v4 as uuidv4 } from 'uuid';
import { queryOne, execute } from '../utils/db.js';

/**
 * Create or get boundary questions for a reporting period
 * POST /api/reporting-periods/:periodId/boundary-questions
 */
export async function createOrUpdateBoundaryQuestions(req, res, next) {
  try {
    const { periodId } = req.params;
    const companyId = req.params.companyId;
    const questions = req.body;

    // Check if reporting period belongs to this company
    const period = await queryOne(
      'SELECT id FROM reporting_periods WHERE id = $1 AND company_id = $2',
      [periodId, companyId]
    );

    if (!period) {
      return res.status(404).json({ error: 'Reporting period not found' });
    }

    // Normalize field names: add 'has_' prefix if not present for database storage
    const normalizedForDb = {};
    for (const [key, value] of Object.entries(questions)) {
      const dbKey = key.startsWith('has_') ? key : `has_${key}`;
      normalizedForDb[dbKey] = value;
    }

    // Check if boundary questions already exist
    const existing = await queryOne(
      'SELECT id FROM boundary_questions WHERE reporting_period_id = $1',
      [periodId]
    );

    if (existing) {
      // Update existing
      const updateFields = [];
      const values = [periodId];
      let paramIndex = 2;

      for (const [key, value] of Object.entries(normalizedForDb)) {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }

      updateFields.push(`updated_at = $${paramIndex}`);
      values.push(new Date());

      const result = await queryOne(
        `UPDATE boundary_questions SET ${updateFields.join(', ')} WHERE reporting_period_id = $1 RETURNING *`,
        values
      );

      // Convert back to API format (remove 'has_' prefix)
      const apiFormat = normalizeDbFieldsForResponse(result);

      return res.json({
        message: 'Boundary questions updated',
        boundaryQuestions: apiFormat,
      });
    }

    // Create new
    const id = uuidv4();
    const now = new Date();

    const fields = ['id', 'reporting_period_id', 'created_at', 'updated_at'];
    const values = [id, periodId, now, now];
    const placeholders = ['$1', '$2', '$3', '$4'];

    let paramIndex = 5;
    for (const [key, value] of Object.entries(normalizedForDb)) {
      fields.push(key);
      values.push(value);
      placeholders.push(`$${paramIndex}`);
      paramIndex++;
    }

    const result = await queryOne(
      `INSERT INTO boundary_questions (${fields.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );

    // Convert back to API format (remove 'has_' prefix)
    const apiFormat = normalizeDbFieldsForResponse(result);

    res.status(201).json({
      message: 'Boundary questions created',
      boundaryQuestions: apiFormat,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Helper function to normalize database field names to API format
 * Removes 'has_' prefix for API response
 */
function normalizeDbFieldsForResponse(dbObject) {
  const apiObject = {};
  for (const [key, value] of Object.entries(dbObject)) {
    if (key.startsWith('has_')) {
      // Remove 'has_' prefix for API response
      const apiKey = key.replace(/^has_/, '');
      apiObject[apiKey] = value;
    } else {
      apiObject[key] = value;
    }
  }
  return apiObject;
}

/**
 * Get boundary questions for a reporting period
 * GET /api/reporting-periods/:periodId/boundary-questions
 */
export async function getBoundaryQuestions(req, res, next) {
  try {
    const { periodId } = req.params;
    const companyId = req.params.companyId;

    // Verify reporting period belongs to company
    const period = await queryOne(
      'SELECT id FROM reporting_periods WHERE id = $1 AND company_id = $2',
      [periodId, companyId]
    );

    if (!period) {
      return res.status(404).json({ error: 'Reporting period not found' });
    }

    const questions = await queryOne(
      'SELECT * FROM boundary_questions WHERE reporting_period_id = $1',
      [periodId]
    );

    if (!questions) {
      return res.status(404).json({ error: 'Boundary questions not found' });
    }

    // Convert back to API format (remove 'has_' prefix)
    const apiFormat = normalizeDbFieldsForResponse(questions);

    res.json({ boundaryQuestions: apiFormat });
  } catch (error) {
    next(error);
  }
}

/**
 * Get boundary questions summary (which scopes are enabled)
 * GET /api/reporting-periods/:periodId/boundary-summary
 */
export async function getBoundarySummary(req, res, next) {
  try {
    const { periodId } = req.params;
    const companyId = req.params.companyId;

    const questions = await queryOne(
      'SELECT * FROM boundary_questions WHERE reporting_period_id = $1',
      [periodId]
    );

    if (!questions) {
      return res.status(404).json({ error: 'Boundary questions not found' });
    }

    // Build summary of enabled modules
    const scopeSummary = {
      scope1: {
        enabled:
          questions.has_stationary_combustion ||
          questions.has_mobile_sources ||
          questions.has_refrigeration_ac ||
          questions.has_fire_suppression ||
          questions.has_purchased_gases,
        modules: {
          stationary_combustion: questions.has_stationary_combustion,
          mobile_sources: questions.has_mobile_sources,
          refrigeration_ac: questions.has_refrigeration_ac,
          fire_suppression: questions.has_fire_suppression,
          purchased_gases: questions.has_purchased_gases,
        },
      },
      scope2: {
        enabled: questions.has_electricity || questions.has_steam,
        modules: {
          electricity: questions.has_electricity,
          steam: questions.has_steam,
          market_based_factors: questions.has_market_based_factors,
        },
      },
      scope3: {
        enabled:
          questions.has_business_travel ||
          questions.has_commuting ||
          questions.has_transportation_distribution ||
          questions.has_waste,
        modules: {
          business_travel: questions.has_business_travel,
          commuting: questions.has_commuting,
          transportation_distribution: questions.has_transportation_distribution,
          waste: questions.has_waste,
        },
      },
      offsets: questions.has_offsets,
    };

    res.json({
      reportingPeriodId: periodId,
      summary: scopeSummary,
    });
  } catch (error) {
    next(error);
  }
}
