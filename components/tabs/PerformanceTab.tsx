"use client";

import { useEffect, useState } from "react";
import Icon from "../Icon";
import { Loading, PageHeader } from "../PageHeader";
import StatCard, { StatGrid } from "../StatCard";

interface Review { id: string; employee: string; period: string; score: number; notes: string | null; }

/** Performance tab: review scores with CSS bar chart. */
export default function PerformanceTab() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [live, setLive] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/performance", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { setReviews(j.data); setLive(j.live); })
      .catch(() => {});
  }, []);

  if (!reviews) return <Loading label="performance" />;
  const q = query.trim().toLowerCase();
  const visible = reviews.filter((r) => !q || r.employee.toLowerCase().includes(q));
  const avg = reviews.length ? Math.round(reviews.reduce((s, r) => s + r.score, 0) / reviews.length) : 0;
  const top = reviews[0];

  return (
    <div>
      <PageHeader title="Performance" subtitle="April review scores and coaching notes" query={query} setQuery={setQuery} live={live} />
      <StatGrid cols={3}>
        <StatCard icon="chart-pie" label="Average Score" value={avg} />
        <StatCard icon="star" label="Top Performer" value={top ? top.employee.split(" ")[0] : "—"} suffix={top ? `${top.score} pts` : undefined} />
        <StatCard icon="users" label="Reviewed" value={reviews.length} suffix="employees" />
      </StatGrid>
      <section className="mt-4 overflow-hidden rounded-2xl border border-[#ececec] bg-white p-4 sm:p-5">
        <p className="flex items-center gap-2 text-[15px] font-medium text-black"><Icon name="chart-pie" size={16} /> Scores ({visible.length})</p>
        <ul className="mt-4 space-y-4">
          {visible.map((r) => (
            <li key={r.id}>
              <div className="flex items-baseline gap-2">
                <span className="text-[14px] font-medium text-black">{r.employee}</span>
                <span className="text-[12px] text-[#b3b3b3]">{r.period}</span>
                <span className="ml-auto text-[14px] font-semibold text-black">{r.score}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#f0f0f0]">
                <div className="h-full rounded-full bg-[#146c44]" style={{ width: `${Math.min(100, r.score)}%` }} />
              </div>
              {r.notes && <p className="mt-1 text-[13px] text-[#808080]">{r.notes}</p>}
            </li>
          ))}
          {visible.length === 0 && <li className="py-6 text-center text-[14px] text-[#b3b3b3]">No reviews match your search.</li>}
        </ul>
      </section>
    </div>
  );
}
