import React, { useMemo, useCallback } from 'react';
import { GradingScreen, CriterionEvaluation } from '../types';
import { useGradingSession } from '../context/GradingSessionContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import LineChart from '../components/LineChart';
import { CALIBRATION_SUBMISSIONS_REQUIRED } from '../constants';

interface S5_ReflectionProps {
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

const S5_Reflection: React.FC<S5_ReflectionProps> = ({ setScreen }) => {
  const { state, goToSubmission, setScreen: setGlobalScreen } = useGradingSession();
  const { sessionAnalytics, overrideLogs, gradedSubmissions, submissions, rubric, calibrationBaseline } = state;

  const isAllGraded = gradedSubmissions.length === submissions.length;

  const criterionNamesMap = useMemo(() => {
    return rubric.reduce((acc, crit) => {
      acc[crit.id] = crit.name;
      return acc;
    }, {} as { [key: string]: string });
  }, [rubric]);

  // Calculate early vs late scoring comparison data
  const earlyVsLateChartData = useMemo(() => {
    if (!calibrationBaseline || gradedSubmissions.length === 0) return { early: [], late: [] };

    const earlyEvaluations: { [critId: string]: number[] } = {};
    const lateEvaluations: { [critId: string]: number[] } = {};

    // Assuming 'early' is calibration phase (first CALIBRATION_SUBMISSIONS_REQUIRED submissions)
    // and 'late' is subsequent submissions.
    gradedSubmissions.forEach((record, index) => {
      record.evaluations.forEach(evalItem => {
        if (evalItem.score !== null) {
          if (index < CALIBRATION_SUBMISSIONS_REQUIRED) {
            earlyEvaluations[evalItem.criterionId] = earlyEvaluations[evalItem.criterionId] || [];
            earlyEvaluations[evalItem.criterionId].push(evalItem.score);
          } else {
            lateEvaluations[evalItem.criterionId] = lateEvaluations[evalItem.criterionId] || [];
            lateEvaluations[evalItem.criterionId].push(evalItem.score);
          }
        }
      });
    });

    const calculateAvg = (scores: number[]) => scores.reduce((sum, s) => sum + s, 0) / scores.length;

    const earlyData = rubric.map(crit => ({
      name: crit.name,
      value: earlyEvaluations[crit.id]?.length > 0 ? calculateAvg(earlyEvaluations[crit.id]) : 0,
    }));

    const lateData = rubric.map(crit => ({
      name: crit.name,
      value: lateEvaluations[crit.id]?.length > 0 ? calculateAvg(lateEvaluations[crit.id]) : 0,
    }));

    return { early: earlyData, late: lateData };
  }, [gradedSubmissions, rubric, calibrationBaseline]);

  const flaggedDecisions = useMemo(() => {
    return overrideLogs.map(log => {
      const submission = submissions.find(sub => sub.id === log.submissionId);
      const criterion = rubric.find(crit => crit.id === log.criterionId);
      return {
        id: `${log.submissionId}-${log.criterionId}`,
        submissionName: submission?.studentName || 'N/A',
        criterionName: criterion?.name || 'N/A',
        originalStatus: log.originalAIStatus,
        professorJustification: log.professorJustification,
        submissionIndex: submissions.findIndex(sub => sub.id === log.submissionId),
      };
    }).concat(
      // Also include any submissions that were flagged as high-risk from analytics, but not overridden
      // This is a simplified example; actual flags would need to be stored differently if not overrides
      sessionAnalytics.highRiskFlags.filter(flag => !flag.startsWith('Override:')).map((flag, index) => ({
        id: `flag-${index}`,
        submissionName: 'General Session Flag', // Or link to specific submission if possible
        criterionName: 'N/A',
        originalStatus: 'NotSupported', // Placeholder
        professorJustification: flag,
        submissionIndex: -1, // No specific submission
      }))
    );
  }, [overrideLogs, submissions, rubric, sessionAnalytics.highRiskFlags]);


  const getDriftColor = (value: number) => {
    return value <= 3 ? 'text-success' : 'text-danger';
  };

  if (gradedSubmissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-600 dark:text-gray-400">
        <h2 className="text-2xl font-bold mb-4">No Submissions Graded Yet</h2>
        <p>Please grade submissions to see reflection metrics.</p>
        <Button onClick={() => setGlobalScreen(GradingScreen.ActiveGrading)} className="mt-4">
          Return to Grading
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-8">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Session Reflection</h2>

      {!isAllGraded && (
        <div className="bg-warning-100 text-warning p-4 rounded-md text-sm" role="alert">
          <p><strong>Warning:</strong> Not all submissions have been graded. Please complete all grading before finalization for a complete report.</p>
          <Button
            variant="secondary"
            className="mt-2 text-warning hover:text-warning-dark"
            onClick={() => setGlobalScreen(GradingScreen.ActiveGrading)}
          >
            Return to Unfinished Grading
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Final Validity Rate"
          value={`${sessionAnalytics.explanationValidityRate.toFixed(1)}%`}
          description="Overall explanation validity across all graded submissions."
          colorClass={sessionAnalytics.explanationValidityRate >= 95 ? 'text-success' : 'text-warning'}
        />
        <MetricCard
          title="Overall Score Drift"
          value={`${sessionAnalytics.scoreDriftPercentage.toFixed(1)}%`}
          description="Average drift from calibration baseline."
          colorClass={getDriftColor(sessionAnalytics.scoreDriftPercentage)}
        />
        <MetricCard
          title="Override Count"
          value={sessionAnalytics.overrideCount}
          description="Number of times AI suggestions were overridden."
          colorClass={sessionAnalytics.overrideCount > 0 ? 'text-warning' : 'text-primary'}
        />
      </div>

      {/* Early vs Late Scoring Comparison */}
      <Card>
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Early vs. Late Scoring Comparison (Average Score per Criterion)</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Compare your average scores per criterion during the calibration phase (early) versus active grading (late). Significant differences might indicate drift.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LineChart
            title="Early Grading (Calibration)"
            data={earlyVsLateChartData.early.map(d => ({ name: d.name, value: d.value }))}
            dataKey="value"
            tooltipLabel="Avg. Score"
            yAxisDomain={[0, Math.max(...rubric.map(r => r.maxScore)) || 10]}
          />
          <LineChart
            title="Late Grading (Active)"
            data={earlyVsLateChartData.late.map(d => ({ name: d.name, value: d.value }))}
            dataKey="value"
            tooltipLabel="Avg. Score"
            yAxisDomain={[0, Math.max(...rubric.map(r => r.maxScore)) || 10]}
          />
        </div>
      </Card>

      {/* Flagged Inconsistencies List */}
      <Card>
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Flagged Decisions & Overrides</h3>
        {flaggedDecisions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Submission
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Criterion
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    AI Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Professor Justification / Flag Detail
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {flaggedDecisions.map((flag) => (
                  <tr key={flag.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {flag.submissionName} {flag.submissionIndex !== -1 && `(Sub ${flag.submissionIndex + 1})`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
                      {flag.criterionName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
                      {flag.originalStatus && <Badge status={flag.originalStatus} />}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-200">
                      {flag.professorJustification}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {flag.submissionIndex !== -1 && (
                        <Button
                          variant="secondary"
                          className="text-primary hover:underline text-xs py-1 px-2"
                          onClick={() => {
                            goToSubmission(flag.submissionIndex);
                            setGlobalScreen(GradingScreen.ActiveGrading);
                          }}
                        >
                          Revisit Submission
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">No flagged decisions or overrides recorded.</p>
        )}
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-white dark:bg-gray-800 shadow-lg border-t border-gray-200 dark:border-gray-700">
        <Button onClick={() => setScreen(GradingScreen.Finalization)} fullWidth className="max-w-md mx-auto">
          Proceed to Finalization
        </Button>
      </div>
    </div>
  );
};

export default S5_Reflection;