"use client";

import { useEffect, useState } from "react";
import Icon from "../Icon";
import { Loading, PageHeader, StatusPill } from "../PageHeader";
import StatCard from "../StatCard";

interface Ticket { id: string; subject: string; body: string | null; status: string; requester: string | null; created_at: string; }

/** Support tab: ticket list + new-ticket form. */
export default function SupportTab() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [live, setLive] = useState(false);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/support", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { setTickets(j.data); setLive(j.live); })
      .catch(() => {});
  };
  useEffect(load, []);

  const create = async () => {
    if (!subject.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim(), requester: "Admin" }),
      });
      const j = await res.json();
      if (j.data) setTickets((prev) => [j.data, ...(prev ?? [])]);
      setSubject(""); setBody("");
    } finally { setSaving(false); }
  };

  if (!tickets) return <Loading label="support tickets" />;
  const q = query.trim().toLowerCase();
  const visible = tickets.filter((t) => !q || `${t.subject} ${t.body ?? ""} ${t.status}`.toLowerCase().includes(q));

  return (
    <div>
      <PageHeader title="Support" subtitle="Help requests and device issues from the crew" query={query} setQuery={setQuery} live={live} />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon="handshake" label="Open Tickets" value={tickets.filter((t) => t.status === "open").length} />
        <StatCard icon="calendar" label="Pending" value={tickets.filter((t) => t.status === "pending").length} />
        <StatCard icon="book-check" label="Resolved" value={tickets.filter((t) => t.status === "resolved").length} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <section className="h-fit rounded-2xl border border-[#ececec] bg-white p-4 sm:p-5">
          <p className="flex items-center gap-2 text-[15px] font-medium text-black"><Icon name="handshake" size={16} /> New ticket</p>
          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">Subject</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Microphone not recording"
              className="w-full rounded-lg border border-[#e3e3e3] px-3 py-2 text-[14px] outline-none focus:border-[#b3b3b3]" />
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">Details</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Device, field, what happened…"
              className="w-full rounded-lg border border-[#e3e3e3] px-3 py-2 text-[14px] outline-none focus:border-[#b3b3b3]" />
          </label>
          <button onClick={create} disabled={saving || !subject.trim()}
            className="mt-4 w-full rounded-lg bg-black py-2.5 text-[14px] font-medium text-white hover:bg-[#222] disabled:opacity-40">
            {saving ? "Submitting…" : "Submit ticket"}
          </button>
        </section>
        <section className="overflow-hidden rounded-2xl border border-[#ececec] bg-white">
          <p className="px-4 pt-4 text-[15px] font-medium text-black sm:px-5">Tickets ({visible.length})</p>
          <ul className="mt-2 divide-y divide-[#f0f0f0]">
            {visible.map((t) => (
              <li key={t.id} className="px-4 py-3.5 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-black">{t.subject}</span>
                  <StatusPill status={t.status} />
                </div>
                {t.body && <p className="mt-1 text-[13px] leading-relaxed text-[#808080]">{t.body}</p>}
                <p className="mt-1 text-[12px] text-[#b3b3b3]">{t.requester ?? "—"} · {t.created_at.slice(0, 10)}</p>
              </li>
            ))}
            {visible.length === 0 && <li className="px-5 py-10 text-center text-[14px] text-[#b3b3b3]">No tickets match your search.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
