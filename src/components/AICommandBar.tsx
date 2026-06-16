import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onTasksChanged: () => void;
}

interface AIResponse {
  response: string;
  actions: unknown[];
}

// C-1: `tasks` prop removed — the server now fetches tasks directly from
// Supabase using the authenticated user's identity, eliminating the prompt
// injection attack surface that existed when task content was supplied by
// the client and interpolated verbatim into the AI system prompt.
export default function AICommandBar({ onTasksChanged }: Props) {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  // Guard against setState calls after the component unmounts mid-request.
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      // Cancel any in-flight fetch when the component unmounts.
      abortControllerRef.current?.abort();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    // Abort any previous in-flight request before starting a new one.
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setResponse('');

    try {
      // H-4: Use getUser() instead of getSession(). getSession() returns the
      // locally-cached session without re-validating against Supabase, meaning
      // a stale or tampered token can be used silently. getUser() verifies server-side.
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Not authenticated');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No active session');

      const res = await fetch('/api/ai/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        // C-1: Only send the user's message — no task data from the client.
        body: JSON.stringify({ message: input }),
        signal: controller.signal,
      });

      const data: AIResponse = await res.json() as AIResponse;
      if (!res.ok) throw new Error((data as { message?: string }).message ?? 'Request failed');

      setResponse(data.response);
      if (data.actions?.length > 0) onTasksChanged();
    } catch (err) {
      // Silently ignore aborts triggered by unmount or a new submission.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setResponse(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      // Only update loading state if this request was not superseded/aborted.
      if (!controller.signal.aborted) {
        setLoading(false);
        setInput('');
      }
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
          onChange={(e) => setInput(e.target.value)}
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
