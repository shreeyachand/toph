"use client";

import { useContext } from "react";
import Icon from "./Icon";
import { MobileNav, ShellContext } from "./Sidebar";

export function PageHeader({
  title,
  subtitle,
  query,
  setQuery,
  live,
  nav,
}: {
  title: string;
  subtitle: string;
  query?: string;
  setQuery?: (q: string) => void;
  live?: boolean;
  nav?: React.ReactNode;
}) {
  const shell = useContext(ShellContext);
  const menu =
    nav ??
    (shell ? (
      <MobileNav
        farm={shell.farm}
        role={shell.role}
        active={shell.active}
        onNavigate={shell.onNavigate}
        newCount={shell.newCount}
        className="mt-[1px]"
      />
    ) : null);

  return (
    <div className="sticky top-0 z-30 -mx-3 flex flex-wrap items-start gap-3 border-b border-[#f0f0f0] bg-white px-3 pb-3 pt-3 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
      <div className="flex min-w-0 items-start gap-2.5">
        {menu}
        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold tracking-tight text-black">{title}</h1>
          <p className="text-[14px] text-[#4d4d4d]">
            {subtitle}
            {live === false && (
              <span className="ml-2 rounded-full bg-[#f2f2f2] px-2 py-0.5 text-[11px] text-[#808080]">
                mock data — connect Supabase to go live
              </span>
            )}
          </p>
        </div>
      </div>
      {setQuery !== undefined && (
        <label className="ml-auto flex w-full max-w-[370px] items-center gap-2 rounded-full border border-[#e7e7e7] bg-white px-3.5 py-2 text-[14px] text-[#b3b3b3] focus-within:border-[#b3b3b3]">
          <Icon name="search" size={15} />
          <input
            value={query ?? ""}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-black outline-none placeholder:text-[#c9c9c9]"
          />
        </label>
      )}
    </div>
  );
}

export function Loading({ label }: { label: string }) {
  return <p className="p-6 text-[14px] text-[#808080]">Loading {label}…</p>;
}

export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: "bg-[#e8f3ec] text-[#146c44]",
    open: "bg-[#e8f3ec] text-[#146c44]",
    reviewed: "bg-[#f2f2f2] text-[#4d4d4d]",
    passed: "bg-[#e8f3ec] text-[#146c44]",
    resolved: "bg-[#e8f3ec] text-[#146c44]",
    flagged: "bg-[#fdeaea] text-[#b3261e]",
    failed: "bg-[#fdeaea] text-[#b3261e]",
    critical: "bg-[#fdeaea] text-[#b3261e]",
    in_progress: "bg-[#e8effe] text-[#1a56db]",
    pending: "bg-[#fff4e0] text-[#9a6700]",
    warning: "bg-[#fff4e0] text-[#9a6700]",
    info: "bg-[#f2f2f2] text-[#4d4d4d]",
    shift: "bg-[#e8effe] text-[#1a56db]",
    task: "bg-[#f2f2f2] text-[#4d4d4d]",
    time_off: "bg-[#fff4e0] text-[#9a6700]",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[12px] font-medium capitalize ${styles[status] ?? "bg-[#f2f2f2] text-[#4d4d4d]"}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
