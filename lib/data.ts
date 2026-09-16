import { mockLogs, mockStats, mockUser } from "./mock-data";
import { getSupabaseClient } from "./supabase";
import type { DashboardStats, EmployeeLog } from "./types";

export interface DashboardData {
  stats: DashboardStats;
  logs: EmployeeLog[];
  farm: string;
  role: string;
  live: boolean; // true once Supabase returns rows
}

interface VoiceLogRow {
  id: string;
  log_date: string;
  started_at: string | null;
  ended_at: string | null;
  summary: string | null;
  status: "new" | "reviewed" | "flagged";
  audio_path: string | null;
  accuracy_score: number | null;
  employees: { full_name: string } | null;
  activity_types: { name: string } | null;
  fields: { name: string } | null;
}

function formatTime(date: string): string {
  const d = new Date(date);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatRange(start: string | null, end: string | null): string {
  if (!start) return "—";
  return end ? `${formatTime(start)} - ${formatTime(end)}` : formatTime(start);
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function mockFallback(): DashboardData {
  return {
    stats: mockStats,
    logs: mockLogs,
    farm: mockUser.farm,
    role: mockUser.role,
    live: false,
  };
}

/**
 * Single data-access entry point for the dashboard.
 * Reads `voice_logs` (with employee/activity/field joins), the active-worker
 * count, and the farm name. Falls back to mock data when Supabase is
 * unconfigured or errors. Stats are computed over the most recent log day
 * ("today" for the crew using the app daily).
 */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = getSupabaseClient();
  if (!supabase) return mockFallback();

  try {
    const [logsRes, workersRes, farmRes] = await Promise.all([
      supabase
        .from("voice_logs")
        .select(
          "id, log_date, started_at, ended_at, summary, status, audio_path, accuracy_score, employees(full_name), activity_types(name), fields(name)"
        )
        .order("log_date", { ascending: false })
        .overrideTypes<VoiceLogRow[]>(),
      supabase
        .from("employees")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("farm_settings")
        .select("value")
        .eq("key", "farm_name")
        .single(),
    ]);
    if (logsRes.error) throw logsRes.error;

    const rows = logsRes.data ?? [];
    if (!rows.length) return mockFallback();

    const logs: EmployeeLog[] = rows.map((r) => ({
      id: r.id,
      employee: r.employees?.full_name ?? "Unknown",
      activity: r.activity_types?.name ?? "—",
      date: formatDate(r.log_date),
      isoDate: r.log_date,
      field: r.fields?.name ?? "—",
      time: formatRange(r.started_at, r.ended_at),
      summary: r.summary ?? undefined,
      isNew: r.status === "new",
      status: r.status,
      audioPath: r.audio_path ?? undefined,
    }));

    const latestDay = logs[0].isoDate;
    const todays = logs.filter((l) => l.isoDate === latestDay);
    const scored = rows.filter(
      (r): r is VoiceLogRow & { accuracy_score: number } =>
        r.accuracy_score !== null
    );

    const stats: DashboardStats = {
      todaysRecordings: todays.length,
      todaysNew: todays.filter((l) => l.isNew).length,
      activeWorkers: workersRes.count ?? mockStats.activeWorkers,
      responseAccuracy: scored.length
        ? Math.round(
            scored.reduce((sum, r) => sum + r.accuracy_score, 0) / scored.length
          )
        : 0,
    };

    const farm =
      typeof farmRes.data?.value === "string"
        ? (farmRes.data.value as string)
        : mockUser.farm;

    return { stats, logs, farm, role: mockUser.role, live: true };
  } catch {
    return mockFallback();
  }
}
