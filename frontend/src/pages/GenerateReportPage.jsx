import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../contexts/AuthContext';
import { reportingPeriodsAPI } from '../api/reportingPeriodsAPI';

const GenerateReportPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const periodId = searchParams.get('periodId');

  const [formData, setFormData] = useState({
    reportType: 'csrd',
    includeCharts: true,
    includeDetails: true,
    includeBreakdown: true,
  });
  const [generating, setGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [reportId, setReportId] = useState(null);
  
  // New state for period selection
  const [periods, setPeriods] = useState([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);

  // Check payment status or load periods on load
  useEffect(() => {
    if (!periodId) {
      // If no period selected, fetch available periods
      const fetchPeriods = async () => {
        setLoadingPeriods(true);
        try {
          const data = await reportingPeriodsAPI.listPeriods(user.companyId);
          const periodsArray = data.periods || data.reportingPeriods || [];
          setPeriods(Array.isArray(periodsArray) ? periodsArray : []);
          
          // Auto-select if only one period exists
          if (periodsArray.length === 1) {
             setSearchParams({ periodId: periodsArray[0].id });
          }
        } catch (err) {
            console.error('Failed to load periods', err);
            error('Failed to load reporting periods');
        } finally {
            setLoadingPeriods(false);
        }
      };
      
      if (user?.companyId) {
        fetchPeriods();
      }
      return;
    }

    // Handle payment redirect parameters
    if (searchParams.get('payment_success') === 'true') {
      setIsPaid(true);
      setReportGenerated(true);
      success('Payment successful! Your report is ready.');
      // Clear params to avoid repeat toasts
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('payment_success');
      setSearchParams(newParams, { replace: true });
    } else if (searchParams.get('payment_cancelled') === 'true') {
      error('Payment was cancelled.');
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('payment_cancelled');
      setSearchParams(newParams, { replace: true });
    }

    const checkPaymentStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/payments/verify/${periodId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.paid) {
            setIsPaid(true);
            // If they just arrived here without the success param but it's paid, 
            // maybe they previously paid. We only auto-set generated if they came from Stripe.
          }
        }
      } catch (err) {
        console.error('Failed to check payment status', err);
      }
    };

    checkPaymentStatus();
  }, [periodId, navigate, user?.companyId, setSearchParams, searchParams, success, error]);

  const handleChange = (e) => {
    const { name, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : e.target.value,
    }));
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setGenerating(true);

    try {
      const token = localStorage.getItem('token');
      
      // Attempt to generate/download report logic
      // Note: The backend exportPDF endpoint checks for payment.
      // If paid, it returns the PDF. If not, it returns 402.
      
      const queryParams = new URLSearchParams({
        lang: formData.language || 'en',
        includeDetails: formData.includeDetails,
        includeBreakdown: formData.includeBreakdown,
        includeCharts: formData.includeCharts,
        reportType: formData.reportType
      }).toString();

      const generateResponse = await fetch(`/api/exports/pdf/${periodId}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (generateResponse.status === 402) {
        // Payment required
        setReportGenerated(true); // Switch to "Result/Payment" view
        setIsPaid(false); // Ensure we show payment button
        // Don't show success toast yet, maybe an info toast
        return; 
      }

      if (!generateResponse.ok) {
        throw new Error('Failed to generate report');
      }

      // If we got here, it effectively succeeded (or user is previously paid)
      // For the "Generate" flow, we might want to just show the success state.
      // The actual download happens via handleDownload.
      
      const newReportId = Math.random().toString(36).substr(2, 9);
      setReportId(newReportId);
      setReportGenerated(true);
      setIsPaid(true);
      success(t('reports.generateSuccess'));
    } catch (err) {
      error(err.message || 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const handleProceedToPayment = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Create Stripe checkout session
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportingPeriodId: periodId,
          metadata: {
            reportType: formData.reportType,
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();
      
      if (data.session?.url) {
        // Redirect to Stripe checkout
        window.location.href = data.session.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      error(err.message || 'Failed to proceed to payment');
    }
  };

  const handleDownload = async (format) => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        lang: formData.language || 'en',
        includeDetails: formData.includeDetails,
        includeBreakdown: formData.includeBreakdown,
        includeCharts: formData.includeCharts,
        reportType: formData.reportType
      }).toString();

      let endpoint = '';
      if (format === 'pdf') endpoint = `/api/exports/pdf/${periodId}?${queryParams}`;
      else if (format === 'csv') endpoint = `/api/exports/csv/${periodId}?${queryParams}`;
      else if (format === 'excel') endpoint = `/api/exports/excel/${periodId}?${queryParams}`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 402) {
         error('Payment required to download this report');
         setIsPaid(false);
         setReportGenerated(true);
         return;
      }

      if (!response.ok) {
        throw new Error(`Failed to download ${format.toUpperCase()}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${periodId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      success(`${format.toUpperCase()} downloaded successfully`);
    } catch (err) {
      error(err.message || `Failed to download ${format.toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-midnight-navy p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-cyan-mist hover:text-growth-green mb-4 flex items-center gap-2 text-sm"
          >
            ← {t('common.back')}
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {t('reports.generateReport')}
          </h1>
          <p className="text-stone-gray text-sm">
            {t('reports.generateSubtitle')}
          </p>
        </div>


        {!periodId ? (
          <div className="bg-midnight-navy-lighter border border-carbon-gray rounded-lg p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-white mb-4">Select Reporting Period</h2>
            {loadingPeriods ? (
              <div className="text-cyan-mist">Loading periods...</div>
            ) : periods.length > 0 ? (
              <div className="space-y-4">
                <p className="text-stone-gray mb-4">Please select a reporting period to generate a report for.</p>
                <div className="grid gap-4">
                  {periods.map(period => (
                    <button
                      key={period.id}
                      onClick={() => setSearchParams({ periodId: period.id })}
                      className="w-full text-left p-4 bg-midnight-navy border border-carbon-gray rounded-lg hover:border-cyan-mist hover:bg-midnight-navy/80 transition-all group"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-white group-hover:text-cyan-mist">{period.period_label}</span>
                        <span className="text-sm text-stone-gray">
                           {new Date(period.period_start_date).toLocaleDateString()} - {new Date(period.period_end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-stone-gray mb-4">No reporting periods found.</p>
                <button
                   onClick={() => navigate('/settings/reporting-periods')}
                   className="px-4 py-2 bg-cyan-mist text-midnight-navy rounded-lg hover:bg-growth-green transition-colors"
                >
                  Manage Reporting Periods
                </button>
              </div>
            )}
          </div>
        ) : !reportGenerated ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Report Configuration Form */}
            <form onSubmit={handleGenerateReport} className="space-y-6">
              <div className="bg-midnight-navy-lighter border border-carbon-gray rounded-lg p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Report Configuration</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Reporting Standard
                    </label>
                    <select
                      name="reportType"
                      value={formData.reportType}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-midnight-navy border border-carbon-gray text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-growth-green"
                    >
                      <option value="csrd">CSRD (Corporate Sustainability Reporting Directive)</option>
                      <option value="ghg">GHG Protocol</option>
                      <option value="iso">ISO 14064</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Report Language
                    </label>
                    <select
                      name="language"
                      value={formData.language || 'en'}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-midnight-navy border border-carbon-gray text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-growth-green"
                    >
                      <option value="en">English</option>
                      <option value="de">German (Deutsch)</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="includeCharts"
                        checked={formData.includeCharts}
                        onChange={handleChange}
                        className="w-4 h-4 rounded border-carbon-gray"
                      />
                      <span className="text-white text-sm">Include charts and visualizations</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="includeDetails"
                        checked={formData.includeDetails}
                        onChange={handleChange}
                        className="w-4 h-4 rounded border-carbon-gray"
                      />
                      <span className="text-white text-sm">Include detailed breakdown</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="includeBreakdown"
                        checked={formData.includeBreakdown}
                        onChange={handleChange}
                        className="w-4 h-4 rounded border-carbon-gray"
                      />
                      <span className="text-white text-sm">Include scope breakdown</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="bg-midnight-navy-lighter border border-carbon-gray rounded-lg p-4 sm:p-6">
                <h3 className="text-sm font-medium text-stone-gray mb-2">Pricing</h3>
                <div className="flex items-center justify-between">
                  <span className="text-white">Report Generation & Download</span>
                  <span className="text-2xl font-bold text-growth-green">€49.00</span>
                </div>
                <p className="text-xs text-stone-gray mt-2">
                  Pay per report. Access reports for one year.
                </p>
              </div>
              <button
                type="submit"
                disabled={generating}
                className="w-full py-3 bg-growth-green text-midnight-navy font-bold rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {generating ? 'Generating...' : 'Generate Report'}
              </button>
            </form>
            {/* Live Report Preview */}
            <div className="bg-midnight-navy-lighter border border-carbon-gray rounded-lg p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Live Report Preview</h2>
              <ul className="list-disc pl-6 text-white text-sm mb-4">
                <li>Summary & KPIs</li>
                {formData.includeBreakdown && <li>Scope Breakdown</li>}
                {formData.includeDetails && <li>Detailed Activity Breakdown</li>}
                {formData.includeCharts && <li>Charts & Visualizations</li>}
                <li>Recommendations</li>
                <li>Audit Trail</li>
                <li>Certification & Signature</li>
              </ul>
              <div className="text-stone-gray text-xs">
                <p>All numbers, units, and calculations will match the Excel calculator exactly.</p>
                <p>Report will be formatted for clarity and compliance.</p>
              </div>
            </div>
          </div>
        ) : (
          /* Report Generated - Download/Payment Options */
          <div className="space-y-6">
            {isPaid ? (
               <div className="bg-green-900 border border-green-500 rounded-lg p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="text-green-500 text-2xl">✓</span>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Report Ready</h3>
                    <p className="text-green-200 text-sm">
                      Your emissions report is ready for download.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-900/50 border border-yellow-500 rounded-lg p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="text-yellow-500 text-2xl">⚠</span>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Payment Required</h3>
                    <p className="text-yellow-200 text-sm">
                      Please complete payment to download your official report.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {isPaid && (
              <div className="bg-midnight-navy-lighter border border-carbon-gray rounded-lg p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Download Options</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleDownload('pdf')}
                    className="py-3 px-4 bg-midnight-navy border border-cyan-mist text-cyan-mist rounded-lg hover:bg-midnight-navy-lighter transition-colors font-medium text-sm"
                  >
                    📄 Download PDF
                  </button>
                  <button
                    onClick={() => handleDownload('csv')}
                    className="py-3 px-4 bg-midnight-navy border border-cyan-mist text-cyan-mist rounded-lg hover:bg-midnight-navy-lighter transition-colors font-medium text-sm"
                  >
                    📊 Download CSV
                  </button>
                  <button
                    onClick={() => handleDownload('excel')}
                    className="py-3 px-4 bg-midnight-navy border border-cyan-mist text-cyan-mist rounded-lg hover:bg-midnight-navy-lighter transition-colors font-medium text-sm"
                  >
                    📈 Download Excel
                  </button>
                </div>
              </div>
            )}
            {!isPaid && (
              <div className="bg-midnight-navy-lighter border border-carbon-gray rounded-lg p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-white mb-3">Official Report with Payment</h2>
                <p className="text-stone-gray text-sm mb-4">
                  Pay €49.00 to download the official signed report with audit trail and certification.
                </p>
                <button
                  onClick={handleProceedToPayment}
                  className="w-full py-3 bg-growth-green text-midnight-navy font-bold rounded-lg hover:bg-opacity-90 transition-all"
                >
                  Proceed to Payment →
                </button>
              </div>
            )}
            <button
              onClick={() => navigate('/reports')}
              className="w-full py-2 text-cyan-mist hover:text-growth-green transition-colors"
            >
              View All Reports
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateReportPage;
