import { useState, useEffect, lazy, Suspense } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { useTasks } from './hooks/useTasks';
import LoginScreen from './components/LoginScreen';
import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';
import AICommandBar from './components/AICommandBar';

const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));

type View = 'tasks' | 'analytics';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>('tasks');
  const { tasks, loading, error, addTask, deleteTask, updateTask, refetch } = useTasks(user);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white p-8 font-sans">
      <header className="flex justify-between items-center mb-12 border-b border-yellow-800 pb-6">
        <h1 className="text-3xl font-bold text-yellow-500">
          Personal OS <span className="text-white text-sm font-light ml-2">v1.0</span>
        </h1>
        <div className="flex items-center gap-6">
          <nav className="flex gap-1">
            {(['tasks', 'analytics'] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-xs uppercase tracking-widest px-3 py-1 rounded transition-all ${
                  view === v ? 'text-yellow-500 border border-yellow-700' : 'text-gray-500 hover:text-white'
                }`}
              >
                {v}
              </button>
            ))}
          </nav>
          <span className="text-gray-400 text-sm">{user.email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-xs uppercase tracking-widest text-gray-500 hover:text-white"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        {view === 'tasks' ? (
          <>
            <AICommandBar onTasksChanged={refetch} />
            <TaskInput onAdd={addTask} />
            <TaskList
              tasks={tasks}
              loading={loading}
              error={error}
              onDelete={deleteTask}
              onUpdate={updateTask}
            />
          </>
        ) : (
          <Suspense fallback={<div className="text-center text-gray-600 py-20 text-xs uppercase tracking-widest">Loading Analytics...</div>}>
            <AnalyticsDashboard tasks={tasks} />
          </Suspense>
        )}
      </main>
    </div>
  );
}
