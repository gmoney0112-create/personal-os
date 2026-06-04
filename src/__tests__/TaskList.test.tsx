import { render, screen } from '@testing-library/react';
import TaskList from '../components/TaskList';
import type { Task } from '../types';

const tasks: Task[] = [
  { id: '1', user_id: 'u1', title: 'Task One', status: 'todo', priority: 'high', created_at: '' },
  { id: '2', user_id: 'u1', title: 'Task Two', status: 'done', priority: 'low', created_at: '' },
];

describe('TaskList', () => {
  it('shows loading state', () => {
    render(<TaskList tasks={[]} loading={true} error={null} onDelete={() => {}} onUpdate={() => {}} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<TaskList tasks={[]} loading={false} error="DB error" onDelete={() => {}} onUpdate={() => {}} />);
    expect(screen.getByText(/DB error/i)).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<TaskList tasks={[]} loading={false} error={null} onDelete={() => {}} onUpdate={() => {}} />);
    expect(screen.getByText(/no directives/i)).toBeInTheDocument();
  });

  it('renders all tasks', () => {
    render(<TaskList tasks={tasks} loading={false} error={null} onDelete={() => {}} onUpdate={() => {}} />);
    expect(screen.getByText('Task One')).toBeInTheDocument();
    expect(screen.getByText('Task Two')).toBeInTheDocument();
  });

  it('renders correct number of task cards', () => {
    render(<TaskList tasks={tasks} loading={false} error={null} onDelete={() => {}} onUpdate={() => {}} />);
    expect(screen.getAllByRole('button', { name: /delete task/i })).toHaveLength(2);
  });
});
