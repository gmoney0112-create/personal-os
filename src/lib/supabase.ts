import { createClient } from '@supabase/supabase-js';

// L-1: Assert required env vars at module load time so the app fails with a
// clear message rather than producing cryptic "Cannot read property of undefined"
// errors at runtime when Supabase calls are made.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
