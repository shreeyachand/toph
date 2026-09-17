"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/** Bar + gap geometry (px) — must match the classes on the row and bars. */
const BAR_WIDTH = 2;
const BAR_GAP = 3;
/** Upper bound of bars for very wide containers. Cheap to render. */
const MAX_BARS = 200;

/** Deterministic pseudo-random bar heights so SSR/CSR match. */
function barHeights(count: number, seed = 7): number[] {
  const heights: number[] = [];
  let s = seed;
  for (let i = 0; i < count; i++) {
    s = (s * 16807) % 2147483647;
    const envelope =
      Math.sin(i / 9) * 0.5 + 0.5 > 0.55
        ? 0.9
        : 0.35 + Math.sin(i / 23) * 0.2;
    heights.push(6 + ((s % 100) / 100) * 74 * envelope);
  }
  return heights;
}

export default function Waveform({
  progress = 0.42,
  playing = false,
}: {
  progress?: number;
  playing?: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowWidth, setRowWidth] = useState(0);

  // Fit the bar count to the rendered width so bars never shrink to zero
  // on narrow (mobile) containers. Prefix-sliced, so resizes stay stable.
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setRowWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const allBars = useMemo(() => barHeights(MAX_BARS), []);
  const count =
    rowWidth > 0
      ? Math.max(
          24,
          Math.min(
            MAX_BARS,
            Math.floor((rowWidth + BAR_GAP) / (BAR_WIDTH + BAR_GAP))
          )
        )
      : 24;
  const bars = allBars.slice(0, count);
  const playedCount = Math.floor(bars.length * progress);

  return (
    <div
      ref={rowRef}
      className="flex h-[80px] items-center gap-[3px] overflow-hidden"
      role="img"
      aria-label="Audio waveform"
    >
      {bars.map((h, i) => (
        <span
          key={i}
          style={{ height: `${h}px` }}
          className={`w-[2px] shrink-0 rounded-full transition-colors ${
            i < playedCount ? "bg-[#0d4a32]" : "bg-[#cfd8d3]"
          } ${playing && i === playedCount ? "animate-pulse" : ""}`}
        />
      ))}
    </div>
  );
}
