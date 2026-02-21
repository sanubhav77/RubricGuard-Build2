import React, { useMemo } from 'react';
import { GradingScreen } from '../types';
import { useGradingSession } from '../context/GradingSessionContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Heatmap from '../components/Heatmap';
import LineChart from '../components/LineChart'; // Recharts LineChart
import Badge from '../components/Badge';

interface S4_LiveAnalyticsProps {
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

const S4_LiveAnalytics: React.FC<S4_LiveAnalyticsProps> = ({ setScreen }) => {
  const { state, goToSubmission, setScreen: setGlobalScreen } = useGradingSession();
  const { sessionAnalytics, rubric, overrideLogs, gradedSubmissions, submissions } = state;

  const criterionNamesMap = useMemo(() => {
    return rubric.reduce((acc, crit) => {
      acc[crit.id] = crit.name;
      return acc;
    }, {} as { [key: string]: string });
  }, [rubric]);

  const driftChartData = useMemo(() => {
    const data: { name: string; value: number }[] = [];
    // Calculate drift for each submission
    if (state.calibrationBaseline && gradedSubmissions.length > 0) {
      gradedSubmissions.forEach((record, index) => {
        let totalDrift = 0;
        let critCount = 0;
        record.evaluations.forEach(evalItem => {
          if (evalItem.score !== null && state.calibrationBaseline?.meanScores[evalItem.criterionId] !== undefined) {
            totalDrift += Math.abs(evalItem.score - state.calibrationBaseline.meanScores[evalItem.criterionId]);
            critCount++;
          }
        });
        const avgDrift = critCount > 0 ? (totalDrift / critCount) : 0;
        data.push({ name: `Sub ${index + 1}`, value: avgDrift });
      });
    }
    return data;
  }, [gradedSubmissions, state.calibrationBaseline]);

  const highRiskTableData = useMemo(() => {
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
    });
  }, [overrideLogs, submissions, rubric]);

  const currentSubmissionIndex = state.currentSubmissionIndex;
  const submissionsGradedCount = gradedSubmissions.length;
  const totalSubmissions = submissions.length;

  return (
    <div className="flex flex-col h-full space-y-8">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">Live Analytics Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Explanation Validity"
          value={`${sessionAnalytics.explanationValidityRate.toFixed(1)}%`}
          description="Rate of explanations supported by AI."
          colorClass={sessionAnalytics.explanationValidityRate >= 95 ? 'text-success' : 'text-warning'}
        />
        <MetricCard
          title="Score Drift"
          value={`${sessionAnalytics.scoreDriftPercentage.toFixed(1)}%`}
          description="Average deviation from calibration baseline."
          colorClass={sessionAnalytics.scoreDriftPercentage <= 3 ? 'text-success' : 'text-danger'}
        />
        <MetricCard
          title="Submissions Graded"
          value={`${submissionsGradedCount} / ${totalSubmissions}`}
          description="Total submissions processed in this session."
          colorClass="text-primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-grow">
        <Heatmap
          title="Criterion Score Variance Over Time"
          data={sessionAnalytics.criterionVarianceHeatmap}
          criterionNames={criterionNamesMap}
          className="lg:col-span-1"
        />
        <LineChart
          title="Score Drift Trend"
          data={driftChartData}
          dataKey="value"
          tooltipLabel="Avg. Criterion Drift"
          yAxisDomain={[0, Math.max(10, ...driftChartData.map(d => d.value))]}
          className="lg:col-span-1"
        />
      </div>

      <Card>
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">High-Risk Grading Flags / Overrides</h3>
        {highRiskTableData.length > 0 ? (
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
                    Original AI Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Professor Justification
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {highRiskTableData.map((flag) => (
                  <tr key={flag.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {flag.submissionName} (Sub {flag.submissionIndex + 1})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
                      {flag.criterionName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
                      <Badge status={flag.originalStatus} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-200">
                      {flag.professorJustification}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="secondary"
                        className="text-primary hover:underline text-xs py-1 px-2"
                        onClick={() => {
                          goToSubmission(flag.submissionIndex);
                          setGlobalScreen(GradingScreen.ActiveGrading);
                        }}
                      >
                        Revisit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">No high-risk grading flags or overrides recorded yet.</p>
        )}
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-white dark:bg-gray-800 shadow-lg border-t border-gray-200 dark:border-gray-700">
        <Button onClick={() => setScreen(GradingScreen.ActiveGrading)} fullWidth className="max-w-md mx-auto">
          Return to Grading
        </Button>
      </div>
    </div>
  );
};

export default S4_LiveAnalytics;