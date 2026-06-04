import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Task, TaskPriority } from '../types';

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  addTask: (title: string, priority?: TaskPriority) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Pick<Task, 'status' | 'priority'>>) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useTasks(user: User | null): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else setTasks((data as Task[]) ?? []);
    setLoading(false);
  }, [user]);

  const addTask = useCallback(async (title: string, priority: TaskPriority = 'medium') => {
    if (!title?.trim() || !user) return;
    const { error: err } = await supabase
      .from('tasks')
      .insert([{ user_id: user.id, title: title.trim(), status: 'todo', priority }]);
    if (err) { setError(err.message); return; }
    await fetchTasks();
  }, [user, fetchTasks]);

  const deleteTask = useCallback(async (taskId: string) => {
    const { error: err } = await supabase.from('tasks').delete().eq('id', taskId);
    if (err) { setError(err.message); return; }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Pick<Task, 'status' | 'priority'>>) => {
    const dbUpdates: Partial<Task> = { ...updates };
    if (updates.status === 'done') {
      dbUpdates.completed_at = new Date().toISOString();
    } else if (updates.status !== undefined) {
      dbUpdates.completed_at = null;
    }
    const { data, error: err } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', taskId)
      .select();
    if (err) { setError(err.message); return; }
    setTasks((prev) => prev.map((t) => (t.id === taskId ? (data as Task[])[0] : t)));
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  return { tasks, loading, error, addTask, deleteTask, updateTask, refetch: fetchTasks };
}
