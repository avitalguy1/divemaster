'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ProgressPieProps {
  approved: number;
  pending: number;
  notStarted: number;
}

export function ProgressPie({ approved, pending, notStarted }: ProgressPieProps) {
  const data = [
    { name: 'Approved', value: approved, color: '#10b981' },
    { name: 'Pending Review', value: pending, color: '#f59e0b' },
    { name: 'Not Started', value: notStarted, color: '#334155' },
  ].filter((item) => item.value > 0);

  return (
    <div className="w-full h-64 flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              borderColor: '#334155',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '12px',
            }}
            formatter={(value: any) => [`${value} units`, 'Count']}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value: string) => (
              <span className="text-slate-300 text-xs font-medium">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
