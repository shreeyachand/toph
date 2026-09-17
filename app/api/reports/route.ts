import { getSupabaseAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

const FALLBACK = [
  { id: "r1", title: "Weekly Activity Summary Apr 19–26", type: "weekly", created_at: "2026-04-28T12:00:00Z", generated_by: "Isaac Wang" },
  { id: "r2", title: "Spray Compliance Export", type: "compliance", created_at: "2026-04-27T12:00:00Z", generated_by: "Maya Patel" },
];

/** GET /api/reports — saved reports. POST creates a mock entry. */
export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json({ data: FALLBACK, live: false });
  try {
    const { data, error } = await supabase
      .from("reports")
      .select("id, title, type, created_at, employees(full_name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json({
      data: ((data ?? []) as Array<{
        id: string; title: string; type: string; created_at: string;
        employees: { full_name: string } | Array<{ full_name: string }> | null;
      }>).map((r) => ({ ...r, generated_by: Array.isArray(r.employees) ? (r.employees[0]?.full_name ?? "—") : (r.employees?.full_name ?? "—") })),
      live: true,
    });
  } catch {
    return Response.json({ data: FALLBACK, live: false });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return Response.json({
      data: { id: `r-${Date.now()}`, title: body.title ?? "Untitled report", type: body.type ?? "custom", created_at: new Date().toISOString(), generated_by: "Admin" },
      live: false,
    });
  }
  try {
    const { data, error } = await supabase
      .from("reports")
      .insert({ title: body.title ?? "Untitled report", type: body.type ?? "custom", filters: body.filters ?? {} })
      .select("id, title, type, created_at")
      .single();
    if (error) throw error;
    return Response.json({ data: { ...data, generated_by: "Admin" }, live: true });
  } catch {
    return Response.json({ data: FALLBACK[0], live: false }, { status: 500 });
  }
}
