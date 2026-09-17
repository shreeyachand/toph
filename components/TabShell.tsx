"use client";

import Sidebar, { ShellContext, type TabKey } from "./Sidebar";

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
  onNavigate?: (tab: TabKey) => void;
  children: React.ReactNode;
}) {
  return (
    <ShellContext.Provider value={{ farm, role, active, onNavigate }}>
      <div className="flex min-h-screen gap-4 bg-white p-3 md:p-4">
        <Sidebar farm={farm} role={role} active={active} onNavigate={onNavigate} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </ShellContext.Provider>
  );
}
