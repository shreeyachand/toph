"use client";

import { useEffect, useState } from "react";
import Icon from "../Icon";
import { Loading, PageHeader } from "../PageHeader";
import StatCard from "../StatCard";

interface Msg { id: string; sender: string; body: string; created_at: string; }
interface Convo { id: string; subject: string | null; updated_at: string; messages: Msg[]; }

/** Messages tab: conversation list + thread view with reply box. */
export default function MessagesTab() {
  const [convos, setConvos] = useState<Convo[] | null>(null);
  const [live, setLive] = useState(false);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = () => {
    fetch("/api/conversations", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        setConvos(j.data); setLive(j.live);
        if (!activeId && j.data[0]) setActiveId(j.data[0].id);
      })
      .catch(() => {});
  };
  useEffect(load, []);

  const send = async () => {
    if (!draft.trim() || !activeId) return;
    setSending(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: activeId, body: draft.trim() }),
      });
      const j = await res.json();
      if (j.data) {
        setConvos((prev) => prev?.map((c) => c.id === activeId ? { ...c, messages: [...c.messages, j.data] } : c) ?? null);
        setDraft("");
      }
    } finally { setSending(false); }
  };

  if (!convos) return <Loading label="messages" />;
  const q = query.trim().toLowerCase();
  const visible = convos.filter((c) => !q || `${c.subject ?? ""} ${c.messages.map((m) => `${m.sender} ${m.body}`).join(" ")}`.toLowerCase().includes(q));
  const active = convos.find((c) => c.id === activeId) ?? visible[0] ?? null;
  const totalMsgs = convos.reduce((s, c) => s + c.messages.length, 0);

  return (
    <div>
      <PageHeader title="Messages" subtitle="Crew threads and announcements" query={query} setQuery={setQuery} live={live} />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon="mail" label="Conversations" value={convos.length} />
        <StatCard icon="audio-lines" label="Total Messages" value={totalMsgs} />
        <StatCard icon="users" label="Participants" value={new Set(convos.flatMap((c) => c.messages.map((m) => m.sender))).size} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.5fr]">
        <section className="overflow-hidden rounded-2xl border border-[#ececec] bg-white">
          <p className="px-4 pt-4 text-[15px] font-medium text-black sm:px-5">Threads ({visible.length})</p>
          <ul className="mt-2 divide-y divide-[#f0f0f0]">
            {visible.map((c) => {
              const last = c.messages[c.messages.length - 1];
              return (
                <li key={c.id}>
                  <button onClick={() => setActiveId(c.id)}
                    className={`w-full px-4 py-3.5 text-left sm:px-5 ${active?.id === c.id ? "bg-[#fafafa]" : "bg-white hover:bg-[#f8f8f8]"}`}>
                    <span className="block truncate text-[14px] font-medium text-black">{c.subject ?? "(no subject)"}</span>
                    <span className="mt-0.5 block truncate text-[12px] text-[#b3b3b3]">
                      {last ? `${last.sender}: ${last.body}` : "No messages yet"} · {c.messages.length}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="flex min-h-[380px] flex-col overflow-hidden rounded-2xl border border-[#ececec] bg-white">
          {active ? (
            <>
              <p className="flex items-center gap-2 border-b border-[#f0f0f0] px-4 py-3.5 text-[15px] font-medium text-black sm:px-5">
                <Icon name="mail" size={16} /> {active.subject ?? "(no subject)"}
              </p>
              <ul className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
                {active.messages.map((m) => {
                  const mine = m.sender === "Admin";
                  return (
                    <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[14px] ${mine ? "bg-black text-white" : "bg-[#f5f5f5] text-black"}`}>
                        {!mine && <p className="text-[11px] font-semibold uppercase tracking-wide opacity-60">{m.sender}</p>}
                        <p>{m.body}</p>
                        <p className={`mt-1 text-[11px] ${mine ? "text-white/60" : "text-[#b3b3b3]"}`}>
                          {new Date(m.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div className="flex gap-2 border-t border-[#f0f0f0] p-3">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder="Write a reply…" className="flex-1 rounded-full border border-[#e3e3e3] px-4 py-2 text-[14px] outline-none focus:border-[#b3b3b3]" />
                <button onClick={send} disabled={sending || !draft.trim()}
                  className="rounded-full bg-black px-5 py-2 text-[14px] font-medium text-white hover:bg-[#222] disabled:opacity-40">Send</button>
              </div>
            </>
          ) : (
            <p className="px-5 py-10 text-center text-[14px] text-[#b3b3b3]">Select a thread.</p>
          )}
        </section>
      </div>
    </div>
  );
}
