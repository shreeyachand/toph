/** Shared domain types. Mirror these as Postgres tables when wiring Supabase. */

export interface EmployeeLog {
  id: string;
  employee: string;
  activity: string;
  date: string; // display string, e.g. "April 19, 2026"
  isoDate: string; // sortable ISO date, e.g. "2026-04-19"
  field: string;
  time: string; // display range, e.g. "6:00 AM - 10:40 AM"
  summary?: string;
  isNew?: boolean;
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
