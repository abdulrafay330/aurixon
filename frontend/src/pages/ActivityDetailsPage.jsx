import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/common/Toast';
import { activitiesAPI } from '../api/activitiesAPI';
import { useAuth } from "../contexts/AuthContext";

const ActivityDetailsPage = () => {
  const { t } = useTranslation();
  const { activityType, activityId } = useParams();
  const navigate = useNavigate();
  const { error } = useToast();
  const { user } = useAuth();
  
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  const canEdit = user?.role === 'editor' || user?.role === 'company_admin';

  useEffect(() => {
    fetchActivity();
  }, [activityId, activityType]);

  const fetchActivity = async () => {
    try {
      const data = await activitiesAPI.getActivity(user.companyId, activityType, activityId);
      console.log('Activity data received:', data);
      setActivity(data.activity || data);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
      error(err.response?.data?.message || 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-midnight-navy flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-mist border-t-transparent"></div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-midnight-navy p-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-off-white text-xl">{t('activities.notFound')}</p>
          <button
            onClick={() => navigate('/activities')}
            className="mt-4 text-cyan-mist hover:text-growth-green"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight-navy p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/activities')}
            className="text-cyan-mist hover:text-growth-green mb-4 flex items-center gap-2"
          >
            ← {t('common.back')}
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-off-white mb-2">
                {t('activities.activityDetails')}
              </h1>
              <p className="text-stone-gray">
                {activityType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </p>
            </div>
            {canEdit && (
              <button
                onClick={() => navigate(`/activities/${activityType}/${activityId}/edit`)}
                className="px-4 py-2 bg-cyan-mist text-midnight-navy rounded-lg hover:bg-growth-green transition-colors font-medium"
              >
                {t('common.edit')}
              </button>
            )}
          </div>
        </div>

        {/* Activity Details */}
        <div className="bg-midnight-navy-lighter border border-carbon-gray rounded-lg p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <h2 className="text-xl font-semibold text-off-white mb-4 pb-2 border-b border-carbon-gray">
              {t('activities.basicInfo')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(activity).map(([key, value]) => {
                // Skip internal fields and complex objects
                if (['id', 'entered_by', 'company_id', 'created_at', 'updated_at', 'calculation_result', 'co2e_kg'].includes(key) || key.includes('purpose')) return null;
                
                // Skip if value is an object or array (can't render directly)
                if (typeof value === 'object' && value !== null) return null;
                
                return (
                  <div key={key} className="p-3 bg-midnight-navy rounded-lg">
                    <p className="text-sm text-stone-gray mb-1">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </p>
                    <p className="text-off-white font-medium">
                      {value || '-'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Emissions Summary */}
          {(activity.co2e_kg || activity.co2e) && (
            <div>
              <h2 className="text-xl font-semibold text-off-white mb-4 pb-2 border-b border-carbon-gray">
                {t('activities.emissionsSummary', 'Emissions Summary')}
              </h2>
              
              {/* Scope 2 Dual Reporting */}
              {activity.calculation_result?.location_based && activity.calculation_result?.market_based ? (
                <div className="space-y-4">
                  <div className="p-4 bg-midnight-navy-light rounded-lg border border-cyan-mist/30">
                    <p className="text-xs font-bold text-cyan-mist uppercase tracking-wider mb-2">Location-Based Method</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-stone-gray mb-1">Total CO₂e</p>
                        <p className="text-xl font-bold text-off-white">
                          {(activity.calculation_result.location_based.total_co2e_mt * 1000).toFixed(2)} kg
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-stone-gray mb-1">CO₂</p>
                        <p className="text-lg text-stone-gray">{(activity.calculation_result.location_based.co2_kg || 0).toFixed(2)} kg</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-midnight-navy-light rounded-lg border border-emerald-500/30">
                    <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-2">Market-Based Method</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-stone-gray mb-1">Total CO₂e</p>
                        <p className="text-xl font-bold text-off-white">
                          {(activity.calculation_result.market_based.total_co2e_mt * 1000).toFixed(2)} kg
                        </p>
                      </div>
                       <div>
                        <p className="text-sm text-stone-gray mb-1">CO₂</p>
                        <p className="text-lg text-stone-gray">{(activity.calculation_result.market_based.co2_kg || 0).toFixed(2)} kg</p>
                      </div>
                      {activity.calculation_result.market_based.is_fallback && (
                        <div className="flex items-center">
                          <span className="text-[10px] bg-carbon-gray text-stone-gray px-2 py-1 rounded">Fallback to Location factors</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-midnight-navy rounded-lg border border-cyan-mist">
                    <p className="text-sm text-stone-gray mb-1">Total CO₂e</p>
                    <p className="text-2xl font-bold text-cyan-mist">
                      {parseFloat(activity.co2e_kg || activity.co2e || 0).toFixed(2)} kg
                    </p>
                  </div>
                  {(activity.co2_kg || activity.co2) && (
                    <div className="p-4 bg-midnight-navy rounded-lg">
                      <p className="text-sm text-stone-gray mb-1">CO₂</p>
                      <p className="text-2xl font-bold text-off-white">
                        {parseFloat(activity.co2_kg || activity.co2 || 0).toFixed(2)} kg
                      </p>
                    </div>
                  )}
                  {(activity.ch4_kg || activity.ch4) && (
                    <div className="p-4 bg-midnight-navy rounded-lg">
                      <p className="text-sm text-stone-gray mb-1">CH₄</p>
                      <p className="text-2xl font-bold text-off-white">
                        {parseFloat(activity.ch4_kg || activity.ch4 || 0).toFixed(2)} kg
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          <div>
            <h2 className="text-xl font-semibold text-off-white mb-4 pb-2 border-b border-carbon-gray">
              {t('activities.metadata')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-midnight-navy rounded-lg">
                <p className="text-sm text-stone-gray mb-1">{t('activities.createdAt')}</p>
                <p className="text-off-white">
                  {new Date(activity.created_at).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-midnight-navy rounded-lg">
                <p className="text-sm text-stone-gray mb-1">{t('activities.updatedAt')}</p>
                <p className="text-off-white">
                  {new Date(activity.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityDetailsPage;
