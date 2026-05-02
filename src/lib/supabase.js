import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export { supabaseKey, supabaseUrl };

export const supabaseEnvMissing = !supabaseUrl || !supabaseKey;

if (supabaseEnvMissing) {
  console.error('Supabase environment variables are missing or empty.', {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseKey ? '[set]' : supabaseKey,
  });
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
