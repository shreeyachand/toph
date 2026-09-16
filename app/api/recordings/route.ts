import { mockLogs } from "@/lib/mock-data";
import type { EmployeeLog } from "@/lib/types";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import {
  VOICE_LOG_SELECT,
  toEmployeeLog,
  type VoiceLogRow,
} from "@/lib/server/recordings";

export const dynamic = "force-dynamic";

type Status = "new" | "reviewed" | "flagged";
type Sort = "newest" | "oldest";

/**
 * GET /api/recordings — the "new recordings" feed behind New Employee Logs.
 *
 * Query params (all optional):
 *   status    new | reviewed | flagged  (repeatable or comma-separated)
 *   activity  activity name (repeatable or comma-separated)
 *   field     field name (repeatable or comma-separated)
 *   search    free text matched against employee/activity/field/summary
 *   from/to   ISO dates (YYYY-MM-DD) bounding log_date
 *   sort      newest (default) | oldest
 *   limit     default 50, max 200
 *   offset    default 0
 *
 * Status/date/sort/limit run in SQL; activity/field/search filter in memory
 * (PostgREST can't filter on the joined display names without inner joins
 * that would drop rows with null FKs — fine at this scale, revisit with a
 * view/RPC when the table grows).
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const statuses = splitParam(q, "status").filter(isStatus);
  const activities = new Set(splitParam(q, "activity").map((s) => s.toLowerCase()));
  const fields = new Set(splitParam(q, "field").map((s) => s.toLowerCase()));
  const search = (q.get("search") ?? "").trim().toLowerCase();
  const from = q.get("from");
  const to = q.get("to");
  const sort: Sort = q.get("sort") === "oldest" ? "oldest" : "newest";
  const limit = Math.min(Math.max(Number(q.get("limit")) || 50, 1), 200);
  const offset = Math.max(Number(q.get("offset")) || 0, 0);

  const matches = (l: EmployeeLog) =>
    (activities.size === 0 || activities.has(l.activity.toLowerCase())) &&
    (fields.size === 0 || fields.has(l.field.toLowerCase())) &&
    (!search ||
      [l.employee, l.activity, l.field, l.date, l.summary ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(search));

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return Response.json(paginate(mockLogs.filter(matches), limit, offset, false));
  }

  try {
    // Pull a bounded window in SQL, then apply name/search filters in memory.
    // NOTE: overrideTypes() must stay last — it drops the filter methods
    // from the builder's type.
    let query = supabase.from("voice_logs").select(VOICE_LOG_SELECT);
    if (statuses.length > 0) query = query.in("status", statuses);
    if (from) query = query.gte("log_date", from);
    if (to) query = query.lte("log_date", to);
    query = query
      .order("log_date", { ascending: sort === "oldest" })
      .range(0, 499);

    const { data, error } = await query.overrideTypes<VoiceLogRow[]>();
    if (error) throw error;

    const logs = (data ?? []).map(toEmployeeLog).filter(matches);
    return Response.json(paginate(logs, limit, offset, true));
  } catch {
    return Response.json(paginate(mockLogs.filter(matches), limit, offset, false));
  }
}

function splitParam(q: URLSearchParams, key: string): string[] {
  return q
    .getAll(key)
    .flatMap((v) => v.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

function isStatus(s: string): s is Status {
  return s === "new" || s === "reviewed" || s === "flagged";
}

function paginate(logs: EmployeeLog[], limit: number, offset: number, live: boolean) {
  return {
    data: logs.slice(offset, offset + limit),
    total: logs.length,
    limit,
    offset,
    live,
  };
}
