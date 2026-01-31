import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { dashboardAPI } from '../../api/dashboardAPI';
import { useToast } from '../../components/common/Toast';
import NewReportingPeriodModal from '../../components/forms/NewReportingPeriodModal';

/**
 * Dashboard Page
 * Main landing page after login with real-time data
 */
const DashboardPage = () => {
  const { user, hasAnyRole } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { error, success } = useToast();

  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewPeriodModal, setShowNewPeriodModal] = useState(false);

  // Role-based permissions
  const canAddData = hasAnyRole(['company_admin', 'editor']);
  const canViewReports = hasAnyRole(['company_admin', 'editor', 'viewer']);
  const canGenerateReports = hasAnyRole(['company_admin', 'editor']);
  const canManagePeriods = hasAnyRole(['company_admin']);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // First check if company has any reporting periods
      // This endpoint needs to be available or we can check via KPI response structure
      const kpiData = await dashboardAPI.getKPIs(user.companyId);
      
      // If the API returns a specific "no periods" signal or empty 0s for everything, 
      // we might want to guide the user. 
      // Assuming getKPIs might return null or we can catch a specific 404/400 if no period
      setKpis(kpiData);

      // If we got here, we assume data exists or is 0. 
      // A better check would be an API call to getReportingPeriods given the user's intent.
      // But let's rely on the user manually creating one if they see zeros, 
      // OR we can fetch periods specifically to show the "Welcome" state.
    } catch (err) {
      if (err.response?.status === 404 || err.response?.data?.message?.includes('No reporting period')) {
        // Handle specifically as "No Period" state
        setKpis(null); 
      } else {
        error(err.response?.data?.message || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodCreated = (newPeriod) => {
    success(t('reportingPeriod.createSuccess', 'Reporting period created successfully'));
    setShowNewPeriodModal(false);
    fetchDashboardData();
  };

  // EMPTY STATE: If not loading and no KPIS/Periods found (logic needs to be robust)
  // For now, let's assume if kpis is null/empty after loading, we show the prompt.
  // Actually, standard dashboards show 0s. 
  // Let's explicitly check if we should show "Get Started"
  const showEmptyState = !loading && (!kpis || (kpis.totalEmissions === 0 && kpis.scope1 === 0 && kpis.scope2 === 0 && kpis.scope3 === 0));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-mist border-t-transparent"></div>
      </div>
    );
  }

  // FORCE "CREATE PERIOD" Prompt if completely new
  if (showEmptyState && canManagePeriods) {
     return (
       <div className="container mx-auto px-4 py-16 text-center">
         <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur-md border border-cyan-mist/30 rounded-2xl p-12 shadow-2xl">
           <div className="w-20 h-20 bg-gradient-to-br from-cyan-mist to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
             <span className="text-4xl">📅</span>
           </div>
           <h2 className="text-3xl font-bold text-white mb-4">{t('reportingPeriods.emptyStateTitle')}</h2>
           <p className="text-xl text-gray-300 mb-8" dangerouslySetInnerHTML={{ __html: t('reportingPeriods.emptyStateText') }}></p>
           <button
             onClick={() => setShowNewPeriodModal(true)}
             className="btn-primary text-lg px-8 py-4 rounded-full shadow-lg hover:shadow-cyan-mist/20 transition-all transform hover:-translate-y-1"
           >
             {t('reportingPeriods.createButton')}
           </button>
         </div>
         <NewReportingPeriodModal
            isOpen={showNewPeriodModal}
            onClose={() => setShowNewPeriodModal(false)}
            onSuccess={handlePeriodCreated}
            companyId={user?.companyId}
          />
       </div>
     );
  }

  return (
    <>
    <div className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white mb-2">
              {t('dashboard.welcome', { name: user?.firstName || 'User' })} 👋
            </h1>
            <p className="text-cyan-mist text-base sm:text-lg">
              {t('dashboard.subtitle')}
            </p>
          </div>
          {/* Quick Add if data exists */}
          {canManagePeriods && !showEmptyState && (
             <button 
               onClick={() => setShowNewPeriodModal(true)}
               className="btn-secondary text-sm px-4 py-2 rounded-lg flex items-center gap-2 w-full sm:w-auto justify-center"
             >
               <span>+</span> {t('reportingPeriods.createNew')}
             </button>
          )}
        </div>

        {/* Stats Cards */}
      {kpis && (

          <div className="card bg-white/10 backdrop-blur-sm border border-cyan-mist/30 shadow-xl">
            <h2 className="text-xl font-heading font-semibold text-white mb-6">
              {t('dashboard.trafficLightRating')} 🚦
            </h2>
            {/* Main Traffic Light Badge */}
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
              <div className="flex-shrink-0">
                {kpis.traffic_light === 'green' ? (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-growth-green to-emerald-600 flex items-center justify-center shadow-lg">
                    <span className="text-white text-4xl">✓</span>
                  </div>
                ) : kpis.traffic_light === 'yellow' ? (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg">
                    <span className="text-white text-4xl">⚠</span>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg">
                    <span className="text-white text-4xl">!</span>
                  </div>
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-2xl font-bold text-white capitalize mb-2">
                  {kpis.traffic_light === 'green' ? t('dashboard.ratingGreenTitle') : 
                   kpis.traffic_light === 'yellow' ? t('dashboard.ratingYellowTitle') : 
                   t('dashboard.ratingRedTitle')}
                </h3>
                <p className="text-gray-300">
                  {kpis.traffic_light === 'green' ? t('dashboard.ratingGreenDesc') : 
                   kpis.traffic_light === 'yellow' ? t('dashboard.ratingYellowDesc') : 
                   t('dashboard.ratingRedDesc')}
                </p>
              </div>
            </div>
            {/* Scope Breakdown with Total Emissions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-white/5 border border-gray-600">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-white">{t('dashboard.totalEmissions')}</span>
                </div>
                <p className="text-gray-400 text-sm mb-2">{t('common.all')}</p>
                <p className="text-2xl font-bold text-white">{kpis.totalEmissions?.toFixed(2) || 0}</p>
                <p className="text-xs text-gray-500">{t('dashboard.mtCo2e')}</p>
              </div>
              <div className="p-4 rounded-lg bg-white/5 border border-gray-600">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-white">{t('dashboard.scope1')}</span>
                  {kpis.traffic_light_scope1 === 'green' && <span className="w-3 h-3 rounded-full bg-green-500"></span>}
                  {kpis.traffic_light_scope1 === 'yellow' && <span className="w-3 h-3 rounded-full bg-yellow-500"></span>}
                  {kpis.traffic_light_scope1 === 'red' && <span className="w-3 h-3 rounded-full bg-red-500"></span>}
                </div>
                <p className="text-gray-400 text-sm mb-2">{t('dashboard.directEmissions')}</p>
                <p className="text-2xl font-bold text-white">{kpis.scope1?.toFixed(2) || 0}</p>
                <p className="text-xs text-gray-500">{t('dashboard.mtCo2e')}</p>
              </div>
              <div className="p-4 rounded-lg bg-white/5 border border-gray-600">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-white">{t('dashboard.scope2')}</span>
                  {kpis.traffic_light_scope2 === 'green' && <span className="w-3 h-3 rounded-full bg-green-500"></span>}
                  {kpis.traffic_light_scope2 === 'yellow' && <span className="w-3 h-3 rounded-full bg-yellow-500"></span>}
                  {kpis.traffic_light_scope2 === 'red' && <span className="w-3 h-3 rounded-full bg-red-500"></span>}
                </div>
                <p className="text-gray-400 text-sm mb-2">{t('dashboard.purchasedEnergy')}</p>
                <div className="flex justify-between items-end mb-1">
                  <div>
                     <p className="text-xs text-gray-400">Location:</p>
                     <p className="text-xl font-bold text-white">{kpis.scope2_location?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-xs text-gray-400">Market:</p>
                     <p className="text-xl font-bold text-white text-cyan-mist">{kpis.scope2_market?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1 center">{t('dashboard.mtCo2e')}</p>
              </div>
              <div className="p-4 rounded-lg bg-white/5 border border-gray-600">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-white">{t('dashboard.scope3')}</span>
                  {kpis.traffic_light_scope3 === 'green' && <span className="w-3 h-3 rounded-full bg-green-500"></span>}
                  {kpis.traffic_light_scope3 === 'yellow' && <span className="w-3 h-3 rounded-full bg-yellow-500"></span>}
                  {kpis.traffic_light_scope3 === 'red' && <span className="w-3 h-3 rounded-full bg-red-500"></span>}
                </div>
                <p className="text-gray-400 text-sm mb-2">{t('dashboard.supplyChain')}</p>
                <p className="text-2xl font-bold text-white">{kpis.scope3?.toFixed(2) || 0}</p>
                <p className="text-xs text-gray-500">{t('dashboard.mtCo2e')}</p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="mt-6 p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
              <h4 className="text-sm font-semibold text-blue-200 mb-2">{t('dashboard.recommendationsTitle')}</h4>
              {kpis.recommendations && kpis.recommendations.length > 0 ? (
                <ul className="text-sm text-blue-100 space-y-2">
                  {kpis.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                       <span className="text-cyan-mist">•</span>
                       <span>{rec.text} <span className="text-xs opacity-70 ml-1">({rec.impact} Impact)</span></span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-blue-300 italic">No recommendations at this time.</p>
              )}
            </div>
          </div>
        )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Quick Actions Card - Show if user has any actionable permissions */}
        {(canAddData || canViewReports || canGenerateReports) && (
          <div className="card bg-white/10 backdrop-blur-sm border border-cyan-mist/30 shadow-xl">
            <h2 className="text-xl font-heading font-semibold text-white mb-4">
              {t('dashboard.quickActions')}
            </h2>
            <div className="space-y-3">
              {canGenerateReports && (
                <button 
                  onClick={() => navigate('/reports')}
                  className="w-full px-6 py-4 rounded-lg font-bold text-lg bg-gradient-to-r from-cyan-mist to-growth-green text-midnight-navy border-2 border-cyan-mist shadow-lg hover:from-growth-green hover:to-cyan-mist transition-all mb-2"
                  style={{ fontSize: '1.25rem' }}
                >
                  {t('reports.generateReport')}
                </button>
              )}
              {canManagePeriods && (
                <button 
                  onClick={() => setShowNewPeriodModal(true)}
                  className="w-full px-6 py-3 rounded-lg font-medium transition-colors bg-blue-600 text-white border border-blue-500 hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <span>+</span>
                  {t('actions.createReportingPeriod', 'Create Reporting Period')}
                </button>
              )}
              {canAddData && (
                <button 
                  onClick={() => navigate('/activities')}
                  className="btn-primary w-full justify-start"
                >
                  {t('actions.addActivity')}
                </button>
              )}
              {canViewReports && (
                <button 
                  onClick={() => navigate('/reports')}
                  className="w-full px-6 py-3 rounded-lg font-medium transition-colors bg-white/10 text-white border border-cyan-mist/50 hover:bg-white/20 flex items-center"
                >
                  {t('actions.viewReports')}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="card bg-white/10 backdrop-blur-sm border border-cyan-mist/30 shadow-xl">
          <h2 className="text-xl font-heading font-semibold text-white mb-4">
            {t('dashboard.completionStatus')}
          </h2>
          <div className="space-y-4">
            {kpis && kpis.completionStatus ? (
              <>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-300">{t('dashboard.dataEntry')}</span>
                <span className="font-semibold text-white">{kpis.completionStatus.dataEntry}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-growth-green h-2 rounded-full" style={{ width: `${kpis.completionStatus.dataEntry}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-300">{t('dashboard.csrdCompliance')}</span>
                <span className="font-semibold text-white">{kpis.completionStatus.csrdCompliance}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-compliance-blue h-2 rounded-full" style={{ width: `${kpis.completionStatus.csrdCompliance}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-300">{t('dashboard.reportGeneration')}</span>
                <span className="font-semibold text-white">{kpis.completionStatus.reportGeneration}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${kpis.completionStatus.reportGeneration}%` }}></div>
              </div>
            </div>
              </>
            ) : (
               <p className="text-gray-400 italic">No status data available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Traffic Light Status */}
      <div className="card bg-white/10 backdrop-blur-sm border border-cyan-mist/30 shadow-xl">
        <h2 className="text-xl font-heading font-semibold text-white mb-4">
          {t('dashboard.dataQuality')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 border border-cyan-mist/30 rounded-lg bg-white/5">
            <div className={`w-3 h-3 rounded-full ${kpis?.dataQuality?.status === 'High' ? 'traffic-light-green' : 'bg-gray-500'}`}></div>
            <div>
              <p className="text-sm font-semibold text-white">{t('dashboard.complete')}</p>
              <p className="text-xs text-gray-400">{kpis?.dataQuality?.activityCount || 0} {t('dashboard.activities')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 border border-cyan-mist/30 rounded-lg bg-white/5">
            <div className={`w-3 h-3 rounded-full ${kpis?.dataQuality?.status === 'Medium' ? 'traffic-light-yellow' : 'bg-gray-500'}`}></div>
            <div>
              <p className="text-sm font-semibold text-white">{t('dashboard.inProgress')}</p>
              <p className="text-xs text-gray-400">0 {t('dashboard.activities')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 border border-cyan-mist/30 rounded-lg bg-white/5">
            <div className={`w-3 h-3 rounded-full ${kpis?.dataQuality?.status === 'Low' ? 'traffic-light-red' : 'bg-gray-500'}`}></div>
            <div>
              <p className="text-sm font-semibold text-white">{t('dashboard.missingData')}</p>
              <p className="text-xs text-gray-400">0 {t('dashboard.activities')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>

    {/* New Reporting Period Modal */}
    <NewReportingPeriodModal
      isOpen={showNewPeriodModal}
      onClose={() => setShowNewPeriodModal(false)}
      onSuccess={handlePeriodCreated}
      companyId={user?.companyId}
    />
    </>
  );
};

export default DashboardPage;
