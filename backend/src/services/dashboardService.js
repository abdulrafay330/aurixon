/**
 * ========================================================================
 * DASHBOARD SERVICE
 * ========================================================================
 * 
 * Business logic for dashboard KPIs, alerts, and analytics
 */

import pool from '../utils/db.js';

/**
 * Get KPIs for a company
 * @param {number} companyId - Company ID
 * @param {number} periodId - Optional specific period ID
 * @returns {Promise<object>} KPI data
 */
export async function getCompanyKPIs(companyId, periodId = null) {
  const periodFilter = periodId ? 'AND rp.id = $2' : '';
  const params = periodId ? [companyId, periodId] : [companyId];

  // Get total emissions
  const emissionsQuery = await pool.query(
    `SELECT 
       SUM(CAST(cr.result_data->>'total_emissions_mt_co2e' AS NUMERIC)) as total_emissions,
       SUM(CAST(cr.result_data->>'co2_mt' AS NUMERIC)) as total_co2,
       SUM(CAST(cr.result_data->>'ch4_mt' AS NUMERIC)) as total_ch4,
       SUM(CAST(cr.result_data->>'n2o_mt' AS NUMERIC)) as total_n2o,
       COUNT(DISTINCT cr.reporting_period_id) as period_count,
       COUNT(*) as calculation_count
     FROM calculation_results cr
     JOIN reporting_periods rp ON cr.reporting_period_id = rp.id
     WHERE rp.company_id = $1 ${periodFilter}`,
    params
  );

  const emissions = emissionsQuery.rows[0];

  // Get scope breakdown
  const scopeQuery = await pool.query(
    `SELECT 
       CASE 
         WHEN cr.activity_type IN ('stationary_combustion', 'mobile_sources', 'refrigeration_ac') THEN 'Scope 1'
         WHEN cr.activity_type IN ('electricity', 'steam') THEN 'Scope 2'
         ELSE 'Scope 3'
       END as scope,
       SUM(CAST(cr.result_data->>'total_emissions_mt_co2e' AS NUMERIC)) as emissions
     FROM calculation_results cr
     JOIN reporting_periods rp ON cr.reporting_period_id = rp.id
     WHERE rp.company_id = $1 ${periodFilter}
     GROUP BY scope`,
    params
  );

  const scopeBreakdown = scopeQuery.rows.reduce((acc, row) => {
    acc[row.scope] = parseFloat(row.emissions || 0);
    return acc;
  }, {});

  // Get activity type breakdown
  const activityQuery = await pool.query(
    `SELECT 
       cr.activity_type,
       SUM(CAST(cr.result_data->>'total_emissions_mt_co2e' AS NUMERIC)) as emissions,
       COUNT(*) as activity_count
     FROM calculation_results cr
     JOIN reporting_periods rp ON cr.reporting_period_id = rp.id
     WHERE rp.company_id = $1 ${periodFilter}
     GROUP BY cr.activity_type
     ORDER BY emissions DESC`,
    params
  );

  // Get trends (last 12 months)
  const trendsQuery = await pool.query(
    `SELECT 
       DATE_TRUNC('month', rp.start_date) as month,
       SUM(CAST(cr.result_data->>'total_emissions_mt_co2e' AS NUMERIC)) as emissions
     FROM calculation_results cr
     JOIN reporting_periods rp ON cr.reporting_period_id = rp.id
     WHERE rp.company_id = $1 
       AND rp.start_date >= NOW() - INTERVAL '12 months'
     GROUP BY DATE_TRUNC('month', rp.start_date)
     ORDER BY month`,
    [companyId]
  );

  return {
    totalEmissions: parseFloat(emissions.total_emissions || 0),
    ghgComposition: {
      co2: parseFloat(emissions.total_co2 || 0),
      ch4: parseFloat(emissions.total_ch4 || 0),
      n2o: parseFloat(emissions.total_n2o || 0)
    },
    scopeBreakdown,
    activityBreakdown: activityQuery.rows.map(row => ({
      activityType: row.activity_type,
      emissions: parseFloat(row.emissions || 0),
      activityCount: parseInt(row.activity_count)
    })),
    periodCount: parseInt(emissions.period_count || 0),
    calculationCount: parseInt(emissions.calculation_count || 0),
    trends: trendsQuery.rows.map(row => ({
      month: row.month,
      emissions: parseFloat(row.emissions || 0)
    }))
  };
}

/**
 * Get emissions intensity metrics
 * @param {number} companyId - Company ID
 * @param {number} periodId - Reporting period ID
 * @param {object} metricsData - Revenue, employees, sqm, production units
 * @returns {Promise<object>} Intensity metrics
 */
export async function getEmissionsIntensity(companyId, periodId, metricsData) {
  const { revenue, employees, squareMeters, productionUnits } = metricsData;

  // Get total emissions for period
  const emissionsQuery = await pool.query(
    `SELECT 
       SUM(CAST(result_data->>'total_emissions_mt_co2e' AS NUMERIC)) as total_emissions
     FROM calculation_results
     WHERE reporting_period_id = $1`,
    [periodId]
  );

  const totalEmissions = parseFloat(emissionsQuery.rows[0]?.total_emissions || 0);

  const intensity = {};

  if (revenue) {
    intensity.perRevenue = totalEmissions / revenue; // MT CO2e per $1M revenue
    intensity.revenueUnit = '$1M';
  }

  if (employees) {
    intensity.perEmployee = totalEmissions / employees; // MT CO2e per employee
  }

  if (squareMeters) {
    intensity.perSquareMeter = totalEmissions / squareMeters; // MT CO2e per sqm
  }

  if (productionUnits) {
    intensity.perProductionUnit = totalEmissions / productionUnits; // MT CO2e per unit
  }

  return {
    totalEmissions,
    intensity
  };
}

/**
 * Generate alerts based on emission thresholds
 * @param {number} companyId - Company ID
 * @param {object} thresholds - Alert thresholds
 * @returns {Promise<array>} Array of alerts
 */
export async function generateAlerts(companyId, thresholds = {}) {
  const {
    highEmissionThreshold = 1000, // MT CO2e
    monthlyIncreaseThreshold = 0.15, // 15%
    scope1Threshold = 500,
    scope2Threshold = 500
  } = thresholds;

  const alerts = [];

  // Get latest period
  const latestPeriod = await pool.query(
    `SELECT id, period_name FROM reporting_periods 
     WHERE company_id = $1 
     ORDER BY start_date DESC LIMIT 1`,
    [companyId]
  );

  if (latestPeriod.rows.length === 0) {
    return alerts;
  }

  const periodId = latestPeriod.rows[0].id;
  const periodName = latestPeriod.rows[0].period_name;

  // Check total emissions threshold
  const totalQuery = await pool.query(
    `SELECT SUM(CAST(result_data->>'total_emissions_mt_co2e' AS NUMERIC)) as total
     FROM calculation_results WHERE reporting_period_id = $1`,
    [periodId]
  );

  const totalEmissions = parseFloat(totalQuery.rows[0]?.total || 0);

  if (totalEmissions > highEmissionThreshold) {
    alerts.push({
      alertType: 'High Emissions Detected',
      severity: 'high',
      message: `Total emissions of ${totalEmissions.toFixed(2)} MT CO2e exceed threshold of ${highEmissionThreshold} MT CO2e`,
      periodName,
      value: totalEmissions,
      threshold: highEmissionThreshold
    });
  }

  // Check month-over-month increase
  const previousPeriod = await pool.query(
    `SELECT id FROM reporting_periods 
     WHERE company_id = $1 AND start_date < (
       SELECT start_date FROM reporting_periods WHERE id = $2
     )
     ORDER BY start_date DESC LIMIT 1`,
    [companyId, periodId]
  );

  if (previousPeriod.rows.length > 0) {
    const prevQuery = await pool.query(
      `SELECT SUM(CAST(result_data->>'total_emissions_mt_co2e' AS NUMERIC)) as total
       FROM calculation_results WHERE reporting_period_id = $1`,
      [previousPeriod.rows[0].id]
    );

    const prevEmissions = parseFloat(prevQuery.rows[0]?.total || 0);
    
    if (prevEmissions > 0) {
      const increase = (totalEmissions - prevEmissions) / prevEmissions;
      
      if (increase > monthlyIncreaseThreshold) {
        alerts.push({
          alertType: 'Significant Increase Detected',
          severity: 'medium',
          message: `Emissions increased by ${(increase * 100).toFixed(1)}% from previous period`,
          periodName,
          value: increase,
          threshold: monthlyIncreaseThreshold
        });
      }
    }
  }

  // Check scope-specific thresholds
  const scopeQuery = await pool.query(
    `SELECT 
       CASE 
         WHEN activity_type IN ('stationary_combustion', 'mobile_sources', 'refrigeration_ac') THEN 'Scope 1'
         WHEN activity_type IN ('electricity', 'steam') THEN 'Scope 2'
         ELSE 'Scope 3'
       END as scope,
       SUM(CAST(result_data->>'total_emissions_mt_co2e' AS NUMERIC)) as emissions
     FROM calculation_results
     WHERE reporting_period_id = $1
     GROUP BY scope`,
    [periodId]
  );

  scopeQuery.rows.forEach(row => {
    const emissions = parseFloat(row.emissions || 0);
    
    if (row.scope === 'Scope 1' && emissions > scope1Threshold) {
      alerts.push({
        alertType: `${row.scope} Threshold Exceeded`,
        severity: 'medium',
        message: `${row.scope} emissions of ${emissions.toFixed(2)} MT CO2e exceed threshold`,
        periodName,
        value: emissions,
        threshold: scope1Threshold
      });
    }
    
    if (row.scope === 'Scope 2' && emissions > scope2Threshold) {
      alerts.push({
        alertType: `${row.scope} Threshold Exceeded`,
        severity: 'medium',
        message: `${row.scope} emissions of ${emissions.toFixed(2)} MT CO2e exceed threshold`,
        periodName,
        value: emissions,
        threshold: scope2Threshold
      });
    }
  });

  return alerts;
}

/**
 * Get benchmark comparison
 * @param {number} companyId - Company ID
 * @param {string} industry - Industry sector
 * @param {number} periodId - Reporting period ID
 * @returns {Promise<object>} Benchmark data
 */
export async function getBenchmarkComparison(companyId, industry, periodId) {
  // Get company emissions
  const companyQuery = await pool.query(
    `SELECT SUM(CAST(result_data->>'total_emissions_mt_co2e' AS NUMERIC)) as total
     FROM calculation_results WHERE reporting_period_id = $1`,
    [periodId]
  );

  const companyEmissions = parseFloat(companyQuery.rows[0]?.total || 0);

  // Get industry average (from companies in same industry)
  const industryQuery = await pool.query(
    `SELECT 
       AVG(total_emissions) as avg_emissions,
       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_emissions) as median_emissions,
       PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_emissions) as percentile_25,
       PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_emissions) as percentile_75,
       COUNT(*) as company_count
     FROM (
       SELECT 
         c.id,
         SUM(CAST(cr.result_data->>'total_emissions_mt_co2e' AS NUMERIC)) as total_emissions
       FROM companies c
       JOIN reporting_periods rp ON c.id = rp.company_id
       JOIN calculation_results cr ON rp.id = cr.reporting_period_id
       WHERE c.industry = $1 AND c.id != $2
       GROUP BY c.id
     ) industry_data`,
    [industry, companyId]
  );

  const industryData = industryQuery.rows[0];

  const benchmarkData = {
    companyEmissions,
    industry,
    industryAverage: parseFloat(industryData.avg_emissions || 0),
    industryMedian: parseFloat(industryData.median_emissions || 0),
    percentile25: parseFloat(industryData.percentile_25 || 0),
    percentile75: parseFloat(industryData.percentile_75 || 0),
    companyCount: parseInt(industryData.company_count || 0)
  };

  // Calculate percentile ranking
  if (benchmarkData.industryMedian > 0) {
    if (companyEmissions < benchmarkData.percentile25) {
      benchmarkData.ranking = 'Top 25% (Low Emissions)';
    } else if (companyEmissions < benchmarkData.industryMedian) {
      benchmarkData.ranking = 'Below Average';
    } else if (companyEmissions < benchmarkData.percentile75) {
      benchmarkData.ranking = 'Above Average';
    } else {
      benchmarkData.ranking = 'Top 75% (High Emissions)';
    }

    benchmarkData.percentageDiff = ((companyEmissions - benchmarkData.industryAverage) / benchmarkData.industryAverage * 100).toFixed(1);
  }

  return benchmarkData;
}

/**
 * Get reduction targets and progress
 * @param {number} companyId - Company ID
 * @param {object} targetData - Target configuration
 * @returns {Promise<object>} Target progress
 */
export async function getTargetProgress(companyId, targetData) {
  const { baselineYear, targetYear, reductionPercent, baselinePeriodId } = targetData;

  // Get baseline emissions
  const baselineQuery = await pool.query(
    `SELECT SUM(CAST(result_data->>'total_emissions_mt_co2e' AS NUMERIC)) as total
     FROM calculation_results WHERE reporting_period_id = $1`,
    [baselinePeriodId]
  );

  const baselineEmissions = parseFloat(baselineQuery.rows[0]?.total || 0);
  const targetEmissions = baselineEmissions * (1 - reductionPercent / 100);

  // Get current year emissions
  const currentQuery = await pool.query(
    `SELECT 
       rp.id, rp.period_name,
       SUM(CAST(cr.result_data->>'total_emissions_mt_co2e' AS NUMERIC)) as total
     FROM calculation_results cr
     JOIN reporting_periods rp ON cr.reporting_period_id = rp.id
     WHERE rp.company_id = $1
     ORDER BY rp.start_date DESC LIMIT 1`,
    [companyId]
  );

  const currentEmissions = parseFloat(currentQuery.rows[0]?.total || 0);
  const reductionAchieved = baselineEmissions - currentEmissions;
  const reductionRequired = baselineEmissions - targetEmissions;
  const progressPercent = reductionRequired > 0 ? (reductionAchieved / reductionRequired * 100) : 0;

  return {
    baselineYear,
    baselineEmissions,
    targetYear,
    targetEmissions,
    reductionPercent,
    currentEmissions,
    reductionAchieved,
    reductionRequired,
    progressPercent,
    onTrack: progressPercent >= 50, // Simple heuristic
    yearsRemaining: targetYear - new Date().getFullYear()
  };
}

export default {
  getCompanyKPIs,
  getEmissionsIntensity,
  generateAlerts,
  getBenchmarkComparison,
  getTargetProgress
};
