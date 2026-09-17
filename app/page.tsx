"use client";

import { useEffect, useState } from "react";
import Dashboard from "@/components/Dashboard";
import { getDashboardData, type DashboardData } from "@/lib/data";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardData().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="p-6 text-[14px] text-red-600">{error}</p>;
  if (!data) return <p className="p-6 text-[14px] text-[#808080]">Loading dashboard…</p>;

  return <Dashboard data={data} active="dashboard" />;
}
