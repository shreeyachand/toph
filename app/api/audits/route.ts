import { getSupabaseAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

const FALLBACK = [
  { id: "a1", title: "Spring Spray Compliance Review", due_date: "2026-05-15", status: "in_progress", assignee: "Isaac Wang", notes: "Verify spray logs and chemical handling records.", findings: 1 },
  { id: "a2", title: "Harvest Record Accuracy Audit", due_date: "2026-05-20", status: "open", assignee: "Maya Patel", notes: "Cross-check harvest voice logs against yield reports.", findings: 1 },
  { id: "a3", title: "Irrigation Water-Use Audit", due_date: "2026-04-30", status: "passed", assignee: "Sophia Lee", notes: "All irrigation entries matched meter readings.", findings: 0 },
];

/** GET /api/audits — audits with assignee name + finding count. */
export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json({ data: FALLBACK, live: false });
  try {
    const { data, error } = await supabase
      .from("audits")
      .select("id, title, due_date, status, notes, employees(full_name), audit_findings(id)")
      .order("due_date");
    if (error) throw error;
    return Response.json({
      data: ((data ?? []) as Array<{
        id: string; title: string; due_date: string | null; status: string;
        notes: string | null; employees: { full_name: string } | Array<{ full_name: string }> | null;
        audit_findings: Array<{ id: string }>;
      }>).map((a) => ({
        id: a.id,
        title: a.title,
        due_date: a.due_date,
        status: a.status,
        assignee: Array.isArray(a.employees) ? (a.employees[0]?.full_name ?? "Unassigned") : (a.employees?.full_name ?? "Unassigned"),
        notes: a.notes,
        findings: a.audit_findings.length,
      })),
      live: true,
    });
  } catch {
    return Response.json({ data: FALLBACK, live: false });
  }
}
