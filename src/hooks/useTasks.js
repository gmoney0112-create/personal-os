import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useTasks(user) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    else setTasks(data ?? []);
    setLoading(false);
  }, [user]);

  const addTask = useCallback(async (title) => {
    if (!title?.trim() || !user) return;
    const { error: err } = await supabase
      .from('tasks')
      .insert([{ user_id: user.id, title: title.trim(), status: 'todo', priority: 'medium' }]);
    if (err) { setError(err.message); return; }
    await fetchTasks();
  }, [user, fetchTasks]);

  const deleteTask = useCallback(async (taskId) => {
    const { error: err } = await supabase.from('tasks').delete().eq('id', taskId);
    if (err) { setError(err.message); return; }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const updateTask = useCallback(async (taskId, updates) => {
    const { data, error: err } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select();
    if (err) { setError(err.message); return; }
    setTasks((prev) => prev.map((t) => (t.id === taskId ? data[0] : t)));
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  return { tasks, loading, error, addTask, deleteTask, updateTask, refetch: fetchTasks };
}
