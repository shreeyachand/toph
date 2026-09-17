import {
  Children,
  cloneElement,
  isValidElement,
  type ReactNode,
} from "react";
import Icon from "./Icon";

const DESKTOP_COLS = {
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
} as const;

/**
 * Responsive stat grid: compact 2-column layout on phones, roomier grid on
 * larger screens. Automatically opts children into `compactOnMobile` and
 * spans an orphaned last card full-width so 3-card grids never leave a
 * half-width hole. `cols` controls the xl breakpoint column count.
 */
export function StatGrid({
  children,
  cols = 3,
  className = "",
}: {
  children: ReactNode;
  cols?: keyof typeof DESKTOP_COLS;
  className?: string;
}) {
  const items = Children.toArray(children).map((child) =>
    isValidElement<{ compactOnMobile?: boolean }>(child)
      ? cloneElement(child, {
          compactOnMobile: child.props.compactOnMobile ?? true,
        })
      : child
  );
  const wrapLast = items.length > 0 && items.length % 2 === 1;
  const rest = wrapLast ? items.slice(0, -1) : items;
  const last = wrapLast ? items[items.length - 1] : null;

  return (
    <div
      className={`mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-4 ${DESKTOP_COLS[cols]} ${className}`}
    >
      {rest}
      {last != null && (
        <div
          key="stat-grid-span"
          className={cols === 2 ? "col-span-2" : "col-span-2 xl:col-span-1"}
        >
          {last}
        </div>
      )}
    </div>
  );
}

export default function StatCard({
  icon,
  label,
  value,
  suffix,
  compactOnMobile = false,
}: {
  icon: string;
  label: string;
  value: string | number;
  suffix?: string;
  /** Denser layout below the sm breakpoint (e.g. 2×2 grids on phones). */
  compactOnMobile?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#ececec] bg-white ${
        compactOnMobile ? "p-3 sm:p-5" : "p-5"
      }`}
    >
      <p
        className={`flex items-center font-medium text-black ${
          compactOnMobile
            ? "gap-1.5 text-[13px] sm:gap-2 sm:text-[15px]"
            : "gap-2 text-[15px]"
        }`}
      >
        <Icon name={icon} size={16} />
        {label}
      </p>
      <p
        className={`flex items-baseline font-display ${
          compactOnMobile
            ? "mt-2 flex-wrap gap-x-2 gap-y-0.5 sm:mt-3 sm:gap-3"
            : "mt-3 gap-3"
        }`}
      >
        <span
          className={`font-medium leading-none tracking-tight text-black ${
            compactOnMobile
              ? "text-[26px] sm:text-[48px]"
              : "text-[36px] sm:text-[48px]"
          }`}
        >
          {value}
        </span>
        {suffix && (
          <span
            className={`font-normal text-[#808080] ${
              compactOnMobile ? "text-[12px] sm:text-[14px]" : "text-[14px]"
            }`}
          >
            {suffix}
          </span>
        )}
      </p>
    </div>
  );
}
