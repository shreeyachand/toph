"use client";

import Dashboard from "./Dashboard";
import EmployeeDashboard from "./EmployeeDashboard";
import type { DashboardData } from "@/lib/data";
import { useCurrentUser } from "@/lib/role";
import type { TabKey } from "./Sidebar";

/**
 * Client boundary for the dashboard route. The page itself is a server
 * component that streams `data` with the HTML; this wrapper only handles
 * the localStorage-backed admin/employee switch, which can't run on the
 * server.
 */
export default function DashboardRouter({
  data,
  active = "dashboard",
  onNavigate = () => {},
}: {
  data: DashboardData;
  active?: TabKey;
  onNavigate?: (tab: TabKey) => void;
}) {
  const user = useCurrentUser({ farm: data.farm, role: data.role });

  if (user.isEmployee && user.employeeName) {
    return (
      <EmployeeDashboard
        data={data}
        employeeName={user.employeeName}
        active={active}
        onNavigate={onNavigate}
      />
    );
  }

  return <Dashboard data={data} active={active} onNavigate={onNavigate} />;
}
