import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client for Node API routes.
 * Returns null when env vars are missing so routes can fall back to mock data.
 * Never import this from client components — only `app/api/*` routes.
 */
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
