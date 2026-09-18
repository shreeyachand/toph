import { mockLogs, mockStats, mockUser } from "@/lib/mock-data";
import type { DashboardStats, EmployeeLog } from "@/lib/types";
import { getSupabaseAdmin } from "./supabase";
import {
  VOICE_LOG_SELECT_TAGS,
  toEmployeeLog,
  type VoiceLogRow,
} from "./recordings";

/**
 * Server-only data queries. Single source of truth for the API routes
 * and the async server pages.
 *
 * Never import this from a client component - it touches the
 * service-role Supabase client. Pages call these directly so the HTML
 * streams with data instead of shipping a "Loading..." shell + a second
 * client-side fetch.
 */

export interface MetaData {
  farm: string;
  role: string;
  activities: string[];
  fields: string[];
  tags: Array<{ id: number; name: string; color: string | null }>;
  live: boolean;
}

export interface StatsData extends DashboardStats {
  today: string | null;
  live: boolean;
}

export interface RecordingsData {
  data: EmployeeLog[];
  total: number;
  limit: number;
  offset: number;
  live: boolean;
}

export interface DashboardData {
  stats: DashboardStats;
  logs: EmployeeLog[];
  farm: string;
  role: string;
  live: boolean;
  /** Full activity/field catalogs (from meta) — feeds the recorder dropdowns,
   *  which must offer every option, not just what's in the new-logs feed. */
  activities: string[];
  fields: string[];
  /** Total # new recordings (uncapped) — the admin sidebar Dashboard badge. */
  newCount: number;
}

/** GET /api/meta core — farm/role + filter options for the shell. */
export async function getMeta(): Promise<MetaData> {
  const fallback: MetaData = {
    farm: mockUser.farm,
    role: mockUser.role,
    activities: Array.from(new Set(mockLogs.map((l) => l.activity))).sort(),
    fields: Array.from(new Set(mockLogs.map((l) => l.field))).sort(),
    tags: [],
    live: false,
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) return fallback;

  try {
    const [farmRes, activitiesRes, fieldsRes, tagsRes] = await Promise.all([
      supabase.from("farm_settings").select("value").eq("key", "farm_name").single(),
      supabase.from("activity_types").select("name").order("name"),
      supabase.from("fields").select("name").order("name"),
      supabase.from("tags").select("id, name, color").order("name"),
    ]);
    if (activitiesRes.error) throw activitiesRes.error;
    if (fieldsRes.error) throw fieldsRes.error;

    return {
      farm:
        typeof farmRes.data?.value === "string" ? farmRes.data.value : mockUser.farm,
      role: mockUser.role,
      activities: (activitiesRes.data ?? []).map((a: { name: string }) => a.name),
      fields: (fieldsRes.data ?? []).map((f: { name: string }) => f.name),
      tags: tagsRes.error ? [] : (tagsRes.data ?? []),
      live: true,
    };
  } catch {
    return fallback;
  }
}

/** GET /api/stats core — the three stat cards. */
export async function getStats(): Promise<StatsData> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { ...mockStats, today: null, live: false };
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

    return {
      todaysRecordings: dayRes.count ?? 0,
      todaysNew: newRes.count ?? 0,
      activeWorkers: workersRes.count ?? mockStats.activeWorkers,
      responseAccuracy: accuracy ?? 0,
      today,
      live: true,
    };
  } catch {
    return { ...mockStats, today: null, live: false };
  }
}

export interface RecordingsQuery {
  statuses?: Array<"new" | "reviewed" | "flagged">;
  activities?: string[];
  fields?: string[];
  /** Tag names — a log matches if it has ANY of them (case-insensitive). */
  tags?: string[];
  search?: string;
  from?: string | null;
  to?: string | null;
  sort?: "newest" | "oldest";
  limit?: number;
  offset?: number;
}

/** GET /api/recordings core — status/date/sort/limit in SQL, names/search in memory. */
export async function getRecordings(query: RecordingsQuery = {}): Promise<RecordingsData> {
  const statuses = query.statuses ?? [];
  const activities = new Set((query.activities ?? []).map((s) => s.toLowerCase()));
  const fields = new Set((query.fields ?? []).map((s) => s.toLowerCase()));
  const tags = new Set((query.tags ?? []).map((s) => s.toLowerCase()));
  const search = (query.search ?? "").trim().toLowerCase();
  const sort = query.sort === "oldest" ? "oldest" : "newest";
  const limit = Math.min(Math.max(query.limit || 50, 1), 200);
  const offset = Math.max(query.offset || 0, 0);

  const matches = (l: EmployeeLog) =>
    (statuses.length === 0 ||
      statuses.includes(
        (l.status ?? (l.isNew ? "new" : "reviewed")) as "new" | "reviewed" | "flagged"
      )) &&
    (activities.size === 0 || activities.has(l.activity.toLowerCase())) &&
    (fields.size === 0 || fields.has(l.field.toLowerCase())) &&
    (tags.size === 0 || (l.tags ?? []).some((t) => tags.has(t.name.toLowerCase()))) &&
    (!search ||
      [l.employee, l.activity, l.field, l.date, l.summary ?? "", l.transcript ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(search));

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return paginate(mockLogs.filter(matches), limit, offset, false);
  }

  try {
    // Pull a bounded window in SQL (with each log's tags embedded), then apply
    // name/tag/search filters in memory.
    // NOTE: overrideTypes() must stay last — it drops the filter methods
    // from the builder's type.
    let builder = supabase.from("voice_logs").select(VOICE_LOG_SELECT_TAGS);
    if (statuses.length > 0) builder = builder.in("status", statuses);
    if (query.from) builder = builder.gte("log_date", query.from);
    if (query.to) builder = builder.lte("log_date", query.to);
    builder = builder.order("log_date", { ascending: sort === "oldest" }).range(0, 499);

    const { data, error } = await builder.overrideTypes<VoiceLogRow[]>();
    if (error) throw error;

    const logs = (data ?? []).map(toEmployeeLog).filter(matches);
    return paginate(logs, limit, offset, true);
  } catch {
    return paginate(mockLogs.filter(matches), limit, offset, false);
  }
}

function paginate(
  logs: EmployeeLog[],
  limit: number,
  offset: number,
  live: boolean
): RecordingsData {
  return {
    data: logs.slice(offset, offset + limit),
    total: logs.length,
    limit,
    offset,
    live,
  };
}

/**
 * Dashboard composition, run on the server: fans out to the three resource
 * queries in parallel. Replaces the client-side `getDashboardData()` fetch
 * waterfall so the page streams with content.
 *
 * The dashboard feed is all new logs (status "new", any date) — the review
 * queue. The stat cards stay today-scoped ("Todays Recordings / N New"), so
 * the two are intentionally distinct. The Activity Logs tab fetches the full
 * history (no status filter).
 */
export async function getDashboardData(): Promise<DashboardData> {
  const [recordings, stats, meta] = await Promise.all([
    getRecordings({ sort: "newest", limit: 100, statuses: ["new"] }),
    getStats(),
    getMeta(),
  ]);
  const { today: _today, ...restStats } = stats;
  void _today;
  return {
    stats: restStats,
    logs: recordings.data,
    farm: meta.farm,
    role: meta.role,
    live: recordings.live && stats.live && meta.live,
    activities: meta.activities,
    fields: meta.fields,
    newCount: recordings.total,
  };
}
