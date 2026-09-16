import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase browser client. Returns null when env vars are missing so the
 * dashboard can run on mock data until Postgres is connected.
 *
 * SQL sketch for later:
 *   create table employee_logs (
 *     id uuid primary key default gen_random_uuid(),
 *     employee text not null,
 *     activity text not null,
 *     log_date date not null,
 *     field text not null,
 *     time_range text not null,
 *     summary text,
 *     audio_url text,
 *     created_at timestamptz default now()
 *   );
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseClient() {
  if (!url || !anonKey) return null;
  return createBrowserClient(url, anonKey);
}

export function isSupabaseConfigured() {
  return Boolean(url && anonKey);
}
