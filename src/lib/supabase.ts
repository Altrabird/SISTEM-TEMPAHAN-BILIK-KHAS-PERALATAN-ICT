import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

if (url && anonKey) {
  try {
    client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } catch (err) {
    console.warn('[Supabase] Failed to initialise client:', err);
    client = null;
  }
}

export const supabase = client;
export const isSupabaseEnabled = client !== null;
