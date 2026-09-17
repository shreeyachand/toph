"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "../Icon";
import {
  ColumnHeaders,
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
import { Loading, PageHeader } from "../PageHeader";
import StatCard, { StatGrid } from "../StatCard";
import { REPORT_TYPES, buildReportTitle } from "@/lib/reports";

interface Report { id: string; title: string; type: "week" | "month"; created_at: string; generated_by: string; }

type SortMode = "newest" | "oldest" | "title-az" | "type-az";
type OpenMenu = null | "sort" | "filter";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "title-az", label: "Title A–Z" },
  { value: "type-az", label: "Type A–Z" },
];

/** Reports tab: dashboard-style table with sort + filters, plus a generate form. */
export default function ReportsTab() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [live, setLive] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [type, setType] = useState("all");
  const [author, setAuthor] = useState("all");
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const { sortAnchorRef, filterAnchorRef, menuPos, toggleMenuAnchored } =
    useAnchoredMenus(openMenu, setOpenMenu);
  const [newType, setNewType] = useState<(typeof REPORT_TYPES)[number]>("week");
  const [title, setTitle] = useState(() => buildReportTitle("week"));
  const [saving, setSaving] = useState(false);

  const handleTypeChange = (t: typeof newType) => {
    setNewType(t);
    setTitle(buildReportTitle(t));
  };

  useEffect(() => {
    fetch("/api/reports", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { setReports(j.data); setLive(j.live); })
      .catch(() => {});
  }, []);

  const types = useMemo(() => Array.from(new Set((reports ?? []).map((r) => r.type))).sort(), [reports]);
  const authors = useMemo(() => Array.from(new Set((reports ?? []).map((r) => r.generated_by))).sort(), [reports]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => (reports ?? [])
    .filter((r) => !q || `${r.title} ${r.type} ${r.generated_by}`.toLowerCase().includes(q))
    .filter((r) => (type === "all" ? true : r.type === type))
    .filter((r) => (author === "all" ? true : r.generated_by === author))
    .sort((a, b) => {
      switch (sortMode) {
        case "oldest": return a.created_at.localeCompare(b.created_at);
        case "title-az": return a.title.localeCompare(b.title);
        case "type-az": return a.type.localeCompare(b.type);
        default: return b.created_at.localeCompare(a.created_at);
      }
    }), [reports, q, type, author, sortMode]);

  const { expandedIds, allExpanded, toggleExpandAll, toggleExpanded } =
    useExpandedIds(visible);

  const create = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), type: newType }),
      });
      const j = await res.json();
      if (j.data) setReports((prev) => [j.data, ...(prev ?? [])]);
      setTitle(buildReportTitle(newType));
    } finally { setSaving(false); }
  };

  if (!reports) return <Loading label="reports" />;

  const activeFilterCount = (type === "all" ? 0 : 1) + (author === "all" ? 0 : 1);
  const sortLabel = SORT_OPTIONS.find((s) => s.value === sortMode)?.label ?? "Sort";
  const clearAll = () => { setType("all"); setAuthor("all"); setOpenMenu(null); };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Weekly and monthly activity summaries" query={query} setQuery={setQuery} live={live} />
      <StatGrid cols={3}>
        <StatCard icon="files" label="Saved Reports" value={reports.length} />
        <StatCard icon="calendar" label="This Month" value={reports.filter((r) => r.created_at.startsWith("2026-04")).length} />
        <StatCard icon="users" label="Contributors" value={new Set(reports.map((r) => r.generated_by)).size} />
      </StatGrid>

      {/* Generate form */}
      <section className="mt-4 rounded-2xl border border-[#ececec] bg-white p-4 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <p className="flex items-center gap-2 text-[15px] font-medium text-black lg:pb-2.5">
            <Icon name="files" size={16} /> Generate report
          </p>
          <label className="block flex-1">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-[#e3e3e3] px-3 py-2 text-[14px] outline-none focus:border-[#b3b3b3]" />
          </label>
          <label className="block lg:w-48">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">Type</span>
            <select value={newType} onChange={(e) => handleTypeChange(e.target.value as typeof newType)}
              className="w-full rounded-lg border border-[#e3e3e3] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-[#b3b3b3]">
              {REPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <button onClick={create} disabled={saving || !title.trim()}
            className="rounded-lg bg-black px-5 py-2 text-[14px] font-medium text-white hover:bg-[#222] disabled:opacity-40">
            {saving ? "Generating…" : "Generate"}
          </button>
        </div>
      </section>

      <div className="mt-4">
      <TableSection>
        <TableToolbar
          icon="files"
          title="All reports"
          count={visible.length}
          allExpanded={allExpanded}
          onToggleAll={toggleExpandAll}
          controls={
            <>
              <div ref={sortAnchorRef} className="relative shrink-0">
                <Pill icon="list-filter" onClick={() => toggleMenuAnchored("sort", sortAnchorRef)} ariaExpanded={openMenu === "sort"} ariaLabel={`Sort reports, current: ${sortLabel}`}>
                  {sortMode === "newest" ? "Sort" : sortLabel}
                </Pill>
              </div>
              {type !== "all" && (
                <div className="shrink-0">
                  <Pill active icon="x" onClick={() => setType("all")} ariaLabel={`Clear type filter ${type}`}>{type}</Pill>
                </div>
              )}
              {author !== "all" && (
                <div className="shrink-0">
                  <Pill active icon="x" onClick={() => setAuthor("all")} ariaLabel={`Clear author filter ${author}`}>{author}</Pill>
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
              <FilterSelect label="Type" value={type} onChange={setType} allLabel="All types" options={types} capitalize />
              <FilterSelect label="Generated by" value={author} onChange={setAuthor} allLabel="Everyone" options={authors} />
              <button onClick={clearAll} className="w-full rounded-lg bg-black py-2 text-[13px] font-medium text-white hover:bg-[#222]">Clear all</button>
            </div>
          </MenuShell>
        )}

        <ColumnHeaders
          gridClass="grid-cols-[1.8fr_0.8fr_1fr_0.9fr_92px]"
          allExpanded={allExpanded}
          onToggleAll={toggleExpandAll}
        >
          <span>Report</span><span>Type</span><span>Generated by</span><span>Date</span>
        </ColumnHeaders>

        <TableRows>
          {visible.map((r) => {
            const expanded = expandedIds.has(r.id);
            return (
              <ExpandableRow
                key={r.id}
                expanded={expanded}
                onToggle={() => toggleExpanded(r.id)}
                gridClass="grid-cols-[1fr_auto] md:grid-cols-[1.8fr_0.8fr_1fr_0.9fr_92px]"
                ariaLabel={`${r.title} report — ${r.type}, ${expanded ? "collapse" : "expand"}`}
                summary={
                  <>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef7f1] md:flex">
                        <Icon name="files" size={14} />
                      </span>
                      <span className="min-w-0 truncate font-normal text-black">{r.title}</span>
                    </span>
                    <span className="hidden truncate capitalize md:block">{r.type}</span>
                    <span className="hidden truncate md:block">{r.generated_by}</span>
                    <span className="hidden truncate md:block">{r.created_at.slice(0, 10)}</span>
                    <span className="col-span-1 truncate text-[12px] capitalize text-[#b3b3b3] md:hidden">
                      {r.type} · {r.generated_by} · {r.created_at.slice(0, 10)}
                    </span>
                    <span className="text-right">
                      <ViewButton expanded={expanded} onToggle={() => toggleExpanded(r.id)} />
                    </span>
                  </>
                }
                detail={
                  <div className="px-4 py-4 sm:px-6">
                    <p className="text-[15px] font-medium text-black">Details</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#e3e3e3] px-3 py-1 text-[13px] capitalize text-[#4d4d4d]">{r.type}</span>
                      <span className="rounded-full border border-[#e3e3e3] px-3 py-1 text-[13px] text-[#4d4d4d]">{r.generated_by}</span>
                      <span className="rounded-full border border-[#e3e3e3] px-3 py-1 text-[13px] text-[#4d4d4d]">
                        {new Date(r.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#e3e3e3] bg-white py-2.5 text-[14px] font-medium text-black hover:bg-[#f8f8f8] sm:w-auto sm:px-8">
                      <Icon name="files" size={15} />
                      Download
                    </button>
                  </div>
                }
              />
            );
          })}
          {visible.length === 0 && (
            <EmptyRow onClear={clearAll}>
              No reports match your filters.
            </EmptyRow>
          )}
        </TableRows>
      </TableSection>
      </div>
    </div>
  );
}
