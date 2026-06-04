import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskInput from '../components/TaskInput';

describe('TaskInput', () => {
  it('renders the input and execute button', () => {
    render(<TaskInput onAdd={() => {}} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /execute/i })).toBeInTheDocument();
  });

  it('calls onAdd with trimmed value and default priority on button click', async () => {
    const onAdd = vi.fn();
    render(<TaskInput onAdd={onAdd} />);
    await userEvent.type(screen.getByRole('textbox'), '  Build empire  ');
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));
    expect(onAdd).toHaveBeenCalledWith('Build empire', 'medium');
  });

  it('clears input after submit', async () => {
    const onAdd = vi.fn();
    render(<TaskInput onAdd={onAdd} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Test task');
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));
    expect(input).toHaveValue('');
  });

  it('submits on Enter key', async () => {
    const onAdd = vi.fn();
    render(<TaskInput onAdd={onAdd} />);
    await userEvent.type(screen.getByRole('textbox'), 'Keyboard task{Enter}');
    expect(onAdd).toHaveBeenCalledWith('Keyboard task', 'medium');
  });

  it('does not call onAdd for empty input', () => {
    const onAdd = vi.fn();
    render(<TaskInput onAdd={onAdd} />);
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('does not call onAdd for whitespace-only input', async () => {
    const onAdd = vi.fn();
    render(<TaskInput onAdd={onAdd} />);
    await userEvent.type(screen.getByRole('textbox'), '   ');
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));
    expect(onAdd).not.toHaveBeenCalled();
  });
});
