import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { TaskStatus } from '../../../lib/enums';
import type { TaskListItem } from '../types';

interface TaskSummaryChartProps {
  tasks: TaskListItem[];
}

const STATUS_CONFIG = [
  { key: TaskStatus.TODO, label: 'A fazer', color: 'var(--color-telier-400)' },
  { key: TaskStatus.IN_PROGRESS, label: 'Em andamento', color: 'var(--color-info-500)' },
  { key: TaskStatus.WAITING, label: 'Em espera', color: 'var(--color-warning-500)' },
  { key: TaskStatus.DONE, label: 'Concluída', color: 'var(--color-success-500)' },
];

export function TaskSummaryChart({ tasks }: TaskSummaryChartProps) {
  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of tasks) {
      counts[task.status] = (counts[task.status] || 0) + 1;
    }

    return STATUS_CONFIG
      .map((cfg) => ({
        name: cfg.label,
        value: counts[cfg.key] || 0,
        color: cfg.color,
      }))
      .filter((item) => item.value > 0);
  }, [tasks]);

  if (tasks.length === 0) return null;

  return (
    <div className="flex items-center gap-6">
      <div className="h-[100px] w-[100px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={28}
              outerRadius={46}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-text-secondary">
              {item.name}
            </span>
            <span className="text-xs font-semibold text-text-primary">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
