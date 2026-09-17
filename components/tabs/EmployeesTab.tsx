"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchRecordings } from "@/lib/data";
import type { EmployeeLog } from "@/lib/types";
import Icon from "../Icon";
import { Loading, PageHeader, StatusPill } from "../PageHeader";
import StatCard from "../StatCard";

interface Employee { id: string; full_name: string; role: string; phone: string | null; email: string | null; status: string; hire_date: string | null; }

/** Employees tab: roster with expandable profiles + jump to filtered schedule. */
export default function EmployeesTab({ onViewSchedule }: { onViewSchedule?: (name: string) => void }) {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [live, setLive] = useState(false);
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState<EmployeeLog[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();

  const viewSchedule = (name: string) => {
    if (onViewSchedule) {
      onViewSchedule(name);
      return;
    }
    router.push(`/schedule?person=${encodeURIComponent(name)}`);
  };

  useEffect(() => {
    fetch("/api/employees", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { setEmployees(j.data); setLive(j.live); })
      .catch(() => {});
    fetchRecordings({ limit: 200 }).then((r) => setLogs(r.data)).catch(() => {});
    fetch("/api/performance", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const m: Record<string, number> = {};
        for (const p of j.data as Array<{ employee: string; score: number }>) m[p.employee] = p.score;
        setScores(m);
      })
      .catch(() => {});
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (employees ?? []).filter((e) => !q || `${e.full_name} ${e.role}`.toLowerCase().includes(q));
  }, [employees, query]);

  const logsByEmployee = useMemo(() => {
    const m = new Map<string, EmployeeLog[]>();
    for (const l of logs) {
      if (!m.has(l.employee)) m.set(l.employee, []);
      m.get(l.employee)!.push(l);
    }
    for (const list of m.values()) list.sort((a, b) => b.isoDate.localeCompare(a.isoDate));
    return m;
  }, [logs]);

  if (!employees) return <Loading label="employees" />;

  return (
    <div>
      <PageHeader title="Employees" subtitle="Active crew, roles and recording volume" query={query} setQuery={setQuery} live={live} />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon="users" label="Active Workers" value={employees.length} />
        <StatCard icon="audio-lines" label="Workers With Logs" value={logsByEmployee.size} />
        <StatCard icon="star" label="Admins" value={employees.filter((e) => e.role === "admin").length} />
      </div>
      <section className="mt-4 overflow-hidden rounded-2xl border border-[#ececec] bg-white">
        <p className="flex items-center gap-2 px-4 pt-4 text-[15px] font-medium text-black sm:px-5">
          <Icon name="users" size={16} /> Crew <span className="font-normal text-[#b3b3b3]">({visible.length})</span>
        </p>
        <div className="hidden grid-cols-[1.4fr_1fr_1fr_0.8fr_0.5fr_92px] gap-2 border-y border-[#f0f0f0] px-5 py-3 text-[12px] font-medium uppercase tracking-wide text-[#c4c4c4] md:grid">
          <span>Name</span><span>Role</span><span>Contact</span><span>Hired</span><span>Logs</span><span />
        </div>
        <ul className="mt-2 divide-y divide-[#f0f0f0] md:mt-0">
          {visible.map((e) => {
            const expanded = expandedId === e.id;
            const empLogs = logsByEmployee.get(e.full_name) ?? [];
            const score = scores[e.full_name];
            return (
              <li key={e.id} className={expanded ? "bg-[#fafafa]" : "bg-white"}>
                <div className="grid grid-cols-[1fr_auto] items-center gap-2 px-4 py-3.5 sm:px-5 md:grid-cols-[1.4fr_1fr_1fr_0.8fr_0.5fr_92px]">
                  <button onClick={() => setExpandedId(expanded ? null : e.id)} aria-expanded={expanded}
                    className="flex min-w-0 items-center gap-2.5 text-left">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#146c44] text-[13px] font-semibold text-white">
                      {e.full_name.charAt(0)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-black hover:underline">{e.full_name}</span>
                      <span className="block truncate text-[12px] capitalize text-[#b3b3b3] md:hidden">{e.role} · {empLogs.length} logs</span>
                    </span>
                  </button>
                  <span className="hidden text-[14px] capitalize text-[#4d4d4d] md:block">{e.role}</span>
                  <span className="hidden truncate text-[14px] text-[#4d4d4d] md:block">{e.phone ?? e.email ?? "—"}</span>
                  <span className="hidden text-[14px] text-[#4d4d4d] md:block">{e.hire_date ?? "—"}</span>
                  <span className="hidden md:block">
                    <span className="inline-flex h-[18px] min-w-[28px] items-center justify-center rounded-full bg-[#b9e2c6] px-1.5 text-[11px] font-semibold text-[#0b3d25]">
                      {empLogs.length}
                    </span>
                  </span>
                  <span className="text-right">
                    <button onClick={() => setExpandedId(expanded ? null : e.id)} aria-expanded={expanded}
                      className="rounded-full border border-[#e9e9e9] bg-white px-4 py-1.5 text-[13px] text-[#4d4d4d] hover:bg-[#f5f5f5]">
                      {expanded ? "Close" : "View"}
                    </button>
                  </span>
                </div>
                {expanded && (
                  <div className="border-t border-[#f0f0f0] px-4 py-4 sm:px-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[15px] font-medium text-black">Info</p>
                        <dl className="mt-2 space-y-1.5 text-[14px]">
                          <div className="flex gap-2"><dt className="w-16 shrink-0 text-[#b3b3b3]">Role</dt><dd className="capitalize text-black">{e.role}</dd></div>
                          <div className="flex gap-2"><dt className="w-16 shrink-0 text-[#b3b3b3]">Phone</dt><dd className="text-black">{e.phone ?? "—"}</dd></div>
                          <div className="flex gap-2"><dt className="w-16 shrink-0 text-[#b3b3b3]">Email</dt><dd className="truncate text-black">{e.email ?? "—"}</dd></div>
                          <div className="flex gap-2"><dt className="w-16 shrink-0 text-[#b3b3b3]">Hired</dt><dd className="text-black">{e.hire_date ?? "—"}</dd></div>
                          <div className="flex items-center gap-2"><dt className="w-16 shrink-0 text-[#b3b3b3]">Status</dt><dd><StatusPill status={e.status} /></dd></div>
                          {score !== undefined && (
                            <div className="flex gap-2"><dt className="w-16 shrink-0 text-[#b3b3b3]">Score</dt><dd className="font-medium text-black">{score} / 100</dd></div>
                          )}
                        </dl>
                      </div>
                      <div>
                        <p className="text-[15px] font-medium text-black">Recent logs ({empLogs.length})</p>
                        {empLogs.length > 0 ? (
                          <ul className="mt-2 space-y-1.5">
                            {empLogs.slice(0, 3).map((l) => (
                              <li key={l.id} className="truncate text-[13px] text-[#4d4d4d]">
                                {l.activity} · {l.field} · <span className="text-[#b3b3b3]">{l.date}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-[13px] text-[#b3b3b3]">No recordings yet.</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => viewSchedule(e.full_name)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-black py-2.5 text-[14px] font-medium text-white hover:bg-[#222] sm:w-auto sm:px-8"
                    >
                      <Icon name="calendar" size={15} />
                      View {e.full_name.split(" ")[0]}&apos;s schedule
                    </button>
                  </div>
                )}
              </li>
            );
          })}
          {visible.length === 0 && <li className="px-5 py-10 text-center text-[14px] text-[#b3b3b3]">No employees match your search.</li>}
        </ul>
      </section>
    </div>
  );
}
