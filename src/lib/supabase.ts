import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './config';

let client: SupabaseClient | null = null;

/** The shared Supabase client. Only imported by the live (signed-in) areas, so the demo never loads it. */
export function getSupabase(): SupabaseClient {
  if (!supabaseConfig.url || !supabaseConfig.anonKey) throw new Error('The online database is not configured.');
  client ??= createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
