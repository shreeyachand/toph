"use client";

import { useEffect, useState } from "react";
import FieldMap from "../FieldMap";
import Icon from "../Icon";
import { Loading, PageHeader } from "../PageHeader";
import StatCard, { StatGrid } from "../StatCard";

interface FieldRow {
  id: string; name: string; block: string | null; acreage: number | string | null;
  calc_acres?: number | string | null;
  center_lat: number | null; center_lng: number | null; logs: number;
  polygon: GeoJSON.Geometry | null; centroid: GeoJSON.Geometry | null;
}

/** Map tab: farm overview + per-field cards. */
export default function MapTab() {
  const [fields, setFields] = useState<FieldRow[] | null>(null);
  const [live, setLive] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/fields", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { setFields(j.data); setLive(j.live); if (!selected && j.data[0]) setSelected(j.data[0].id); })
      .catch(() => {});
  }, []);

  if (!fields) return <Loading label="map" />;
  const q = query.trim().toLowerCase();
  const visible = fields.filter((f) => !q || `${f.name} ${f.block ?? ""}`.toLowerCase().includes(q));
  const totalAcres = fields.reduce((a, f) => a + (Number(f.acreage) || 0), 0);
  const active = fields.find((f) => f.id === selected) ?? visible[0];

  return (
    <div>
      <PageHeader title="Map" subtitle="Fields, acreage and recent recording activity" query={query} setQuery={setQuery} live={live} />
      <StatGrid cols={3}>
        <StatCard icon="map" label="Total Fields" value={fields.length} />
        <StatCard icon="expand" label="Total Acreage" value={totalAcres.toFixed(1)} suffix="acres" />
        <StatCard icon="audio-lines" label="Fields With Logs" value={fields.filter((f) => f.logs > 0).length} />
      </StatGrid>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-[#ececec] bg-white p-4 sm:p-5">
          <p className="flex items-center gap-2 text-[15px] font-medium text-black">
            <Icon name="map" size={16} /> {active ? `${active.name} — satellite view` : "Farm overview"}
          </p>
          <div className="mt-3">
            <FieldMap fields={visible} selectedId={selected} onSelect={setSelected} />
          </div>
          {active && (
            <div className="mt-3 flex flex-wrap gap-2 text-[13px] text-[#4d4d4d]">
              <span className="rounded-full border border-[#e3e3e3] px-3 py-1">{active.block ?? "No block"}</span>
              <span className="rounded-full border border-[#e3e3e3] px-3 py-1">
                {Number(active.calc_acres ?? active.acreage ?? 0).toFixed(1)} acres (PostGIS)
              </span>
              <span className="rounded-full border border-[#e3e3e3] px-3 py-1">{active.logs} recordings</span>
              {active.center_lat != null && (
                <span className="rounded-full border border-[#e3e3e3] px-3 py-1">
                  {Number(active.center_lat).toFixed(4)}, {Number(active.center_lng).toFixed(4)}
                </span>
              )}
            </div>
          )}
        </section>
        <section className="overflow-hidden rounded-2xl border border-[#ececec] bg-white">
          <p className="px-4 pt-4 text-[15px] font-medium text-black sm:px-5">Fields ({visible.length})</p>
          <ul className="divide-y divide-[#f0f0f0]">
            {visible.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => setSelected(f.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left sm:px-5 ${selected === f.id ? "bg-[#fafafa]" : "bg-white hover:bg-[#f8f8f8]"}`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef7f1] text-[13px] font-semibold text-[#146c44]">
                    {f.name.replace("FIELD ", "")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-black">{f.name}</span>
                    <span className="block truncate text-[12px] text-[#b3b3b3]">
                      {f.block ?? "—"} · {Number(f.acreage ?? 0).toFixed(1)} ac · {f.logs} logs
                    </span>
                  </span>
                  <Icon name="expand" size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
