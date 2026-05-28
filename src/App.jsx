import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const fetchTasks = async () => {
    if (!user) return;
    const { data } = await supabase.from('tasks').select('*').eq('user_id', user.id);
    setTasks(data || []);
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    await supabase.from('tasks').insert([{ user_id: user.id, title: newTask, status: 'todo' }]);
    setNewTask('');
    fetchTasks();
  };

  useEffect(() => { if (user) fetchTasks(); }, [user]);

  if (!user) return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center font-sans">
      <div className="p-8 bg-[#141414] border border-yellow-600 rounded-lg shadow-2xl text-center">
        <h1 className="text-4xl font-bold text-yellow-500 mb-4">KINGDOM SYSTEMS</h1>
        <p className="text-gray-400 mb-6">Imperial OS Authentication Required</p>
        <button onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })} 
                className="px-6 py-3 bg-yellow-600 text-black font-bold rounded hover:bg-yellow-500 transition-all">
          ENTER EMPIRE
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white p-8 font-sans">
      <header className="flex justify-between items-center mb-12 border-b border-yellow-800 pb-6">
        <h1 className="text-3xl font-bold text-yellow-500">Personal OS <span className="text-white text-sm font-light ml-2">v1.0</span></h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{user.email}</span>
          <button onClick={() => supabase.auth.signOut()} className="text-xs uppercase tracking-widest text-gray-500 hover:text-white">Sign Out</button>
        </div}
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="flex gap-4 mb-8">
          <input 
            value={newTask} 
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTask()}
            placeholder="Add a new imperial directive..." 
            className="flex-1 bg-[#141414] border border-gray-800 p-4 rounded-lg text-white focus:border-yellow-500 outline-none transition-all"
          />
          <button onClick={addTask} className="px-8 py-4 bg-yellow-600 text-black font-bold rounded-lg hover:bg-yellow-500 transition-all">
            EXECUTE
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {tasks.map(t => (
            <div key={t.id} className="p-4 bg-[#141414] border-l-4 border-yellow-600 rounded-r-lg flex justify-between items-center hover:bg-[#1a1a1a] transition-all">
              <span className="text-lg">{t.title}</span>
              <span className="text-xs uppercase text-gray-500 px-2 py-1 bg-black rounded border border-gray-800">{t.status}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
