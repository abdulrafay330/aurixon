import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { boundariesAPI } from '../api/boundariesAPI';
import { useToast } from '../components/common/Toast';
import { useAuth } from '../contexts/AuthContext';

const BoundaryQuestionsWizard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { success, error } = useToast();
    const { user, refreshUser } = useAuth(); // Assuming refreshUser updates the user context
    const [questions, setQuestions] = useState([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);


    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const data = await boundariesAPI.getAllQuestions();
                const qs = data.questions || data;
                setQuestions(qs);

                // Try to fetch existing answers for this user/company
                let existingAnswers = null;
                try {
                    const companyId = user.companyId || user.companies?.[0]?.companyId;
                    if (companyId) {
                        const res = await boundariesAPI.getUserAnswers(user.id);
                        if (res && Array.isArray(res)) {
                            existingAnswers = {};
                            res.forEach(ans => {
                                existingAnswers[ans.boundary_question_id] = ans.answer;
                            });
                        }
                    }
                } catch (e) {
                    // No answers yet, that's fine
                }

                // If no answers, default all to true
                if (!existingAnswers) {
                    const defaultAnswers = {};
                    qs.forEach(q => { defaultAnswers[q.id] = true; });
                    setAnswers(defaultAnswers);
                } else {
                    setAnswers(existingAnswers);
                }
            } catch (err) {
                console.error("Failed to load boundary questions", err);
                error(t('boundary.loadError', 'Failed to load questions'));
            } finally {
                setLoading(false);
            }
        };
        fetchQuestions();
    }, [error, t, user]);

    const handleAnswer = (questionId, value) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
    };

    const handleNext = () => {
        if (currentStep < questions.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            // Ensure we have a company ID
            const companyId = user.companyId || user.companies?.[0]?.companyId;
            
            if (!companyId) {
                console.error('No company ID found for user', user);
                error('Company ID missing. Please re-login.');
                return;
            }

            // Format answers for API
            const answersPayload = {
                companyId: companyId,
                answers: Object.entries(answers).map(([questionId, answer]) => ({
                    boundary_question_id: questionId,
                    answer: answer
                }))
            };

            await boundariesAPI.submitAnswers(answersPayload);
            success(t('boundary.submitSuccess', 'Boundary questions saved successfully!'));
            
            // Force refresh of user/company status so OnboardingGuard knows we are done
            if (refreshUser) await refreshUser();
            
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            error(t('boundary.submitError', 'Failed to save boundary questions'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-midnight-navy">
                <div className="text-cyan-mist text-xl">Loading Wizard...</div>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="p-10 text-center text-white">
                No boundary questions found. Please contact support.
            </div>
        );
    }

    const currentQuestion = questions[currentStep];
    const progress = ((currentStep + 1) / questions.length) * 100;

    return (
        <div className="min-h-screen bg-midnight-navy flex flex-col items-center justify-center p-6">
            <div className="max-w-2xl w-full bg-midnight-navy-lighter border border-carbon-gray rounded-xl shadow-2xl overflow-hidden">
                {/* Header / Progress */}
                <div className="bg-midnight-navy p-6 border-b border-carbon-gray">
                    <h1 className="text-2xl font-bold text-off-white mb-2">
                        {t('boundary.setupTitle', 'Company Setup')}
                    </h1>
                    <div className="w-full bg-carbon-gray h-2 rounded-full mt-4">
                        <div 
                            className="bg-growth-green h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-stone-gray text-sm mt-2 text-right">
                        Step {currentStep + 1} of {questions.length}
                    </p>
                </div>

                {/* Content */}
                <div className="p-8">
                    <h2 className="text-xl font-semibold text-cyan-mist mb-6">
                        {currentQuestion.question_text}
                    </h2>
                    
                    {currentQuestion.description && (
                        <p className="text-off-white/80 mb-8 leading-relaxed">
                            {currentQuestion.description}
                        </p>
                    )}

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => handleAnswer(currentQuestion.id, true)}
                            className={`px-8 py-4 rounded-lg border-2 transition-all duration-200 text-lg font-medium w-40
                                ${answers[currentQuestion.id] === true 
                                    ? 'bg-growth-green/20 border-growth-green text-growth-green' 
                                    : 'border-carbon-gray text-stone-gray hover:border-growth-green hover:text-off-white'}`}
                        >
                            {t('common.yes', 'Yes')}
                        </button>
                        <button
                            onClick={() => handleAnswer(currentQuestion.id, false)}
                            className={`px-8 py-4 rounded-lg border-2 transition-all duration-200 text-lg font-medium w-40
                                ${answers[currentQuestion.id] === false 
                                    ? 'bg-red-500/20 border-red-500 text-red-500' 
                                    : 'border-carbon-gray text-stone-gray hover:border-red-500 hover:text-off-white'}`}
                        >
                            {t('common.no', 'No')}
                        </button>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-6 bg-midnight-navy/50 border-t border-carbon-gray flex justify-between items-center">
                    <button
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        className={`text-stone-gray hover:text-off-white transition-colors
                            ${currentStep === 0 ? 'opacity-0 cursor-default' : ''}`}
                    >
                        {t('common.back', 'Back')}
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={answers[currentQuestion.id] === undefined || submitting}
                        className={`px-6 py-2 rounded-lg bg-cyan-mist text-midnight-navy font-semibold hover:bg-growth-green transition-all shadow-lg
                            disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {currentStep === questions.length - 1 
                            ? (submitting ? t('common.saving', 'Saving...') : t('common.finish', 'Finish Setup'))
                            : t('common.next', 'Next Step →')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BoundaryQuestionsWizard;
