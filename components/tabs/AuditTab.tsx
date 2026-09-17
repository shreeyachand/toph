"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ColumnHeaders,
  CountBadge,
  EmptyRow,
  ExpandableRow,
  FilterSelect,
  MenuShell,
  Pill,
  SortMenuList,
  TableRows,
  TableSection,
  TableToolbar,
  ViewButton,
  useAnchoredMenus,
  useExpandedIds,
} from "../DataTable";
import { Loading, PageHeader, StatusPill } from "../PageHeader";
import StatCard, { StatGrid } from "../StatCard";

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
  const [sortMode, setSortMode] = useState<SortMode>("due-asc");
  const [status, setStatus] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const { sortAnchorRef, filterAnchorRef, menuPos, toggleMenuAnchored } =
    useAnchoredMenus(openMenu, setOpenMenu);

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

  const { expandedIds, allExpanded, toggleExpandAll, toggleExpanded } =
    useExpandedIds(visible);

  if (!audits) return <Loading label="audits" />;

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

      <div className="mt-4">
      <TableSection>
        <TableToolbar
          icon="book-check"
          title="Audits"
          count={visible.length}
          allExpanded={allExpanded}
          onToggleAll={toggleExpandAll}
          controls={
            <>
              <div ref={sortAnchorRef} className="relative shrink-0">
                <Pill icon="list-filter" onClick={() => toggleMenuAnchored("sort", sortAnchorRef)} ariaExpanded={openMenu === "sort"} ariaLabel={`Sort audits, current: ${sortLabel}`}>
                  {sortMode === "due-asc" ? "Sort" : sortLabel}
                </Pill>
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
              <div ref={filterAnchorRef} className="relative shrink-0">
                <Pill active={activeFilterCount > 0} icon="funnel" onClick={() => toggleMenuAnchored("filter", filterAnchorRef)} ariaExpanded={openMenu === "filter"} ariaLabel="Open filters">
                  Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </Pill>
              </div>
            </>
          }
        />
        {openMenu === "sort" && (
          <MenuShell pos={menuPos} onClose={() => setOpenMenu(null)}>
            <SortMenuList
              options={SORT_OPTIONS}
              value={sortMode}
              onPick={(v) => { setSortMode(v); setOpenMenu(null); }}
            />
          </MenuShell>
        )}
        {openMenu === "filter" && (
          <MenuShell pos={menuPos} onClose={() => setOpenMenu(null)}>
            <div className="space-y-3 px-4 py-3.5">
              <FilterSelect label="Status" value={status} onChange={setStatus} allLabel="All statuses" options={statuses} />
              <FilterSelect label="Assignee" value={assignee} onChange={setAssignee} allLabel="All assignees" options={assignees} />
              <button onClick={clearAll} className="w-full rounded-lg bg-black py-2 text-[13px] font-medium text-white hover:bg-[#222]">Clear all</button>
            </div>
          </MenuShell>
        )}

        <ColumnHeaders
          gridClass="grid-cols-[1.6fr_1fr_0.9fr_0.8fr_0.6fr_92px]"
          allExpanded={allExpanded}
          onToggleAll={toggleExpandAll}
        >
          <span>Audit</span><span>Assignee</span><span>Due</span><span>Status</span><span>Findings</span>
        </ColumnHeaders>

        <TableRows>
          {visible.map((a) => {
            const expanded = expandedIds.has(a.id);
            return (
              <ExpandableRow
                key={a.id}
                expanded={expanded}
                onToggle={() => toggleExpanded(a.id)}
                gridClass="grid-cols-[1fr_auto] md:grid-cols-[1.6fr_1fr_0.9fr_0.8fr_0.6fr_92px]"
                ariaLabel={`${a.title} audit — ${a.status}, ${expanded ? "collapse" : "expand"}`}
                summary={
                  <>
                    <span className="min-w-0 truncate font-normal text-black">{a.title}</span>
                    <span className="hidden truncate md:block">{a.assignee}</span>
                    <span className="hidden truncate md:block">{a.due_date ?? "—"}</span>
                    <span className="hidden md:block"><StatusPill status={a.status} /></span>
                    <span className="hidden md:block">
                      <CountBadge>{a.findings}</CountBadge>
                    </span>
                    <span className="col-span-1 truncate text-[12px] text-[#b3b3b3] md:hidden">
                      {a.assignee} · {a.due_date ?? "—"} · {a.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-right">
                      <ViewButton expanded={expanded} onToggle={() => toggleExpanded(a.id)} />
                    </span>
                  </>
                }
                detail={
                  <div className="px-4 py-4 sm:px-6">
                    <p className="text-[15px] font-medium text-black">Notes</p>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-[#808080]">&quot;{a.notes ?? "No notes."}&quot;</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusPill status={a.status} />
                      <span className="rounded-full border border-[#e3e3e3] px-3 py-1 text-[13px] text-[#4d4d4d]">{a.findings} finding{a.findings === 1 ? "" : "s"}</span>
                      <span className="rounded-full border border-[#e3e3e3] px-3 py-1 text-[13px] text-[#4d4d4d]">Due {a.due_date ?? "—"}</span>
                    </div>
                  </div>
                }
              />
            );
          })}
          {visible.length === 0 && (
            <EmptyRow onClear={clearAll}>
              No audits match your filters.
            </EmptyRow>
          )}
        </TableRows>
      </TableSection>
      </div>
    </div>
  );
}
