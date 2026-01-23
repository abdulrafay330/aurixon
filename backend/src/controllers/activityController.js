// ========================================================================
// ACTIVITY CONTROLLER
// Handles CRUD operations for all 11 activity types
// ========================================================================

import { v4 as uuidv4 } from 'uuid';
import { queryOne, queryAll, execute } from '../utils/db.js';
import { validateActivity } from '../utils/validation.js';

// Helper: Get table name from activity type
function getTableName(activityType) {
  const tableMap = {
    stationary_combustion: 'stationary_combustion_activities',
    mobile_sources: 'mobile_sources_activities',
    refrigeration_ac: 'refrigeration_ac_activities',
    fire_suppression: 'fire_suppression_activities',
    purchased_gases: 'purchased_gases_activities',
    electricity: 'electricity_activities',
    steam: 'steam_activities',
    business_travel_air: 'business_travel_air',
    business_travel_rail: 'business_travel_rail',
    business_travel_road: 'business_travel_road',
    business_travel_hotel: 'business_travel_hotel',
    commuting: 'commuting_activities',
    transportation_distribution: 'transportation_distribution_activities',
    waste: 'waste_activities',
    offsets: 'offsets_activities',
  };
  return tableMap[activityType];
}

/**
 * Create activity
 * POST /api/activities/:activityType
 */
export async function createActivity(req, res, next) {
  try {
    const { activityType } = req.params;
    // Convert hyphenated URLs to underscore format (stationary-combustion -> stationary_combustion)
    const normalizedActivityType = activityType.replace(/-/g, '_');
    // Accept both camelCase and snake_case for reporting period ID
    const reportingPeriodId = req.body.reportingPeriodId || req.body.reporting_period_id;
    const { reportingPeriodId: _, reporting_period_id: __, ...activityData } = req.body;
    const userId = req.user.userId;
    const companyId = req.params.companyId;

    // Validate activity data
    const validation = validateActivity(normalizedActivityType, activityData);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      });
    }

    const tableName = getTableName(normalizedActivityType);
    if (!tableName) {
      return res.status(400).json({ error: `Unknown activity type: ${normalizedActivityType}` });
    }

    const id = uuidv4();
    const now = new Date();

    // Build dynamic INSERT query
    const fields = ['id', 'company_id', 'reporting_period_id', 'entered_by', 'created_at', 'updated_at'];
    const values = [id, companyId, reportingPeriodId, userId, now, now];
    const placeholders = ['$1', '$2', '$3', '$4', '$5', '$6'];

    let paramIndex = 7;
    for (const [key, value] of Object.entries(activityData)) {
      // Skip reporting_period_id and entered_by as they're already included in base fields
      if (key === 'reporting_period_id' || key === 'entered_by') continue;
      
      fields.push(key);
      values.push(value);
      placeholders.push(`$${paramIndex}`);
      paramIndex++;
    }

    const query = `
      INSERT INTO ${tableName} (${fields.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await queryOne(query, values);

    res.status(201).json({
      message: `${activityType} activity created`,
      activity: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get activity by ID
 * GET /api/activities/:activityType/:id
 */
export async function getActivity(req, res, next) {
  try {
    const { activityType, id } = req.params;
    const companyId = req.params.companyId;

    const tableName = getTableName(activityType);
    if (!tableName) {
      return res.status(400).json({ error: `Unknown activity type: ${activityType}` });
    }

    const activity = await queryOne(
      `SELECT * FROM ${tableName} WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({ activity });
  } catch (error) {
    next(error);
  }
}

/**
 * List activities by type
 * GET /api/activities/:activityType
 */
export async function listActivities(req, res, next) {
  try {
    const { activityType } = req.params;
    // Convert hyphenated URLs to underscore format
    const normalizedActivityType = activityType.replace(/-/g, '_');
    const { reportingPeriodId } = req.query;
    const companyId = req.params.companyId;

    const tableName = getTableName(normalizedActivityType);
    if (!tableName) {
      return res.status(400).json({ error: `Unknown activity type: ${normalizedActivityType}` });
    }

    let query = `SELECT * FROM ${tableName} WHERE company_id = $1`;
    const values = [companyId];

    if (reportingPeriodId) {
      query += ` AND reporting_period_id = $2`;
      values.push(reportingPeriodId);
    }

    query += ` ORDER BY created_at DESC`;

    const activities = await queryAll(query, values);

    res.json({
      activityType: normalizedActivityType,
      count: activities.length,
      activities,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update activity
 * PUT /api/activities/:activityType/:id
 */
export async function updateActivity(req, res, next) {
  try {
    const { activityType, id } = req.params;
    const companyId = req.params.companyId;
    const activityData = req.body;

    // Validate activity data
    const validation = validateActivity(activityType, activityData);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      });
    }

    const tableName = getTableName(activityType);
    if (!tableName) {
      return res.status(400).json({ error: `Unknown activity type: ${activityType}` });
    }

    // Build dynamic UPDATE query
    const updates = [];
    const values = [companyId, id];
    let paramIndex = 3;

    updates.push('updated_at = $' + paramIndex);
    values.push(new Date());
    paramIndex++;

    for (const [key, value] of Object.entries(activityData)) {
      updates.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    const query = `
      UPDATE ${tableName}
      SET ${updates.join(', ')}
      WHERE id = $2 AND company_id = $1
      RETURNING *
    `;

    const result = await queryOne(query, values);

    if (!result) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({
      message: `${activityType} activity updated`,
      activity: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete activity
 * DELETE /api/activities/:activityType/:id
 */
export async function deleteActivity(req, res, next) {
  try {
    const { activityType, id } = req.params;
    const companyId = req.params.companyId;

    const tableName = getTableName(activityType);
    if (!tableName) {
      return res.status(400).json({ error: `Unknown activity type: ${activityType}` });
    }

    await execute(
      `DELETE FROM ${tableName} WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    );

    res.json({ message: `${activityType} activity deleted` });
  } catch (error) {
    next(error);
  }
}

/**
 * List all activities for a reporting period (all types combined)
 * GET /api/reporting-periods/:periodId/activities
 */
export async function listAllActivitiesByPeriod(req, res, next) {
  try {
    const { periodId } = req.params;
    const companyId = req.params.companyId;

    const activityTables = [
      'stationary_combustion_activities',
      'mobile_sources_activities',
      'refrigeration_ac_activities',
      'fire_suppression_activities',
      'purchased_gases_activities',
      'electricity_activities',
      'steam_activities',
      'business_travel_air',
      'business_travel_rail',
      'business_travel_road',
      'business_travel_hotel',
      'commuting_activities',
      'transportation_distribution_activities',
      'waste_activities',
      'offsets_activities',
    ];

    const results = {};

    for (const table of activityTables) {
      const activities = await queryAll(
        `SELECT * FROM ${table} WHERE company_id = $1 AND reporting_period_id = $2`,
        [companyId, periodId]
      );
      results[table] = activities;
    }

    res.json({
      reportingPeriodId: periodId,
      activities: results,
    });
  } catch (error) {
    next(error);
  }
}
