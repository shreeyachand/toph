"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar, { ShellContext, type TabKey } from "./Sidebar";
import { EMPLOYEE_TABS, useCurrentUser } from "@/lib/role";

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
  const user = useCurrentUser({ farm, role });
  const router = useRouter();
  const restricted = user.isEmployee && !EMPLOYEE_TABS.includes(active);

  useEffect(() => {
    if (restricted) router.replace("/");
  }, [restricted, router]);

  if (restricted) {
    return <p className="p-6 text-[14px] text-[#808080]">Redirecting…</p>;
  }

  return (
    <ShellContext.Provider
      value={{ farm: user.farm, role: user.role, active, onNavigate }}
    >
      <div className="flex min-h-screen gap-4 bg-white p-3 md:p-4">
        <Sidebar farm={user.farm} role={user.role} active={active} onNavigate={onNavigate} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </ShellContext.Provider>
  );
}
