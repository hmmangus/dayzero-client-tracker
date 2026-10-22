/**
 * Connection details for the live (online) app. Both values are public by design:
 * they ship to every browser, and the database's row-level security rules decide
 * what each signed-in person can see. The secret service-role key is never used here.
 */
export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
};

/** False until the online database is connected; the live areas show a setup notice instead. */
export const isLiveConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);
