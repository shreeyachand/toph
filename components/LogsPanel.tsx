"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { fetchAudioUrl } from "@/lib/data";
import type { EmployeeLog } from "@/lib/types";
import type { MapField } from "./FieldMap";
import Icon from "./Icon";
import Waveform from "./Waveform";
import {
  ColumnHeaders,
  EmptyRow,
  ExpandableRow,
  FilterSelect,
  MenuShell,
  Pill,
  RowCheckbox,
  SortMenuList,
  TableRows,
  TableSection,
  TableToolbar,
  ViewButton,
  menuCoordsFor,
  useAnchoredMenus,
  useExpandedIds,
  type MenuCoords,
} from "./DataTable";

// maplibre-gl (~750KB) ships only when a map actually renders — not with the
// initial dashboard bundle. Both the per-log mini-map and the expanded modal
// share this split chunk.
const FieldMap = dynamic(() => import("./FieldMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[340px] w-full items-center justify-center rounded-xl border border-[#ececec] bg-[#2c3a26] text-[13px] text-[#cfcfcf]">
      Loading map…
    </div>
  ),
});

// Re-export shared table primitives for tabs that still import them here.
export { Pill, MenuShell, menuCoordsFor, type MenuCoords } from "./DataTable";

type SortMode = "newest" | "oldest" | "employee-az" | "activity-az";
type DateRange = "all" | "today" | "week" | "month";
type OpenMenu = null | "sort" | "filter";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "employee-az", label: "Employee A–Z" },
  { value: "activity-az", label: "Activity A–Z" },
];

const DATE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "all", label: "All dates" },
  { value: "today", label: "Today" },
  { value: "week", label: "Past 7 days" },
  { value: "month", label: "This month" },
];

function ExpandedMapModal({
  log,
  mapField,
  onClose,
}: {
  log: EmployeeLog;
  mapField?: MapField | null;
  onClose: () => void;
}) {
  // Esc closes; lock background scroll while the frame is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${log.field} — expanded map`}
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#ececec] bg-white shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-[#f0f0f0] px-4 py-3.5 sm:px-5">
          <p className="flex min-w-0 items-center gap-2 text-[15px] font-medium text-black">
            <Icon name="map" size={16} />
            <span className="truncate">
              {log.field}
            </span>
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close expanded map"
            autoFocus
            className="ml-auto rounded-lg p-1.5 text-[#4d4d4d] hover:bg-[#f5f5f5]"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <FieldMap
            fields={mapField ? [mapField] : []}
            selectedId={mapField?.id}
            className="h-[55vh] min-h-[320px]"
          />
          <p className="mt-3 truncate text-[12px] text-[#b3b3b3]">
            {log.employee} · {log.activity} · {log.date}
          </p>
        </div>
        <div className="border-t border-[#f0f0f0] px-4 py-3.5 sm:px-5">
          <button
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#e3e3e3] bg-white py-2.5 text-[14px] font-medium text-black hover:bg-[#f8f8f8]"
          >
            <Icon name="x" size={15} />
            Close Map
          </button>
        </div>
      </div>
    </div>
  );
}

function LogDetail({ log, mapField }: { log: EmployeeLog; mapField?: MapField | null }) {
  const [playing, setPlaying] = useState(false);
  const [tagged, setTagged] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  // Signed playback URL when this log has stored audio (null = simulated).
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  // Real waveform peaks decoded from the audio (null = decorative bars).
  const [peaks, setPeaks] = useState<number[] | null>(null);
  // Playhead 0..1, driven by the audio clock when real audio is playing.
  const [playhead, setPlayhead] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setAudioUrl(null);
    if (!log.audioPath) return;
    let cancelled = false;
    fetchAudioUrl(log.audioPath).then((url) => {
      if (!cancelled) setAudioUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [log.audioPath, log.id]);

  // Decode peaks once the audio URL is known so the bars match the take.
  useEffect(() => {
    setPeaks(null);
    setPlayhead(0);
    if (!audioUrl) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(audioUrl);
        if (!res.ok) return;
        const buf = await res.arrayBuffer();
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        try {
          const decoded = await ctx.decodeAudioData(buf);
          if (cancelled) return;
          const raw = decoded.getChannelData(0);
          const N = 200;
          const block = Math.max(1, Math.floor(raw.length / N));
          const out: number[] = [];
          for (let i = 0; i < N; i++) {
            let max = 0;
            const start = i * block;
            for (let j = start; j < Math.min(start + block, raw.length); j += 10) {
              const v = Math.abs(raw[j] ?? 0);
              if (v > max) max = v;
            }
            out.push(max);
          }
          const peak = Math.max(...out, 0.01);
          setPeaks(out.map((p) => p / peak));
        } finally {
          void ctx.close().catch(() => {});
        }
      } catch {
        // Keep the decorative waveform on decode/fetch failure.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (el && audioUrl) {
      if (el.paused) void el.play().catch(() => {});
      else el.pause();
    } else {
      setPlaying((p) => !p);
    }
  };

  return (
    <>
    <div className="grid gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-2">
      {/* Left: audio + summary */}
      <div className="min-w-0">
        <div className="overflow-hidden">
          <Waveform
            playing={playing}
            progress={audioUrl ? playhead : playing ? 0.62 : 0.42}
            levels={peaks ?? undefined}
            onSeek={
              audioUrl
                ? (ratio) => {
                    const el = audioRef.current;
                    if (el && el.duration > 0) {
                      el.currentTime = ratio * el.duration;
                      setPlayhead(ratio);
                    }
                  }
                : undefined
            }
          />
        </div>
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="metadata"
            className="hidden"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false);
              setPlayhead(0);
            }}
            onLoadedMetadata={() => setPlayhead(0)}
            onTimeUpdate={(e) => {
              const el = e.currentTarget;
              setPlayhead(el.duration > 0 ? el.currentTime / el.duration : 0);
            }}
          />
        )}
        <button
          onClick={togglePlay}
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
          <p className="mt-1.5 text-[14px] leading-relaxed text-[#808080]">
            &quot;
            {log.summary ??
              `Voice log for ${log.employee} — ${log.activity.toLowerCase()} in ${log.field} on ${log.date}. Transcription pending review.`}
            &quot;
          </p>
        </div>
        {log.transcript ? (
          <div className="mt-4">
            <p className="text-[15px] font-medium text-black">Transcript</p>
            <p className="mt-1.5 text-[14px] leading-relaxed text-[#4d4d4d]">
              &quot;{log.transcript}&quot;
            </p>
          </div>
        ) : (
          log.audioPath && (
            <p className="mt-4 text-[13px] text-[#b3b3b3]">
              Transcription pending — check back after processing.
            </p>
          )
        )}
      </div>

      {/* Right: map */}
      <div className="min-w-0">
        <FieldMap fields={mapField ? [mapField] : []} selectedId={mapField?.id} />
        <button
          onClick={() => setMapOpen(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#e3e3e3] bg-white py-2.5 text-[14px] font-medium text-black hover:bg-[#f8f8f8]"
        >
          <Icon name="expand" size={15} />
          Expand Map
        </button>
      </div>
    </div>
    {mapOpen && (
      <ExpandedMapModal
        log={log}
        mapField={mapField}
        onClose={() => setMapOpen(false)}
      />
    )}
    </>
  );
}

export default function LogsPanel({
  logs,
  searchQuery,
  hideEmployee = false,
}: {
  logs: EmployeeLog[];
  searchQuery: string;
  /** Employee view: everyone listed is the viewer, so drop that column. */
  hideEmployee?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  // Field polygons for the per-log mini-map (matched by field name).
  const [fieldIndex, setFieldIndex] = useState<Record<string, MapField>>({});
  useEffect(() => {
    fetch("/api/fields", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const idx: Record<string, MapField> = {};
        for (const f of j.data ?? []) idx[f.name] = f;
        setFieldIndex(idx);
      })
      .catch(() => {});
  }, []);
  const [activity, setActivity] = useState<string>("all");
  const [field, setField] = useState<string>("all");
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const { sortAnchorRef, filterAnchorRef, menuPos, toggleMenuAnchored } =
    useAnchoredMenus(openMenu, setOpenMenu);

  // Anchor relative date filters to the newest log so mock + live data behave.
  const anchorIso = useMemo(
    () => logs.reduce((max, l) => (l.isoDate > max ? l.isoDate : max), logs[0]?.isoDate ?? ""),
    [logs]
  );
  const anchorMonth = anchorIso.slice(0, 7);

  const activities = useMemo(
    () => Array.from(new Set(logs.map((l) => l.activity))).sort(),
    [logs]
  );
  const fields = useMemo(
    () => Array.from(new Set(logs.map((l) => l.field))).sort(),
    [logs]
  );

  const q = searchQuery.trim().toLowerCase();

  const inDateRange = (iso: string) => {
    if (dateRange === "all") return true;
    if (dateRange === "month") return iso.startsWith(anchorMonth);
    if (dateRange === "today") return iso === anchorIso;
    // past 7 days inclusive of anchor
    const d = new Date(`${iso}T00:00:00`);
    const a = new Date(`${anchorIso}T00:00:00`);
    const diffDays = (a.getTime() - d.getTime()) / 86_400_000;
    return diffDays >= 0 && diffDays < 7;
  };

  const visible = logs
    .filter((log) =>
      q
        ? [log.employee, log.activity, log.field, log.date]
            .join(" ")
            .toLowerCase()
            .includes(q)
        : true
    )
    .filter((log) => inDateRange(log.isoDate))
    .filter((log) => (activity === "all" ? true : log.activity === activity))
    .filter((log) => (field === "all" ? true : log.field === field))
    .sort((a, b) => {
      switch (sortMode) {
        case "oldest":
          return a.isoDate.localeCompare(b.isoDate);
        case "employee-az":
          return a.employee.localeCompare(b.employee);
        case "activity-az":
          return a.activity.localeCompare(b.activity);
        default:
          return b.isoDate.localeCompare(a.isoDate);
      }
    });

  const { expandedIds, allExpanded, toggleExpandAll, toggleExpanded, setExpandedIds } =
    useExpandedIds(visible);

  // Employee view drops the redundant employee column (and its sort).
  const sortOptions = hideEmployee
    ? SORT_OPTIONS.filter((o) => o.value !== "employee-az")
    : SORT_OPTIONS;
  const headerGrid = hideEmployee
    ? "grid-cols-[44px_1fr_1fr_0.8fr_1.2fr_92px]"
    : "grid-cols-[44px_1.2fr_1fr_1fr_0.8fr_1.2fr_92px]";
  const rowGrid = hideEmployee
    ? "grid-cols-[28px_1fr] md:grid-cols-[44px_1fr_1fr_0.8fr_1.2fr_92px]"
    : "grid-cols-[28px_1fr] md:grid-cols-[44px_1.2fr_1fr_1fr_0.8fr_1.2fr_92px]";
  const panelTitle = hideEmployee
    ? "My Logs"
    : `New Employee Log${visible.length === 1 ? "" : "s"}`;

  // Pre-expand the first log on first load (previous default behavior).
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!seeded && logs[0]) {
      setSeeded(true);
      setExpandedIds(new Set([logs[0].id]));
    }
  }, [logs, seeded, setExpandedIds]);

  const activeFilterCount =
    (dateRange === "all" ? 0 : 1) +
    (activity === "all" ? 0 : 1) +
    (field === "all" ? 0 : 1);
  const dateLabel =
    DATE_OPTIONS.find((d) => d.value === dateRange)?.label ?? "Date";
  const sortLabel =
    sortOptions.find((s) => s.value === sortMode)?.label ?? "Sort";

  const clearAll = () => {
    setDateRange("all");
    setActivity("all");
    setField("all");
    setOpenMenu(null);
  };

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
      prev.size === visible.length && visible.length > 0
        ? new Set()
        : new Set(visible.map((l) => l.id))
    );
  };

  return (
    <TableSection>
      {/* Panel header — pills scroll horizontally on mobile, wrap on sm+ */}
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2">
          <p className="flex items-center gap-2 text-[15px] font-medium text-black">
            <Icon name="audio-lines" size={16} />
            {panelTitle}{" "}
            <span className="font-normal text-[#b3b3b3]">({visible.length})</span>
          </p>
        </div>
        <div className="nice-scroll -mx-4 flex flex-nowrap items-center gap-2 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:ml-auto lg:flex-wrap lg:justify-end lg:overflow-visible lg:px-0">
          {/* Sort */}
          <div ref={sortAnchorRef} className="shrink-0">
            <Pill
              icon="list-filter"
              onClick={() => toggleMenuAnchored("sort", sortAnchorRef)}
              ariaExpanded={openMenu === "sort"}
              ariaLabel={`Sort logs, current: ${sortLabel}`}
            >
              {sortMode === "newest" ? "Sort" : sortLabel}
            </Pill>
          </div>

          {/* Active filters — dark pills inline, Figma style */}
          {dateRange !== "all" && (
            <div className="shrink-0">
              <Pill
                active
                icon="x"
                onClick={() => setDateRange("all")}
                ariaLabel={`Clear date filter ${dateLabel}`}
              >
                {dateLabel}
              </Pill>
            </div>
          )}
          {activity !== "all" && (
            <div className="shrink-0">
              <Pill
                active
                icon="x"
                onClick={() => setActivity("all")}
                ariaLabel={`Clear activity filter ${activity}`}
              >
                {activity}
              </Pill>
            </div>
          )}
          {field !== "all" && (
            <div className="shrink-0">
              <Pill
                active
                icon="x"
                onClick={() => setField("all")}
                ariaLabel={`Clear field filter ${field}`}
              >
                {field}
              </Pill>
            </div>
          )}

          {/* Filter */}
          <div ref={filterAnchorRef} className="shrink-0">
            <Pill
              active={activeFilterCount > 0}
              icon="funnel"
              onClick={() => toggleMenuAnchored("filter", filterAnchorRef)}
              ariaExpanded={openMenu === "filter"}
              ariaLabel="Open filters"
            >
              Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Pill>
          </div>
          </div>
          {/* Dropdowns are viewport-fixed under their pill (see menuPos), so
              the scroll row's mobile overflow can't clip them. */}
          {openMenu === "sort" && (
            <MenuShell pos={menuPos} onClose={() => setOpenMenu(null)}>
              <SortMenuList
                options={sortOptions}
                value={sortMode}
                onPick={(v) => {
                  setSortMode(v);
                  setOpenMenu(null);
                }}
              />
            </MenuShell>
          )}
          {openMenu === "filter" && (
            <MenuShell pos={menuPos} onClose={() => setOpenMenu(null)}>
                <div className="space-y-3 px-4 py-3.5">
                  <FilterSelect
                    label="Date"
                    value={dateRange}
                    onChange={(v) => setDateRange(v as DateRange)}
                    allLabel="All dates"
                    options={DATE_OPTIONS.filter((o) => o.value !== "all")}
                  />
                  <FilterSelect
                    label="Activity"
                    value={activity}
                    onChange={setActivity}
                    allLabel="All activities"
                    options={activities}
                  />
                  <FilterSelect
                    label="Field"
                    value={field}
                    onChange={setField}
                    allLabel="All fields"
                    options={fields}
                  />
                  <button
                    onClick={clearAll}
                    className="w-full rounded-lg bg-black py-2 text-[13px] font-medium text-white hover:bg-[#222]"
                  >
                    Clear all
                  </button>
                </div>
              </MenuShell>
            )}
      </div>

      {/* Column headers */}
      <ColumnHeaders
        gridClass={headerGrid}
        allExpanded={allExpanded}
        onToggleAll={toggleExpandAll}
      >
        <button
          onClick={toggleAll}
          aria-label="Select all"
          className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-[#d4d4d4]"
        >
          {selected.size > 0 && selected.size === visible.length && (
            <span className="h-2 w-2 rounded-[2px] bg-black" />
          )}
        </button>
        {!hideEmployee && <span>Employee</span>}
        <span>Activity</span>
        <span>Date</span>
        <span>Field</span>
        <span>Time</span>
      </ColumnHeaders>

      {/* Rows */}
      <TableRows>
        {visible.map((log) => {
          const expanded = expandedIds.has(log.id);
          return (
            <ExpandableRow
              key={log.id}
              expanded={expanded}
              onToggle={() => toggleExpanded(log.id)}
              gridClass={rowGrid}
              ariaLabel={hideEmployee ? `${log.activity} in ${log.field}, ${expanded ? "collapse" : "expand"}` : `${log.employee} log — ${log.activity} in ${log.field}, ${expanded ? "collapse" : "expand"}`}
              summary={
                <>
                  <RowCheckbox
                    checked={selected.has(log.id)}
                    label={`Select ${log.employee}`}
                    onToggle={() => toggleSelect(log.id)}
                  />
                  {!hideEmployee && (
                    <span className="min-w-0 truncate font-normal text-black">
                      {log.employee}
                    </span>
                  )}
                  <span className="hidden truncate md:block">
                    {log.activity}
                  </span>
                  <span className="hidden truncate md:block">{log.date}</span>
                  <span className="hidden truncate md:block">{log.field}</span>
                  <span className="hidden truncate md:block">{log.time}</span>
                  {/* mobile sub-line — hidden until expanded, full row width */}
                  {expanded && (
                    <span className="col-span-2 truncate text-[12px] text-[#b3b3b3] md:hidden">
                      {log.activity} · {log.date} · {log.field}
                    </span>
                  )}
                  <span className="hidden text-right md:block">
                    <ViewButton expanded={expanded} onToggle={() => toggleExpanded(log.id)} />
                  </span>
                </>
              }
              detail={
                <LogDetail log={log} mapField={fieldIndex[log.field] ?? null} />
              }
            />
          );
        })}
        {visible.length === 0 && (
          <EmptyRow onClear={clearAll}>
            No logs match your filters.
          </EmptyRow>
        )}
      </TableRows>
    </TableSection>
  );
}

// Re-export toolbar pieces for tabs migrating off LogsPanel imports.
export { TableToolbar };
