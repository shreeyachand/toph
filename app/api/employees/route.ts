import { getSupabaseAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/employees — active crew list for the Employees view and any
 * assignment dropdowns. Small table, returned in full.
 */
export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json({ data: [], total: 0, live: false });

  try {
    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name, role, phone, email, status, avatar_url, hire_date")
      .eq("status", "active")
      .order("full_name");
    if (error) throw error;
    return Response.json({ data, total: data.length, live: true });
  } catch {
    return Response.json({ data: [], total: 0, live: false });
  }
}
