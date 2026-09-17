"use client";

import { useEffect, useState } from "react";
import Dashboard from "@/components/Dashboard";
import TabShell from "@/components/TabShell";
import type { TabKey } from "@/components/Sidebar";
import ActivityLogsTab from "@/components/tabs/ActivityLogsTab";
import AuditTab from "@/components/tabs/AuditTab";
import EmployeesTab from "@/components/tabs/EmployeesTab";
import MapTab from "@/components/tabs/MapTab";
import MessagesTab from "@/components/tabs/MessagesTab";
import PerformanceTab from "@/components/tabs/PerformanceTab";
import ReportsTab from "@/components/tabs/ReportsTab";
import ScheduleTab from "@/components/tabs/ScheduleTab";
import SettingsTab from "@/components/tabs/SettingsTab";
import SupportTab from "@/components/tabs/SupportTab";
import { fetchMeta, getDashboardData, type DashboardData, type MetaResponse } from "@/lib/data";

export default function Page() {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [scheduleSeed, setScheduleSeed] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardData().then(setData).catch((e) => setError(e.message));
    fetchMeta().then(setMeta).catch(() => {});
  }, []);

  const go = (t: TabKey) => {
    // Sidebar navigation always opens an unfiltered schedule.
    if (t === "schedule") setScheduleSeed(null);
    setTab(t);
  };

  const viewSchedule = (name: string) => {
    setScheduleSeed(name);
    setTab("schedule");
  };

  if (error) return <p className="p-6 text-[14px] text-red-600">{error}</p>;
  if (!data) return <p className="p-6 text-[14px] text-[#808080]">Loading dashboard…</p>;

  if (tab === "dashboard") {
    return <Dashboard data={data} active={tab} onNavigate={go} />;
  }

  const farm = meta?.farm ?? data.farm;
  const role = meta?.role ?? data.role;

  return (
    <TabShell farm={farm} role={role} active={tab} onNavigate={go}>
      {tab === "activity" && <ActivityLogsTab />}
      {tab === "map" && <MapTab />}
      {tab === "audit" && <AuditTab />}
      {tab === "reports" && <ReportsTab />}
      {tab === "schedule" && <ScheduleTab key={scheduleSeed ?? "all"} initialPerson={scheduleSeed} />}
      {tab === "employees" && <EmployeesTab onViewSchedule={viewSchedule} />}
      {tab === "performance" && <PerformanceTab />}
      {tab === "messages" && <MessagesTab />}
      {tab === "settings" && <SettingsTab />}
      {tab === "support" && <SupportTab />}
    </TabShell>
  );
}
