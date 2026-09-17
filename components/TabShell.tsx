"use client";

import Sidebar, { type TabKey } from "./Sidebar";

/** Shared shell matching Dashboard's layout for all non-dashboard tabs. */
export default function TabShell({
  farm,
  role,
  active,
  onNavigate,
  children,
}: {
  farm: string;
  role: string;
  active: TabKey;
  onNavigate: (tab: TabKey) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen gap-4 bg-white p-3 md:p-4">
      <Sidebar farm={farm} role={role} active={active} onNavigate={onNavigate} />
      <main className="min-w-0 flex-1">
        <div className="mb-3 flex items-center gap-2 lg:hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#146c44] text-[14px] font-semibold text-white">
            {farm.charAt(0)}
          </div>
          <p className="text-[14px] font-semibold">{farm}</p>
        </div>
        {children}
      </main>
    </div>
  );
}
