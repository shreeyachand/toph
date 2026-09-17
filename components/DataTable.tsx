"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "./Icon";

/* ------------------------------------------------------------------ */
/* Pill                                                                */
/* ------------------------------------------------------------------ */

export function Pill({
  active,
  icon,
  children,
  onClick,
  ariaExpanded,
  ariaLabel,
}: {
  active?: boolean;
  icon?: string;
  children: ReactNode;
  onClick?: () => void;
  ariaExpanded?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-expanded={ariaExpanded}
      aria-label={ariaLabel}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
        active
          ? "bg-black text-white hover:bg-[#222]"
          : "border border-[#e3e3e3] bg-white text-[#4d4d4d] hover:bg-[#f8f8f8]"
      }`}
    >
      {icon &&
        (active ? (
          <span className="brightness-0 invert">
            <Icon name={icon} size={14} />
          </span>
        ) : (
          <Icon name={icon} size={14} />
        ))}
      <span className="whitespace-nowrap">{children}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Anchored dropdown menu (viewport-fixed so mobile scroll rows can't   */
/* clip it). Shared by Logs / Audits / Reports / Schedule.             */
/* ------------------------------------------------------------------ */

export interface MenuCoords {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

/** Viewport-anchored position for a dropdown under its trigger button. */
export function menuCoordsFor(
  rect: DOMRect,
  align: "left" | "right"
): MenuCoords {
  const MENU_W = 208; // w-52
  const GAP = 8;
  const EST_H = 320;
  const pad = 8;
  const maxEdge = Math.max(pad, window.innerWidth - MENU_W - pad);
  const below = window.innerHeight - rect.bottom - GAP;
  const vertical =
    below >= EST_H || below >= rect.top
      ? { top: Math.round(rect.bottom + GAP) }
      : { bottom: Math.round(window.innerHeight - rect.top + GAP) };
  return align === "left"
    ? {
        ...vertical,
        left: Math.round(Math.min(Math.max(rect.left, pad), maxEdge)),
      }
    : {
        ...vertical,
        right: Math.round(
          Math.min(Math.max(window.innerWidth - rect.right, pad), maxEdge)
        ),
      };
}

export function MenuShell({
  onClose,
  children,
  align = "right",
  pos = null,
}: {
  onClose: () => void;
  children: ReactNode;
  align?: "right" | "left";
  /** When provided, the panel is viewport-fixed at these coords (ignores `align`). */
  pos?: MenuCoords | null;
}) {
  return (
    <>
      <button
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-transparent"
      />
      <div
        role="menu"
        style={pos ?? undefined}
        className={`${
          pos ? "fixed" : "absolute top-[calc(100%+8px)]"
        } z-40 w-52 overflow-hidden rounded-xl border border-[#ececec] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)] ${
          pos ? "" : align === "right" ? "right-0" : "left-0"
        }`}
      >
        {children}
      </div>
    </>
  );
}

/**
 * Anchored sort/filter menus. Keeps the open menu glued to its pill across
 * scroll/resize; Esc closes. Replaces the ad-hoc absolute menus that got
 * clipped inside the mobile horizontal scroll row.
 */
export function useAnchoredMenus<TOpen extends string>(
  openMenu: TOpen | null,
  setOpenMenu: (m: TOpen | null) => void
) {
  const sortAnchorRef = useRef<HTMLDivElement>(null);
  const filterAnchorRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<MenuCoords | null>(null);

  const placeMenu = useCallback(
    (menu: TOpen) => {
      const anchor =
        (menu === "sort" ? sortAnchorRef : filterAnchorRef).current;
      const rect = anchor?.getBoundingClientRect();
      if (!rect) {
        setOpenMenu(null);
        return;
      }
      setMenuPos(menuCoordsFor(rect, menu === "sort" ? "left" : "right"));
    },
    [setOpenMenu]
  );

  const toggleMenuAnchored = useCallback(
    (menu: TOpen, anchorRef: React.RefObject<HTMLDivElement | null>) => {
      if (openMenu === menu) {
        setOpenMenu(null);
        return;
      }
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect)
        setMenuPos(menuCoordsFor(rect, menu === "sort" ? "left" : "right"));
      setOpenMenu(menu);
    },
    [openMenu, setOpenMenu]
  );

  useEffect(() => {
    if (!openMenu) return;
    const onMove = () => placeMenu(openMenu);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("resize", onMove);
    document.addEventListener("scroll", onMove, true);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", onMove);
      document.removeEventListener("scroll", onMove, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu, placeMenu, setOpenMenu]);

  return { sortAnchorRef, filterAnchorRef, menuPos, toggleMenuAnchored };
}

/** Generic sort-option list used inside a MenuShell. */
export function SortMenuList<T extends string>({
  options,
  value,
  onPick,
}: {
  options: { value: T; label: string }[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <>
      {options.map((opt) => (
        <button
          key={opt.value}
          role="menuitemradio"
          aria-checked={value === opt.value}
          onClick={() => onPick(opt.value)}
          className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] hover:bg-[#f8f8f8] ${
            value === opt.value
              ? "font-semibold text-black"
              : "text-[#4d4d4d]"
          }`}
        >
          {opt.label}
          {value === opt.value && <span aria-hidden>✓</span>}
        </button>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Expand / collapse state shared by every table                        */
/* ------------------------------------------------------------------ */

export function useExpandedIds<T extends { id: string }>(visible: T[]) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const allExpanded =
    visible.length > 0 && visible.every((r) => expandedIds.has(r.id));
  const toggleExpandAll = useCallback(() => {
    setExpandedIds(allExpanded ? new Set() : new Set(visible.map((r) => r.id)));
  }, [allExpanded, visible]);
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  return { expandedIds, allExpanded, toggleExpandAll, toggleExpanded, setExpandedIds };
}

/* ------------------------------------------------------------------ */
/* Table chrome                                                         */
/* ------------------------------------------------------------------ */

export function TableSection({ children }: { children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#ececec] bg-white">
      {children}
    </section>
  );
}

/** Panel header: title + mobile View All + pills scroll row. */
export function TableToolbar({
  icon,
  title,
  count,
  allExpanded,
  onToggleAll,
  controls,
}: {
  icon: string;
  title: string;
  count: number;
  allExpanded?: boolean;
  onToggleAll?: () => void;
  controls?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center">
      <div className="flex items-center gap-2">
        <p className="flex items-center gap-2 text-[15px] font-medium text-black">
          <Icon name={icon} size={16} />
          {title}{" "}
          <span className="font-normal text-[#b3b3b3]">({count})</span>
        </p>
        {onToggleAll !== undefined && allExpanded !== undefined && (
          <button
            onClick={onToggleAll}
            aria-expanded={allExpanded}
            className="ml-auto rounded-full border border-[#e3e3e3] px-3.5 py-1.5 text-[13px] text-[#4d4d4d] hover:bg-[#f5f5f5] md:hidden"
          >
            {allExpanded ? "Close All" : "View All"}
          </button>
        )}
      </div>
      {controls && (
        <div className="nice-scroll -mx-4 flex flex-nowrap items-center gap-2 overflow-x-auto px-4 pb-0.5 lg:mx-0 lg:ml-auto lg:flex-wrap lg:justify-end lg:overflow-visible lg:px-0">
          {controls}
        </div>
      )}
    </div>
  );
}

export function ColumnHeaders({
  gridClass,
  children,
  allExpanded,
  onToggleAll,
}: {
  gridClass: string;
  children: ReactNode;
  allExpanded?: boolean;
  onToggleAll?: () => void;
}) {
  return (
    <div
      className={`hidden items-center gap-2 border-y border-[#f0f0f0] px-5 py-3 text-[12px] font-medium uppercase tracking-wide text-[#c4c4c4] md:grid ${gridClass}`}
    >
      {children}
      {onToggleAll !== undefined && allExpanded !== undefined && (
        <span className="text-right">
          <button
            onClick={onToggleAll}
            aria-expanded={allExpanded}
            className="rounded-full border border-[#e3e3e3] px-3.5 py-1.5 text-[13px] normal-case tracking-normal text-[#4d4d4d] hover:bg-[#f5f5f5]"
          >
            {allExpanded ? "Close All" : "View All"}
          </button>
        </span>
      )}
    </div>
  );
}

export function ViewButton({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-expanded={expanded}
      className="rounded-full border border-[#e9e9e9] bg-white px-4 py-1.5 text-[13px] text-[#4d4d4d] hover:bg-[#f5f5f5]"
    >
      {expanded ? "Close" : "View"}
    </button>
  );
}

/**
 * One expandable row. The whole summary row toggles (click + Enter/Space)
 * for consistent behavior across Logs / Audits / Reports / Employees.
 */
export function ExpandableRow({
  expanded,
  onToggle,
  gridClass,
  summary,
  detail,
  ariaLabel,
  expandedClassName = "bg-[#fafafa]",
  collapsedClassName = "bg-white",
}: {
  expanded: boolean;
  onToggle: () => void;
  gridClass: string;
  summary: ReactNode;
  detail?: ReactNode;
  ariaLabel?: string;
  expandedClassName?: string;
  collapsedClassName?: string;
}) {
  return (
    <li className={expanded ? expandedClassName : collapsedClassName}>
      <div
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={ariaLabel}
        className={`grid cursor-pointer items-center gap-2 px-4 py-3.5 text-[14px] text-[#4d4d4d] sm:px-5 md:cursor-default ${gridClass}`}
      >
        {summary}
      </div>
      {expanded && detail && (
        <div className="border-t border-[#f0f0f0]">{detail}</div>
      )}
    </li>
  );
}

export function TableRows({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-[#f0f0f0]">{children}</ul>;
}

export function EmptyRow({
  children,
  onClear,
  clearLabel = "Clear filters",
}: {
  children: ReactNode;
  onClear?: () => void;
  clearLabel?: string;
}) {
  return (
    <li className="px-5 py-10 text-center text-[14px] text-[#b3b3b3]">
      {children}{" "}
      {onClear && (
        <button onClick={onClear} className="underline hover:text-black">
          {clearLabel}
        </button>
      )}
    </li>
  );
}

/** Green count badge (findings / log volume). */
export function CountBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[18px] min-w-[28px] items-center justify-center rounded-full bg-[#b9e2c6] px-1.5 text-[11px] font-semibold text-[#0b3d25]">
      {children}
    </span>
  );
}

/** Checkbox cell used by the logs table (stops row-toggle propagation). */
export function RowCheckbox({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={label}
      aria-pressed={checked}
      className={`flex h-4 w-4 items-center justify-center rounded-[4px] border ${
        checked ? "border-black bg-black" : "border-[#d4d4d4] bg-white"
      }`}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M2 5.2 4.2 7.4 8 3"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

/** Labeled select inside a filter MenuShell. */
export function FilterSelect({
  label,
  value,
  onChange,
  allLabel,
  options,
  capitalize = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  options: (string | { value: string; label: string })[];
  capitalize?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border border-[#e3e3e3] bg-white px-2.5 py-2 text-[13px] text-black outline-none focus:border-[#b3b3b3] ${
          capitalize ? "capitalize" : ""
        }`}
      >
        <option value="all">{allLabel}</option>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const lab = typeof o === "string" ? o.replace(/_/g, " ") : o.label;
          return (
            <option key={v} value={v}>
              {lab}
            </option>
          );
        })}
      </select>
    </label>
  );
}
