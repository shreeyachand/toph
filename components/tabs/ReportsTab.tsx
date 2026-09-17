"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "../Icon";
import { Loading, PageHeader } from "../PageHeader";
import StatCard, { StatGrid } from "../StatCard";
import { MenuShell, Pill } from "../LogsPanel";

interface Report { id: string; title: string; type: string; created_at: string; generated_by: string; }

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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [type, setType] = useState("all");
  const [author, setAuthor] = useState("all");
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [title, setTitle] = useState("");
  const [newType, setNewType] = useState("weekly");
  const [saving, setSaving] = useState(false);

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
      setTitle("");
    } finally { setSaving(false); }
  };

  if (!reports) return <Loading label="reports" />;

  const allExpanded = visible.length > 0 && visible.every((r) => expandedIds.has(r.id));
  const toggleExpandAll = () => setExpandedIds(allExpanded ? new Set() : new Set(visible.map((r) => r.id)));
  const toggleExpanded = (id: string) => setExpandedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleMenu = (menu: Exclude<OpenMenu, null>) => setOpenMenu((cur) => (cur === menu ? null : menu));
  const activeFilterCount = (type === "all" ? 0 : 1) + (author === "all" ? 0 : 1);
  const sortLabel = SORT_OPTIONS.find((s) => s.value === sortMode)?.label ?? "Sort";
  const clearAll = () => { setType("all"); setAuthor("all"); setOpenMenu(null); };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Saved exports and summaries for auditors and payroll" query={query} setQuery={setQuery} live={live} />
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
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekly Spray Summary"
              className="w-full rounded-lg border border-[#e3e3e3] px-3 py-2 text-[14px] outline-none focus:border-[#b3b3b3]" />
          </label>
          <label className="block lg:w-48">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">Type</span>
            <select value={newType} onChange={(e) => setNewType(e.target.value)}
              className="w-full rounded-lg border border-[#e3e3e3] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-[#b3b3b3]">
              {["weekly", "compliance", "accuracy", "payroll", "custom"].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <button onClick={create} disabled={saving || !title.trim()}
            className="rounded-lg bg-black px-5 py-2 text-[14px] font-medium text-white hover:bg-[#222] disabled:opacity-40">
            {saving ? "Generating…" : "Generate"}
          </button>
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-[#ececec] bg-white">
        {/* Panel header */}
        <div className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2">
            <p className="flex items-center gap-2 text-[15px] font-medium text-black">
              <Icon name="files" size={16} />
              All reports <span className="font-normal text-[#b3b3b3]">({visible.length})</span>
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
              <Pill icon="list-filter" onClick={() => toggleMenu("sort")} ariaExpanded={openMenu === "sort"} ariaLabel={`Sort reports, current: ${sortLabel}`}>
                {sortMode === "newest" ? "Sort" : sortLabel}
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
            <div className="relative shrink-0">
              <Pill active={activeFilterCount > 0} icon="funnel" onClick={() => toggleMenu("filter")} ariaExpanded={openMenu === "filter"} ariaLabel="Open filters">
                Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </Pill>
              {openMenu === "filter" && (
                <MenuShell onClose={() => setOpenMenu(null)}>
                  <div className="space-y-3 px-4 py-3.5">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">Type</span>
                      <select value={type} onChange={(e) => setType(e.target.value)}
                        className="w-full rounded-lg border border-[#e3e3e3] bg-white px-2.5 py-2 text-[13px] text-black capitalize outline-none focus:border-[#b3b3b3]">
                        <option value="all">All types</option>
                        {types.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">Generated by</span>
                      <select value={author} onChange={(e) => setAuthor(e.target.value)}
                        className="w-full rounded-lg border border-[#e3e3e3] bg-white px-2.5 py-2 text-[13px] text-black outline-none focus:border-[#b3b3b3]">
                        <option value="all">Everyone</option>
                        {authors.map((a) => <option key={a} value={a}>{a}</option>)}
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
        <div className="hidden grid-cols-[1.8fr_0.8fr_1fr_0.9fr_92px] items-center gap-2 border-y border-[#f0f0f0] px-5 py-3 text-[12px] font-medium uppercase tracking-wide text-[#c4c4c4] md:grid">
          <span>Report</span><span>Type</span><span>Generated by</span><span>Date</span>
          <span className="text-right">
            <button onClick={toggleExpandAll} aria-expanded={allExpanded}
              className="rounded-full border border-[#e3e3e3] px-3.5 py-1.5 text-[13px] normal-case tracking-normal text-[#4d4d4d] hover:bg-[#f5f5f5]">
              {allExpanded ? "Close All" : "View All"}
            </button>
          </span>
        </div>

        {/* Rows */}
        <ul className="divide-y divide-[#f0f0f0]">
          {visible.map((r) => {
            const expanded = expandedIds.has(r.id);
            return (
              <li key={r.id} className={expanded ? "bg-[#fafafa]" : "bg-white"}>
                <div className="grid grid-cols-[1fr_auto] items-center gap-2 px-4 py-3.5 text-[14px] text-[#4d4d4d] sm:px-5 md:grid-cols-[1.8fr_0.8fr_1fr_0.9fr_92px]">
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
                    <button onClick={() => toggleExpanded(r.id)} aria-expanded={expanded}
                      className="rounded-full border border-[#e9e9e9] bg-white px-4 py-1.5 text-[13px] text-[#4d4d4d] hover:bg-[#f5f5f5]">
                      {expanded ? "Close" : "View"}
                    </button>
                  </span>
                </div>
                {expanded && (
                  <div className="border-t border-[#f0f0f0] px-4 py-4 sm:px-6">
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
                )}
              </li>
            );
          })}
          {visible.length === 0 && (
            <li className="px-5 py-10 text-center text-[14px] text-[#b3b3b3]">
              No reports match your filters. <button onClick={clearAll} className="underline hover:text-black">Clear filters</button>
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
