import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase env vars not found. Supabase sync will be disabled.');
}

export const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_ANON_KEY ?? '');
