import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { reportingPeriodsAPI } from '../api/reportingPeriodsAPI';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../contexts/AuthContext';

const ReportingPeriodsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const { user } = useAuth();

  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    label: '',
    startDate: '',
    endDate: '',
    type: 'annual',
    reportingStandard: 'GHG_PROTOCOL',
  });
  const [submitting, setSubmitting] = useState(false);

  const canEdit = ['editor', 'company_admin', 'internal_admin'].includes(user?.role);

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const data = await reportingPeriodsAPI.listPeriods(user.companyId);
      console.log('Reporting periods API response:', data);
      const periodsArray = data.periods || data.reportingPeriods || [];
      console.log('Periods array:', periodsArray);
      setPeriods(Array.isArray(periodsArray) ? periodsArray : []);
    } catch (err) {
      console.error('Failed to load reporting periods:', err);
      error(t('reportingPeriods.loadError', 'Failed to load reporting periods'));
      setPeriods([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await reportingPeriodsAPI.createPeriod(user.companyId, formData);
      success(t('reportingPeriods.createSuccess', 'Reporting period created successfully'));
      setShowCreateModal(false);
      setFormData({
        label: '',
        startDate: '',
        endDate: '',
        type: 'annual',
        reportingStandard: 'GHG_PROTOCOL',
      });
      fetchPeriods();
    } catch (err) {
      console.error('Failed to create period:', err);
      error(err.response?.data?.error || t('reportingPeriods.createError', 'Failed to create reporting period'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePeriod = async (periodId) => {
    if (!window.confirm(t('reportingPeriods.deleteConfirm', 'Are you sure you want to delete this period? All associated data will be lost.'))) {
      return;
    }

    try {
      await reportingPeriodsAPI.deletePeriod(user.companyId, periodId);
      success(t('reportingPeriods.deleteSuccess', 'Period deleted successfully'));
      fetchPeriods();
    } catch (err) {
      console.error('Failed to delete period:', err);
      error(err.response?.data?.error || t('reportingPeriods.deleteError', 'Failed to delete period'));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(t('settings.language_preference') === 'de' ? 'de-DE' : 'en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      draft: 'bg-stone-gray/20 text-stone-gray',
      active: 'bg-growth-green/20 text-growth-green',
      closed: 'bg-carbon-gray/20 text-off-white',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[status] || statusColors.draft}`}>
        {t(`status.${status}`) || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-midnight-navy">
        <div className="text-cyan-mist text-xl">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight-navy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-off-white">
              {t('reportingPeriods.title', 'Reporting Periods')}
            </h1>
            <p className="text-stone-gray mt-2">
              {t('reportingPeriods.description', 'Manage your organizational reporting periods for carbon accounting')}
            </p>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-cyan-mist text-midnight-navy rounded-lg hover:bg-growth-green transition-colors font-medium"
            >
              {t('reportingPeriods.create', '+ Create Period')}
            </button>
          )}
        </div>

        {/* Periods List */}
        {periods.length === 0 ? (
          <div className="bg-midnight-navy-lighter border border-carbon-gray rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-off-white mb-2">
              {t('reportingPeriods.noPeriods', 'No Reporting Periods Yet')}
            </h3>
            <p className="text-stone-gray mb-6">
              {t('reportingPeriods.noPeriodsDescription', 'Create your first reporting period to start tracking emissions data.')}
            </p>
            {canEdit && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-cyan-mist text-midnight-navy rounded-lg hover:bg-growth-green transition-colors font-medium"
              >
                {t('reportingPeriods.create', '+ Create Period')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {periods.map(period => (
              <div
                key={period.id}
                className="bg-midnight-navy-lighter border border-carbon-gray rounded-lg p-6 hover:border-cyan-mist transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-off-white mb-1">
                      {period.period_label}
                    </h3>
                    <p className="text-sm text-stone-gray">
                      {formatDate(period.period_start_date)} - {formatDate(period.period_end_date)}
                    </p>
                  </div>
                  {getStatusBadge(period.status)}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-gray">{t('reportingPeriods.type', 'Type')}:</span>
                    <span className="text-off-white">{t(`periodTypes.${period.period_type}`) || period.period_type}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-gray">{t('reportingPeriods.standard', 'Standard')}:</span>
                    <span className="text-off-white">{t(`reportingStandards.${period.reporting_standard}`) || period.reporting_standard}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-carbon-gray">
                  {canEdit && (
                    <button
                      onClick={() => handleDeletePeriod(period.id)}
                      className="flex-1 px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors text-sm font-medium"
                    >
                      {t('common.delete', 'Delete')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Period Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-midnight-navy-lighter border border-carbon-gray rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-off-white mb-6">
              {t('reportingPeriods.createNew', 'Create Reporting Period')}
            </h2>

            <form onSubmit={handleCreatePeriod} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-off-white mb-2">
                  {t('reportingPeriods.label', 'Period Label')} *
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g., FY 2024, Q1 2024"
                  required
                  className="w-full px-4 py-2 bg-midnight-navy border border-carbon-gray rounded-lg text-off-white focus:outline-none focus:border-cyan-mist"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-off-white mb-2">
                    {t('reportingPeriods.startDate', 'Start Date')} *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    required
                    className="w-full px-4 py-2 bg-midnight-navy border border-carbon-gray rounded-lg text-off-white focus:outline-none focus:border-cyan-mist"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-off-white mb-2">
                    {t('reportingPeriods.endDate', 'End Date')} *
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    required
                    className="w-full px-4 py-2 bg-midnight-navy border border-carbon-gray rounded-lg text-off-white focus:outline-none focus:border-cyan-mist"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-off-white mb-2">
                  {t('reportingPeriods.type', 'Period Type')}
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-2 bg-midnight-navy border border-carbon-gray rounded-lg text-off-white focus:outline-none focus:border-cyan-mist"
                >
                  <option value="annual">{t('periodTypes.annual')}</option>
                  <option value="quarterly">{t('periodTypes.quarterly')}</option>
                  <option value="monthly">{t('periodTypes.monthly')}</option>
                  <option value="custom">{t('periodTypes.custom')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-off-white mb-2">
                  {t('reportingPeriods.standard', 'Reporting Standard')}
                </label>
                <select
                  value={formData.reportingStandard}
                  onChange={(e) => setFormData(prev => ({ ...prev, reportingStandard: e.target.value }))}
                  className="w-full px-4 py-2 bg-midnight-navy border border-carbon-gray rounded-lg text-off-white focus:outline-none focus:border-cyan-mist"
                >
                  <option value="GHG_PROTOCOL">{t('reportingStandards.GHG_PROTOCOL')}</option>
                  <option value="CSRD">{t('reportingStandards.CSRD')}</option>
                  <option value="ISO_14064">{t('reportingStandards.ISO_14064')}</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4 border-t border-carbon-gray">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-2 border border-carbon-gray text-off-white rounded-lg hover:bg-midnight-navy transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-cyan-mist text-midnight-navy rounded-lg hover:bg-growth-green transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? t('common.creating', 'Creating...') : t('common.create', 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportingPeriodsPage;
