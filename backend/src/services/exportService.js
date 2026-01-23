/**
 * ========================================================================
 * EXPORT SERVICE
 * ========================================================================
 * 
 * Handles generation of PDF reports, CSV exports, and Excel workbooks
 */

import PDFDocument from 'pdfkit';
import { createObjectCsvWriter } from 'csv-writer';
import ExcelJS from 'exceljs';
import pool from '../utils/db.js';
import * as trafficLightService from './trafficLightService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate PDF report for a reporting period
 * @param {number} periodId - Reporting period ID
 * @param {object} options - Report options (includeCharts, includeDetails, etc.)
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generatePDFReport(periodId, options = {}) {
  const {
    includeDetails = true,
    includeBreakdown = true,
    companyLogo = null
  } = options;

  // Fetch period data
  const periodQuery = await pool.query(
    `SELECT rp.*, c.name as company_name, c.industry 
     FROM reporting_periods rp 
     JOIN companies c ON rp.company_id = c.id 
     WHERE rp.id = $1`,
    [periodId]
  );

  if (periodQuery.rows.length === 0) {
    throw new Error('Reporting period not found');
  }

  const period = periodQuery.rows[0];

  // Fetch aggregated emissions
  const emissionsQuery = await pool.query(
    `SELECT 
       SUM(CAST(result_data->>'total_emissions_mt_co2e' AS NUMERIC)) as total_emissions,
       SUM(CAST(result_data->>'co2_mt' AS NUMERIC)) as total_co2,
       SUM(CAST(result_data->>'ch4_mt' AS NUMERIC)) as total_ch4,
       SUM(CAST(result_data->>'n2o_mt' AS NUMERIC)) as total_n2o,
       activity_type,
       COUNT(*) as activity_count
     FROM calculation_results
     WHERE reporting_period_id = $1
     GROUP BY activity_type`,
    [periodId]
  );

  const emissions = emissionsQuery.rows;
  const totalEmissions = emissions.reduce((sum, row) => sum + parseFloat(row.total_emissions || 0), 0);

  // Calculate traffic light score
  const trafficLightScore = await trafficLightService.calculateTrafficLightScore(periodId, options.companyMetrics || {});

  // Create PDF
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];

  doc.on('data', chunk => chunks.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    if (companyLogo) {
      // doc.image(companyLogo, 50, 45, { width: 100 });
    }
    
    doc.fontSize(24).font('Helvetica-Bold').text('GHG Emissions Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica').text(period.company_name, { align: 'center' });
    doc.fontSize(10).text(`${period.period_name} | ${period.start_date} to ${period.end_date}`, { align: 'center' });
    doc.moveDown(1.5);

    // Traffic Light Score Section
    doc.fontSize(16).font('Helvetica-Bold').text('Performance Summary');
    doc.moveDown(0.5);
    
    // Overall Score
    const overallColor = getTrafficLightColor(trafficLightScore.overall);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(overallColor);
    doc.text(`Overall Rating: ${trafficLightScore.overall.toUpperCase()}`, { continued: false });
    doc.fillColor('black').font('Helvetica').fontSize(10);
    doc.moveDown(0.5);

    // Scope Scores
    doc.fontSize(11).font('Helvetica-Bold').text('Scope-Level Performance:');
    doc.fontSize(10).font('Helvetica');
    doc.fillColor(getTrafficLightColor(trafficLightScore.scope1)).text(`  Scope 1 (Direct): ${trafficLightScore.scope1.toUpperCase()}`, { indent: 20 });
    doc.fillColor(getTrafficLightColor(trafficLightScore.scope2)).text(`  Scope 2 (Energy): ${trafficLightScore.scope2.toUpperCase()}`, { indent: 20 });
    doc.fillColor(getTrafficLightColor(trafficLightScore.scope3)).text(`  Scope 3 (Value Chain): ${trafficLightScore.scope3.toUpperCase()}`, { indent: 20 });
    doc.fillColor('black');
    doc.moveDown(1);

    // Executive Summary
    doc.fontSize(16).font('Helvetica-Bold').text('Executive Summary');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total GHG Emissions: ${totalEmissions.toFixed(2)} MT CO2e`);
    doc.text(`Industry: ${period.industry || 'N/A'}`);
    doc.text(`Status: ${period.status}`);
    
    // Add intensity metrics if available
    if (trafficLightScore.intensityMetrics && trafficLightScore.intensityMetrics.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').text('Carbon Intensity:');
      doc.fontSize(10).font('Helvetica');
      trafficLightScore.intensityMetrics.forEach(metric => {
        if (metric.type === 'per_employee') {
          doc.text(`  ${metric.value.toFixed(2)} MT CO2e per employee`);
        } else if (metric.type === 'per_revenue') {
          doc.text(`  ${metric.value.toFixed(3)} kg CO2e per € revenue`);
        }
      });
    }
    doc.moveDown(1);

    // Emissions by Activity Type
    if (includeBreakdown) {
      doc.fontSize(14).font('Helvetica-Bold').text('Emissions Breakdown by Activity Type');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');

      emissions.forEach(emission => {
        const percentage = (parseFloat(emission.total_emissions) / totalEmissions * 100).toFixed(1);
        doc.text(`${emission.activity_type}: ${parseFloat(emission.total_emissions).toFixed(2)} MT CO2e (${percentage}%)`);
        doc.text(`  Activities: ${emission.activity_count}`, { indent: 20 });
        doc.moveDown(0.3);
      });
      doc.moveDown(1);
    }

    // GHG Composition
    const totalCO2 = emissions.reduce((sum, row) => sum + parseFloat(row.total_co2 || 0), 0);
    const totalCH4 = emissions.reduce((sum, row) => sum + parseFloat(row.total_ch4 || 0), 0);
    const totalN2O = emissions.reduce((sum, row) => sum + parseFloat(row.total_n2o || 0), 0);

    doc.fontSize(14).font('Helvetica-Bold').text('GHG Composition');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`CO2: ${totalCO2.toFixed(3)} MT (${(totalCO2/totalEmissions*100).toFixed(1)}%)`);
    doc.text(`CH4: ${totalCH4.toFixed(3)} MT (${(totalCH4/totalEmissions*100).toFixed(1)}%)`);
    doc.text(`N2O: ${totalN2O.toFixed(3)} MT (${(totalN2O/totalEmissions*100).toFixed(1)}%)`);
    doc.moveDown(1.5);

    // Room for Improvement Section
    if (trafficLightScore.improvements && trafficLightScore.improvements.length > 0) {
      doc.fontSize(16).font('Helvetica-Bold').text('Room for Improvement');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');

      trafficLightScore.improvements.forEach(improvement => {
        doc.fontSize(11).font('Helvetica-Bold').text(improvement.category);
        doc.fontSize(9).fillColor('red').text(`Priority: ${improvement.priority.toUpperCase()}`, { indent: 10 });
        doc.fillColor('black').fontSize(10).font('Helvetica');
        
        improvement.actions.forEach((action, index) => {
          doc.text(`  ${index + 1}. ${action}`, { indent: 20 });
        });
        doc.moveDown(0.5);
      });
      doc.moveDown(1);
    }

    // Key Recommendations
    if (trafficLightScore.recommendations && trafficLightScore.recommendations.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Key Recommendations');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      trafficLightScore.recommendations.forEach((rec, index) => {
        doc.text(`${index + 1}. ${rec}`);
        doc.moveDown(0.3);
      });
    }

    // Footer
    doc.fontSize(8).text(`Report generated on ${new Date().toLocaleDateString()}`, 50, doc.page.height - 50, {
      align: 'center'
    });

    doc.end();
  });
}

/**
 * Generate CSV export for a reporting period
 * @param {number} periodId - Reporting period ID
 * @param {string} exportPath - Path to save CSV file
 * @returns {Promise<string>} Path to generated CSV file
 */
export async function generateCSVExport(periodId, exportPath) {
  // Fetch all calculations
  const query = await pool.query(
    `SELECT 
       cr.id,
       cr.activity_type,
       cr.result_data->>'total_emissions_mt_co2e' as total_emissions,
       cr.result_data->>'co2_mt' as co2,
       cr.result_data->>'ch4_mt' as ch4,
       cr.result_data->>'n2o_mt' as n2o,
       cr.input_data,
       cr.calculated_at,
       u.email as calculated_by
     FROM calculation_results cr
     LEFT JOIN users u ON cr.calculated_by = u.id
     WHERE cr.reporting_period_id = $1
     ORDER BY cr.calculated_at DESC`,
    [periodId]
  );

  if (query.rows.length === 0) {
    throw new Error('No calculations found for this period');
  }

  const csvWriter = createObjectCsvWriter({
    path: exportPath,
    header: [
      { id: 'id', title: 'Calculation ID' },
      { id: 'activity_type', title: 'Activity Type' },
      { id: 'total_emissions', title: 'Total Emissions (MT CO2e)' },
      { id: 'co2', title: 'CO2 (MT)' },
      { id: 'ch4', title: 'CH4 (MT)' },
      { id: 'n2o', title: 'N2O (MT)' },
      { id: 'calculated_at', title: 'Calculated At' },
      { id: 'calculated_by', title: 'Calculated By' }
    ]
  });

  await csvWriter.writeRecords(query.rows);
  return exportPath;
}

/**
 * Generate Excel workbook with multiple sheets
 * @param {number} periodId - Reporting period ID
 * @param {string} exportPath - Path to save Excel file
 * @returns {Promise<string>} Path to generated Excel file
 */
export async function generateExcelExport(periodId, exportPath) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AURIXON';
  workbook.created = new Date();

  // Fetch period data
  const periodQuery = await pool.query(
    `SELECT rp.*, c.name as company_name 
     FROM reporting_periods rp 
     JOIN companies c ON rp.company_id = c.id 
     WHERE rp.id = $1`,
    [periodId]
  );

  if (periodQuery.rows.length === 0) {
    throw new Error('Reporting period not found');
  }

  const period = periodQuery.rows[0];

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 30 }
  ];

  summarySheet.addRows([
    { metric: 'Company', value: period.company_name },
    { metric: 'Period Name', value: period.period_name },
    { metric: 'Start Date', value: period.start_date },
    { metric: 'End Date', value: period.end_date },
    { metric: 'Status', value: period.status }
  ]);

  // Fetch aggregated emissions
  const emissionsQuery = await pool.query(
    `SELECT 
       SUM(CAST(result_data->>'total_emissions_mt_co2e' AS NUMERIC)) as total_emissions,
       activity_type,
       COUNT(*) as activity_count
     FROM calculation_results
     WHERE reporting_period_id = $1
     GROUP BY activity_type`,
    [periodId]
  );

  const totalEmissions = emissionsQuery.rows.reduce((sum, row) => 
    sum + parseFloat(row.total_emissions || 0), 0
  );

  summarySheet.addRow({ metric: '', value: '' });
  summarySheet.addRow({ metric: 'Total Emissions (MT CO2e)', value: totalEmissions.toFixed(2) });
  summarySheet.addRow({ metric: 'Activity Types', value: emissionsQuery.rows.length });

  // Apply styling to summary sheet
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };

  // Sheet 2: Emissions by Activity Type
  const breakdownSheet = workbook.addWorksheet('Emissions Breakdown');
  breakdownSheet.columns = [
    { header: 'Activity Type', key: 'activity_type', width: 30 },
    { header: 'Total Emissions (MT CO2e)', key: 'total_emissions', width: 25 },
    { header: 'Activity Count', key: 'activity_count', width: 15 },
    { header: 'Percentage', key: 'percentage', width: 15 }
  ];

  emissionsQuery.rows.forEach(row => {
    breakdownSheet.addRow({
      activity_type: row.activity_type,
      total_emissions: parseFloat(row.total_emissions).toFixed(2),
      activity_count: row.activity_count,
      percentage: `${(parseFloat(row.total_emissions) / totalEmissions * 100).toFixed(1)}%`
    });
  });

  breakdownSheet.getRow(1).font = { bold: true };
  breakdownSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' }
  };

  // Sheet 3: Detailed Calculations
  const detailsQuery = await pool.query(
    `SELECT 
       cr.id,
       cr.activity_type,
       cr.result_data->>'total_emissions_mt_co2e' as total_emissions,
       cr.result_data->>'co2_mt' as co2,
       cr.result_data->>'ch4_mt' as ch4,
       cr.result_data->>'n2o_mt' as n2o,
       cr.calculated_at,
       u.email as calculated_by
     FROM calculation_results cr
     LEFT JOIN users u ON cr.calculated_by = u.id
     WHERE cr.reporting_period_id = $1
     ORDER BY cr.calculated_at DESC`,
    [periodId]
  );

  const detailsSheet = workbook.addWorksheet('Detailed Calculations');
  detailsSheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Activity Type', key: 'activity_type', width: 25 },
    { header: 'Total Emissions (MT CO2e)', key: 'total_emissions', width: 25 },
    { header: 'CO2 (MT)', key: 'co2', width: 15 },
    { header: 'CH4 (MT)', key: 'ch4', width: 15 },
    { header: 'N2O (MT)', key: 'n2o', width: 15 },
    { header: 'Calculated At', key: 'calculated_at', width: 20 },
    { header: 'Calculated By', key: 'calculated_by', width: 30 }
  ];

  detailsQuery.rows.forEach(row => {
    detailsSheet.addRow(row);
  });

  detailsSheet.getRow(1).font = { bold: true };
  detailsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC000' }
  };

  // Save workbook
  await workbook.xlsx.writeFile(exportPath);
  return exportPath;
}

/**
 * Clean up old export files
 * @param {string} directory - Directory containing export files
 * @param {number} maxAgeHours - Maximum age in hours before deletion
 */
export async function cleanupOldExports(directory, maxAgeHours = 24) {
  const files = fs.readdirSync(directory);
  const now = Date.now();
  const maxAge = maxAgeHours * 60 * 60 * 1000;

  for (const file of files) {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    const age = now - stats.mtimeMs;

    if (age > maxAge) {
      fs.unlinkSync(filePath);
      console.log(`[ExportService] Deleted old export: ${file}`);
    }
  }
}

/**
 * Get PDF color for traffic light score
 * @param {string} score - 'green', 'yellow', or 'red'
 * @returns {string} Hex color code
 */
function getTrafficLightColor(score) {
  switch (score) {
    case 'green':
      return '#28a745';
    case 'yellow':
      return '#ffc107';
    case 'red':
      return '#dc3545';
    default:
      return '#6c757d';
  }
}

export default {
  generatePDFReport,
  generateCSVExport,
  generateExcelExport,
  cleanupOldExports
};
