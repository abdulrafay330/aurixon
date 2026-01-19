// ========================================================================
// REFERENCE DATA CONTROLLER
// Provides dropdown lists and reference data for activities
// ========================================================================

import { getActivityTypes, getDropdowns } from '../utils/validation.js';

/**
 * Get all activity types with metadata
 * GET /api/reference/activity-types
 */
export async function getActivityTypesReference(req, res, next) {
  try {
    const types = getActivityTypes();

    // Return array directly for simpler consumption
    res.json(types);
  } catch (error) {
    next(error);
  }
}

/**
 * Get all dropdown reference data
 * GET /api/reference/dropdowns
 */
export async function getDropdownsReference(req, res, next) {
  try {
    const dropdowns = getDropdowns();

    // Return dropdowns directly without wrapping
    res.json(dropdowns);
  } catch (error) {
    next(error);
  }
}

/**
 * Get specific dropdown by name
 * GET /api/reference/dropdowns/:name
 */
export async function getDropdownByName(req, res, next) {
  try {
    const { name } = req.params;
    const dropdowns = getDropdowns();

    if (!dropdowns[name]) {
      return res.status(404).json({
        error: `Dropdown not found: ${name}`,
        available: Object.keys(dropdowns),
      });
    }

    // Return options array directly
    res.json(dropdowns[name]);
  } catch (error) {
    next(error);
  }
}
