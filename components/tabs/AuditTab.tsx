"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "../Icon";
import { Loading, PageHeader, StatusPill } from "../PageHeader";
import StatCard, { StatGrid } from "../StatCard";
import { MenuShell, Pill } from "../LogsPanel";

interface Audit { id: string; title: string; due_date: string | null; status: string; assignee: string; notes: string | null; findings: number; }

type SortMode = "due-asc" | "due-desc" | "title-az" | "status";
type OpenMenu = null | "sort" | "filter";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "due-asc", label: "Due soonest" },
  { value: "due-desc", label: "Due latest" },
  { value: "title-az", label: "Title A–Z" },
  { value: "status", label: "Status" },
];

/** Audit Manager tab: dashboard-style table with sort + filters. */
export default function AuditTab() {
  const [audits, setAudits] = useState<Audit[] | null>(null);
  const [live, setLive] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>("due-asc");
  const [status, setStatus] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);

  useEffect(() => {
    fetch("/api/audits", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { setAudits(j.data); setLive(j.live); })
      .catch(() => {});
  }, []);

  const statuses = useMemo(() => Array.from(new Set((audits ?? []).map((a) => a.status))).sort(), [audits]);
  const assignees = useMemo(() => Array.from(new Set((audits ?? []).map((a) => a.assignee))).sort(), [audits]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => (audits ?? [])
    .filter((a) => !q || `${a.title} ${a.assignee} ${a.status}`.toLowerCase().includes(q))
    .filter((a) => (status === "all" ? true : a.status === status))
    .filter((a) => (assignee === "all" ? true : a.assignee === assignee))
    .sort((a, b) => {
      switch (sortMode) {
        case "due-desc": return (b.due_date ?? "") .localeCompare(a.due_date ?? "");
        case "title-az": return a.title.localeCompare(b.title);
        case "status": return a.status.localeCompare(b.status);
        default: return (a.due_date ?? "").localeCompare(b.due_date ?? "");
      }
    }), [audits, q, status, assignee, sortMode]);

  if (!audits) return <Loading label="audits" />;

  const allExpanded = visible.length > 0 && visible.every((a) => expandedIds.has(a.id));
  const toggleExpandAll = () => setExpandedIds(allExpanded ? new Set() : new Set(visible.map((a) => a.id)));
  const toggleExpanded = (id: string) => setExpandedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleMenu = (menu: Exclude<OpenMenu, null>) => setOpenMenu((cur) => (cur === menu ? null : menu));
  const activeFilterCount = (status === "all" ? 0 : 1) + (assignee === "all" ? 0 : 1);
  const sortLabel = SORT_OPTIONS.find((s) => s.value === sortMode)?.label ?? "Sort";
  const clearAll = () => { setStatus("all"); setAssignee("all"); setOpenMenu(null); };

  return (
    <div>
      <PageHeader title="Audit Manager" subtitle="Compliance reviews, due dates and findings" query={query} setQuery={setQuery} live={live} />
      <StatGrid cols={4}>
        <StatCard icon="book-check" label="Total Audits" value={audits.length} />
        <StatCard icon="calendar" label="Open" value={audits.filter((a) => a.status === "open").length} />
        <StatCard icon="clipboard-pen" label="In Progress" value={audits.filter((a) => a.status === "in_progress").length} />
        <StatCard icon="x" label="Findings" value={audits.reduce((s, a) => s + a.findings, 0)} />
      </StatGrid>

      <section className="mt-4 overflow-hidden rounded-2xl border border-[#ececec] bg-white">
        {/* Panel header */}
        <div className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2">
            <p className="flex items-center gap-2 text-[15px] font-medium text-black">
              <Icon name="book-check" size={16} />
              Audits <span className="font-normal text-[#b3b3b3]">({visible.length})</span>
            </p>
            <button
              onClick={toggleExpandAll}
              aria-expanded={allExpanded}
              className="ml-auto rounded-full border border-[#e3e3e3] px-3.5 py-1.5 text-[13px] text-[#4d4d4d] hover:bg-[#f5f5f5] md:hidden"
            >
              {allExpanded ? "Close All" : "View All"}
            </button>
          </div>
          <div className="nice-scroll -mx-4 flex flex-nowrap items-center gap-2 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:ml-auto lg:flex-wrap lg:justify-end lg:overflow-visible lg:px-0">
            <div className="relative shrink-0">
              <Pill icon="list-filter" onClick={() => toggleMenu("sort")} ariaExpanded={openMenu === "sort"} ariaLabel={`Sort audits, current: ${sortLabel}`}>
                {sortMode === "due-asc" ? "Sort" : sortLabel}
              </Pill>
              {openMenu === "sort" && (
                <MenuShell onClose={() => setOpenMenu(null)}>
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value} role="menuitemradio" aria-checked={sortMode === opt.value}
                      onClick={() => { setSortMode(opt.value); setOpenMenu(null); }}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] hover:bg-[#f8f8f8] ${sortMode === opt.value ? "font-semibold text-black" : "text-[#4d4d4d]"}`}
                    >
                      {opt.label}
                      {sortMode === opt.value && <span aria-hidden>✓</span>}
                    </button>
                  ))}
                </MenuShell>
              )}
            </div>
            {status !== "all" && (
              <div className="shrink-0">
                <Pill active icon="x" onClick={() => setStatus("all")} ariaLabel={`Clear status filter ${status}`}>{status.replace(/_/g, " ")}</Pill>
              </div>
            )}
            {assignee !== "all" && (
              <div className="shrink-0">
                <Pill active icon="x" onClick={() => setAssignee("all")} ariaLabel={`Clear assignee filter ${assignee}`}>{assignee}</Pill>
              </div>
            )}
            <div className="relative shrink-0">
              <Pill active={activeFilterCount > 0} icon="funnel" onClick={() => toggleMenu("filter")} ariaExpanded={openMenu === "filter"} ariaLabel="Open filters">
                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Pill>
              {openMenu === "filter" && (
                <MenuShell onClose={() => setOpenMenu(null)}>
                  <div className="space-y-3 px-4 py-3.5">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">Status</span>
                      <select value={status} onChange={(e) => setStatus(e.target.value)}
                        className="w-full rounded-lg border border-[#e3e3e3] bg-white px-2.5 py-2 text-[13px] text-black outline-none focus:border-[#b3b3b3]">
                        <option value="all">All statuses</option>
                        {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">Assignee</span>
                      <select value={assignee} onChange={(e) => setAssignee(e.target.value)}
                        className="w-full rounded-lg border border-[#e3e3e3] bg-white px-2.5 py-2 text-[13px] text-black outline-none focus:border-[#b3b3b3]">
                        <option value="all">All assignees</option>
                        {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </label>
                    <button onClick={clearAll} className="w-full rounded-lg bg-black py-2 text-[13px] font-medium text-white hover:bg-[#222]">Clear all</button>
                  </div>
                </MenuShell>
              )}
            </div>
          </div>
        </div>

        {/* Column headers */}
        <div className="hidden grid-cols-[1.6fr_1fr_0.9fr_0.8fr_0.6fr_92px] items-center gap-2 border-y border-[#f0f0f0] px-5 py-3 text-[12px] font-medium uppercase tracking-wide text-[#c4c4c4] md:grid">
          <span>Audit</span><span>Assignee</span><span>Due</span><span>Status</span><span>Findings</span>
          <span className="text-right">
            <button onClick={toggleExpandAll} aria-expanded={allExpanded}
              className="rounded-full border border-[#e3e3e3] px-3.5 py-1.5 text-[13px] normal-case tracking-normal text-[#4d4d4d] hover:bg-[#f5f5f5]">
              {allExpanded ? "Close All" : "View All"}
            </button>
          </span>
        </div>

        {/* Rows */}
        <ul className="divide-y divide-[#f0f0f0]">
          {visible.map((a) => {
            const expanded = expandedIds.has(a.id);
            return (
              <li key={a.id} className={expanded ? "bg-[#fafafa]" : "bg-white"}>
                <div className="grid grid-cols-[1fr_auto] items-center gap-2 px-4 py-3.5 text-[14px] text-[#4d4d4d] sm:px-5 md:grid-cols-[1.6fr_1fr_0.9fr_0.8fr_0.6fr_92px]">
                  <span className="min-w-0 truncate font-normal text-black">{a.title}</span>
                  <span className="hidden truncate md:block">{a.assignee}</span>
                  <span className="hidden truncate md:block">{a.due_date ?? "—"}</span>
                  <span className="hidden md:block"><StatusPill status={a.status} /></span>
                  <span className="hidden md:block">
                    <span className="inline-flex h-[18px] min-w-[28px] items-center justify-center rounded-full bg-[#b9e2c6] px-1.5 text-[11px] font-semibold text-[#0b3d25]">{a.findings}</span>
                  </span>
                  <span className="col-span-1 truncate text-[12px] text-[#b3b3b3] md:hidden">
                    {a.assignee} · {a.due_date ?? "—"} · {a.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-right">
                    <button onClick={() => toggleExpanded(a.id)} aria-expanded={expanded}
                      className="rounded-full border border-[#e9e9e9] bg-white px-4 py-1.5 text-[13px] text-[#4d4d4d] hover:bg-[#f5f5f5]">
                      {expanded ? "Close" : "View"}
                    </button>
                  </span>
                </div>
                {expanded && (
                  <div className="border-t border-[#f0f0f0] px-4 py-4 sm:px-6">
                    <p className="text-[15px] font-medium text-black">Notes</p>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-[#808080]">&quot;{a.notes ?? "No notes."}&quot;</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusPill status={a.status} />
                      <span className="rounded-full border border-[#e3e3e3] px-3 py-1 text-[13px] text-[#4d4d4d]">{a.findings} finding{a.findings === 1 ? "" : "s"}</span>
                      <span className="rounded-full border border-[#e3e3e3] px-3 py-1 text-[13px] text-[#4d4d4d]">Due {a.due_date ?? "—"}</span>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {visible.length === 0 && (
            <li className="px-5 py-10 text-center text-[14px] text-[#b3b3b3]">
              No audits match your filters. <button onClick={clearAll} className="underline hover:text-black">Clear filters</button>
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
