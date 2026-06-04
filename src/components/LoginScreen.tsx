import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center font-sans">
      <div className="p-8 bg-[#141414] border border-yellow-600 rounded-lg shadow-2xl text-center">
        <h1 className="text-4xl font-bold text-yellow-500 mb-4">KINGDOM SYSTEMS</h1>
        <p className="text-gray-400 mb-6">Imperial OS Authentication Required</p>
        <button
          onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
          className="px-6 py-3 bg-yellow-600 text-black font-bold rounded hover:bg-yellow-500 transition-all"
        >
          ENTER EMPIRE
        </button>
      </div>
    </div>
  );
}
