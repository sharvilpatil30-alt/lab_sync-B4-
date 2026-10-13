import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

let client: SupabaseClient | null = null;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('your-supabase-project')
);

if (isSupabaseConfigured) {
  try {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.error('[Supabase] Failed to initialize Supabase client:', err);
  }
}

export const supabase = client;

export async function getSupabaseAccessToken(): Promise<string | null> {
  if (!client) {
    // Fallback to locally stored token if Supabase credentials are not configured yet
    return localStorage.getItem('smart_campus_auth_token');
  }
  try {
    const { data } = await client.auth.getSession();
    const token = data?.session?.access_token || localStorage.getItem('smart_campus_auth_token');
    return token || null;
  } catch {
    return localStorage.getItem('smart_campus_auth_token');
  }
}
