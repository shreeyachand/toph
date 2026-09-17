"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { fetchAudioUrl, updateRecordingStatus } from "@/lib/data";
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
  title,
  statusFilter = "all",
  onStatusChanged,
}: {
  logs: EmployeeLog[];
  searchQuery: string;
  /** Employee view: everyone listed is the viewer, so drop that column. */
  hideEmployee?: boolean;
  /** Panel heading override. Defaults to "All Employee Logs" (or "My Logs"). */
  title?: string;
  /** "new" hides reviewed/flagged logs (dashboard); "all" shows everything (activity tab). */
  statusFilter?: "all" | "new";
  /** Parent refresh hook after a bulk status change succeeds. */
  onStatusChanged?: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // One state per log: a log is new, reviewed, OR flagged — never two at once.
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, "reviewed" | "flagged">
  >({});
  const [pendingAction, setPendingAction] = useState<"reviewed" | "flagged" | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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

  // Local status changes apply instantly (mock + live) and — in "new"
  // mode — drop the row so it no longer shows up as new.
  const effectiveLogs = useMemo(
    () =>
      logs.map((l) => {
        const override = statusOverrides[l.id];
        return override ? { ...l, status: override, isNew: false } : l;
      }),
    [logs, statusOverrides]
  );
  const feedLogs = useMemo(
    () =>
      statusFilter === "new"
        ? effectiveLogs.filter((l) => l.status === "new" || l.isNew)
        : effectiveLogs,
    [effectiveLogs, statusFilter]
  );

  // Drop selections for rows that left the feed (e.g. just marked reviewed
  // in "new" mode, or a parent refetch).
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const ids = new Set(feedLogs.map((l) => l.id));
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (ids.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [feedLogs]);

  // Anchor relative date filters to the newest log so mock + live data behave.
  const anchorIso = useMemo(
    () => feedLogs.reduce((max, l) => (l.isoDate > max ? l.isoDate : max), feedLogs[0]?.isoDate ?? ""),
    [feedLogs]
  );
  const anchorMonth = anchorIso.slice(0, 7);

  const activities = useMemo(
    () => Array.from(new Set(feedLogs.map((l) => l.activity))).sort(),
    [feedLogs]
  );
  const fields = useMemo(
    () => Array.from(new Set(feedLogs.map((l) => l.field))).sort(),
    [feedLogs]
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

  const visible = feedLogs
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
  const panelTitle =
    title ?? (hideEmployee ? "My Logs" : `All Employee Log${visible.length === 1 ? "" : "s"}`);

  // Pre-expand the first log on first load (previous default behavior).
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!seeded && feedLogs[0]) {
      setSeeded(true);
      setExpandedIds(new Set([feedLogs[0].id]));
    }
  }, [feedLogs, seeded, setExpandedIds]);

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

  // Esc closes the status-change confirmation.
  useEffect(() => {
    if (!pendingAction) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPendingAction(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pendingAction]);

  /**
   * Bulk status change (reviewed / flagged). Writes through to Supabase via
   * PATCH /api/recordings/:id (one per selected log) so the `voice_logs`
   * rows flip state — not just local/mock state. A log holds exactly one
   * state: new, reviewed, or flagged.
   */
  const confirmStatusChange = async () => {
    const target = pendingAction;
    const ids = Array.from(selected);
    if (!target || ids.length === 0 || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => updateRecordingStatus(id, target))
      );
      const succeeded = ids.filter((_, i) => results[i]?.status === "fulfilled");
      const failed = ids.filter((_, i) => results[i]?.status !== "fulfilled");
      if (succeeded.length === 0) throw new Error("all failed");
      setStatusOverrides((prev) => {
        const next = { ...prev };
        for (const id of succeeded) next[id] = target;
        return next;
      });
      setSelected(new Set(failed));
      onStatusChanged?.(succeeded);
      if (failed.length > 0) {
        setSaveError(
          `${succeeded.length} of ${ids.length} updated in Supabase — ${failed.length} failed. Please try again.`
        );
      } else {
        setPendingAction(null);
      }
    } catch {
      setSaveError("Couldn't update those logs. Please try again.");
    } finally {
      setSaving(false);
    }
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

      {/* Bulk action bar — appears once rows are checkboxed */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[#f0f0f0] bg-[#fafafa] px-4 py-3 sm:px-5">
          <p className="text-[13px] text-[#4d4d4d]" aria-live="polite">
            <span className="font-medium text-black">{selected.size}</span>{" "}
            selected
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-full border border-[#e3e3e3] bg-white px-3.5 py-1.5 text-[13px] text-[#4d4d4d] hover:bg-[#f5f5f5]"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                setSaveError(null);
                setPendingAction("flagged");
              }}
              className="rounded-full border border-[#f3c2bd] bg-[#fdeaea] px-3.5 py-1.5 text-[13px] font-medium text-[#b3261e] hover:bg-[#fbdcdc]"
            >
              Flag ({selected.size})
            </button>
            <button
              type="button"
              onClick={() => {
                setSaveError(null);
                setPendingAction("reviewed");
              }}
              className="rounded-full bg-black px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-[#222]"
            >
              Mark as reviewed ({selected.size})
            </button>
          </div>
        </div>
      )}

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

      {/* Confirm status change (reviewed / flagged) */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !saving && setPendingAction(null)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              pendingAction === "flagged"
                ? `Flag ${selected.size} logs`
                : `Mark ${selected.size} logs as reviewed`
            }
            className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-[#ececec] bg-white shadow-xl"
          >
            <div className="px-5 pb-3 pt-5">
              <p className="flex items-center gap-2 text-[15px] font-medium text-black">
                <Icon
                  name={pendingAction === "flagged" ? "flag" : "book-check"}
                  size={16}
                />
                {pendingAction === "flagged" ? "Flag logs?" : "Mark as reviewed?"}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#4d4d4d]">
                {selected.size} log{selected.size === 1 ? "" : "s"} will be
                marked as {pendingAction}.
              </p>
              {saveError && (
                <p className="mt-2 text-[13px] text-[#b3261e]" role="alert">
                  {saveError}
                </p>
              )}
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button
                type="button"
                disabled={saving}
                onClick={() => setPendingAction(null)}
                className="flex-1 rounded-lg border border-[#e3e3e3] bg-white py-2.5 text-[14px] font-medium text-black hover:bg-[#f8f8f8] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={confirmStatusChange}
                autoFocus
                className={`flex-1 rounded-lg py-2.5 text-[14px] font-medium text-white disabled:opacity-50 ${
                  pendingAction === "flagged"
                    ? "bg-[#b3261e] hover:bg-[#931b15]"
                    : "bg-black hover:bg-[#222]"
                }`}
              >
                {saving
                  ? "Saving…"
                  : pendingAction === "flagged"
                    ? "Flag"
                    : "Mark reviewed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </TableSection>
  );
}

// Re-export toolbar pieces for tabs migrating off LogsPanel imports.
export { TableToolbar };
