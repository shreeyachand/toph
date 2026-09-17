import { getSupabaseAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

const FALLBACK = [
  { id: "s1", title: "Morning Spray Shift", kind: "shift", employee: "Isaac Wang", field: "FIELD A", starts_at: "2026-05-01T13:00:00Z", ends_at: "2026-05-01T17:30:00Z", notes: "Cover FIELD A rows 1–40." },
  { id: "s2", title: "Harvest Crew Block B", kind: "shift", employee: "Maya Patel", field: "FIELD B", starts_at: "2026-05-02T14:00:00Z", ends_at: "2026-05-02T18:30:00Z", notes: "Bring crates to barn after." },
];

/** GET /api/schedule — upcoming shifts/tasks/time-off. */
export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json({ data: FALLBACK, live: false });
  try {
    const { data, error } = await supabase
      .from("schedule_events")
      .select("id, title, kind, starts_at, ends_at, notes, employees(full_name), fields(name)")
      .order("starts_at");
    if (error) throw error;
    return Response.json({
      data: ((data ?? []) as Array<{
        id: string; title: string; kind: string; starts_at: string; ends_at: string;
        notes: string | null; employees: { full_name: string } | Array<{ full_name: string }> | null; fields: { name: string } | Array<{ name: string }> | null;
      }>).map((s) => ({
        id: s.id, title: s.title, kind: s.kind,
        employee: Array.isArray(s.employees) ? (s.employees[0]?.full_name ?? "Unassigned") : (s.employees?.full_name ?? "Unassigned"),
        field: Array.isArray(s.fields) ? (s.fields[0]?.name ?? "—") : (s.fields?.name ?? "—"),
        starts_at: s.starts_at, ends_at: s.ends_at, notes: s.notes,
      })),
      live: true,
    });
  } catch {
    return Response.json({ data: FALLBACK, live: false });
  }
}
