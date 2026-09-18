"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { fetchAudioUrl, updateRecordingActivity, updateRecordingStatus } from "@/lib/data";
import type { EmployeeLog } from "@/lib/types";
import type { MapField } from "./FieldMap";
import Icon from "./Icon";
import TagBox, { TagChip, chipStyle, type TagItem } from "./TagBox";
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

/** Max active-filter pills shown inline; the rest collapse into a "+N" pill. */
const MAX_FILTER_PILLS = 3;

type FilterPill = {
  key: string;
  kind: "date" | "activity" | "field" | "tag";
  label: string;
  /** Colored dot for tag filters; null renders no dot. */
  dot: string | null;
  clear: () => void;
};

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

/**
 * The log's activity with its "suggested" mark and a draft-then-confirm
 * changer. When the save-time pass classified the activity from the audio,
 * the row carries `activitySuggested` — shown as a small sparkle chip so it
 * reads as a guess, not gospel. Change writes through via PATCH (local-only
 * logs just update the panel state), and a human pick always drops the mark.
 */
function ActivityLine({
  log,
  activities,
  onChanged,
}: {
  log: EmployeeLog;
  /** Full activity catalog from /api/meta — every farm option, not just the feed's. */
  activities: string[];
  onChanged: (activity: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLocal = log.id.startsWith("local-");
  const current = log.activity === "—" ? "" : log.activity;
  const options = useMemo(() => {
    const set = new Set(activities);
    if (current) set.add(current);
    return Array.from(set).sort();
  }, [activities, current]);

  const startEdit = () => {
    setDraft(current);
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    if (saving) return;
    const next = draft.trim();
    if (next === current) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (!isLocal) {
        const updated = await updateRecordingActivity(log.id, next);
        onChanged(updated.activity);
      } else {
        onChanged(next);
      }
      setEditing(false);
    } catch {
      setError("Couldn't save — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <select
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Activity"
          className="min-w-0 flex-1 rounded-lg border border-[#e3e3e3] bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-[#b3b3b3] sm:flex-none"
        >
          <option value="">None</option>
          {options.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-black px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#222] disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          className="rounded-lg border border-[#e3e3e3] bg-white px-3 py-1.5 text-[12px] font-medium text-black hover:bg-[#f8f8f8] disabled:opacity-40"
        >
          Cancel
        </button>
        {error && (
          <p className="w-full text-[12px] text-[#b3261e]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <span className="text-[14px] text-[#4d4d4d]">{log.activity}</span>
      {log.activitySuggested && (
        <span
          title="Picked from your recording — change it if we guessed wrong."
          className="inline-flex items-center gap-1 rounded-full border border-[#dcebe2] bg-[#eef7f1] px-2 py-0.5 text-[11px] font-medium text-[#146c44]"
        >
          <Icon name="sparkle" size={10} alt="" />
          our guess
        </span>
      )}
      <button
        type="button"
        onClick={startEdit}
        className="text-[12px] font-medium text-[#146c44] hover:underline"
      >
        Change
      </button>
    </div>
  );
}

function LogDetail({
  log,
  mapField,
  activities,
  onActivityChange,
}: {
  log: EmployeeLog;
  mapField?: MapField | null;
  activities: string[];
  onActivityChange: (id: string, activity: string) => void;
}) {
  const [playing, setPlaying] = useState(false);
  // Tags on this log (null = not loaded yet — fetched by the TagBox on open).
  const [tags, setTags] = useState<TagItem[] | null>(null);
  const [tagBoxOpen, setTagBoxOpen] = useState(false);
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
          onClick={() => setTagBoxOpen((o) => !o)}
          aria-expanded={tagBoxOpen}
          className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 text-[14px] font-medium transition-colors ${
            tags && tags.length > 0
              ? "border-[#146c44] bg-[#146c44] text-white"
              : "border-[#dcebe2] bg-[#eef7f1] text-[#146c44] hover:bg-[#e3f1e8]"
          }`}
        >
          <Icon name="star" size={15} />
          {tags && tags.length > 0 ? "Tagged" : "Add Tag"}
        </button>
        {tags && tags.length > 0 && !tagBoxOpen && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <TagChip key={t.id} name={t.name} color={t.color} />
            ))}
          </div>
        )}
        {tagBoxOpen && (
          <TagBox
            logId={log.id}
            onClose={() => setTagBoxOpen(false)}
            onSaved={(next) => setTags(next)}
          />
        )}
        <div className="mt-5">
          <p className="text-[15px] font-medium text-black">Activity</p>
          <ActivityLine
            log={log}
            activities={activities}
            onChanged={(a) => onActivityChange(log.id, a)}
          />
        </div>
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
  initialField,
  onFieldChange,
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
  /** Pre-select the field filter (e.g. deep-link from /map?field=…). */
  initialField?: string | null;
  /** Fired whenever the field filter changes (null = cleared) so the parent can keep the URL in sync. */
  onFieldChange?: (field: string | null) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // One state per log: a log is new, reviewed, OR flagged — never two at once.
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, "reviewed" | "flagged">
  >({});
  // Activity edits from the detail view (id → chosen name) — applied like
  // status overrides so a change reflects in the row immediately.
  const [activityOverrides, setActivityOverrides] = useState<Record<string, string>>({});
  const [pendingAction, setPendingAction] = useState<"reviewed" | "flagged" | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  // Field polygons for the per-log mini-map (matched by field name), plus the
  // full activity catalog (feeds the detail view's activity changer).
  const [fieldIndex, setFieldIndex] = useState<Record<string, MapField>>({});
  const [activityOptions, setActivityOptions] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/fields", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const idx: Record<string, MapField> = {};
        for (const f of j.data ?? []) idx[f.name] = f;
        setFieldIndex(idx);
      })
      .catch(() => {});
    fetch("/api/meta", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setActivityOptions(j.activities ?? []))
      .catch(() => {});
  }, []);
  const [activity, setActivity] = useState<string>("all");
  const [field, setField] = useState<string>(initialField ?? "all");
  // Selected tag names (multi-select; a log matches if it has ANY of them).
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const { sortAnchorRef, filterAnchorRef, menuPos, toggleMenuAnchored } =
    useAnchoredMenus(openMenu, setOpenMenu);
  // Anchor for the "+N more filters" pill's copy of the filter menu.
  const moreRef = useRef<HTMLDivElement>(null);

  // Local status/activity changes apply instantly (mock + live) and — in "new"
  // mode — status changes drop the row so it no longer shows up as new.
  const effectiveLogs = useMemo(
    () =>
      logs.map((l) => {
        const activityOverride = activityOverrides[l.id];
        const withActivity = activityOverride
          ? { ...l, activity: activityOverride || "—", activitySuggested: false }
          : l;
        const override = statusOverrides[l.id];
        return override ? { ...withActivity, status: override, isNew: false } : withActivity;
      }),
    [logs, statusOverrides, activityOverrides]
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
  // Tags present on the feed's logs (drives the Tags filter + their colors).
  const { tagOptions, tagColorByName } = useMemo(() => {
    const byName = new Map<string, { name: string; color: string | null }>();
    for (const t of feedLogs.flatMap((l) => l.tags ?? [])) {
      const key = t.name.toLowerCase();
      if (!byName.has(key)) byName.set(key, { name: t.name, color: t.color });
    }
    const options = Array.from(byName.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    const colors = new Map(options.map((o) => [o.name.toLowerCase(), o.color]));
    return { tagOptions: options, tagColorByName: colors };
  }, [feedLogs]);
  const tagFilter = useMemo(
    () => new Set(selectedTags.map((t) => t.toLowerCase())),
    [selectedTags]
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
    .filter((log) =>
      tagFilter.size === 0
        ? true
        : (log.tags ?? []).some((t) => tagFilter.has(t.name.toLowerCase()))
    )
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
    (field === "all" ? 0 : 1) +
    selectedTags.length;
  const dateLabel =
    DATE_OPTIONS.find((d) => d.value === dateRange)?.label ?? "Date";
  const sortLabel =
    sortOptions.find((s) => s.value === sortMode)?.label ?? "Sort";

  // Single choke point for field-filter changes so the URL can follow along.
  const updateField = (v: string) => {
    setField(v);
    onFieldChange?.(v === "all" ? null : v);
  };

  const clearAll = () => {
    setDateRange("all");
    setActivity("all");
    updateField("all");
    setSelectedTags([]);
    setOpenMenu(null);
  };

  const toggleTag = (name: string) =>
    setSelectedTags((prev) =>
      prev.some((t) => t.toLowerCase() === name.toLowerCase())
        ? prev.filter((t) => t.toLowerCase() !== name.toLowerCase())
        : [...prev, name]
    );

  // All active filters as one list (date, activity, field, then tags). Only
  // the first few render inline; the rest collapse into a "+N" pill so the
  // header row never grows tall enough to crowd the table heading.
  const activeFilters: FilterPill[] = [];
  if (dateRange !== "all")
    activeFilters.push({
      key: "date",
      kind: "date",
      label: dateLabel,
      dot: null,
      clear: () => setDateRange("all"),
    });
  if (activity !== "all")
    activeFilters.push({
      key: "activity",
      kind: "activity",
      label: activity,
      dot: null,
      clear: () => setActivity("all"),
    });
  if (field !== "all")
    activeFilters.push({
      key: "field",
      kind: "field",
      label: field,
      dot: null,
      clear: () => updateField("all"),
    });
  for (const t of selectedTags)
    activeFilters.push({
      key: `tag:${t.toLowerCase()}`,
      kind: "tag",
      label: t,
      dot: tagColorByName.get(t.toLowerCase()) ?? "#4f5660",
      clear: () => toggleTag(t),
    });
  const shownFilters = activeFilters.slice(0, MAX_FILTER_PILLS);
  const overflowFilters = activeFilters.slice(MAX_FILTER_PILLS);

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

          {/* Active filters — dark pills inline, capped at MAX_FILTER_PILLS;
              the rest collapse into a "+N" pill (hover previews, click opens
              the full filter menu) so the row can't crowd the table heading */}
          {shownFilters.map((f) => (
            <div key={f.key} className="shrink-0">
              <Pill active icon="x" onClick={f.clear} ariaLabel={`Clear ${f.kind} filter ${f.label}`}>
                {f.dot && (
                  <span
                    aria-hidden
                    className="mr-1.5 inline-block h-2 w-2 rounded-full border border-white/25"
                    style={{ backgroundColor: f.dot }}
                  />
                )}
                {f.label}
              </Pill>
            </div>
          ))}
          {overflowFilters.length > 0 && (
            <div
              ref={moreRef}
              className="group relative shrink-0"
              title={overflowFilters.map((f) => f.label).join(" · ")}
            >
              <Pill
                onClick={() => toggleMenuAnchored("filter", moreRef)}
                ariaExpanded={openMenu === "filter"}
                ariaLabel={`Show ${overflowFilters.length} more active filters`}
              >
                +{overflowFilters.length}
              </Pill>
              {/* Hover preview of the hidden filters — each removable in
                  place. Absolutely positioned inside this group so the hover
                  state (and the pointer bridge) survives moving onto it. On
                  touch, the pill's click opens the filter menu instead. */}
              <div className="pointer-events-none absolute right-0 top-full z-50 pt-1.5 group-hover:pointer-events-auto">
                <div className="flex w-max max-w-[240px] flex-col items-start gap-1.5 overflow-hidden rounded-xl border border-[#ececec] bg-white p-2 opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-opacity duration-100 group-hover:opacity-100">
                  {overflowFilters.map((f) => (
                    <Pill
                      key={f.key}
                      active
                      icon="x"
                      onClick={f.clear}
                      ariaLabel={`Clear ${f.kind} filter ${f.label}`}
                    >
                      {f.dot && (
                        <span
                          aria-hidden
                          className="mr-1.5 inline-block h-2 w-2 rounded-full border border-white/25"
                          style={{ backgroundColor: f.dot }}
                        />
                      )}
                      {f.label}
                    </Pill>
                  ))}
                </div>
              </div>
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
                    onChange={updateField}
                    allLabel="All fields"
                    options={fields}
                  />
                  {tagOptions.length > 0 && (
                    <div>
                      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">
                        Tags
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {tagOptions.map((t) => {
                          const on = tagFilter.has(t.name.toLowerCase());
                          return (
                            <button
                              key={t.name}
                              type="button"
                              onClick={() => toggleTag(t.name)}
                              aria-pressed={on}
                              className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                                on
                                  ? t.color
                                    ? ""
                                    : "border-black/20 bg-[#f0f0f0] text-black"
                                  : "border-[#e3e3e3] bg-white text-[#4d4d4d] hover:bg-[#f8f8f8]"
                              }`}
                              style={on ? chipStyle(t.color) : undefined}
                            >
                              <span
                                aria-hidden
                                className="h-2 w-2 shrink-0 rounded-full border border-black/10"
                                style={{ backgroundColor: t.color ?? "#4f5660" }}
                              />
                              <span className="max-w-[120px] truncate">
                                {t.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1.5 text-[11px] text-[#b3b3b3]">
                        Shows logs with any selected tag
                      </p>
                    </div>
                  )}
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
                    {log.activitySuggested && (
                      <span
                        title="Suggested from the recording — change it in the detail view"
                        className="ml-1 inline-flex h-3 w-3 translate-y-[1px] items-center text-[#146c44]"
                      >
                        <Icon name="sparkle" size={10} alt="Suggested activity" />
                      </span>
                    )}
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
                <LogDetail
                  log={log}
                  mapField={fieldIndex[log.field] ?? null}
                  activities={activityOptions}
                  onActivityChange={(id, activity) =>
                    setActivityOverrides((prev) => ({ ...prev, [id]: activity }))
                  }
                />
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
