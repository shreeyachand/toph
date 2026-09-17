"use client";

import { useState } from "react";
import type { DashboardData } from "@/lib/data";
import Icon from "./Icon";
import LogsPanel from "./LogsPanel";
import Sidebar, { MobileNav, type TabKey } from "./Sidebar";
import StatCard, { StatGrid } from "./StatCard";

export default function Dashboard({
  data,
  active = "dashboard",
  onNavigate = () => {},
}: {
  data: DashboardData;
  active?: TabKey;
  onNavigate?: (tab: TabKey) => void;
}) {
  const [query, setQuery] = useState("");

  return (
    <div className="flex min-h-screen gap-4 bg-white p-3 md:p-4">
      <Sidebar farm={data.farm} role={data.role} active={active} onNavigate={onNavigate} />

      <main className="min-w-0 flex-1">
        {/* Header — sticky on mobile */}
        <div className="sticky top-0 z-30 -mx-3 flex flex-wrap items-start gap-3 border-b border-[#f0f0f0] bg-white px-3 pb-3 pt-3 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
          <div className="flex min-w-0 items-start gap-2.5">
            <MobileNav
              farm={data.farm}
              role={data.role}
              active={active}
              onNavigate={onNavigate}
              className="mt-[1px]"
            />
            <div className="min-w-0">
              <h1 className="text-[20px] font-semibold tracking-tight text-black">
                Dashboard
              </h1>
              <p className="text-[14px] text-[#4d4d4d]">
                An overview of your farm and employee activity
                {!data.live && (
                  <span className="ml-2 rounded-full bg-[#f2f2f2] px-2 py-0.5 text-[11px] text-[#808080]">
                    mock data — connect Supabase to go live
                  </span>
                )}
              </p>
            </div>
          </div>
          <label className="ml-auto flex w-full max-w-[370px] items-center gap-2 rounded-full border border-[#e7e7e7] bg-white px-3.5 py-2 text-[14px] text-[#b3b3b3] focus-within:border-[#b3b3b3]">
            <Icon name="search" size={15} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-black outline-none placeholder:text-[#c9c9c9]"
            />
          </label>
        </div>

        {/* Stat cards */}
        <StatGrid cols={3}>
          <StatCard
            icon="calendar"
            label="Todays Recordings"
            value={data.stats.todaysRecordings}
            suffix={`${data.stats.todaysNew} New`}
          />
          <StatCard
            icon="clipboard-pen"
            label="Active Workers"
            value={data.stats.activeWorkers}
          />
          <StatCard
            icon="percent"
            label="Response Accuracy"
            value={data.stats.responseAccuracy}
          />
        </StatGrid>

        {/* Logs — new recordings only; the Activity Logs tab shows the full history */}
        <div className="mt-4">
          <LogsPanel
            logs={data.logs}
            searchQuery={query}
            title="New Employee Logs"
            statusFilter="new"
          />
        </div>
      </main>
    </div>
  );
}
