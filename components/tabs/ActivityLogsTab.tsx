"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchRecordings, type RecordingsResponse } from "@/lib/data";
import { useCurrentUser } from "@/lib/role";
import LogsPanel from "../LogsPanel";
import { Loading, PageHeader } from "../PageHeader";
import StatCard, { StatGrid } from "../StatCard";

/** Activity Logs tab: full-width log feed with status + stat summaries. */
export default function ActivityLogsTab({ initialField }: { initialField?: string | null }) {
  const searchParams = useSearchParams();
  const { isEmployee, employeeName } = useCurrentUser(null);
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState<"all" | "new" | "reviewed" | "flagged">("all");
  const [rec, setRec] = useState<RecordingsResponse | null>(null);

  // Table feed: follows the status pill (unfiltered when "all" is selected).
  useEffect(() => {
    fetchRecordings({ sort: "newest", limit: 200, ...(status === "all" ? {} : { status: [status] }) })
      .then(setRec)
      .catch(() => {});
  }, [status]);

  // Keep ?field= in the address bar in step with the panel's field filter.
  // replaceState (no router navigation) so the table state stays put —
  // reads window.location directly so it never goes stale between renders.
  const syncFieldParam = (field: string | null) => {
    const params = new URLSearchParams(window.location.search);
    if (field) params.set("field", field);
    else params.delete("field");
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/activity?${qs}` : "/activity");
  };

  // Stats feed: always the full history, independent of the status pill, so
  // the cards reflect the state of all logs.
  const [allRec, setAllRec] = useState<RecordingsResponse | null>(null);
  useEffect(() => {
    fetchRecordings({ sort: "newest", limit: 200 })
      .then(setAllRec)
      .catch(() => {});
  }, []);

  const reload = () => {
    fetchRecordings({ sort: "newest", limit: 200, ...(status === "all" ? {} : { status: [status] }) })
      .then(setRec)
      .catch(() => {});
    fetchRecordings({ sort: "newest", limit: 200 })
      .then(setAllRec)
      .catch(() => {});
  };

  const tableLogs = useMemo(() => {
    const logs = rec?.data ?? [];
    return isEmployee && employeeName
      ? logs.filter((l) => l.employee === employeeName)
      : logs;
  }, [rec, isEmployee, employeeName]);

  const counts = useMemo(() => {
    const logs = allRec?.data ?? [];
    const mine = isEmployee && employeeName
      ? logs.filter((l) => l.employee === employeeName)
      : logs;
    return {
      total: isEmployee ? mine.length : (allRec?.total ?? logs.length),
      new: mine.filter((l) => l.status === "new" || l.isNew).length,
      reviewed: mine.filter((l) => l.status === "reviewed").length,
      flagged: mine.filter((l) => l.status === "flagged").length,
    };
  }, [allRec, isEmployee, employeeName]);

  if (!rec || !allRec) return <Loading label="activity logs" />;

  return (
    <div>
      <PageHeader
        title={isEmployee ? "My Activity Logs" : "Activity Logs"}
        subtitle={
          isEmployee
            ? `Every voice recording you submitted${employeeName ? ` as ${employeeName}` : ""}, newest first`
            : "Every voice recording across your fields, newest first"
        }
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
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <LogsPanel
          logs={tableLogs}
          searchQuery={query}
          hideEmployee={isEmployee}
          title={isEmployee ? "My Activity Logs" : "All Employee Logs"}
          onStatusChanged={reload}
          initialField={initialField ?? (searchParams.get("field") ?? null)}
          onFieldChange={syncFieldParam}
        />
      </div>
    </div>
  );
}
