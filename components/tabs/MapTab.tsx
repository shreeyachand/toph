"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Icon from "../Icon";
import { Loading, PageHeader } from "../PageHeader";
import StatCard, { StatGrid } from "../StatCard";

// Split maplibre-gl (~750KB) into its own chunk so it only downloads when the
// user visits /map — never as part of the shared initial bundle.
const FieldMap = dynamic(() => import("../FieldMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[62vh] min-h-[440px] w-full items-center justify-center rounded-xl border border-[#ececec] bg-[#2c3a26] text-[13px] text-[#cfcfcf]">
      Loading map…
    </div>
  ),
});

interface FieldRow {
  id: string; name: string; block: string | null; acreage: number | string | null;
  calc_acres?: number | string | null;
  center_lat: number | null; center_lng: number | null; logs: number;
  polygon: GeoJSON.Geometry | null; centroid: GeoJSON.Geometry | null;
}

/** Map tab: large satellite map with the fields list as an on-map popup. */
export default function MapTab() {
  const [fields, setFields] = useState<FieldRow[] | null>(null);
  const [live, setLive] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);

  useEffect(() => {
    fetch("/api/fields", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { setFields(j.data); setLive(j.live); if (!selected && j.data[0]) setSelected(j.data[0].id); })
      .catch(() => {});
  }, []);

  // Esc closes the fields popup.
  useEffect(() => {
    if (!listOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setListOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [listOpen]);

  if (!fields) return <Loading label="map" />;
  const totalAcres = fields.reduce((a, f) => a + (Number(f.acreage) || 0), 0);
  const active = fields.find((f) => f.id === selected) ?? fields[0];

  const handleSelect = (id: string) => {
    setSelected(id);
    setListOpen(true);
  };

  return (
    <div>
      <PageHeader title="Map" subtitle="Fields, acreage and recent recording activity" live={live} />
      <StatGrid cols={3}>
        <StatCard icon="map" label="Total Fields" value={fields.length} />
        <StatCard icon="expand" label="Total Acreage" value={totalAcres.toFixed(1)} suffix="acres" />
        <StatCard icon="audio-lines" label="Fields With Logs" value={fields.filter((f) => f.logs > 0).length} />
      </StatGrid>
      <section className="mt-4 overflow-hidden rounded-2xl border border-[#ececec] bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <p className="flex min-w-0 items-center gap-2 text-[15px] font-medium text-black">
            <Icon name="map" size={16} />
            <span className="truncate">Satellite view</span>
          </p>
          <button
            onClick={() => setListOpen((o) => !o)}
            aria-expanded={listOpen}
            aria-label={listOpen ? "Close fields list" : "Open fields list"}
            className="ml-auto shrink-0 rounded-full border border-[#e3e3e3] px-3.5 py-1.5 text-[13px] text-[#4d4d4d] hover:bg-[#f5f5f5]"
          >
            Fields ({fields.length})
          </button>
        </div>
        <div className="relative mt-3">
          <FieldMap
            fields={fields}
            selectedId={selected}
            onSelect={handleSelect}
            className="h-[62vh] min-h-[440px]"
          />
          {listOpen && (
            <div
              role="dialog"
              aria-label="Fields list"
              className="absolute bottom-3 left-3 right-3 overflow-hidden rounded-2xl border border-[#ececec] bg-white shadow-xl sm:bottom-4 sm:left-auto sm:right-4 sm:w-[340px]"
            >
              <div className="flex items-center gap-2 border-b border-[#f0f0f0] px-3 py-2.5 sm:px-4 sm:py-3">
                <p className="text-[14px] font-medium text-black sm:text-[15px]">Fields ({fields.length})</p>
                <button
                  type="button"
                  onClick={() => setListOpen(false)}
                  aria-label="Close fields list"
                  className="ml-auto rounded-lg p-1.5 text-[#4d4d4d] hover:bg-[#f5f5f5]"
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
              <ul className="nice-scroll max-h-[24vh] divide-y divide-[#f0f0f0] overflow-y-auto sm:max-h-[38vh]">
                {fields.map((f) => (
                  <li key={f.id}>
                    <button
                      onClick={() => setSelected(f.id)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left sm:gap-3 sm:px-4 sm:py-3 ${selected === f.id ? "bg-[#fafafa]" : "bg-white hover:bg-[#f8f8f8]"}`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef7f1] text-[12px] font-semibold text-[#146c44] sm:h-9 sm:w-9 sm:text-[13px]">
                        {f.name.replace("FIELD ", "")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-black">{f.name}</span>
                        <span className="block truncate text-[12px] text-[#b3b3b3]">
                          {f.block ?? "—"} · {Number(f.acreage ?? 0).toFixed(1)} ac · {f.logs} log{f.logs === 1 ? "" : "s"}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {active && (
          <div className="mt-3 flex flex-wrap gap-2 text-[13px] text-[#4d4d4d]">
            <span className="rounded-full border border-[#e3e3e3] px-3 py-1">{active.block ?? "No field"}</span>
            <span className="rounded-full border border-[#e3e3e3] px-3 py-1">
              {Number(active.calc_acres ?? active.acreage ?? 0).toFixed(1)} acres
            </span>
            <span className="rounded-full border border-[#e3e3e3] px-3 py-1">{active.logs} recording{active.logs === 1 ? "" : "s"}</span>
            {active.center_lat != null && (
              <span className="rounded-full border border-[#e3e3e3] px-3 py-1">
                {Number(active.center_lat).toFixed(4)}, {Number(active.center_lng).toFixed(4)}
              </span>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
