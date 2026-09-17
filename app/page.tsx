"use client";

import { useEffect, useState } from "react";
import Dashboard from "@/components/Dashboard";
import EmployeeDashboard from "@/components/EmployeeDashboard";
import { getDashboardData, type DashboardData } from "@/lib/data";
import { useCurrentUser } from "@/lib/role";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const user = useCurrentUser(data ? { farm: data.farm, role: data.role } : null);

  useEffect(() => {
    getDashboardData().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="p-6 text-[14px] text-red-600">{error}</p>;
  if (!data) return <p className="p-6 text-[14px] text-[#808080]">Loading dashboard…</p>;

  if (user.isEmployee && user.employeeName) {
    return (
      <EmployeeDashboard
        data={data}
        employeeName={user.employeeName}
        active="dashboard"
      />
    );
  }

  return <Dashboard data={data} active="dashboard" />;
}
