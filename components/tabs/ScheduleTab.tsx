"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "../Icon";
import { Loading, PageHeader, StatusPill } from "../PageHeader";
import StatCard, { StatGrid } from "../StatCard";
import { MenuShell, Pill } from "../LogsPanel";

interface Evt { id: string; title: string; kind: string; employee: string; field: string; starts_at: string; ends_at: string; notes: string | null; }

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfWeekMonday(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  const dow = (c.getDay() + 6) % 7; // Mon=0
  c.setDate(c.getDate() - dow);
  return c;
}
function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

const KIND_STYLES: Record<string, string> = {
  shift: "border-[#bfd3fb] bg-[#e8effe] text-[#1a56db]",
  task: "border-[#cde6d6] bg-[#eef7f1] text-[#146c44]",
  time_off: "border-[#f0dcae] bg-[#fff4e0] text-[#9a6700]",
};

// Visible time-grid window (5 AM – 7 PM) and row height.
const DAY_START_MIN = 5 * 60;
const DAY_END_MIN = 19 * 60;
const HOUR_H = 48;

function toMin(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/** Schedule tab: list view + paginated week grid. */
export default function ScheduleTab({ initialPerson = null }: { initialPerson?: string | null }) {
  const [events, setEvents] = useState<Evt[] | null>(null);
  const [live, setLive] = useState(false);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("all");
  const [view, setView] = useState<"list" | "week">("list");
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [people, setPeople] = useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu] = useState(false);
  const [roster, setRoster] = useState<string[]>([]);
  const [rosterDone, setRosterDone] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    fetch("/api/schedule", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { setEvents(j.data); setLive(j.live); })
      .catch(() => {});
    fetch("/api/employees", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setRoster(((j.data ?? []) as Array<{ full_name: string }>).map((e) => e.full_name).sort()))
      .catch(() => {})
      .finally(() => setRosterDone(true));
  }, []);

  // Default selection once both sources are in: a pre-filtered person when
  // jumping over from Employees, otherwise the whole roster checked so the
  // dropdown matches the "show all" view.
  useEffect(() => {
    if (events && rosterDone && !initialized.current) {
      initialized.current = true;
      const names = Array.from(new Set([...roster, ...events.map((e) => e.employee)])).sort();
      setPeople(initialPerson ? new Set(names.filter((n) => n === initialPerson)) : new Set(names));
    }
  }, [events, roster, rosterDone, initialPerson]);

  // Anchor the week view on the earliest event so it opens with data.
  useEffect(() => {
    if (events && events.length > 0 && !weekStart) {
      const min = events.reduce((m, e) => (e.starts_at < m ? e.starts_at : m), events[0].starts_at);
      setWeekStart(startOfWeekMonday(new Date(min)));
    }
  }, [events, weekStart]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (events ?? []).filter(
      (e) =>
        (kind === "all" || e.kind === kind) &&
        people.has(e.employee) &&
        (!q || `${e.title} ${e.employee} ${e.field}`.toLowerCase().includes(q))
    );
  }, [events, query, kind, people]);

  const peopleOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of events ?? []) counts.set(e.employee, (counts.get(e.employee) ?? 0) + 1);
    // Union the full roster so crew without scheduled events still appear.
    return [...new Set([...roster, ...counts.keys()])].sort()
      .map((n) => [n, counts.get(n) ?? 0] as [string, number]);
  }, [events, roster]);

  const togglePerson = (name: string) => setPeople((prev) => {
    const next = new Set(prev);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });

  const allSelected = peopleOptions.length > 0 && people.size === peopleOptions.length;

  const groups = useMemo(() => {
    const m = new Map<string, Evt[]>();
    for (const e of filtered) {
      const day = e.starts_at.slice(0, 10);
      if (!m.has(day)) m.set(day, []);
      m.get(day)!.push(e);
    }
    return [...m.entries()];
  }, [filtered]);

  const weekDays = useMemo(() => (weekStart ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : []), [weekStart]);
  const weekEvents = useMemo(() => {
    if (!weekStart) return new Map<string, Evt[]>();
    const keys = new Set(weekDays.map(dayKey));
    const m = new Map<string, Evt[]>();
    for (const e of filtered) {
      const k = e.starts_at.slice(0, 10);
      if (!keys.has(k)) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    for (const list of m.values()) list.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return m;
  }, [filtered, weekStart, weekDays]);

  if (!events) return <Loading label="schedule" />;

  const weekLabel = weekStart
    ? `${fmtDay(addDays(weekStart, 0).toISOString())} – ${fmtDay(addDays(weekStart, 6).toISOString())}`
    : "";
  const todayKey = dayKey(new Date());
  const hours = Array.from({ length: DAY_END_MIN / 60 - DAY_START_MIN / 60 + 1 }, (_, i) => DAY_START_MIN / 60 + i);

  return (
    <div>
      <PageHeader title="Schedule" subtitle="Shifts, tasks and time off across the crew" query={query} setQuery={setQuery} live={live} />
      <StatGrid cols={3}>
        <StatCard icon="calendar" label="Scheduled Events" value={events.length} />
        <StatCard icon="users" label="Shifts" value={events.filter((e) => e.kind === "shift").length} />
        <StatCard icon="clipboard-pen" label="Tasks" value={events.filter((e) => e.kind === "task").length} />
      </StatGrid>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {["all", "shift", "task", "time_off"].map((k) => (
          <button key={k} onClick={() => setKind(k)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] capitalize transition-colors ${kind === k ? "bg-black text-white hover:bg-[#222]" : "border border-[#e3e3e3] bg-white text-[#4d4d4d] hover:bg-[#f8f8f8]"}`}>
            {k.replace(/_/g, " ")}
          </button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-[#e3e3e3] sm:block" aria-hidden />
        <div className="relative shrink-0">
          <Pill
            active={people.size !== peopleOptions.length} icon="users"
            onClick={() => setOpenMenu((o) => !o)}
            ariaExpanded={openMenu} ariaLabel="Filter by people"
          >
            People{people.size !== peopleOptions.length ? ` (${people.size})` : ""}
          </Pill>
          {openMenu && (
            <MenuShell onClose={() => setOpenMenu(false)} align="left">
              <p className="px-4 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">
                People
              </p>
              <ul className="max-h-64 overflow-y-auto pb-1">
                {peopleOptions.map(([name, count]) => {
                  const checked = people.has(name);
                  return (
                    <li key={name}>
                      <button
                        role="checkbox" aria-checked={checked}
                        onClick={() => togglePerson(name)}
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] hover:bg-[#f8f8f8]"
                      >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${checked ? "border-black bg-black" : "border-[#d4d4d4] bg-white"}`}>
                          {checked && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5.2 4.2 7.4 8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className={`flex-1 truncate ${checked ? "font-medium text-black" : "text-[#4d4d4d]"}`}>{name}</span>
                        <span className="text-[12px] text-[#b3b3b3]">{count}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-[#f0f0f0] px-4 py-2.5">
                <button
                  onClick={() => setPeople(allSelected ? new Set() : new Set(peopleOptions.map(([n]) => n)))}
                  className="w-full rounded-lg bg-black py-1.5 text-[13px] font-medium text-white hover:bg-[#222]"
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              </div>
            </MenuShell>
          )}
        </div>
        <div className="flex rounded-full border border-[#e3e3e3] bg-white p-0.5">
          {(["list", "week"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} aria-pressed={view === v}
              className={`rounded-full px-4 py-1 text-[13px] capitalize transition-colors ${view === v ? "bg-black text-white" : "text-[#4d4d4d] hover:bg-[#f5f5f5]"}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "list" ? (
        <div className="mt-4 space-y-4">
          {groups.map(([day, evts]) => (
            <section key={day} className="overflow-hidden rounded-2xl border border-[#ececec] bg-white">
              <p className="flex items-center gap-2 border-b border-[#f0f0f0] px-4 py-3 text-[14px] font-medium text-black sm:px-5">
                <Icon name="calendar" size={15} /> {fmtDay(evts[0].starts_at)}
                <span className="font-normal text-[#b3b3b3]">({evts.length})</span>
              </p>
              <ul className="divide-y divide-[#f0f0f0]">
                {evts.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-2 px-4 py-3.5 text-[14px] sm:px-5">
                    <span className="min-w-0 flex-1 basis-48">
                      <span className="block truncate font-medium text-black">{e.title}</span>
                      <span className="block truncate text-[12px] text-[#b3b3b3]">{e.employee} · {e.field}{e.notes ? ` · ${e.notes}` : ""}</span>
                    </span>
                    <StatusPill status={e.kind} />
                    <span className="text-[13px] text-[#4d4d4d]">{fmtTime(e.starts_at)} – {fmtTime(e.ends_at)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {groups.length === 0 && (
            <p className="rounded-2xl border border-[#ececec] bg-white px-5 py-10 text-center text-[14px] text-[#b3b3b3]">No events match your filters.</p>
          )}
        </div>
      ) : (
        <section className="mt-4 overflow-hidden rounded-2xl border border-[#ececec] bg-white">
          {/* Week pagination */}
          <div className="flex flex-wrap items-center gap-2 px-4 py-3.5 sm:px-5">
            <p className="flex items-center gap-2 text-[15px] font-medium text-black">
              <Icon name="calendar" size={16} /> {weekLabel}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => weekStart && setWeekStart(addDays(weekStart, -7))}
                className="rounded-full border border-[#e3e3e3] px-3.5 py-1.5 text-[13px] text-[#4d4d4d] hover:bg-[#f5f5f5]"
              >
                ‹ Prev
              </button>
              <button
                onClick={() => setWeekStart(startOfWeekMonday(new Date()))}
                className="rounded-full border border-[#e3e3e3] px-3.5 py-1.5 text-[13px] text-[#4d4d4d] hover:bg-[#f5f5f5]"
              >
                Today
              </button>
              <button
                onClick={() => weekStart && setWeekStart(addDays(weekStart, 7))}
                className="rounded-full border border-[#e3e3e3] px-3.5 py-1.5 text-[13px] text-[#4d4d4d] hover:bg-[#f5f5f5]"
              >
                Next ›
              </button>
            </div>
          </div>

          {/* All-day row */}
          {weekDays.some((d) => (weekEvents.get(dayKey(d)) ?? []).some((e) => e.kind === "time_off")) && (
            <div className="grid grid-cols-[44px_repeat(7,minmax(0,1fr))] gap-px border-t border-[#f0f0f0] bg-white px-0">
              <span className="px-2 py-2 text-[10px] font-medium uppercase tracking-wide text-[#c4c4c4]">All-day</span>
              {weekDays.map((d) => (
                <div key={dayKey(d)} className="space-y-1 px-1 py-1.5">
                  {(weekEvents.get(dayKey(d)) ?? []).filter((e) => e.kind === "time_off").map((e) => (
                    <div key={e.id} title={`${e.title} — ${e.employee}${e.notes ? ` · ${e.notes}` : ""}`}
                      className={`truncate rounded-md border px-1.5 py-1 text-[11px] font-medium ${KIND_STYLES.time_off}`}>
                      {e.title}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Time grid (scrolls horizontally on small screens) */}
          <div className="nice-scroll overflow-x-auto border-t border-[#f0f0f0]">
            <div className="min-w-[820px]">
              {/* Day headers */}
              <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-[#f0f0f0]">
                <span />
                {weekDays.map((d) => {
                  const isToday = dayKey(d) === todayKey;
                  const count = (weekEvents.get(dayKey(d)) ?? []).filter((e) => e.kind !== "time_off").length;
                  return (
                    <div key={dayKey(d)} className="px-2 py-2.5 text-center">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">
                        {d.toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                      <p className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[14px] font-medium ${isToday ? "bg-black text-white" : "text-black"}`}>
                        {d.getDate()}
                      </p>
                      {count > 0 && <p className="mt-0.5 text-[11px] text-[#b3b3b3]">{count} event{count === 1 ? "" : "s"}</p>}
                    </div>
                  );
                })}
              </div>
              {/* Body */}
              <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
                {/* Gutter */}
                <div className="relative" style={{ height: (hours.length - 1) * HOUR_H }}>
                  {hours.slice(0, -1).map((h) => (
                    <span key={h} className="absolute right-2 text-[11px] text-[#b3b3b3]" style={{ top: (h - DAY_START_MIN / 60) * HOUR_H - 8 }}>
                      {h > 12 ? `${h - 12} PM` : h === 12 ? "12 PM" : `${h} AM`}
                    </span>
                  ))}
                </div>
                {weekDays.map((d) => (
                  <div key={dayKey(d)} className="relative border-l border-[#f0f0f0]" style={{ height: (hours.length - 1) * HOUR_H }}>
                    {/* Hour lines */}
                    {hours.map((h) => (
                      <div key={h} className="absolute inset-x-0 border-t border-[#f0f0f0]" style={{ top: (h - DAY_START_MIN / 60) * HOUR_H }} />
                    ))}
                    {/* Event blocks */}
                    {(weekEvents.get(dayKey(d)) ?? []).filter((e) => e.kind !== "time_off").map((e) => {
                      const top = Math.max(0, (toMin(e.starts_at) - DAY_START_MIN) / 60 * HOUR_H);
                      const bottom = Math.min((hours.length - 1) * HOUR_H, (toMin(e.ends_at) - DAY_START_MIN) / 60 * HOUR_H);
                      const height = Math.max(24, bottom - top);
                      return (
                        <div
                          key={e.id}
                          title={`${e.title} — ${fmtTime(e.starts_at)} to ${fmtTime(e.ends_at)} · ${e.employee} · ${e.field}${e.notes ? ` · ${e.notes}` : ""}`}
                          style={{ top, height }}
                          className={`absolute inset-x-1 overflow-hidden rounded-lg border px-1.5 py-1 ${KIND_STYLES[e.kind] ?? KIND_STYLES.task}`}
                        >
                          <p className="truncate text-[11px] font-semibold leading-tight">{e.title}</p>
                          {height >= 44 && (
                            <>
                              <p className="truncate text-[11px] leading-tight opacity-80">{fmtTime(e.starts_at)} – {fmtTime(e.ends_at)}</p>
                              <p className="truncate text-[11px] leading-tight opacity-80">{e.employee}</p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
