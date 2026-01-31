import apiClient from './apiClient';

/**
 * Reports API Service
 * Handles reporting and analytics API calls
 */
export const reportsAPI = {
  /**
   * Get emissions trends
   * @param {Object} params - Query parameters (startDate, endDate, groupBy, activityType)
   * @returns {Promise} Trends data
   */
  getEmissionsTrends: async (params) => {
    const response = await apiClient.get('/reports/trends', { params });
    return response.data.trends || response.data;
  },

  /**
   * Get scope breakdown for a period
   * @param {string} periodId - Reporting period ID
   * @returns {Promise} Scope breakdown data
   */
  getScopeBreakdown: async (periodId) => {
    const response = await apiClient.get(`/reports/scope-breakdown/${periodId}`);
    return response.data.breakdown || response.data;
  },

  /**
   * Compare two reporting periods
   * @param {string} periodId1 - First period ID
   * @param {string} periodId2 - Second period ID
   * @returns {Promise} Comparison data
   */
  comparePeriods: async (periodId1, periodId2) => {
    const response = await apiClient.get(`/reports/compare/${periodId1}/${periodId2}`);
    return response.data;
  },

  /**
   * Get emission intensity metrics
   * @param {string} periodId - Reporting period ID
   * @param {Object} data - Intensity data (revenue, employees, etc.)
   * @returns {Promise} Intensity metrics
   */
  getEmissionIntensity: async (periodId, data) => {
    const response = await apiClient.post(`/reports/intensity/${periodId}`, data);
    return response.data;
  },

  /**
   * Get goal progress
   * @param {Object} params - Query parameters (baselineYear)
   * @returns {Promise} Goal progress data
   */
  getGoalProgress: async (params) => {
    const response = await apiClient.get('/reports/goal-progress', { params });
    return response.data;
  },
};

export default reportsAPI;
