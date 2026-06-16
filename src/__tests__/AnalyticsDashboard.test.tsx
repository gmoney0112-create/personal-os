import { render, screen } from '@testing-library/react';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import type { Task } from '../types';

// Recharts uses ResizeObserver and SVG which jsdom doesn't fully support.
// Stub out the problematic parts so the component renders cleanly in tests.
vi.mock('recharts', () => {
  const stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    PieChart: stub, Pie: stub, Cell: stub, Tooltip: stub, Legend: stub,
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    AreaChart: stub, Area: stub, XAxis: stub, YAxis: stub, CartesianGrid: stub,
  };
});

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: '1', user_id: 'u1', title: 'Task', status: 'todo', priority: 'medium',
  created_at: new Date().toISOString(), completed_at: null, ...overrides,
});

describe('AnalyticsDashboard', () => {
  it('shows empty state when there are no tasks', () => {
    render(<AnalyticsDashboard tasks={[]} />);
    expect(screen.getByText(/no data in the archive/i)).toBeInTheDocument();
  });

  it('does not show charts in empty state', () => {
    render(<AnalyticsDashboard tasks={[]} />);
    expect(screen.queryByText(/status breakdown/i)).not.toBeInTheDocument();
  });

  it('renders stat cards with task data', () => {
    const tasks = [
      makeTask({ id: '1', status: 'done', priority: 'high', completed_at: new Date().toISOString() }),
      makeTask({ id: '2', status: 'in-progress', priority: 'medium' }),
      makeTask({ id: '3', status: 'todo', priority: 'low' }),
    ];
    render(<AnalyticsDashboard tasks={tasks} />);
    expect(screen.getByText('3')).toBeInTheDocument(); // Total
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('calculates completion rate correctly', () => {
    const tasks = [
      makeTask({ id: '1', status: 'done', completed_at: new Date().toISOString() }),
      makeTask({ id: '2', status: 'todo' }),
    ];
    render(<AnalyticsDashboard tasks={tasks} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('shows 0% completion rate when no tasks are done', () => {
    render(<AnalyticsDashboard tasks={[makeTask()]} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows chart sections when tasks exist', () => {
    render(<AnalyticsDashboard tasks={[makeTask()]} />);
    expect(screen.getByText(/status breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/priority distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/last 7 days/i)).toBeInTheDocument();
  });

  it('shows avg completion time when done tasks exist', () => {
    const created = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h ago
    const tasks = [makeTask({ id: '1', status: 'done', created_at: created, completed_at: new Date().toISOString() })];
    render(<AnalyticsDashboard tasks={tasks} />);
    expect(screen.getByText('Avg Time')).toBeInTheDocument();
    // Value should not be '—'
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('shows — for avg time when no tasks are completed', () => {
    render(<AnalyticsDashboard tasks={[makeTask({ status: 'todo' })]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
