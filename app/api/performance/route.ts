import { getSupabaseAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

const FALLBACK = [
  { id: "p1", employee: "Sophia Lee", period: "Apr 2026", score: 95, notes: "Top accuracy, clear irrigation entries." },
  { id: "p2", employee: "Isaac Wang", period: "Apr 2026", score: 92, notes: "Consistent, detailed spray logs." },
];

/** GET /api/performance — review scores per employee. */
export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json({ data: FALLBACK, live: false });
  try {
    const { data, error } = await supabase
      .from("performance_reviews")
      .select("id, period_start, period_end, score, notes, employees(full_name)")
      .order("score", { ascending: false });
    if (error) throw error;
    const { data: logs } = await supabase.from("voice_logs").select("accuracy_score, employee_id");
    const acc = new Map<string, { sum: number; n: number }>();
    for (const l of (logs ?? []) as Array<{ accuracy_score: number | string | null; employee_id: string | null }>) {
      if (l.employee_id == null || l.accuracy_score == null) continue;
      const e = acc.get(l.employee_id) ?? { sum: 0, n: 0 };
      e.sum += Number(l.accuracy_score); e.n += 1;
      acc.set(l.employee_id, e);
    }
    void acc;
    return Response.json({
      data: ((data ?? []) as Array<{
        id: string; period_start: string; period_end: string; score: number | string | null;
        notes: string | null; employees: { full_name: string } | Array<{ full_name: string }> | null;
      }>).map((p) => ({
        id: p.id,
        employee: Array.isArray(p.employees) ? (p.employees[0]?.full_name ?? "Unknown") : (p.employees?.full_name ?? "Unknown"),
        period: `${p.period_start} → ${p.period_end}`,
        score: p.score == null ? 0 : Number(p.score),
        notes: p.notes,
      })),
      live: true,
    });
  } catch {
    return Response.json({ data: FALLBACK, live: false });
  }
}
