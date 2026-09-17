/** Deterministic report title + filters. Same input (type + date) → same output. */

export const REPORT_TYPES = ["week", "month"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday (UTC) of the week containing `now`. */
export function startOfWeekUTC(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const offset = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() - offset);
  return d;
}

export function buildReportFilters(type: ReportType, now: Date = new Date()) {
  if (type === "month") {
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    return { month: `${y}-${m}` };
  }
  const start = startOfWeekUTC(now);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return { from: isoDay(start), to: isoDay(end) };
}

/** e.g. week → "Weekly Activity Summary Sep 7–13", month → "Monthly Activity Summary — September" */
export function buildReportTitle(type: ReportType, now: Date = new Date()): string {
  if (type === "month") {
    return `Monthly Activity Summary — ${MONTHS_LONG[now.getUTCMonth()]}`;
  }
  const start = startOfWeekUTC(now);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const left = `${MONTHS_SHORT[start.getUTCMonth()]} ${start.getUTCDate()}`;
  const right = sameMonth ? String(end.getUTCDate()) : `${MONTHS_SHORT[end.getUTCMonth()]} ${end.getUTCDate()}`;
  return `Weekly Activity Summary ${left}–${right}`;
}
