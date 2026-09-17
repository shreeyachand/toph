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
  levels,
  onSeek,
}: {
  progress?: number;
  playing?: boolean;
  /** Live 0..1 amplitude snapshot — overrides the decorative bars. */
  levels?: number[];
  /** When set, clicking the waveform seeks (ratio 0..1). */
  onSeek?: (ratio: number) => void;
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
  const bars = useMemo(() => {
    // Live input: resample the snapshot to the fitted bar count.
    if (levels && levels.length > 0) {
      const out: number[] = [];
      for (let i = 0; i < count; i++) {
        const v =
          levels[Math.min(levels.length - 1, Math.floor((i / count) * levels.length))] ?? 0;
        out.push(6 + Math.min(1, Math.max(0, v)) * 66);
      }
      return out;
    }
    return allBars.slice(0, count);
  }, [levels, count, allBars]);
  const playedCount = Math.floor(bars.length * progress);

  const seekable = typeof onSeek === "function";
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(Math.min(1, Math.max(0, ratio)));
  };

  return (
    <div
      ref={rowRef}
      onClick={seekable ? handleSeek : undefined}
      role={seekable ? "slider" : "img"}
      aria-label={seekable ? "Seek audio" : "Audio waveform"}
      aria-valuemin={seekable ? 0 : undefined}
      aria-valuemax={seekable ? 100 : undefined}
      aria-valuenow={seekable ? Math.round(progress * 100) : undefined}
      tabIndex={seekable ? 0 : undefined}
      onKeyDown={
        seekable
          ? (e) => {
              if (e.key === "ArrowRight") onSeek(Math.min(1, progress + 0.05));
              if (e.key === "ArrowLeft") onSeek(Math.max(0, progress - 0.05));
            }
          : undefined
      }
      className={`flex h-[80px] items-center gap-[3px] overflow-hidden ${
        seekable ? "cursor-pointer" : ""
      }`}
    >
      {bars.map((h, i) => {
        const isPlayhead = playing && i === playedCount;
        return (
          <span
            key={i}
            style={{ height: `${h}px` }}
            className={`w-[2px] shrink-0 rounded-full transition-colors ${
              isPlayhead
                ? "animate-pulse bg-black"
                : i < playedCount
                  ? "bg-[#0d4a32]"
                  : "bg-[#cfd8d3]"
            }`}
          />
        );
      })}
    </div>
  );
}
