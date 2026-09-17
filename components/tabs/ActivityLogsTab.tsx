"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchRecordings, fetchStats, type RecordingsResponse, type StatsResponse } from "@/lib/data";
import LogsPanel from "../LogsPanel";
import { Loading, PageHeader } from "../PageHeader";
import StatCard, { StatGrid } from "../StatCard";

/** Activity Logs tab: full-width log feed with status + stat summaries. */
export default function ActivityLogsTab() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "new" | "reviewed" | "flagged">("all");
  const [rec, setRec] = useState<RecordingsResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    fetchRecordings({ sort: "newest", limit: 200, ...(status === "all" ? {} : { status: [status] }) })
      .then(setRec)
      .catch(() => {});
  }, [status]);
  useEffect(() => {
    fetchStats().then(setStats).catch(() => {});
  }, []);

  const counts = useMemo(() => {
    const logs = rec?.data ?? [];
    return {
      total: rec?.total ?? logs.length,
      new: logs.filter((l) => l.status === "new" || l.isNew).length,
      reviewed: logs.filter((l) => l.status === "reviewed").length,
      flagged: logs.filter((l) => l.status === "flagged").length,
    };
  }, [rec]);

  if (!rec) return <Loading label="activity logs" />;

  return (
    <div>
      <PageHeader
        title="Activity Logs"
        subtitle="Every voice recording across your fields, newest first"
        query={query}
        setQuery={setQuery}
        live={rec.live}
      />
      <StatGrid cols={4}>
        <StatCard icon="audio-lines" label="Total Logs" value={counts.total} />
        <StatCard icon="star" label="New" value={counts.new} suffix="Needs review" />
        <StatCard icon="book-check" label="Reviewed" value={counts.reviewed} />
        <StatCard icon="flag" label="Flagged" value={counts.flagged} />
      </StatGrid>
      <div className="mt-4 flex flex-wrap gap-2">
        {(["all", "new", "reviewed", "flagged"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] capitalize transition-colors ${
              status === s
                ? "bg-black text-white hover:bg-[#222]"
                : "border border-[#e3e3e3] bg-white text-[#4d4d4d] hover:bg-[#f8f8f8]"
            }`}
          >
            {s === "all" ? `All (${stats ? stats.todaysRecordings + "+" : counts.total})` : s}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <LogsPanel logs={rec.data} searchQuery={query} />
      </div>
    </div>
  );
}
