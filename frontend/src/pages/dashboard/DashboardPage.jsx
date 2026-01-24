import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

/**
 * Dashboard Page
 * Main landing page after login
 */
const DashboardPage = () => {
  const { user, hasAnyRole } = useAuth();
  const { t } = useTranslation();

  // Role-based permissions
  const canAddData = hasAnyRole(['company_admin', 'editor']);
  const canViewReports = hasAnyRole(['company_admin', 'editor', 'viewer']);
  const canGenerateReports = hasAnyRole(['company_admin', 'editor']);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-white mb-2">
            {t('dashboard.welcome', { name: user?.firstName || 'User' })} 👋
          </h1>
          <p className="text-cyan-mist text-base sm:text-lg">
            {t('dashboard.subtitle')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="card bg-gradient-to-br from-growth-green to-forest-shade text-white shadow-xl">
            <h3 className="text-sm font-medium opacity-90 mb-2">{t('dashboard.totalEmissions')}</h3>
            <p className="text-3xl font-bold">1,234</p>
            <p className="text-sm opacity-90">tCO2e</p>
          </div>

          <div className="card bg-white/10 backdrop-blur-sm border border-cyan-mist/30 text-white shadow-xl">
            <h3 className="text-sm font-medium text-cyan-mist mb-2">{t('dashboard.scope1')}</h3>
            <p className="text-3xl font-bold">456</p>
            <p className="text-sm text-gray-300">tCO2e</p>
          </div>

          <div className="card bg-white/10 backdrop-blur-sm border border-cyan-mist/30 text-white shadow-xl">
            <h3 className="text-sm font-medium text-cyan-mist mb-2">{t('dashboard.scope2')}</h3>
            <p className="text-3xl font-bold">321</p>
            <p className="text-sm text-gray-300">tCO2e</p>
          </div>

          <div className="card bg-white/10 backdrop-blur-sm border border-cyan-mist/30 text-white shadow-xl">
            <h3 className="text-sm font-medium text-cyan-mist mb-2">{t('dashboard.scope3')}</h3>
            <p className="text-3xl font-bold">457</p>
            <p className="text-sm text-gray-300">tCO2e</p>
          </div>
        </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Quick Actions Card - Show if user has any actionable permissions */}
        {(canAddData || canViewReports || canGenerateReports) && (
          <div className="card bg-white/10 backdrop-blur-sm border border-cyan-mist/30 shadow-xl">
            <h2 className="text-xl font-heading font-semibold text-white mb-4">
              {t('dashboard.quickActions')}
            </h2>
            <div className="space-y-3">
              {canAddData && (
                <button className="btn-primary w-full justify-start">
                  {t('actions.addActivity')}
                </button>
              )}
              {canViewReports && (
                <button className="w-full px-6 py-3 rounded-lg font-medium transition-colors bg-white/10 text-white border border-cyan-mist/50 hover:bg-white/20 flex items-center">
                  {t('actions.viewReports')}
                </button>
              )}
              {canGenerateReports && (
                <button className="w-full px-6 py-3 rounded-lg font-medium transition-colors bg-transparent text-cyan-mist border border-cyan-mist/50 hover:bg-cyan-mist/10 flex items-center">
                  {t('actions.generateReport')}
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
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-300">{t('dashboard.dataEntry')}</span>
                <span className="font-semibold text-white">75%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-growth-green h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-300">{t('dashboard.csrdCompliance')}</span>
                <span className="font-semibold text-white">60%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-compliance-blue h-2 rounded-full" style={{ width: '60%' }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-300">{t('dashboard.reportGeneration')}</span>
                <span className="font-semibold text-white">40%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '40%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Traffic Light Status */}
      <div className="card bg-white/10 backdrop-blur-sm border border-cyan-mist/30 shadow-xl">
        <h2 className="text-xl font-heading font-semibold text-white mb-4">
          {t('dashboard.dataQuality')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 border border-cyan-mist/30 rounded-lg bg-white/5">
            <div className="w-3 h-3 rounded-full traffic-light-green"></div>
            <div>
              <p className="text-sm font-semibold text-white">{t('dashboard.complete')}</p>
              <p className="text-xs text-gray-400">8 {t('dashboard.activities')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 border border-cyan-mist/30 rounded-lg bg-white/5">
            <div className="w-3 h-3 rounded-full traffic-light-yellow"></div>
            <div>
              <p className="text-sm font-semibold text-white">{t('dashboard.inProgress')}</p>
              <p className="text-xs text-gray-400">4 {t('dashboard.activities')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 border border-cyan-mist/30 rounded-lg bg-white/5">
            <div className="w-3 h-3 rounded-full traffic-light-red"></div>
            <div>
              <p className="text-sm font-semibold text-white">{t('dashboard.missingData')}</p>
              <p className="text-xs text-gray-400">3 {t('dashboard.activities')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default DashboardPage;
