import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import type { Task, TaskStatus, TaskPriority } from '../types';

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: '#6B7280',
  'in-progress': '#EAB308',
  done: '#22C55E',
};
const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: '#EF4444',
  medium: '#EAB308',
  low: '#6B7280',
};

const tooltipStyle = { background: '#141414', border: '1px solid #78350f', color: '#fff', fontSize: 12 };
const legendFormatter = (v: string) => (
  <span style={{ color: '#9CA3AF', fontSize: 11, textTransform: 'uppercase' as const }}>{v}</span>
);

interface Props {
  tasks: Task[];
}

export default function AnalyticsDashboard({ tasks }: Props) {
  const statusData = useMemo(() => {
    const counts: Record<TaskStatus, number> = { todo: 0, 'in-progress': 0, done: 0 };
    tasks.forEach(t => { if (t.status in counts) counts[t.status]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const priorityData = useMemo(() => {
    const counts: Record<TaskPriority, number> = { high: 0, medium: 0, low: 0 };
    tasks.forEach(t => { if (t.priority in counts) counts[t.priority]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const timelineData = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
    }
    tasks.forEach(t => {
      const key = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (key in days) days[key]++;
    });
    return Object.entries(days).map(([date, count]) => ({ date, count }));
  }, [tasks]);

  const done = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const highPriority = tasks.filter(t => t.priority === 'high').length;
  const completionRate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  const avgCompletionHours = useMemo(() => {
    const timed = tasks.filter(t => t.status === 'done' && t.completed_at);
    if (!timed.length) return null;
    const avg = timed.reduce((sum, t) => {
      return sum + (new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime());
    }, 0) / timed.length;
    const hours = avg / (1000 * 60 * 60);
    return hours < 24 ? `${Math.round(hours)}h` : `${Math.round(hours / 24)}d`;
  }, [tasks]);

  const stats = [
    { label: 'Total', value: tasks.length },
    { label: 'In Progress', value: inProgress },
    { label: 'Completed', value: done },
    { label: 'Completion', value: `${completionRate}%` },
    { label: 'Avg Time', value: avgCompletionHours ?? '—' },
  ];

  if (tasks.length === 0) {
    return (
      <div className="text-center text-gray-600 py-20 text-xs uppercase tracking-widest">
        No data yet — add tasks to see analytics
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-[#111] border border-yellow-900 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-500">{s.value}</div>
            <div className="text-xs uppercase tracking-widest text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#111] border border-yellow-900 rounded-lg p-4">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4">Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                {statusData.map(entry => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name as TaskStatus]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend formatter={legendFormatter} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#111] border border-yellow-900 rounded-lg p-4">
          <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4">Priority Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={priorityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                {priorityData.map(entry => (
                  <Cell key={entry.name} fill={PRIORITY_COLORS[entry.name as TaskPriority]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend formatter={legendFormatter} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#111] border border-yellow-900 rounded-lg p-4">
        <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4">Tasks Created — Last 7 Days</h3>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={timelineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EAB308" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
            <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 11 }} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="count" stroke="#EAB308" fill="url(#goldGrad)" strokeWidth={2} dot={{ fill: '#EAB308', r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
