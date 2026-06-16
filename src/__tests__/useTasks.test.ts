import { renderHook, act, waitFor } from '@testing-library/react';
import { useTasks } from '../hooks/useTasks';
import type { Task } from '../types';
import type { User } from '@supabase/supabase-js';

// ─── Mock ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockFrom = vi.fn() as any;

vi.mock('../lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

// Build a fluent Supabase-like chain where every method returns the chain
// and the chain itself is a Promise (thenable) resolving to `result`.
function chain(result: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'order'].forEach(m => {
    c[m] = vi.fn(() => c);
  });
  // Make it awaitable
  c.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(result).then(resolve, reject);
  return c;
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const user = { id: 'user-1', email: 'a@b.com' } as User;

const task1: Task = {
  id: 'task-1', user_id: 'user-1', title: 'Alpha', status: 'todo',
  priority: 'medium', created_at: '2026-01-01T00:00:00Z', completed_at: null,
};
const task2: Task = {
  id: 'task-2', user_id: 'user-1', title: 'Beta', status: 'done',
  priority: 'high', created_at: '2026-01-02T00:00:00Z', completed_at: '2026-01-03T00:00:00Z',
};

beforeEach(() => { vi.clearAllMocks(); });

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useTasks', () => {
  describe('initial state', () => {
    it('returns empty tasks and no error when user is null', () => {
      mockFrom.mockReturnValue(chain({ data: [], error: null }));
      const { result } = renderHook(() => useTasks(null));
      expect(result.current.tasks).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('fetches tasks on mount when user is provided', async () => {
      mockFrom.mockReturnValue(chain({ data: [task1, task2], error: null }));
      const { result } = renderHook(() => useTasks(user));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.tasks).toEqual([task1, task2]);
    });

    it('sets error state when fetch fails', async () => {
      mockFrom.mockReturnValue(chain({ data: null, error: { message: 'Network error' } }));
      const { result } = renderHook(() => useTasks(user));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe('Network error');
      expect(result.current.tasks).toEqual([]);
    });
  });

  describe('addTask', () => {
    it('optimistically prepends the task before the round-trip completes', async () => {
      const fetchChain = chain({ data: [task1], error: null });
      const insertChain = chain({ error: null });
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        // First call = fetchTasks on mount; second = insert; third = refetch after insert
        if (callCount === 2) return insertChain;
        return fetchChain;
      });

      const { result } = renderHook(() => useTasks(user));
      await waitFor(() => expect(result.current.tasks).toHaveLength(1));

      act(() => { void result.current.addTask('Beta', 'high'); });

      // Optimistic task appears synchronously before the insert resolves
      expect(result.current.tasks.some(t => t.title === 'Beta')).toBe(true);
    });

    it('rolls back the optimistic entry on insert error', async () => {
      const fetchChain = chain({ data: [task1], error: null });
      const insertChain = chain({ error: { message: 'DB error' } });
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 2 ? insertChain : fetchChain;
      });

      const { result } = renderHook(() => useTasks(user));
      await waitFor(() => expect(result.current.tasks).toHaveLength(1));

      await act(async () => { await result.current.addTask('Fail task', 'low'); });

      expect(result.current.tasks).toEqual([task1]);
      expect(result.current.error).toBe('DB error');
    });

    it('is a no-op when user is null', async () => {
      mockFrom.mockReturnValue(chain({ data: [], error: null }));
      const { result } = renderHook(() => useTasks(null));
      await act(async () => { await result.current.addTask('Ghost task'); });
      // from() is never called with insert when user is null
      const insertCalls = mockFrom.mock.calls.filter(
        (_: unknown, i: number) => mockFrom.mock.results[i]?.value?.insert?.mock?.calls?.length > 0
      );
      expect(insertCalls).toHaveLength(0);
    });
  });

  describe('deleteTask', () => {
    it('removes the task from state on success', async () => {
      const fetchChain = chain({ data: [task1, task2], error: null });
      const deleteChain = chain({ error: null });
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? fetchChain : deleteChain;
      });

      const { result } = renderHook(() => useTasks(user));
      await waitFor(() => expect(result.current.tasks).toHaveLength(2));

      await act(async () => { await result.current.deleteTask('task-1'); });

      expect(result.current.tasks).toEqual([task2]);
    });

    it('sets error and keeps tasks on delete failure', async () => {
      const fetchChain = chain({ data: [task1], error: null });
      const deleteChain = chain({ error: { message: 'Delete failed' } });
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? fetchChain : deleteChain;
      });

      const { result } = renderHook(() => useTasks(user));
      await waitFor(() => expect(result.current.tasks).toHaveLength(1));

      await act(async () => { await result.current.deleteTask('task-1'); });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.error).toBe('Delete failed');
    });
  });

  describe('updateTask', () => {
    it('updates task in state on success', async () => {
      const updated = { ...task1, status: 'done' as const, completed_at: '2026-06-16T00:00:00Z' };
      const fetchChain = chain({ data: [task1], error: null });
      const updateChain = chain({ data: [updated], error: null });
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? fetchChain : updateChain;
      });

      const { result } = renderHook(() => useTasks(user));
      await waitFor(() => expect(result.current.tasks).toHaveLength(1));

      await act(async () => { await result.current.updateTask('task-1', { status: 'done' }); });

      expect(result.current.tasks[0].status).toBe('done');
    });
  });

  describe('refetch', () => {
    it('re-fetches tasks from Supabase', async () => {
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1
          ? chain({ data: [task1], error: null })
          : chain({ data: [task1, task2], error: null });
      });

      const { result } = renderHook(() => useTasks(user));
      await waitFor(() => expect(result.current.tasks).toHaveLength(1));

      await act(async () => { await result.current.refetch(); });

      expect(result.current.tasks).toHaveLength(2);
    });
  });
});
