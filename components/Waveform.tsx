"use client";

import { useMemo } from "react";

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
  const bars = useMemo(() => barHeights(120), []);
  const playedCount = Math.floor(bars.length * progress);

  return (
    <div
      className="flex h-[80px] items-center gap-[3px]"
      role="img"
      aria-label="Audio waveform"
    >
      {bars.map((h, i) => (
        <span
          key={i}
          style={{ height: `${h}px` }}
          className={`w-[2px] rounded-full transition-colors ${
            i < playedCount ? "bg-[#0d4a32]" : "bg-[#cfd8d3]"
          } ${playing && i === playedCount ? "animate-pulse" : ""}`}
        />
      ))}
    </div>
  );
}
