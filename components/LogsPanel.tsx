"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EmployeeLog } from "@/lib/types";
import FieldMap, { type MapField } from "./FieldMap";
import Icon from "./Icon";
import Waveform from "./Waveform";

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

export function Pill({
  active,
  icon,
  children,
  onClick,
  ariaExpanded,
  ariaLabel,
}: {
  active?: boolean;
  icon?: string;
  children: React.ReactNode;
  onClick?: () => void;
  ariaExpanded?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-expanded={ariaExpanded}
      aria-label={ariaLabel}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
        active
          ? "bg-black text-white hover:bg-[#222]"
          : "border border-[#e3e3e3] bg-white text-[#4d4d4d] hover:bg-[#f8f8f8]"
      }`}
    >
      {icon &&
        (active ? (
          <span className="brightness-0 invert">
            <Icon name={icon} size={14} />
          </span>
        ) : (
          <Icon name={icon} size={14} />
        ))}
      <span className="whitespace-nowrap">{children}</span>
    </button>
  );
}

export interface MenuCoords {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

/** Viewport-anchored position for a dropdown under its trigger button. */
export function menuCoordsFor(
  rect: DOMRect,
  align: "left" | "right"
): MenuCoords {
  const MENU_W = 208; // w-52
  const GAP = 8;
  const EST_H = 320;
  const pad = 8;
  const maxEdge = Math.max(pad, window.innerWidth - MENU_W - pad);
  const below = window.innerHeight - rect.bottom - GAP;
  const vertical =
    below >= EST_H || below >= rect.top
      ? { top: Math.round(rect.bottom + GAP) }
      : { bottom: Math.round(window.innerHeight - rect.top + GAP) };
  return align === "left"
    ? {
        ...vertical,
        left: Math.round(Math.min(Math.max(rect.left, pad), maxEdge)),
      }
    : {
        ...vertical,
        right: Math.round(
          Math.min(Math.max(window.innerWidth - rect.right, pad), maxEdge)
        ),
      };
}

export function MenuShell({
  onClose,
  children,
  align = "right",
  pos = null,
}: {
  onClose: () => void;
  children: React.ReactNode;
  align?: "right" | "left";
  /** When provided, the panel is viewport-fixed at these coords (ignores `align`). */
  pos?: MenuCoords | null;
}) {
  return (
    <>
      <button
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-transparent"
      />
      <div
        role="menu"
        style={pos ?? undefined}
        className={`${
          pos ? "fixed" : "absolute top-[calc(100%+8px)]"
        } z-40 w-52 overflow-hidden rounded-xl border border-[#ececec] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)] ${
          pos ? "" : align === "right" ? "right-0" : "left-0"
        }`}
      >
        {children}
      </div>
    </>
  );
}

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

  return (
    <>
    <div className="grid gap-6 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-2">
      {/* Left: audio + summary */}
      <div className="min-w-0">
        <div className="overflow-hidden">
          <Waveform playing={playing} progress={playing ? 0.62 : 0.42} />
        </div>
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
          <p className="mt-1.5 text-[14px] leading-relaxed text-[#808080]">
            &quot;
            {log.summary ??
              `Voice log for ${log.employee} — ${log.activity.toLowerCase()} in ${log.field} on ${log.date}. Transcription pending review.`}
            &quot;
          </p>
        </div>
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
}: {
  logs: EmployeeLog[];
  searchQuery: string;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(logs[0] ? [logs[0].id] : [])
  );
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
  // Anchors + viewport coords so dropdowns sit directly under their pill.
  const sortAnchorRef = useRef<HTMLDivElement>(null);
  const filterAnchorRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<MenuCoords | null>(null);

  const placeMenu = (menu: Exclude<OpenMenu, null>) => {
    const anchor =
      (menu === "sort" ? sortAnchorRef : filterAnchorRef).current;
    const rect = anchor?.getBoundingClientRect();
    if (!rect) {
      setOpenMenu(null);
      return;
    }
    setMenuPos(menuCoordsFor(rect, menu === "sort" ? "left" : "right"));
  };

  const toggleMenuAnchored = (
    menu: Exclude<OpenMenu, null>,
    anchorRef: React.RefObject<HTMLDivElement | null>
  ) => {
    if (openMenu === menu) {
      setOpenMenu(null);
      return;
    }
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) setMenuPos(menuCoordsFor(rect, menu === "sort" ? "left" : "right"));
    setOpenMenu(menu);
  };

  // Keep the open menu glued to its pill across scroll/resize; Esc closes.
  useEffect(() => {
    if (!openMenu) return;
    const onMove = () => placeMenu(openMenu);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("resize", onMove);
    document.addEventListener("scroll", onMove, true);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onMove);
      document.removeEventListener("scroll", onMove, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu ]);

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

  const allExpanded =
    visible.length > 0 && visible.every((l) => expandedIds.has(l.id));

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(visible.map((l) => l.id)));
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeFilterCount =
    (dateRange === "all" ? 0 : 1) +
    (activity === "all" ? 0 : 1) +
    (field === "all" ? 0 : 1);
  const dateLabel =
    DATE_OPTIONS.find((d) => d.value === dateRange)?.label ?? "Date";
  const sortLabel =
    SORT_OPTIONS.find((s) => s.value === sortMode)?.label ?? "Sort";

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
    <section className="overflow-hidden rounded-2xl border border-[#ececec] bg-white">
      {/* Panel header — pills scroll horizontally on mobile, wrap on sm+ */}
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2">
          <p className="flex items-center gap-2 text-[15px] font-medium text-black">
            <Icon name="audio-lines" size={16} />
            New Employee Log{visible.length === 1 ? "" : "s"}{" "}
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
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  role="menuitemradio"
                  aria-checked={sortMode === opt.value}
                  onClick={() => {
                    setSortMode(opt.value);
                    setOpenMenu(null);
                  }}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] hover:bg-[#f8f8f8] ${
                    sortMode === opt.value
                      ? "font-semibold text-black"
                      : "text-[#4d4d4d]"
                  }`}
                >
                  {opt.label}
                  {sortMode === opt.value && <span aria-hidden>✓</span>}
                </button>
              ))}
            </MenuShell>
          )}
          {openMenu === "filter" && (
            <MenuShell pos={menuPos} onClose={() => setOpenMenu(null)}>
                <div className="space-y-3 px-4 py-3.5">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">
                      Date
                    </span>
                    <select
                      value={dateRange}
                      onChange={(e) =>
                        setDateRange(e.target.value as DateRange)
                      }
                      className="w-full rounded-lg border border-[#e3e3e3] bg-white px-2.5 py-2 text-[13px] text-black outline-none focus:border-[#b3b3b3]"
                    >
                      {DATE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">
                      Activity
                    </span>
                    <select
                      value={activity}
                      onChange={(e) => setActivity(e.target.value)}
                      className="w-full rounded-lg border border-[#e3e3e3] bg-white px-2.5 py-2 text-[13px] text-black outline-none focus:border-[#b3b3b3]"
                    >
                      <option value="all">All activities</option>
                      {activities.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">
                      Field
                    </span>
                    <select
                      value={field}
                      onChange={(e) => setField(e.target.value)}
                      className="w-full rounded-lg border border-[#e3e3e3] bg-white px-2.5 py-2 text-[13px] text-black outline-none focus:border-[#b3b3b3]"
                    >
                      <option value="all">All fields</option>
                      {fields.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </label>
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
          <button
            onClick={toggleExpandAll}
            aria-expanded={allExpanded}
            className="rounded-full border border-[#e3e3e3] px-3.5 py-1.5 text-[13px] normal-case tracking-normal text-[#4d4d4d] hover:bg-[#f5f5f5]"
          >
            {allExpanded ? "Close All" : "View All"}
          </button>
        </span>
      </div>

      {/* Rows */}
      <ul className="divide-y divide-[#f0f0f0]">
        {visible.map((log) => {
          const expanded = expandedIds.has(log.id);
          return (
            <li
              key={log.id}
              className={expanded ? "bg-[#fafafa]" : "bg-white"}
            >
              <div
                onClick={() => toggleExpanded(log.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleExpanded(log.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                aria-label={`${log.employee} log — ${log.activity} in ${log.field}, ${expanded ? "collapse" : "expand"}`}
                className="grid cursor-pointer grid-cols-[28px_1fr] items-center gap-2 px-4 py-3.5 text-[14px] text-[#4d4d4d] sm:px-5 md:cursor-default md:grid-cols-[44px_1.2fr_1fr_1fr_0.8fr_1.2fr_92px]"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(log.id);
                  }}
                  aria-label={`Select ${log.employee}`}
                  aria-pressed={selected.has(log.id)}
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
                <span className="min-w-0 truncate font-normal text-black">
                  {log.employee}
                </span>
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(log.id);
                    }}
                    aria-expanded={expanded}
                    className="rounded-full border border-[#e9e9e9] bg-white px-4 py-1.5 text-[13px] text-[#4d4d4d] hover:bg-[#f5f5f5]"
                  >
                    {expanded ? "Close" : "View"}
                  </button>
                </span>
              </div>
              {expanded && (
                <div className="border-t border-[#f0f0f0]">
                  <LogDetail log={log} mapField={fieldIndex[log.field] ?? null} />
                </div>
              )}
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="px-5 py-10 text-center text-[14px] text-[#b3b3b3]">
            No logs match your filters.{" "}
            <button onClick={clearAll} className="underline hover:text-black">
              Clear filters
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}
