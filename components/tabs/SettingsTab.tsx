"use client";

import { useEffect, useState } from "react";
import Icon from "../Icon";
import { Loading, PageHeader } from "../PageHeader";

/** Settings tab: farm profile form backed by farm_settings. */
export default function SettingsTab() {
  const [farm, setFarm] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [live, setLive] = useState<boolean | undefined>(undefined);
  const [notify, setNotify] = useState({ newLogs: true, flagged: true, weekly: false });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { setFarm(j.farm); setTimezone(j.timezone); setLive(j.live); })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farm, timezone }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  if (live === undefined) return <Loading label="settings" />;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Farm profile and notification preferences" live={live} />
      <div className="mt-5 grid max-w-3xl gap-4">
        <section className="rounded-2xl border border-[#ececec] bg-white p-4 sm:p-5">
          <p className="flex items-center gap-2 text-[15px] font-medium text-black"><Icon name="cog" size={16} /> Farm profile</p>
          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">Farm name</span>
            <input value={farm} onChange={(e) => setFarm(e.target.value)}
              className="w-full rounded-lg border border-[#e3e3e3] px-3 py-2 text-[14px] outline-none focus:border-[#b3b3b3]" />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">Timezone</span>
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
              className="w-full rounded-lg border border-[#e3e3e3] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-[#b3b3b3]">
              {["America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York"].map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </label>
          <button onClick={save} disabled={saving}
            className="mt-4 rounded-lg bg-black px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#222] disabled:opacity-40">
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
          </button>
        </section>
        <section className="rounded-2xl border border-[#ececec] bg-white p-4 sm:p-5">
          <p className="flex items-center gap-2 text-[15px] font-medium text-black"><Icon name="inbox" size={16} /> Notifications</p>
          <ul className="mt-3 divide-y divide-[#f0f0f0]">
            {([
              ["newLogs", "New recordings", "Alert when a worker submits a voice log"],
              ["flagged", "Flagged logs", "Alert when accuracy drops or a log is flagged"],
              ["weekly", "Weekly digest", "Monday summary of activity and accuracy"],
            ] as const).map(([key, label, desc]) => (
              <li key={key} className="flex items-center gap-3 py-3">
                <span className="flex-1">
                  <span className="block text-[14px] font-medium text-black">{label}</span>
                  <span className="block text-[12px] text-[#b3b3b3]">{desc}</span>
                </span>
                <button role="switch" aria-checked={notify[key]} onClick={() => setNotify((n) => ({ ...n, [key]: !n[key] }))}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${notify[key] ? "bg-[#146c44]" : "bg-[#e3e3e3]"}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${notify[key] ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
