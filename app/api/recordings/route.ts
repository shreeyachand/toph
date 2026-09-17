import { getSupabaseAdmin } from "@/lib/server/supabase";
import { getRecordings } from "@/lib/server/queries";
import { transcribeAudio, transcriptionConfigured } from "@/lib/server/transcribe";
import {
  VOICE_BUCKET,
  VOICE_LOG_SELECT,
  toEmployeeLog,
  type VoiceLogRow,
} from "@/lib/server/recordings";

export const dynamic = "force-dynamic";

type Status = "new" | "reviewed" | "flagged";
type Sort = "newest" | "oldest";

/**
 * GET /api/recordings — the "new recordings" feed behind New Employee Logs.
 *
 * Query params (all optional):
 *   status    new | reviewed | flagged  (repeatable or comma-separated)
 *   activity  activity name (repeatable or comma-separated)
 *   field     field name (repeatable or comma-separated)
 *   search    free text matched against employee/activity/field/summary
 *   from/to   ISO dates (YYYY-MM-DD) bounding log_date
 *   sort      newest (default) | oldest
 *   limit     default 50, max 200
 *   offset    default 0
 *
 * Status/date/sort/limit run in SQL; activity/field/search filter in memory
 * (PostgREST can't filter on the joined display names without inner joins
 * that would drop rows with null FKs — fine at this scale, revisit with a
 * view/RPC when the table grows).
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const statuses = splitParam(q, "status").filter(isStatus);
  const sort: Sort = q.get("sort") === "oldest" ? "oldest" : "newest";
  return Response.json(
    await getRecordings({
      statuses,
      activities: splitParam(q, "activity"),
      fields: splitParam(q, "field"),
      search: q.get("search") ?? "",
      from: q.get("from"),
      to: q.get("to"),
      sort,
      limit: Number(q.get("limit")) || 50,
      offset: Number(q.get("offset")) || 0,
    })
  );
}

function splitParam(q: URLSearchParams, key: string): string[] {
  return q
    .getAll(key)
    .flatMap((v) => v.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

function isStatus(s: string): s is Status {
  return s === "new" || s === "reviewed" || s === "flagged";
}

/** Reject uploads larger than this (25 MB ≈ 3+ hours of Opus audio). */
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
};

/**
 * POST /api/recordings — submit a captured voice log. Multipart form:
 *   audio       File (required) — the recorded blob
 *   employee    string (required) — employee full name, e.g. "Maya Patel"
 *   activity    string — activity name, e.g. "Harvesting"
 *   field       string — field name, e.g. "FIELD B"
 *   durationSec number — recorded length in seconds
 *   note        string — optional free-text note (stored as summary for now)
 *   startedAt   string — ISO timestamp of capture start (defaults to now)
 *
 * Uploads the audio to the `voice-logs` storage bucket and inserts a
 * `voice_logs` row with status "new" and no transcript — parsing/transcription
 * lands later. Name/activity/field misses resolve to null FKs (same as rows
 * the list endpoints already tolerate).
 *
 * When a transcription provider is configured (GROQ_API_KEY or XAI_API_KEY),
 * the audio is transcribed inline and the transcript stored on the row;
 * failures leave transcript null ("pending") without failing the upload.
 */
export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const audio = form.get("audio");
  const employee = str(form.get("employee"));
  const activity = str(form.get("activity"));
  const field = str(form.get("field"));
  const note = str(form.get("note"));
  const durationSec = Math.max(0, Math.round(Number(form.get("durationSec")) || 0));
  const startedAt = str(form.get("startedAt"));
  const start = startedAt ? new Date(startedAt) : new Date();
  if (!(audio instanceof File) || audio.size === 0) {
    return Response.json({ error: "Missing audio file" }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return Response.json({ error: "Audio file too large (max 25 MB)" }, { status: 413 });
  }
  if (!employee) {
    return Response.json({ error: "Missing employee" }, { status: 400 });
  }
  if (Number.isNaN(start.getTime())) {
    return Response.json({ error: "Invalid startedAt" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return Response.json(
      { error: "Storage not configured", hint: "Set SUPABASE_URL + key in .env.local" },
      { status: 503 }
    );
  }

  const ext = EXT_BY_MIME[audio.type] ?? "webm";
  const day = start.toISOString().slice(0, 10);
  const slug = employee.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const path = `${slug}/${day}/${crypto.randomUUID()}.${ext}`;

  try {
    let { error: upErr } = await supabase.storage
      .from(VOICE_BUCKET)
      .upload(path, audio, { contentType: audio.type || "audio/webm", upsert: false });
    if (upErr && /bucket not found/i.test(upErr.message)) {
      // First upload ever (or dashboard setup skipped): create then retry.
      // Works with the service-role key; the anon key can't — see 503 below.
      const { error: mkErr } = await supabase.storage.createBucket(VOICE_BUCKET, {
        public: false,
      });
      if (mkErr) throw mkErr;
      ({ error: upErr } = await supabase.storage
        .from(VOICE_BUCKET)
        .upload(path, audio, { contentType: audio.type || "audio/webm", upsert: false }));
    }
    if (upErr) throw upErr;

    const [empRes, actRes, fldRes] = await Promise.all([
      supabase.from("employees").select("id").eq("full_name", employee).maybeSingle(),
      activity
        ? supabase.from("activity_types").select("id").ilike("name", activity).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      field
        ? supabase.from("fields").select("id").eq("name", field).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (empRes.error) throw empRes.error;
    if (actRes.error) throw actRes.error;
    if (fldRes.error) throw fldRes.error;

    const end = new Date(start.getTime() + durationSec * 1000);
    const { data: row, error: insErr } = await supabase
      .from("voice_logs")
      .insert({
        employee_id: (empRes.data as { id: string } | null)?.id ?? null,
        activity_type_id: (actRes.data as { id: number } | null)?.id ?? null,
        field_id: (fldRes.data as { id: string } | null)?.id ?? null,
        log_date: day,
        started_at: start.toISOString(),
        ended_at: end.toISOString(),
        audio_path: path,
        duration_sec: durationSec,
        transcript: null,
        summary: note || null,
        status: "new",
      })
      .select(VOICE_LOG_SELECT)
      .single()
      .overrideTypes<VoiceLogRow>();
    if (insErr) throw insErr;

    // Inline transcription (short clips take seconds; move to background jobs
    // if takes get long). Never fails the upload — worst case the row waits
    // for the parsing pass with transcript null.
    let transcript: string | null = null;
    let transcription: "done" | "pending" | "skipped" = transcriptionConfigured()
      ? "pending"
      : "skipped";
    try {
      transcript = await transcribeAudio(audio, {
        keyterms: [activity, field, "Bays Ranch"],
      });
      if (transcript) {
        const { error: txErr } = await supabase
          .from("voice_logs")
          .update({ transcript })
          .eq("id", row.id);
        if (txErr) throw txErr;
        transcription = "done";
      }
    } catch (e) {
      console.error("transcription failed:", e instanceof Error ? e.message : e);
    }

    return Response.json(
      {
        data: { ...toEmployeeLog(row), transcript: transcript ?? undefined },
        transcription,
        live: true,
      },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    const blocked = /row-level security|not authorized|permission|bucket not found/i.test(msg);
    // Don't leak the orphaned object: best-effort cleanup when the insert failed.
    if (!/bucket not found/i.test(msg)) {
      await supabase.storage.from(VOICE_BUCKET).remove([path]).catch(() => {});
    }
    return Response.json(
      {
        error: blocked ? "Write blocked by Supabase policy" : "Upload failed",
        hint: blocked
          ? "Use the service-role key server-side, or add storage + voice_logs RLS policies for the anon key"
          : msg,
      },
      { status: blocked ? 503 : 500 }
    );
  }
}

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}
