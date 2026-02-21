import React from 'react';

interface HeatmapProps {
  data: { [criterionId: string]: number[] }; // { criterionId: [variance_val1, variance_val2, ...] }
  criterionNames: { [criterionId: string]: string };
  title: string;
  className?: string;
}

const Heatmap: React.FC<HeatmapProps> = ({ data, criterionNames, title, className = '' }) => {
  // Fix: Explicitly type 'val' as 'number' in the reduce callback.
  const allVariances = Object.values(data).flat();
  const maxVariance = allVariances.length > 0 ? allVariances.reduce((max, val: number) => Math.max(max, val), 0) : 0;
  // Fix: Safely access length property by finding the first non-empty criterion data array.
  const firstCriterionData = Object.values(data).find(arr => arr.length > 0);
  const numSubmissions = firstCriterionData ? firstCriterionData.length : 0;

  const getColor = (value: number) => {
    if (maxVariance === 0 || value === 0) return 'bg-gray-200 dark:bg-gray-700'; // No variance or zero variance
    // Fix: `value` is already typed as number, `maxVariance` is also number. This error might have been a cascade.
    const intensity = value / maxVariance;
    if (intensity < 0.25) return 'bg-blue-100'; // Low variance, cool colors
    if (intensity < 0.5) return 'bg-blue-300';
    if (intensity < 0.75) return 'bg-orange-300'; // Medium variance, warmer
    return 'bg-red-400'; // High variance, hot
  };

  if (Object.keys(data).length === 0 || numSubmissions === 0) {
    return (
      <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow-subtle ${className}`}>
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400">Not enough data to generate heatmap yet.</p>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow-subtle ${className}`}>
      <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">{title}</h3>
      <div className="overflow-x-auto">
        <div className="grid gap-px min-w-full">
          {/* Header Row: Submission Numbers */}
          <div className="grid" style={{ gridTemplateColumns: `minmax(120px, 0.5fr) repeat(${numSubmissions}, minmax(40px, 1fr))` }}>
            <div className="p-2 text-sm font-medium text-gray-600 dark:text-gray-400 text-left">Criterion</div>
            {Array.from({ length: numSubmissions }).map((_, i) => (
              <div key={`sub-header-${i}`} className="p-2 text-sm font-medium text-gray-600 dark:text-gray-400 text-center">
                Sub {i + 1}
              </div>
            ))}
          </div>

          {/* Data Rows */}
          {Object.entries(data).map(([criterionId, variances]) => (
            <div key={criterionId} className="grid border-t border-gray-100 dark:border-gray-700" style={{ gridTemplateColumns: `minmax(120px, 0.5fr) repeat(${numSubmissions}, minmax(40px, 1fr))` }}>
              <div className="p-2 text-sm text-gray-700 dark:text-gray-300 font-medium text-left truncate" title={criterionNames[criterionId]}>
                {criterionNames[criterionId]}
              </div>
              {/* Fix: `variances` is already correctly typed as `number[]` by `Object.entries(data)` and interface definition */}
              {variances.map((val: number, i: number) => (
                <div
                  key={`${criterionId}-${i}`}
                  className={`flex items-center justify-center h-10 w-full ${getColor(val)}`}
                  title={`Submission ${i + 1}: Variance ${val.toFixed(2)}`}
                >
                  <span className="text-xs text-gray-800 dark:text-gray-100 font-mono">
                    {val.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Heatmap;