import React, { useMemo, useState } from 'react';
import { GradingScreen } from '../types';
import { useGradingSession } from '../context/GradingSessionContext';
import Card from '../components/Card';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';

interface S6_FinalizationProps {
  setScreen: (screen: GradingScreen) => void;
}

const MetricCard: React.FC<{ title: string; value: string | number; description?: string; colorClass?: string }> = ({
  title,
  value,
  description,
  colorClass = 'text-primary',
}) => (
  <Card className="flex flex-col justify-between">
    <div>
      <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h4>
      <p className={`text-3xl font-bold mt-2 ${colorClass}`}>{value}</p>
    </div>
    {description && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{description}</p>}
  </Card>
);

const S6_Finalization: React.FC<S6_FinalizationProps> = ({ setScreen }) => {
  const { state, resetSession } = useGradingSession();
  const { sessionAnalytics, gradedSubmissions, submissions, aiEnabled, overrideLogs } = state;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const isAllGraded = gradedSubmissions.length === submissions.length;

  // Calculate composite Session Confidence Score
  const sessionConfidenceScore = useMemo(() => {
    // Example composite:
    // 60% explanation validity rate
    // 30% score drift (inverse: lower is better)
    // 10% override count (inverse: lower is better)
    let validityScore = sessionAnalytics.explanationValidityRate * 0.6; // Max 60
    let driftScore = (100 - Math.min(100, sessionAnalytics.scoreDriftPercentage * 5)) * 0.3; // Max 30, scale drift (e.g., 20% drift => 0 score)
    let overrideScore = (100 - Math.min(100, sessionAnalytics.overrideCount * 10)) * 0.1; // Max 10, scale overrides (e.g., 10 overrides => 0 score)

    return Math.max(0, Math.min(100, validityScore + driftScore + overrideScore)).toFixed(1);
  }, [sessionAnalytics]);

  // Calculate Rubric Adherence % (simplified: how often explanations are supported or partially supported)
  const rubricAdherencePercentage = useMemo(() => {
      // This logic should be more robust, potentially checking for minimum explanation length
      // For now, reuse explanationValidityRate
      return sessionAnalytics.explanationValidityRate.toFixed(1);
  }, [sessionAnalytics.explanationValidityRate]);

  const aiInterventionSummary = useMemo(() => {
    if (!aiEnabled) return { total: 0, refinements: 0, overrides: 0 };
    const totalInterventions = gradedSubmissions.reduce((sum, record) => {
        return sum + record.evaluations.filter(e => e.aiAnalysis && e.aiAnalysis.status !== 'Supported' && e.aiAnalysis.status !== 'NotAnalyzed' && e.aiAnalysis.status !== 'Error').length;
    }, 0);
    const refinementsApplied = 0; // This would require tracking if a professor edited their explanation based on a suggestion
    const overrides = overrideLogs.length;

    return { total: totalInterventions, refinements: refinementsApplied, overrides: overrides };
  }, [gradedSubmissions, aiEnabled, overrideLogs]);


  const handleSubmitGrades = async () => {
    setIsSubmitting(true);
    // Simulate submission to LMS
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setShowConfirmation(true);
    // In a real app, this would integrate with the LMS API
  };

  const handleDownloadReport = () => {
    // Simulate report generation and download
    const reportContent = `
Grading Consistency Report - ${state.selectedAssignment?.name}
-------------------------------------------------------
Date: ${new Date().toLocaleDateString()}
Professor: [Your Name]

Overall Metrics:
- Session Confidence Score: ${sessionConfidenceScore}%
- Rubric Adherence: ${rubricAdherencePercentage}%
- Score Drift from Calibration: ${sessionAnalytics.scoreDriftPercentage.toFixed(1)}%
- Total AI Interventions: ${aiInterventionSummary.total}
- Overrides after AI Intervention: ${aiInterventionSummary.overrides}

Detailed Analytics:
- Explanation Validity Rate: ${sessionAnalytics.explanationValidityRate.toFixed(1)}%
- High-Risk Flags: ${sessionAnalytics.highRiskFlags.join(', ') || 'None'}

Override Log (${sessionAnalytics.overrideCount} total):
${overrideLogs.map(log => `- Submission: ${submissions.find(s => s.id === log.submissionId)?.studentName} | Criterion: ${state.rubric.find(r => r.id === log.criterionId)?.name} | Original AI Status: ${log.originalAIStatus} | Justification: ${log.professorJustification}`).join('\n')}

--- End of Report ---
    `;
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Grading_Consistency_Report_${state.selectedAssignment?.name.replace(/\s/g, '_') || 'Session'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getDriftColor = (value: number) => {
    return value <= 3 ? 'text-success' : 'text-danger';
  };

  if (!isAllGraded) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-600 dark:text-gray-400">
        <h2 className="text-2xl font-bold mb-4">Grading Not Complete</h2>
        <p>You must grade all {submissions.length} submissions before proceeding to finalization.</p>
        <Button onClick={() => setScreen(GradingScreen.ActiveGrading)} className="mt-4">
          Return to Grading
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Finalization & Submission</h2>

      {showConfirmation && (
        <div className="bg-success-100 text-success p-4 rounded-md text-sm mb-4 flex items-center justify-between" role="alert">
          <span>Grades for "{state.selectedAssignment?.name}" submitted successfully to LMS!</span>
          <Button variant="secondary" onClick={() => {
            setShowConfirmation(false);
            resetSession(); // Start fresh
            setScreen(GradingScreen.Setup);
          }} className="text-success hover:text-success-dark">
            Start New Session
          </Button>
        </div>
      )}

      <Card>
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Session Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricCard
            title="Session Confidence Score"
            value={`${sessionConfidenceScore}%`}
            description="Composite metric reflecting consistency and validity."
            colorClass={parseFloat(sessionConfidenceScore) >= 85 ? 'text-success' : 'text-warning'}
          />
          <MetricCard
            title="Rubric Adherence"
            value={`${rubricAdherencePercentage}%`}
            description="Overall alignment of justifications with rubric criteria."
            colorClass={parseFloat(rubricAdherencePercentage) >= 90 ? 'text-success' : 'text-warning'}
          />
          <MetricCard
            title="Score Drift"
            value={`${sessionAnalytics.scoreDriftPercentage.toFixed(1)}%`}
            description="Average deviation from your calibration baseline."
            colorClass={getDriftColor(sessionAnalytics.scoreDriftPercentage)}
          />
          <MetricCard
            title="AI Assistance Summary"
            value={`${aiInterventionSummary.total} interventions`}
            description={`(${aiInterventionSummary.overrides} overrides)`}
            colorClass={aiEnabled ? 'text-primary' : 'text-gray-500'}
          />
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Next Steps</h3>
        <div className="flex flex-col md:flex-row gap-4">
          <Button
            onClick={handleSubmitGrades}
            disabled={isSubmitting || showConfirmation}
            isLoading={isSubmitting}
            fullWidth
            className="flex-1"
          >
            {isSubmitting ? 'Submitting to LMS...' : 'Submit Grades to LMS (Mocked)'}
          </Button>
          <Button
            onClick={handleDownloadReport}
            disabled={showConfirmation}
            fullWidth
            variant="secondary"
            className="flex-1"
          >
            Download Consistency Report
          </Button>
        </div>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-white dark:bg-gray-800 shadow-lg border-t border-gray-200 dark:border-gray-700">
        <Button onClick={() => setScreen(GradingScreen.Reflection)} fullWidth variant="secondary" className="max-w-md mx-auto">
          Return to Reflection
        </Button>
      </div>
    </div>
  );
};

export default S6_Finalization;