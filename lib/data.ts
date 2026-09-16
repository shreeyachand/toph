import type { DashboardStats, EmployeeLog } from "./types";

/**
 * Frontend API client. Components talk to these Node endpoints — never to
 * Supabase directly:
 *
 *   GET   /api/recordings[?status&activity&field&search&from&to&sort&limit&offset]
 *   GET   /api/recordings/:id        (expanded log detail: transcript, Q&A, tags)
 *   PATCH /api/recordings/:id       { status } — review actions
 *   GET   /api/stats                (stat cards)
 *   GET   /api/meta                 (farm/role + activity/field/tag options)
 *   GET   /api/employees            (active crew list)
 */

export interface DashboardData {
  stats: DashboardStats;
  logs: EmployeeLog[];
  farm: string;
  role: string;
  live: boolean;
}

export interface RecordingsParams {
  status?: Array<"new" | "reviewed" | "flagged">;
  activity?: string[];
  field?: string[];
  search?: string;
  from?: string;
  to?: string;
  sort?: "newest" | "oldest";
  limit?: number;
  offset?: number;
}

export interface RecordingsResponse {
  data: EmployeeLog[];
  total: number;
  limit: number;
  offset: number;
  live: boolean;
}

export interface RecordingAnswer {
  id: string;
  question_key: string;
  question_text: string | null;
  answer_text: string | null;
  is_confident: boolean | null;
}

export interface RecordingTag {
  id: number;
  name: string;
  color: string | null;
}

export interface RecordingDetail extends EmployeeLog {
  transcript: string | null;
  durationSec: number | null;
  accuracyScore: number | null;
  gps: { lat: number; lng: number } | null;
  answers: RecordingAnswer[];
  tags: RecordingTag[];
}

export interface StatsResponse extends DashboardStats {
  today: string | null;
  live: boolean;
}

export interface MetaResponse {
  farm: string;
  role: string;
  activities: string[];
  fields: string[];
  tags: RecordingTag[];
  live: boolean;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

/** The "new recordings" feed behind New Employee Logs. */
export function fetchRecordings(params: RecordingsParams = {}): Promise<RecordingsResponse> {
  const q = new URLSearchParams();
  for (const [key, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    q.set(key, Array.isArray(v) ? v.join(",") : String(v));
  }
  const suffix = q.size > 0 ? `?${q}` : "";
  return get<RecordingsResponse>(`/api/recordings${suffix}`);
}

/** Expanded log view: transcript, guided Q&A answers, tags. */
export function fetchRecording(id: string): Promise<{ data: RecordingDetail; live: boolean }> {
  return get(`/api/recordings/${id}`);
}

/** Review action from the log detail view. */
export async function updateRecordingStatus(
  id: string,
  status: "new" | "reviewed" | "flagged"
): Promise<EmployeeLog> {
  const res = await fetch(`/api/recordings/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`update recording failed: ${res.status}`);
  return ((await res.json()) as { data: EmployeeLog }).data;
}

export function fetchStats(): Promise<StatsResponse> {
  return get<StatsResponse>("/api/stats");
}

export function fetchMeta(): Promise<MetaResponse> {
  return get<MetaResponse>("/api/meta");
}

/**
 * Dashboard composition: fans out to the three resource endpoints in
 * parallel. Keeps <Dashboard>/<LogsPanel> unchanged — they still receive one
 * DashboardData object, now assembled in the frontend from resources.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const [recordings, stats, meta] = await Promise.all([
    fetchRecordings({ sort: "newest", limit: 100 }),
    fetchStats(),
    fetchMeta(),
  ]);
  const { today: _today, ...restStats } = stats;
  void _today;
  return {
    stats: restStats,
    logs: recordings.data,
    farm: meta.farm,
    role: meta.role,
    live: recordings.live && stats.live && meta.live,
  };
}
