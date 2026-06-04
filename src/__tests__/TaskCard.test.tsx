import { render, screen, fireEvent } from '@testing-library/react';
import TaskCard from '../components/TaskCard';
import type { Task } from '../types';

const base: Task = { id: '1', user_id: 'u1', title: 'Conquer the north', status: 'todo', priority: 'medium', created_at: '', completed_at: null };

describe('TaskCard', () => {
  it('renders task title', () => {
    render(<TaskCard task={base} onDelete={() => {}} onUpdate={() => {}} />);
    expect(screen.getByText('Conquer the north')).toBeInTheDocument();
  });

  it('renders current status as a button', () => {
    render(<TaskCard task={base} onDelete={() => {}} onUpdate={() => {}} />);
    expect(screen.getByRole('button', { name: /todo/i })).toBeInTheDocument();
  });

  it('cycles status on click: todo → in-progress', () => {
    const onUpdate = vi.fn();
    render(<TaskCard task={base} onDelete={() => {}} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole('button', { name: /todo/i }));
    expect(onUpdate).toHaveBeenCalledWith('1', { status: 'in-progress' });
  });

  it('cycles status: in-progress → done', () => {
    const onUpdate = vi.fn();
    render(<TaskCard task={{ ...base, status: 'in-progress' }} onDelete={() => {}} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole('button', { name: /in-progress/i }));
    expect(onUpdate).toHaveBeenCalledWith('1', { status: 'done' });
  });

  it('cycles status: done → todo', () => {
    const onUpdate = vi.fn();
    render(<TaskCard task={{ ...base, status: 'done' }} onDelete={() => {}} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(onUpdate).toHaveBeenCalledWith('1', { status: 'todo' });
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    render(<TaskCard task={base} onDelete={onDelete} onUpdate={() => {}} />);
    fireEvent.click(screen.getByLabelText('Delete task'));
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('applies red border for high priority', () => {
    const { container } = render(<TaskCard task={{ ...base, priority: 'high' }} onDelete={() => {}} onUpdate={() => {}} />);
    expect(container.firstChild).toHaveClass('border-red-500');
  });

  it('applies gray border for low priority', () => {
    const { container } = render(<TaskCard task={{ ...base, priority: 'low' }} onDelete={() => {}} onUpdate={() => {}} />);
    expect(container.firstChild).toHaveClass('border-gray-600');
  });

  it('falls back to medium border for unknown priority', () => {
    const task = { ...base, priority: undefined as unknown as Task['priority'] };
    const { container } = render(<TaskCard task={task} onDelete={() => {}} onUpdate={() => {}} />);
    expect(container.firstChild).toHaveClass('border-yellow-600');
  });
});
