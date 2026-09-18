"use client";

import { useCallback, useEffect, useState } from "react";
import type { TabKey } from "@/components/Sidebar";

export type UserKind = "admin" | "employee";

export interface CurrentUserOption {
  kind: UserKind;
  /** Name shown in the sidebar header. */
  displayName: string;
  /** Role label shown under the name. */
  roleLabel: string;
  /** Employee name used to scope logs/schedule. Null for admin (sees all). */
  employeeName: string | null;
  farm: string;
}

const STORAGE_KEY = "toph-user-kind";

export const USER_OPTIONS: CurrentUserOption[] = [
  {
    kind: "admin",
    displayName: "Bays Ranch",
    roleLabel: "Admin",
    employeeName: null,
    farm: "Bays Ranch",
  },
  {
    kind: "employee",
    displayName: "Maya Patel",
    roleLabel: "Employee",
    employeeName: "Maya Patel",
    farm: "Bays Ranch",
  },
];

/** Tabs an employee is allowed to see. Everything else is admin-only. */
export const EMPLOYEE_TABS: TabKey[] = [
  "dashboard",
  "activity",
  "schedule",
  "settings",
  "support",
];

export function isEmployeeKind(kind: UserKind | string | null | undefined) {
  return kind === "employee";
}

export function getStoredKind(): UserKind {
  if (typeof window === "undefined") return "admin";
  return window.localStorage.getItem(STORAGE_KEY) === "employee"
    ? "employee"
    : "admin";
}

export function setStoredKind(kind: UserKind) {
  window.localStorage.setItem(STORAGE_KEY, kind);
  // Notify other mounted hooks in the same tab.
  window.dispatchEvent(new CustomEvent("toph-user-change", { detail: kind }));
}

export function optionForKind(kind: UserKind): CurrentUserOption {
  return USER_OPTIONS.find((u) => u.kind === kind) ?? USER_OPTIONS[0];
}

/**
 * Merges the server-provided shell identity (farm/role from /api/meta) with
 * the locally selected user. Admin keeps the server identity; employee gets
 * the employee display name + "Employee" label while keeping the farm.
 */
export function useCurrentUser(meta: { farm: string; role: string } | null) {
  // Start with the server default so the first client paint matches SSR.
  // Reading localStorage in a lazy initializer would render the employee
  // shell during hydration while the server rendered the admin one —
  // "Hydration failed because the server rendered text didn't match".
  const [kind, setKind] = useState<UserKind>("admin");

  useEffect(() => {
    // Sync from storage only after mount (post-hydration update is safe).
    setKind(getStoredKind());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as UserKind | undefined;
      setKind(detail ?? getStoredKind());
    };
    window.addEventListener("toph-user-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("toph-user-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const switchUser = useCallback((next: UserKind) => {
    setStoredKind(next);
    setKind(next);
  }, []);

  const option = optionForKind(kind);
  const employee = kind === "employee";
  return {
    kind,
    isEmployee: employee,
    /** Sidebar header name. */
    farm: employee ? option.displayName : (meta?.farm ?? option.farm),
    /** Actual farm name (never the person) — for greetings/subtitles. */
    farmName: meta?.farm ?? option.farm,
    /** Sidebar role label. */
    role: employee ? option.roleLabel : (meta?.role ?? option.roleLabel),
    employeeName: option.employeeName,
    displayName: employee ? option.displayName : (meta?.farm ?? option.farm),
    switchUser,
  };
}

export type CurrentUserShell = ReturnType<typeof useCurrentUser>;
