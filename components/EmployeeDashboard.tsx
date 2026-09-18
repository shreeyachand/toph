"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DashboardData } from "@/lib/data";
import Icon from "./Icon";
import RecordPanel from "./RecordPanel";
import Sidebar, { MobileNav, type TabKey } from "./Sidebar";
import StatCard, { StatGrid } from "./StatCard";

interface SchedEvt {
  id: string;
  title: string;
  kind: string;
  employee: string;
  field: string;
  starts_at: string;
  ends_at: string;
}

function fmtEvt(e: SchedEvt) {
  const d = new Date(e.starts_at);
  const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

/**
 * Employee dashboard: greeting, recorder, personal stats, and up-next
 * schedule. Scoped to `employeeName` throughout. The full log feed lives on
 * the Activity Logs tab and the full schedule on the Schedule tab.
 */
export default function EmployeeDashboard({
  data,
  employeeName,
  active = "dashboard",
  onNavigate = () => {},
}: {
  data: DashboardData;
  employeeName: string;
  active?: TabKey;
  onNavigate?: (tab: TabKey) => void;
}) {
  const [sessionCount, setSessionCount] = useState(0);
  const [upcoming, setUpcoming] = useState<SchedEvt[]>([]);

  const myRecordingCount =
    sessionCount + data.logs.filter((l) => l.employee === employeeName).length;

  // Recorder dropdowns use the full catalogs from meta (every activity/field),
  // not the new-logs feed — which only covers what's currently unreviewed.
  // Fall back to feed-derived options if a caller passes empty catalogs.
  const { activities, fields } = useMemo(() => {
    const fromLogs = {
      activities: Array.from(new Set(data.logs.map((l) => l.activity))).sort(),
      fields: Array.from(new Set(data.logs.map((l) => l.field))).sort(),
    };
    return {
      activities: data.activities.length > 0 ? data.activities : fromLogs.activities,
      fields: data.fields.length > 0 ? data.fields : fromLogs.fields,
    };
  }, [data]);

  useEffect(() => {
    fetch("/api/schedule", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const mine = ((j.data ?? []) as SchedEvt[])
          .filter((e) => e.employee === employeeName)
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
          .slice(0, 3);
        setUpcoming(mine);
      })
      .catch(() => {});
  }, [employeeName]);

  const firstName = employeeName.split(" ")[0];

  return (
    <div className="flex min-h-screen gap-4 bg-white p-3 md:p-4">
      <Sidebar farm={employeeName} role="Employee" active={active} onNavigate={onNavigate} />

      <main className="min-w-0 flex-1">
        {/* Header */}
        <div className="sticky top-0 z-30 -mx-3 flex flex-wrap items-start gap-3 border-b border-[#f0f0f0] bg-white px-3 pb-3 pt-3 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
          <div className="flex min-w-0 items-start gap-2.5">
            <MobileNav
              farm={employeeName}
              role="Employee"
              active={active}
              onNavigate={onNavigate}
              className="mt-[1px]"
            />
            <div className="min-w-0">
              <h1 className="text-[20px] font-semibold tracking-tight text-black">
                Hi {firstName},
              </h1>
              <p className="text-[14px] text-[#4d4d4d]">
                Record today&apos;s work and review your logs
              </p>
            </div>
          </div>
        </div>

        <StatGrid cols={3}>
          <StatCard icon="audio-lines" label="My Recordings" value={myRecordingCount} />
          <StatCard
            icon="calendar"
            label="Upcoming Shifts"
            value={upcoming.length}
            suffix={upcoming.length === 1 ? "Scheduled" : "Scheduled"}
          />
          <StatCard
            icon="percent"
            label="Response Accuracy"
            value={data.stats.responseAccuracy}
          />
        </StatGrid>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <RecordPanel
            employeeName={employeeName}
            activities={activities}
            fields={fields}
            onSave={() => setSessionCount((c) => c + 1)}
          />
          <section className="h-fit rounded-2xl border border-[#ececec] bg-white p-4 sm:p-5">
            <p className="flex items-center gap-2 text-[15px] font-medium text-black">
              <Icon name="calendar" size={16} />
              Up next
            </p>
            {upcoming.length === 0 ? (
              <p className="mt-2 text-[13px] text-[#b3b3b3]">
                Nothing scheduled — check the Schedule tab for the full week.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-[#f0f0f0]">
                {upcoming.map((e) => (
                  <li key={e.id} className="py-2.5">
                    <p className="truncate text-[14px] font-medium text-black">{e.title}</p>
                    <p className="truncate text-[12px] text-[#b3b3b3]">
                      {fmtEvt(e)} · {e.field}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/schedule"
              className="mt-3 block rounded-lg border border-[#e3e3e3] bg-white py-2 text-center text-[13px] font-medium text-black hover:bg-[#f8f8f8]"
            >
              View my schedule
            </Link>
            <Link
              href="/activity"
              className="mt-2 block rounded-lg bg-black py-2 text-center text-[13px] font-medium text-white hover:bg-[#222]"
            >
              View my activity logs
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
