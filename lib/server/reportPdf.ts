import type { SupabaseClient } from "@supabase/supabase-js";
import { mockLogs, mockUser } from "@/lib/mock-data";
import { startOfWeekUTC } from "@/lib/reports";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ReportRecord {
  id: string;
  title: string;
  type: string;
  filters: Record<string, unknown>;
  created_at: string;
  generatedBy: string;
}

export interface ReportPeriod {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  label: string; // e.g. "Apr 19 – Apr 26, 2026" / "April 2026"
}

export interface BreakdownRow {
  name: string;
  count: number;
  hours: number | null;
}

export interface ReportData {
  report: ReportRecord;
  period: ReportPeriod;
  farm: string;
  totalLogs: number;
  workers: number;
  fieldsWorked: number;
  activitiesUsed: number;
  avgAccuracy: number | null;
  totalHours: number | null;
  reviewedShare: number | null; // 0–100
  byActivity: BreakdownRow[];
  byField: BreakdownRow[];
  byWorker: BreakdownRow[];
  daily: { day: string; count: number }[];
}

/* ------------------------------------------------------------------ */
/* Period resolution (deterministic from the report's stored filters)  */
/* ------------------------------------------------------------------ */

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmtDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${d}`;
}

function fmtDayYear(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${d}, ${y}`;
}

function lastDayOfMonth(year: number, month1: number): string {
  const last = new Date(Date.UTC(year, month1, 0)).getUTCDate();
  return `${year}-${String(month1).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

export function resolvePeriod(report: ReportRecord): ReportPeriod {
  const f = report.filters ?? {};
  if (typeof f.from === "string" && typeof f.to === "string") {
    const sameYear = f.from.slice(0, 4) === f.to.slice(0, 4);
    return {
      from: f.from,
      to: f.to,
      label: sameYear ? `${fmtDay(f.from)} – ${fmtDayYear(f.to)}` : `${fmtDayYear(f.from)} – ${fmtDayYear(f.to)}`,
    };
  }
  if (typeof f.month === "string" && /^\d{4}-\d{2}$/.test(f.month)) {
    const [y, m] = f.month.split("-").map(Number);
    return {
      from: `${f.month}-01`,
      to: lastDayOfMonth(y, m),
      label: `${MONTHS_LONG[m - 1]} ${y}`,
    };
  }
  // Fallback for reports saved before filters existed: infer from created_at.
  const created = new Date(report.created_at);
  if (report.type === "month") {
    const y = created.getUTCFullYear();
    const m = created.getUTCMonth() + 1;
    const mm = String(m).padStart(2, "0");
    return { from: `${y}-${mm}-01`, to: lastDayOfMonth(y, m), label: `${MONTHS_LONG[m - 1]} ${y}` };
  }
  const start = startOfWeekUTC(created);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const from = start.toISOString().slice(0, 10);
  const to = end.toISOString().slice(0, 10);
  return { from, to, label: `${fmtDay(from)} – ${fmtDayYear(to)}` };
}

/* ------------------------------------------------------------------ */
/* Data gathering                                                      */
/* ------------------------------------------------------------------ */

interface RawLog {
  log_date: string;
  employee: string;
  activity: string;
  field: string;
  hours: number | null;
  accuracy: number | null;
  status: string;
}

export async function gatherReportData(
  client: SupabaseClient | null,
  report: ReportRecord
): Promise<ReportData> {
  const period = resolvePeriod(report);

  if (!client) return buildFromRaw(report, period, mockUser.farm, mockRaw(period));

  const [farmRes, logsRes] = await Promise.all([
    client.from("farm_settings").select("value").eq("key", "farm_name").single(),
    client
      .from("voice_logs")
      .select("log_date, started_at, ended_at, accuracy_score, status, employees(full_name), activity_types(name), fields(name)")
      .gte("log_date", period.from)
      .lte("log_date", period.to)
      .order("log_date"),
  ]);
  if (logsRes.error) throw logsRes.error;

  const farm =
    typeof farmRes.data?.value === "string" ? (farmRes.data.value as string) : mockUser.farm;

  const raw: RawLog[] = ((logsRes.data ?? []) as Array<Record<string, unknown>>).map((r) => {
    const emp = r.employees as { full_name?: string } | null;
    const act = r.activity_types as { name?: string } | null;
    const fld = r.fields as { name?: string } | null;
    const start = r.started_at as string | null;
    const end = r.ended_at as string | null;
    let hours: number | null = null;
    if (start && end) {
      const ms = new Date(end).getTime() - new Date(start).getTime();
      if (Number.isFinite(ms) && ms >= 0) hours = ms / 3_600_000;
    }
    const acc = r.accuracy_score == null ? null : Number(r.accuracy_score);
    return {
      log_date: String(r.log_date),
      employee: emp?.full_name ?? "Unknown",
      activity: act?.name ?? "—",
      field: fld?.name ?? "—",
      hours,
      accuracy: acc != null && Number.isFinite(acc) ? acc : null,
      status: String(r.status ?? ""),
    };
  });

  return buildFromRaw(report, period, farm, raw);
}

function mockRaw(period: ReportPeriod): RawLog[] {
  return mockLogs
    .filter((l) => l.isoDate >= period.from && l.isoDate <= period.to)
    .map((l) => ({
      log_date: l.isoDate,
      employee: l.employee,
      activity: l.activity,
      field: l.field,
      hours: null,
      accuracy: null,
      status: l.isNew ? "new" : "reviewed",
    }));
}

function buildFromRaw(
  report: ReportRecord,
  period: ReportPeriod,
  farm: string,
  raw: RawLog[]
): ReportData {
  const accs = raw.map((r) => r.accuracy).filter((n): n is number => n != null);
  const hourVals = raw.map((r) => r.hours).filter((n): n is number => n != null);
  const reviewed = raw.filter((r) => r.status === "reviewed").length;

  const tally = (key: (r: RawLog) => string): BreakdownRow[] => {
    const map = new Map<string, { count: number; hours: number; hasHours: boolean }>();
    for (const r of raw) {
      const k = key(r);
      const e = map.get(k) ?? { count: 0, hours: 0, hasHours: false };
      e.count += 1;
      if (r.hours != null) {
        e.hours += r.hours;
        e.hasHours = true;
      }
      map.set(k, e);
    }
    return [...map.entries()]
      .map(([name, e]) => ({
        name,
        count: e.count,
        hours: e.hasHours ? Math.round(e.hours * 10) / 10 : null,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  };

  const dayCounts = new Map<string, number>();
  for (let d = period.from; d <= period.to; d = nextDay(d)) dayCounts.set(d, 0);
  for (const r of raw) dayCounts.set(r.log_date, (dayCounts.get(r.log_date) ?? 0) + 1);

  return {
    report,
    period,
    farm,
    totalLogs: raw.length,
    workers: new Set(raw.map((r) => r.employee)).size,
    fieldsWorked: new Set(raw.map((r) => r.field)).size,
    activitiesUsed: new Set(raw.map((r) => r.activity)).size,
    avgAccuracy: accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : null,
    totalHours: hourVals.length ? Math.round(hourVals.reduce((a, b) => a + b, 0) * 10) / 10 : null,
    reviewedShare: raw.length ? Math.round((reviewed / raw.length) * 100) : null,
    byActivity: tally((r) => r.activity),
    byField: tally((r) => r.field),
    byWorker: tally((r) => r.employee),
    daily: [...dayCounts.entries()].map(([day, count]) => ({ day, count })),
  };
}

function nextDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "report";
}

export function reportFilename(title: string): string {
  return `${slug(title)}.pdf`;
}
