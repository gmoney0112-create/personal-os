import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AICommandBar from '../components/AICommandBar';

const mockGetUser = vi.fn();
const mockGetSession = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
      getSession: () => mockGetSession(),
    },
  },
}));

const authedUser = { id: 'u1', email: 'x@x.com' };
const authedSession = { access_token: 'tok123' };

beforeEach(() => {
  vi.resetAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: authedUser }, error: null });
  mockGetSession.mockResolvedValue({ data: { session: authedSession } });
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AICommandBar', () => {
  it('renders the input and execute button', () => {
    render(<AICommandBar onTasksChanged={vi.fn()} />);
    expect(screen.getByPlaceholderText(/add high priority/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /execute/i })).toBeInTheDocument();
  });

  it('disables execute button when input is empty', () => {
    render(<AICommandBar onTasksChanged={vi.fn()} />);
    expect(screen.getByRole('button', { name: /execute/i })).toBeDisabled();
  });

  it('enables execute button when input has text', () => {
    render(<AICommandBar onTasksChanged={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/add high priority/i), { target: { value: 'hello' } });
    expect(screen.getByRole('button', { name: /execute/i })).not.toBeDisabled();
  });

  it('shows AI response on successful submission', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: 'Task created.', actions: [] }),
    });

    render(<AICommandBar onTasksChanged={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/add high priority/i), { target: { value: 'create a task' } });
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));

    await waitFor(() => expect(screen.getByText('Task created.')).toBeInTheDocument());
  });

  it('calls onTasksChanged when actions are returned', async () => {
    const onTasksChanged = vi.fn();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: 'Done.', actions: [{ type: 'created' }] }),
    });

    render(<AICommandBar onTasksChanged={onTasksChanged} />);
    fireEvent.change(screen.getByPlaceholderText(/add high priority/i), { target: { value: 'add task' } });
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));

    await waitFor(() => expect(onTasksChanged).toHaveBeenCalledOnce());
  });

  it('does not call onTasksChanged when no actions returned', async () => {
    const onTasksChanged = vi.fn();
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: 'Just advice.', actions: [] }),
    });

    render(<AICommandBar onTasksChanged={onTasksChanged} />);
    fireEvent.change(screen.getByPlaceholderText(/add high priority/i), { target: { value: 'what to focus on' } });
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));

    await waitFor(() => expect(screen.getByText('Just advice.')).toBeInTheDocument());
    expect(onTasksChanged).not.toHaveBeenCalled();
  });

  it('shows error message on failed request', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: 'AI command failed' }),
    });

    render(<AICommandBar onTasksChanged={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/add high priority/i), { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));

    await waitFor(() => expect(screen.getByText(/Error: AI command failed/i)).toBeInTheDocument());
  });

  it('shows error when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('No session') });

    render(<AICommandBar onTasksChanged={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/add high priority/i), { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));

    await waitFor(() => expect(screen.getByText(/Error: Not authenticated/i)).toBeInTheDocument());
  });

  it('sends only message in request body (no task data)', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: 'ok', actions: [] }),
    });

    render(<AICommandBar onTasksChanged={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/add high priority/i), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const body = JSON.parse((fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body).toEqual({ message: 'hello' });
    expect(body).not.toHaveProperty('tasks');
  });

  it('clears input after successful submission', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: 'Done.', actions: [] }),
    });

    render(<AICommandBar onTasksChanged={vi.fn()} />);
    const input = screen.getByPlaceholderText(/add high priority/i);
    fireEvent.change(input, { target: { value: 'some command' } });
    fireEvent.click(screen.getByRole('button', { name: /execute/i }));

    await waitFor(() => expect(input).toHaveValue(''));
  });
});
