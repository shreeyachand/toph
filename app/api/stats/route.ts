import { mockStats } from "@/lib/mock-data";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats — the three stat cards. "Today" is the most recent log day
 * (the crew logs daily, so the latest day is their today).
 */
export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return Response.json({ ...mockStats, today: null, live: false });
  }

  try {
    const [latestRes, workersRes, accuracyRes] = await Promise.all([
      supabase
        .from("voice_logs")
        .select("log_date")
        .order("log_date", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase.from("v_response_accuracy_daily").select("*").limit(1),
    ]);
    if (latestRes.error) throw latestRes.error;

    const today = (latestRes.data as { log_date: string }).log_date;
    const dayRes = await supabase
      .from("voice_logs")
      .select("id", { count: "exact", head: true })
      .eq("log_date", today);
    const newRes = await supabase
      .from("voice_logs")
      .select("id", { count: "exact", head: true })
      .eq("log_date", today)
      .eq("status", "new");
    if (dayRes.error) throw dayRes.error;
    if (newRes.error) throw newRes.error;

    // Prefer the precomputed view; fall back to a live average.
    let accuracy: number | null = null;
    const viewRow = (accuracyRes.data as Array<{ avg_accuracy?: number | string }> | null)?.[0];
    if (viewRow?.avg_accuracy != null) {
      accuracy = Math.round(Number(viewRow.avg_accuracy));
    } else {
      const { data } = await supabase.from("voice_logs").select("accuracy_score");
      const scores = ((data ?? []) as Array<{ accuracy_score: number | string | null }>)
        .map((r) => (r.accuracy_score == null ? null : Number(r.accuracy_score)))
        .filter((n): n is number => n != null);
      accuracy = scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
    }

    return Response.json({
      todaysRecordings: dayRes.count ?? 0,
      todaysNew: newRes.count ?? 0,
      activeWorkers: workersRes.count ?? mockStats.activeWorkers,
      responseAccuracy: accuracy ?? 0,
      today,
      live: true,
    });
  } catch {
    return Response.json({ ...mockStats, today: null, live: false });
  }
}
