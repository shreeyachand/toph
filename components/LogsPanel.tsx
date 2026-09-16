"use client";

import { useState } from "react";
import type { EmployeeLog } from "@/lib/types";
import FieldMap from "./FieldMap";
import Icon from "./Icon";
import Waveform from "./Waveform";

function Pill({
  dark,
  icon,
  children,
  onClick,
}: {
  dark?: boolean;
  icon?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
        dark
          ? "bg-black text-white hover:bg-[#222]"
          : "border border-[#e3e3e3] bg-white text-[#4d4d4d] hover:bg-[#f8f8f8]"
      }`}
    >
      {icon &&
        (dark ? (
          <span className="brightness-0 invert">
            <Icon name={icon} size={14} />
          </span>
        ) : (
          <Icon name={icon} size={14} />
        ))}
      {children}
    </button>
  );
}

function LogDetail({ log }: { log: EmployeeLog }) {
  const [playing, setPlaying] = useState(false);
  const [tagged, setTagged] = useState(false);

  return (
    <div className="grid gap-6 px-6 py-6 md:grid-cols-2">
      {/* Left: audio + summary */}
      <div>
        <Waveform playing={playing} progress={playing ? 0.62 : 0.42} />
        <button
          onClick={() => setPlaying((p) => !p)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#e3e3e3] bg-white py-2.5 text-[14px] font-medium text-black hover:bg-[#f8f8f8]"
        >
          <Icon name="play" size={15} />
          {playing ? "Pause Recording" : "Play Recording"}
        </button>
        <button
          onClick={() => setTagged((t) => !t)}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 text-[14px] font-medium transition-colors ${
            tagged
              ? "border-[#146c44] bg-[#146c44] text-white"
              : "border-[#dcebe2] bg-[#eef7f1] text-[#146c44] hover:bg-[#e3f1e8]"
          }`}
        >
          <Icon name="star" size={15} />
          {tagged ? "Tagged" : "Add Tag"}
        </button>
        <div className="mt-5">
          <p className="text-[15px] font-medium text-black">Summary</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[#b3b3b3]">
            &quot;
            {log.summary ??
              `Voice log for ${log.employee} — ${log.activity.toLowerCase()} in ${log.field} on ${log.date}. Transcription pending review.`}
            &quot;
          </p>
        </div>
      </div>

      {/* Right: map */}
      <div>
        <FieldMap />
        <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#e3e3e3] bg-white py-2.5 text-[14px] font-medium text-black hover:bg-[#f8f8f8]">
          <Icon name="expand" size={15} />
          Expand Map
        </button>
      </div>
    </div>
  );
}

export default function LogsPanel({
  logs,
  searchQuery,
}: {
  logs: EmployeeLog[];
  searchQuery: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(
    logs[0]?.id ?? null
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortDesc, setSortDesc] = useState(true);
  const [monthOnly, setMonthOnly] = useState(true);

  const q = searchQuery.trim().toLowerCase();
  const visible = logs
    .filter((log) =>
      q
        ? [log.employee, log.activity, log.field, log.date]
            .join(" ")
            .toLowerCase()
            .includes(q)
        : true
    )
    .filter((log) => (monthOnly ? log.date.includes("April") : true))
    .sort((a, b) =>
      sortDesc
        ? b.isoDate.localeCompare(a.isoDate)
        : a.isoDate.localeCompare(b.isoDate)
    );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === visible.length
        ? new Set()
        : new Set(visible.map((l) => l.id))
    );
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[#ececec] bg-white">
      {/* Panel header */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <p className="flex items-center gap-2 text-[15px] font-medium text-black">
          <Icon name="audio-lines" size={16} />
          New Employee Logs{" "}
          <span className="font-normal text-[#b3b3b3]">({visible.length})</span>
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Pill dark icon="x">
            Date
          </Pill>
          <Pill icon="list-filter" onClick={() => setSortDesc((s) => !s)}>
            Sort{sortDesc ? "" : " ▲"}
          </Pill>
          <Pill
            dark={monthOnly}
            icon="x"
            onClick={() => setMonthOnly((m) => !m)}
          >
            This Month{monthOnly ? ` (${visible.length})` : ""}
          </Pill>
          <Pill icon="funnel">Filter</Pill>
        </div>
      </div>

      {/* Column headers */}
      <div className="hidden grid-cols-[44px_1.2fr_1fr_1fr_0.8fr_1.2fr_92px] items-center gap-2 border-y border-[#f0f0f0] px-5 py-3 text-[12px] font-medium uppercase tracking-wide text-[#c4c4c4] md:grid">
        <button
          onClick={toggleAll}
          aria-label="Select all"
          className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-[#d4d4d4]"
        >
          {selected.size > 0 && selected.size === visible.length && (
            <span className="h-2 w-2 rounded-[2px] bg-black" />
          )}
        </button>
        <span>Employee</span>
        <span>Activity</span>
        <span>Date</span>
        <span>Field</span>
        <span>Time</span>
        <span className="text-right">
          <span className="inline-block rounded-full border border-[#e3e3e3] px-3.5 py-1.5 text-[13px] normal-case tracking-normal text-[#4d4d4d]">
            View All
          </span>
        </span>
      </div>

      {/* Rows */}
      <ul className="divide-y divide-[#f0f0f0]">
        {visible.map((log) => {
          const expanded = expandedId === log.id;
          return (
            <li
              key={log.id}
              className={expanded ? "bg-[#fafafa]" : "bg-white"}
            >
              <div className="grid grid-cols-[28px_1fr_auto] items-center gap-2 px-5 py-3.5 text-[14px] text-[#4d4d4d] md:grid-cols-[44px_1.2fr_1fr_1fr_0.8fr_1.2fr_92px]">
                <button
                  onClick={() => toggleSelect(log.id)}
                  aria-label={`Select ${log.employee}`}
                  className={`flex h-4 w-4 items-center justify-center rounded-[4px] border ${
                    selected.has(log.id)
                      ? "border-black bg-black"
                      : "border-[#d4d4d4] bg-white"
                  }`}
                >
                  {selected.has(log.id) && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5.2 4.2 7.4 8 3"
                        stroke="#fff"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                <span className="font-normal">{log.employee}</span>
                <span className="hidden md:block">{log.activity}</span>
                <span className="hidden md:block">{log.date}</span>
                <span className="hidden md:block">{log.field}</span>
                <span className="hidden md:block">{log.time}</span>
                {/* mobile sub-line */}
                <span className="col-span-1 text-[12px] text-[#b3b3b3] md:hidden">
                  {log.activity} · {log.date}
                </span>
                <span className="text-right">
                  <button
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                    className="rounded-full border border-[#e9e9e9] bg-white px-4 py-1.5 text-[13px] text-[#4d4d4d] hover:bg-[#f5f5f5]"
                  >
                    {expanded ? "Close" : "View"}
                  </button>
                </span>
              </div>
              {expanded && (
                <div className="border-t border-[#f0f0f0]">
                  <LogDetail log={log} />
                </div>
              )}
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="px-5 py-10 text-center text-[14px] text-[#b3b3b3]">
            No logs match your search.
          </li>
        )}
      </ul>
    </section>
  );
}
