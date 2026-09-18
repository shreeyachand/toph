"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { uploadRecording } from "@/lib/data";
import type { EmployeeLog } from "@/lib/types";
import Icon from "./Icon";
import Waveform from "./Waveform";

type Phase = "idle" | "recording" | "review";

function fmtElapsed(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** First MediaRecorder mime the browser supports (Chrome/Edge → Opus). */
function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {
      // ignore and try the next candidate
    }
  }
  return "";
}

/**
 * Voice-log recorder. Captures from the mic via MediaRecorder, lets the
 * worker review the actual take, then uploads audio + metadata to
 * POST /api/recordings (stored in the `voice-logs` bucket + `voice_logs`
 * row, status "new"). When capture or upload is unavailable it degrades to a
 * local-only entry so the flow never dead-ends.
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
  // "" = auto-detect — let the save-time pass classify from the audio.
  const [activity, setActivity] = useState("");
  const [field, setField] = useState(fields[0] ?? "FIELD B");
  const [note, setNote] = useState("");
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // Object URL of the captured take for review playback (null in demo mode).
  const [takeUrl, setTakeUrl] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const startedAtRef = useRef<Date>(new Date());
  const demoRef = useRef(false);
  // Live level monitor (Web Audio analyser on the mic stream).
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastPushRef = useRef(0);
  const [liveLevels, setLiveLevels] = useState<number[]>([]);

  useEffect(() => {
    setActivity("");
    setField(fields[0] ?? "FIELD B");
  }, [activities, fields]);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };
  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };
  const revokeTake = () => {
    if (takeUrl) URL.revokeObjectURL(takeUrl);
    setTakeUrl(null);
  };
  const clearTake = () => {
    revokeTake();
    blobRef.current = null;
  };
  /** Tear down the live level monitor (safe to call when inactive). */
  const stopMonitor = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setLiveLevels([]);
  };
  /**
   * Feed RMS mic levels into `liveLevels` (~10/s, last ~9s) so the waveform
   * draws what is actually being recorded. Failures fall back to the
   * decorative animation — recording itself is unaffected.
   */
  const startMonitor = (stream: MediaStream) => {
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioCtxRef.current = ctx;
      const buf = new Uint8Array(analyser.fftSize);
      const history: number[] = [];
      lastPushRef.current = 0;
      const tick = (t: number) => {
        rafRef.current = requestAnimationFrame(tick);
        if (t - lastPushRef.current < 100) return;
        lastPushRef.current = t;
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        history.push(Math.min(1, Math.sqrt(sum / buf.length) * 3.5));
        if (history.length > 96) history.shift();
        setLiveLevels([...history]);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      // No monitor — the animated waveform stands in.
    }
  };
  // Release mic + timer + monitor if the component unmounts mid-take.
  useEffect(
    () => () => {
      stopTimer();
      stopTracks();
      stopMonitor();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Fake live progress that loops while recording.
  const progress = useMemo(
    () => (phase === "recording" ? 0.25 + ((elapsed % 20) / 20) * 0.6 : 0.65),
    [phase, elapsed]
  );

  const flash = (msg: string) => {
    setSavedFlash(msg);
    setTimeout(() => setSavedFlash(null), 4000);
  };

  const beginTimer = () => {
    stopTimer();
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };

  const startDemo = () => {
    demoRef.current = true;
    setError(null);
    setElapsed(0);
    setPhase("recording");
    beginTimer();
  };

  const start = async () => {
    setError(null);
    setElapsed(0);
    demoRef.current = false;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser can't access the microphone.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = recorder;
      startedAtRef.current = new Date();
      recorder.start(250);
      startMonitor(stream);
      setPhase("recording");
      beginTimer();
    } catch {
      setError("Microphone blocked — allow access or continue in demo mode.");
    }
  };

  const stop = async () => {
    stopTimer();
    stopMonitor();
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (!recorder || recorder.state === "inactive") {
      setPhase("review");
      return;
    }
    await new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
      recorder.stop();
    });
    stopTracks();
    const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
    revokeTake();
    blobRef.current = blob;
    setTakeUrl(URL.createObjectURL(blob));
    setPhase("review");
  };

  const cancel = () => {
    stopTimer();
    stopMonitor();
    recorderRef.current = null;
    stopTracks();
    clearTake();
    setElapsed(0);
    setError(null);
    setPhase("idle");
  };

  const buildLocalLog = (): EmployeeLog => {
    const now = new Date();
    return {
      id: `local-${Date.now()}`,
      employee: employeeName,
      activity: activity || "—",
      date: now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      isoDate: now.toISOString().slice(0, 10),
      field,
      time: `${fmtElapsed(elapsed)} recording`,
      summary: note.trim()
        ? note.trim()
        : activity
          ? `Voice log — ${activity.toLowerCase()} in ${field}.`
          : `Voice log in ${field} — activity left for review.`,
      isNew: true,
      status: "new",
    };
  };

  const save = async () => {
    const blob = blobRef.current;
    // Demo take or no audio: keep a local-only entry.
    if (demoRef.current || !blob) {
      onSave(buildLocalLog());
      reset("Log saved on this device (demo — no audio).");
      return;
    }
    setUploading(true);
    try {
      const { log: saved, tags, suggestedActivity } = await uploadRecording({
        blob,
        employee: employeeName,
        activity,
        field,
        durationSec: elapsed,
        note: note.trim(),
        startedAt: startedAtRef.current,
      });
      onSave(saved);
      const bits: string[] = [];
      if (tags.length > 0) bits.push(`${tags.length} smart tag${tags.length === 1 ? "" : "s"}`);
      if (suggestedActivity)
        bits.push(`sounds like ${suggestedActivity.toLowerCase()} — easy to change`);
      reset(
        bits.length > 0
          ? `Log saved — ${bits.join(" · ")}.`
          : "Log saved — audio uploaded to the farm log."
      );
    } catch (e) {
      // Backend unreachable/unconfigured: don't lose the entry.
      onSave(buildLocalLog());
      reset(`Saved on this device — upload failed (${e instanceof Error ? e.message : "network error"}).`);
    } finally {
      setUploading(false);
    }
  };

  const reset = (msg: string) => {
    setNote("");
    setElapsed(0);
    setError(null);
    clearTake();
    setPhase("idle");
    flash(msg);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[#ececec] bg-white">
      <div className="flex flex-wrap items-center gap-2 px-4 py-4 sm:px-5">
        <p className="flex items-center gap-2 text-[15px] font-medium text-black">
          <Icon name="audio-lines" size={16} />
          Record today&apos;s work
        </p>
      </div>

      {phase === "idle" && (
        <div className="px-4 pb-5 sm:px-5">
          <p className="text-[14px] leading-relaxed text-[#808080]">
            Tap record at the start of a task. Your take uploads to the farm
            log when you save it.
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
          {error && (
            <div className="mt-3 rounded-lg bg-[#fdeaea] px-3 py-2.5 text-center">
              <p className="text-[13px] font-medium text-[#b3261e]">{error}</p>
              <button
                type="button"
                onClick={startDemo}
                className="mt-1 text-[13px] font-medium text-[#146c44] hover:underline"
              >
                Continue in demo mode (no audio)
              </button>
            </div>
          )}
          {savedFlash && (
            <p className="mt-3 rounded-lg bg-[#eef7f1] px-3 py-2 text-center text-[13px] font-medium text-[#146c44]">
              {savedFlash}
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
            </div>
            <div className="[&_span]:!bg-white/90">
              <Waveform
                playing
                progress={progress}
                levels={liveLevels.length > 0 ? liveLevels : undefined}
              />
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
                {demoRef.current && (
                  <span className="ml-2 text-[12px] font-normal text-[#b3b3b3]">(demo — no audio)</span>
                )}
              </p>
              <button
                type="button"
                onClick={start}
                className="ml-auto text-[13px] font-medium text-[#146c44] hover:underline"
              >
                Re-record
              </button>
            </div>
            {takeUrl ? (
              <audio controls src={takeUrl} className="mt-2 w-full" preload="metadata" />
            ) : (
              <Waveform progress={0.65} />
            )}
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
                <option value="">Auto-detect from audio</option>
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
              disabled={uploading}
              className="rounded-lg border border-[#e3e3e3] bg-white py-2.5 text-[14px] font-medium text-black hover:bg-[#f8f8f8] disabled:opacity-40"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={save}
              disabled={uploading}
              className="rounded-lg bg-[#146c44] py-2.5 text-[14px] font-medium text-white hover:bg-[#0f5737] disabled:opacity-40"
            >
              {uploading ? "Uploading…" : "Save log"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
