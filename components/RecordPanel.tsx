"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { EmployeeLog } from "@/lib/types";
import Icon from "./Icon";
import Waveform from "./Waveform";

type Phase = "idle" | "recording" | "review";

function fmtElapsed(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Prototype voice-log recorder — frontend only. Simulates capture with a
 * timer + animated waveform; saving prepends a log to the session list.
 * Nothing is uploaded.
 */
export default function RecordPanel({
  employeeName,
  activities,
  fields,
  onSave,
}: {
  employeeName: string;
  activities: string[];
  fields: string[];
  onSave: (log: EmployeeLog) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [activity, setActivity] = useState(activities[0] ?? "Harvesting");
  const [field, setField] = useState(fields[0] ?? "FIELD B");
  const [note, setNote] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setActivity(activities[0] ?? "Harvesting");
    setField(fields[0] ?? "FIELD B");
  }, [activities, fields]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    []
  );

  // Fake live progress that loops while recording.
  const progress = useMemo(
    () => (phase === "recording" ? 0.25 + ((elapsed % 20) / 20) * 0.6 : 0.65),
    [phase, elapsed]
  );

  const start = () => {
    setElapsed(0);
    setPhase("recording");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setPhase("review");
  };

  const cancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setElapsed(0);
    setPhase("idle");
  };

  const save = () => {
    const now = new Date();
    const iso = now.toISOString().slice(0, 10);
    const label = now.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    onSave({
      id: `local-${Date.now()}`,
      employee: employeeName,
      activity,
      date: label,
      isoDate: iso,
      field,
      time: `${fmtElapsed(elapsed)} recording`,
      summary: note.trim()
        ? note.trim()
        : `Prototype voice log — ${activity.toLowerCase()} in ${field}. Audio capture not implemented yet.`,
      isNew: true,
      status: "new",
    });
    setNote("");
    setElapsed(0);
    setPhase("idle");
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2500);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[#ececec] bg-white">
      <div className="flex flex-wrap items-center gap-2 px-4 py-4 sm:px-5">
        <p className="flex items-center gap-2 text-[15px] font-medium text-black">
          <Icon name="audio-lines" size={16} />
          Record today&apos;s work
        </p>
        <span className="ml-auto rounded-full bg-[#f2f2f2] px-2.5 py-1 text-[11px] font-medium text-[#808080]">
          Prototype — stays on this device
        </span>
      </div>

      {phase === "idle" && (
        <div className="px-4 pb-5 sm:px-5">
          <p className="text-[14px] leading-relaxed text-[#808080]">
            Tap record at the start of a task. Your audio stays here for now —
            transcription and upload come later.
          </p>
          <button
            type="button"
            onClick={start}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3.5 text-[15px] font-medium text-white hover:bg-[#222]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e5484d]">
              <span className="h-2.5 w-2.5 rounded-full bg-white" />
            </span>
            Start recording
          </button>
          {savedFlash && (
            <p className="mt-3 rounded-lg bg-[#eef7f1] px-3 py-2 text-center text-[13px] font-medium text-[#146c44]">
              Log saved to this session&apos;s list below.
            </p>
          )}
        </div>
      )}

      {phase === "recording" && (
        <div className="px-4 pb-5 sm:px-5">
          <div className="rounded-xl bg-[#0d4a32] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ff6b6b]" />
              <p className="text-[14px] font-medium tabular-nums text-white">
                Recording… {fmtElapsed(elapsed)}
              </p>
              <p className="ml-auto text-[12px] text-white/70">
                {activity} · {field}
              </p>
            </div>
            <div className="[&_span]:!bg-white/90">
              <Waveform playing progress={progress} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={cancel}
              className="rounded-lg border border-[#e3e3e3] bg-white py-2.5 text-[14px] font-medium text-black hover:bg-[#f8f8f8]"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={stop}
              className="rounded-lg bg-black py-2.5 text-[14px] font-medium text-white hover:bg-[#222]"
            >
              Stop &amp; review
            </button>
          </div>
        </div>
      )}

      {phase === "review" && (
        <div className="px-4 pb-5 sm:px-5">
          <div className="rounded-xl border border-[#ececec] bg-[#fafafa] px-4 py-3">
            <div className="flex items-center gap-2">
              <Icon name="play" size={14} />
              <p className="text-[14px] font-medium text-black">
                {fmtElapsed(elapsed)} captured
              </p>
              <button
                type="button"
                onClick={start}
                className="ml-auto text-[13px] font-medium text-[#146c44] hover:underline"
              >
                Re-record
              </button>
            </div>
            <Waveform progress={0.65} />
          </div>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">
                Activity
              </span>
              <select
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                className="w-full rounded-lg border border-[#e3e3e3] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-[#b3b3b3]"
              >
                {activities.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">
                Field
              </span>
              <select
                value={field}
                onChange={(e) => setField(e.target.value)}
                className="w-full rounded-lg border border-[#e3e3e3] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-[#b3b3b3]"
              >
                {fields.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-2.5 block">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[#b3b3b3]">
              Note (optional)
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Anything the mic missed…"
              className="w-full rounded-lg border border-[#e3e3e3] px-3 py-2 text-[14px] outline-none focus:border-[#b3b3b3]"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={cancel}
              className="rounded-lg border border-[#e3e3e3] bg-white py-2.5 text-[14px] font-medium text-black hover:bg-[#f8f8f8]"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-[#146c44] py-2.5 text-[14px] font-medium text-white hover:bg-[#0f5737]"
            >
              Save log
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
