import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AICommandBar({ tasks, onTasksChanged }) {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setLoading(true);
    setResponse('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ai/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ message: input, tasks })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setResponse(data.response);
      if (data.actions?.length > 0) onTasksChanged();
    } catch (err) {
      setResponse(`Error: ${err.message}`);
    } finally {
      setLoading(false);
      setInput('');
    }
  }

  return (
    <div className="mb-8 border border-yellow-900 rounded-lg p-4 bg-[#111]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-yellow-500 text-xs uppercase tracking-widest font-bold">AI Command</span>
        <div className="h-px flex-1 bg-yellow-900 opacity-40" />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder='Try: "Add high priority task: review Q3 report" or "What should I focus on?"'
          className="flex-1 bg-[#0D0D0D] border border-yellow-900 text-white placeholder-gray-600 px-4 py-2 rounded text-sm focus:outline-none focus:border-yellow-600"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 text-black text-xs font-bold rounded uppercase tracking-widest"
        >
          {loading ? '···' : 'Execute'}
        </button>
      </form>
      {response && (
        <p className="mt-3 text-sm text-gray-300 border-l-2 border-yellow-700 pl-3 leading-relaxed">
          {response}
        </p>
      )}
    </div>
  );
}
