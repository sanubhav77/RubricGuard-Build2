import React from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface LineChartProps {
  data: { name: string; value: number }[]; // e.g., [{ name: 'Submission 1', value: 0.5 }, ...]
  title: string;
  dataKey: string; // The key for the value in each data object, e.g., 'value'
  tooltipLabel?: string; // Label for the tooltip, e.g., 'Drift'
  className?: string;
  yAxisDomain?: [number, number]; // e.g., [0, 10] for percentages
}

const LineChart: React.FC<LineChartProps> = ({ data, title, dataKey, tooltipLabel = 'Value', className = '', yAxisDomain }) => {
  if (!data || data.length === 0) {
    return (
      <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow-subtle ${className}`}>
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400">Not enough data to generate chart yet.</p>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow-subtle ${className}`}>
      <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsLineChart
          data={data}
          margin={{
            top: 5,
            right: 10,
            left: 0,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" className="dark:stroke-gray-600" />
          <XAxis dataKey="name" stroke="#6b7280" className="dark:stroke-gray-400 text-xs" />
          <YAxis stroke="#6b7280" className="dark:stroke-gray-400 text-xs" domain={yAxisDomain} />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--bg-white)', borderColor: 'var(--gray-300)', borderRadius: '8px' }}
            labelStyle={{ color: 'var(--gray-800)' }}
            itemStyle={{ color: 'var(--gray-800)' }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, tooltipLabel]}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ stroke: '#3B82F6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 3 }}
            animationDuration={300}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChart;