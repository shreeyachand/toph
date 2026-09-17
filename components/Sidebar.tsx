"use client";

import { createContext, useEffect, useState } from "react";
import Link from "next/link";
import { getStoredKind, setStoredKind, type UserKind } from "@/lib/role";
import Icon from "./Icon";

export type TabKey =
  | "dashboard"
  | "activity"
  | "map"
  | "audit"
  | "reports"
  | "schedule"
  | "employees"
  | "performance"
  | "messages"
  | "settings"
  | "support";

interface NavItem {
  icon: string;
  label: string;
  tab: TabKey;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/** Nav state shared by the shell so headers can render the menu button inline. */
export interface ShellNav {
  farm: string;
  role: string;
  active: TabKey;
  onNavigate?: (tab: TabKey) => void;
}

export const ShellContext = createContext<ShellNav | null>(null);

/** Canonical URL for every tab — refreshing keeps you on the same view. */
export const TAB_PATHS: Record<TabKey, string> = {
  dashboard: "/",
  activity: "/activity",
  map: "/map",
  audit: "/audit",
  reports: "/reports",
  schedule: "/schedule",
  employees: "/employees",
  performance: "/performance",
  messages: "/messages",
  settings: "/settings",
  support: "/support",
};

const SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { icon: "chart-line", label: "Dashboard", tab: "dashboard", badge: "1" },
      { icon: "audio-lines", label: "Activity Logs", tab: "activity" },
      { icon: "map", label: "Map", tab: "map" },
    ],
  },
  {
    title: "Compliance",
    items: [
      { icon: "book-check", label: "Audit Manager", tab: "audit" },
      { icon: "files", label: "Reports", tab: "reports" },
      { icon: "calendar", label: "Schedule", tab: "schedule" },
    ],
  },
  {
    title: "Team Management",
    items: [
      { icon: "users", label: "Employees", tab: "employees" },
      { icon: "chart-pie", label: "Performance", tab: "performance" },
      { icon: "mail", label: "Messages", tab: "messages" },
    ],
  },
  {
    title: "Other",
    items: [
      { icon: "cog", label: "Settings", tab: "settings" },
      { icon: "handshake", label: "Support", tab: "support" },
    ],
  },
];

const isEmployeeRole = (role: string) => role.toLowerCase() === "employee";

/** Employees see a limited set of tabs, regrouped flatter. */
export function sectionsForRole(role: string): NavSection[] {
  if (!isEmployeeRole(role)) return SECTIONS;
  const byTab = new Map<TabKey, NavItem>();
  for (const section of SECTIONS)
    for (const item of section.items) byTab.set(item.tab, item);
  const pick = (...tabs: TabKey[]): NavItem[] =>
    tabs.map((t) => byTab.get(t)).filter((i): i is NavItem => !!i);
  return [
    { title: "Overview", items: pick("dashboard", "activity", "schedule") },
    { title: "Other", items: pick("settings", "support") },
  ];
}

const SWITCH_TARGETS: { kind: UserKind; label: string; role: string }[] = [
  { kind: "admin", label: "Bays Ranch", role: "Admin" },
  { kind: "employee", label: "Maya Patel", role: "Employee" },
];

function SwitchUserButton() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<UserKind>("admin");

  useEffect(() => {
    setCurrent(getStoredKind());
  }, []);

  const pick = (kind: UserKind) => {
    if (kind === current) {
      setOpen(false);
      return;
    }
    setStoredKind(kind);
    // Reload on dashboard so every shell re-reads the stored user.
    window.location.href = "/";
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Switch user"
        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] text-[#4d4d4d] hover:bg-[#f8f8f8]"
      >
        <Icon name="arrow-right-left" size={16} />
        Switch User
      </button>
      {open && (
        <>
          <span
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute bottom-full left-0 z-20 mb-2 w-full min-w-[220px] overflow-hidden rounded-xl border border-[#ececec] bg-white shadow-xl">
            <p className="px-3.5 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">
              View as
            </p>
            <ul className="pb-1.5">
              {SWITCH_TARGETS.map((t) => {
                const selected = current === t.kind;
                return (
                  <li key={t.kind}>
                    <button
                      type="button"
                      onClick={() => pick(t.kind)}
                      aria-pressed={selected}
                      className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] hover:bg-[#f8f8f8] ${
                        selected ? "font-medium text-black" : "text-[#4d4d4d]"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                          selected ? "border-black" : "border-[#d4d4d4]"
                        }`}
                      >
                        {selected && (
                          <span className="h-2 w-2 rounded-full bg-black" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{t.label}</span>
                        <span className="block text-[12px] text-[#b3b3b3]">
                          {t.role}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default function Sidebar({
  farm,
  role,
  active,
  onNavigate,
}: {
  farm: string;
  role: string;
  active: TabKey;
  onNavigate?: (tab: TabKey) => void;
}) {
  return (
    <aside className="hidden w-[270px] shrink-0 flex-col rounded-2xl border border-[#ececec] bg-white p-4 lg:sticky lg:top-4 lg:flex lg:h-[calc(100vh-2rem)]">
      <SidebarBody
        farm={farm}
        role={role}
        active={active}
        onNavigate={onNavigate}
      />
    </aside>
  );
}

/** Mobile menu button + slide-over drawer. Meant to sit inline with the page title. */
export function MobileNav({
  farm,
  role,
  active,
  onNavigate,
  className = "",
}: {
  farm: string;
  role: string;
  active: TabKey;
  onNavigate?: (tab: TabKey) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open ]);

  return (
    <>
      <span className={`inline-flex shrink-0 lg:hidden ${className}`}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e7e7e7] bg-white text-black hover:bg-[#f5f5f5]"
        >
          <span aria-hidden="true" className="flex flex-col gap-[3px]">
            <span className="block h-[2px] w-4 rounded bg-current" />
            <span className="block h-[2px] w-4 rounded bg-current" />
            <span className="block h-[2px] w-4 rounded bg-current" />
          </span>
        </button>
      </span>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            className="absolute left-0 top-0 flex h-full w-[280px] max-w-[85vw] flex-col bg-white p-4 shadow-xl"
          >
            <div className="flex items-center gap-2.5 px-1 pb-4">
              <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#146c44] text-[15px] font-semibold text-white">
                {farm.charAt(0)}
              </div>
              <div className="leading-tight">
                <p className="text-[13px] font-semibold text-black">{farm}</p>
                <p className="flex items-center gap-1 text-[12px] text-[#b3b3b3]">
                  <Icon name={isEmployeeRole(role) ? "users" : "user-star"} size={10} />
                  {role}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="ml-auto rounded-lg p-1.5 text-[#4d4d4d] hover:bg-[#f5f5f5]"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <SidebarBody
                farm={farm}
                role={role}
                active={active}
                hideHeader
                onNavigate={(tab) => {
                  onNavigate?.(tab);
                  setOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SidebarBody({
  farm,
  role,
  active,
  onNavigate,
  hideHeader = false,
}: {
  farm: string;
  role: string;
  active: TabKey;
  onNavigate?: (tab: TabKey) => void;
  hideHeader?: boolean;
}) {
  const sections = sectionsForRole(role);
  return (
    <>
      {/* User header */}
      {!hideHeader && (
        <div className="flex shrink-0 items-center gap-2.5 px-1 pb-4">
          <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#146c44] text-[15px] font-semibold text-white">
            {farm.charAt(0)}
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-semibold text-black">{farm}</p>
            <p className="flex items-center gap-1 text-[12px] text-[#b3b3b3]">
              <Icon name={isEmployeeRole(role) ? "users" : "user-star"} size={10} />
              {role}
            </p>
          </div>
          <button
            aria-label="Inbox"
            className="ml-auto rounded-lg p-1.5 text-[#4d4d4d] hover:bg-[#f5f5f5]"
          >
            <Icon name="inbox" size={16} />
          </button>
        </div>
      )}

      {/* Nav sections */}
      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto nice-scroll">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-2 pb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#b3b3b3]">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.label}>
                  <Link
                    href={TAB_PATHS[item.tab]}
                    onClick={() => onNavigate?.(item.tab)}
                    aria-current={active === item.tab ? "page" : undefined}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] transition-colors ${
                      active === item.tab
                        ? "bg-[#f2f2f2] font-medium text-black"
                        : "text-[#4d4d4d] hover:bg-[#f8f8f8]"
                    }`}
                  >
                    <Icon name={item.icon} size={16} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="flex h-[18px] min-w-[28px] items-center justify-center rounded-full bg-[#b9e2c6] px-1.5 text-[11px] font-semibold text-[#0b3d25]">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="shrink-0 space-y-0.5 pt-4">
        <SwitchUserButton />
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] text-[#4d4d4d] hover:bg-[#f8f8f8]"
        >
          <Icon name="log-out" size={16} />
          Log Out
        </a>
      </div>
    </>
  );
}
