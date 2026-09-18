import type { EmployeeLog, LogTag } from "@/lib/types";

/** Storage bucket for captured audio. Created on first upload (service role)
 *  or ahead of time in the Supabase dashboard. Not a table — no migration. */
export const VOICE_BUCKET = "voice-logs";

/** Raw `voice_logs` row with joined names, as returned by Supabase. */
export interface VoiceLogRow {
  id: string;
  employee_id: string | null;
  activity_type_id: number | null;
  field_id: string | null;
  log_date: string;
  started_at: string | null;
  ended_at: string | null;
  audio_path: string | null;
  duration_sec: number | null;
  transcript: string | null;
  summary: string | null;
  accuracy_score: number | null;
  status: "new" | "reviewed" | "flagged";
  gps_lat: number | null;
  gps_lng: number | null;
  employees: { full_name: string } | null;
  activity_types: { name: string } | null;
  fields: { name: string } | null;
  /** Present on read paths that use VOICE_LOG_SELECT_TAGS. */
  log_tags?: Array<{
    tags: LogTag | LogTag[] | null;
  } | null> | null;
}

export const VOICE_LOG_SELECT =
  "id, employee_id, activity_type_id, field_id, log_date, started_at, ended_at, audio_path, duration_sec, transcript, summary, accuracy_score, status, gps_lat, gps_lng, employees(full_name), activity_types(name), fields(name)";

/**
 * Read shape (lists + detail): the row plus its attached tags, so feeds can
 * render chips and power the tag filter. Insert paths keep VOICE_LOG_SELECT —
 * embedding in an insert-returning selection is provider-sensitive.
 */
export const VOICE_LOG_SELECT_TAGS = `${VOICE_LOG_SELECT}, log_tags(tags(id, name, color))`;

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

/** Map a DB row to the list-item shape the LogsPanel renders. */
export function toEmployeeLog(r: VoiceLogRow): EmployeeLog {
  // log_tags rows come back as { tags: {...} | {...}[] } — normalize.
  const tags = (r.log_tags ?? []).flatMap((lt) =>
    Array.isArray(lt?.tags) ? lt.tags : lt?.tags ? [lt.tags] : []
  );
  return {
    id: r.id,
    employee: r.employees?.full_name ?? "Unknown",
    activity: r.activity_types?.name ?? "—",
    date: formatDate(r.log_date),
    isoDate: r.log_date,
    field: r.fields?.name ?? "—",
    time: formatRange(r.started_at, r.ended_at),
    summary: r.summary ?? undefined,
    transcript: r.transcript ?? undefined,
    isNew: r.status === "new",
    status: r.status,
    audioPath: r.audio_path ?? undefined,
    tags: tags.length > 0 ? tags : undefined,
  };
}
