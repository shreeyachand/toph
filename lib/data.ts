import { mockLogs, mockStats, mockUser } from "./mock-data";
import { getSupabaseClient } from "./supabase";
import type { DashboardStats, EmployeeLog } from "./types";

export interface DashboardData {
  stats: DashboardStats;
  logs: EmployeeLog[];
  farm: string;
  role: string;
  live: boolean; // true once Supabase is wired
}

/**
 * Single data-access entry point for the dashboard.
 * Today: returns mock data. When Supabase env vars exist, it attempts the
 * `employee_logs` table and falls back to mocks on any error.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      stats: mockStats,
      logs: mockLogs,
      farm: mockUser.farm,
      role: mockUser.role,
      live: false,
    };
  }

  try {
    const { data, error } = await supabase
      .from("employee_logs")
      .select("*")
      .order("log_date", { ascending: false });
    if (error || !data) throw error ?? new Error("empty");
    const logs: EmployeeLog[] = (data as Record<string, string>[]).map(
      (row, i) => ({
        id: String(row.id ?? `row-${i}`),
        employee: String(row.employee ?? "Unknown"),
        activity: String(row.activity ?? "—"),
        date: String(row.log_date ?? ""),
        isoDate: String(row.log_date ?? ""),
        field: String(row.field ?? ""),
        time: String(row.time_range ?? ""),
        summary: row.summary ? String(row.summary) : undefined,
      })
    );
    return {
      stats: {
        ...mockStats,
        todaysRecordings: logs.length || mockStats.todaysRecordings,
      },
      logs: logs.length ? logs : mockLogs,
      farm: mockUser.farm,
      role: mockUser.role,
      live: true,
    };
  } catch {
    return {
      stats: mockStats,
      logs: mockLogs,
      farm: mockUser.farm,
      role: mockUser.role,
      live: false,
    };
  }
}
