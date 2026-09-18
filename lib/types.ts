/** Shared domain types. Mirror these as Postgres tables when wiring Supabase. */

/** Tag attached to a log (from the shared `tags` vocabulary). */
export interface LogTag {
  id: number;
  name: string;
  color: string | null;
}

export interface EmployeeLog {
  id: string;
  employee: string;
  activity: string;
  date: string; // display string, e.g. "April 19, 2026"
  isoDate: string; // sortable ISO date, e.g. "2026-04-19"
  field: string;
  time: string; // display range, e.g. "6:00 AM - 10:40 AM"
  summary?: string;
  transcript?: string | null;
  isNew?: boolean;  /** DB-backed extras (present when loaded from Supabase). */
  status?: "new" | "reviewed" | "flagged";
  /** True when the activity was auto-classified from the audio (a changeable guess). */
  activitySuggested?: boolean;
  audioPath?: string;
  /** Tags attached to this log (read paths; feeds the tag filter). */
  tags?: LogTag[];
}

export interface DashboardStats {
  todaysRecordings: number;
  todaysNew: number;
  activeWorkers: number;
  responseAccuracy: number;
}

export interface CurrentUser {
  farm: string;
  role: string;
  avatarUrl?: string;
}
