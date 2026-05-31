import { render, screen } from '@testing-library/react';
import TaskList from '../components/TaskList';

const tasks = [
  { id: '1', title: 'Task Alpha', status: 'todo', priority: 'high' },
  { id: '2', title: 'Task Beta', status: 'done', priority: 'low' },
];

describe('TaskList', () => {
  it('shows loading state', () => {
    render(<TaskList tasks={[]} loading={true} error={null} onDelete={() => {}} onUpdate={() => {}} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<TaskList tasks={[]} loading={false} error="Connection failed" onDelete={() => {}} onUpdate={() => {}} />);
    expect(screen.getByText(/Connection failed/i)).toBeInTheDocument();
  });

  it('shows empty state when no tasks', () => {
    render(<TaskList tasks={[]} loading={false} error={null} onDelete={() => {}} onUpdate={() => {}} />);
    expect(screen.getByText(/no directives/i)).toBeInTheDocument();
  });

  it('renders all task titles', () => {
    render(<TaskList tasks={tasks} loading={false} error={null} onDelete={() => {}} onUpdate={() => {}} />);
    expect(screen.getByText('Task Alpha')).toBeInTheDocument();
    expect(screen.getByText('Task Beta')).toBeInTheDocument();
  });

  it('does not render loading or error when tasks are present', () => {
    render(<TaskList tasks={tasks} loading={false} error={null} onDelete={() => {}} onUpdate={() => {}} />);
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });
});
