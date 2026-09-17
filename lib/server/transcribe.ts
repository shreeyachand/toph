/**
 * Server-only transcription providers. No new infra — audio bytes already in
 * hand at upload time are forwarded to one of:
 *
 *   groq (default) — Whisper large-v3-turbo, OpenAI-compatible endpoint.
 *     Perpetual free tier, no card: 20 RPM / 2,000 req-day / 28,800
 *     audio-sec-day, 25 MB max per file. Paid fallback $0.04/hr.
 *   xai — Grok STT (POST /v1/stt). Supports our formats natively plus
 *     `keyterm` biasing (field names, farm vocab) and word timestamps.
 *     Billed ~$0.10/hr batch from API credits.
 *
 *   TRANSCRIPTION_PROVIDER=groq|xai (default groq)
 *   GROQ_API_KEY=... / XAI_API_KEY=...
 *
 * A missing key skips transcription (returns null) so uploads never fail for
 * lack of config — the row stays transcript-less until parsing lands.
 * Provider call failures throw so the caller can mark the row pending.
 */

export interface TranscribeOpts {
  language?: string;
  /** Domain terms to bias toward — only xAI supports these today. */
  keyterms?: string[];
}

export function transcriptionConfigured(): boolean {
  const provider = (process.env.TRANSCRIPTION_PROVIDER ?? "groq").toLowerCase();
  if (provider === "xai") return !!process.env.XAI_API_KEY;
  return !!process.env.GROQ_API_KEY;
}

export async function transcribeAudio(
  file: File,
  opts: TranscribeOpts = {}
): Promise<string | null> {
  const provider = (process.env.TRANSCRIPTION_PROVIDER ?? "groq").toLowerCase();
  if (provider === "xai") return transcribeXai(file, opts);
  return transcribeGroq(file, opts);
}

async function transcribeGroq(file: File, opts: TranscribeOpts): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const form = new FormData();
  form.set("file", file, file.name || "audio.webm");
  form.set("model", "whisper-large-v3-turbo");
  form.set("language", opts.language ?? "en");
  form.set("response_format", "json");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`groq stt failed: ${res.status}`);
  const body = (await res.json()) as { text?: unknown };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  return text || null;
}

async function transcribeXai(file: File, opts: TranscribeOpts): Promise<string | null> {
  const key = process.env.XAI_API_KEY;
  if (!key) return null;
  const form = new FormData();
  form.set("language", opts.language ?? "en");
  form.set("format", "true");
  for (const k of (opts.keyterms ?? []).filter(Boolean).slice(0, 100)) {
    form.append("keyterm", k.slice(0, 50));
  }
  // xAI requires the file field last in the multipart form.
  form.set("file", file, file.name || "audio.webm");
  const res = await fetch("https://api.x.ai/v1/stt", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`xai stt failed: ${res.status}`);
  const body = (await res.json()) as { text?: unknown; transcript?: unknown };
  const text = [body.text, body.transcript].find(
    (t): t is string => typeof t === "string" && t.trim().length > 0
  );
  return text?.trim() ?? null;
}
