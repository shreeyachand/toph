"use client";

import { useState } from "react";
import type { DashboardData } from "@/lib/data";
import Icon from "./Icon";
import LogsPanel from "./LogsPanel";
import Sidebar from "./Sidebar";
import StatCard from "./StatCard";

export default function Dashboard({ data }: { data: DashboardData }) {
  const [query, setQuery] = useState("");

  return (
    <div className="flex min-h-screen gap-4 bg-white p-3 md:p-4">
      <Sidebar farm={data.farm} role={data.role} />

      <main className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <div className="mb-3 flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#146c44] text-[14px] font-semibold text-white">
            {data.farm.charAt(0)}
          </div>
          <p className="text-[14px] font-semibold">{data.farm}</p>
        </div>

        {/* Header */}
        <div className="flex flex-wrap items-start gap-3">
          <div>
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
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
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
        </div>

        {/* Logs */}
        <div className="mt-4">
          <LogsPanel logs={data.logs} searchQuery={query} />
        </div>
      </main>
    </div>
  );
}
