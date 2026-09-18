import { mockLogs } from "@/lib/mock-data";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import {
  VOICE_LOG_SELECT_TAGS,
  toEmployeeLog,
  type VoiceLogRow,
} from "@/lib/server/recordings";

export const dynamic = "force-dynamic";

/**
 * GET /api/recordings/:id — single recording detail for the expanded log view:
 * summary + transcript, audio path, GPS, duration, guided Q&A answers and tags.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json({ data: mockDetail(id), live: false });

  try {
    const { data: row, error } = await supabase
      .from("voice_logs")
      .select(VOICE_LOG_SELECT_TAGS)
      .eq("id", id)
      .single()
      .overrideTypes<VoiceLogRow>();
    if (error) throw error;

    const answersRes = await supabase
      .from("log_answers")
      .select("id, question_key, question_text, answer_text, is_confident")
      .eq("log_id", id)
      .order("created_at");
    if (answersRes.error) throw answersRes.error;

    const log = toEmployeeLog(row);
    return Response.json({
      data: {
        ...log,
        transcript: row.transcript,
        audioPath: row.audio_path ?? undefined,
        durationSec: row.duration_sec,
        accuracyScore: row.accuracy_score == null ? null : Number(row.accuracy_score),
        gps:
          row.gps_lat != null && row.gps_lng != null
            ? { lat: row.gps_lat, lng: row.gps_lng }
            : null,
        answers: answersRes.data ?? [],
        // tags come embedded on the row (normalized in toEmployeeLog)
        tags: log.tags ?? [],
      },
      live: true,
    });
  } catch {
    return Response.json({ data: mockDetail(id), live: false });
  }
}

/**
 * PATCH /api/recordings/:id — review actions and corrections from the log
 * detail view. Body (either or both):
 *   { "status": "new" | "reviewed" | "flagged" }
 *   { "activity": "Spraying" }  — must match an activity_types name
 *   (case-insensitive); "" clears it. A human change always clears the
 *   `activity_suggested` flag.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { status?: unknown; activity?: unknown };
  try {
    body = (await req.json()) as { status?: unknown; activity?: unknown };
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const hasStatus = body.status !== undefined;
  const hasActivity = body.activity !== undefined;
  if (!hasStatus && !hasActivity) {
    return Response.json(
      { error: 'body must include "status" or "activity"' },
      { status: 400 }
    );
  }

  if (hasStatus && body.status !== "new" && body.status !== "reviewed" && body.status !== "flagged") {
    return Response.json(
      { error: 'status must be "new", "reviewed" or "flagged"' },
      { status: 400 }
    );
  }
  if (hasActivity && typeof body.activity !== "string") {
    return Response.json({ error: "activity must be a string" }, { status: 400 });
  }
  const status = hasStatus
    ? (body.status as "new" | "reviewed" | "flagged")
    : undefined;
  const activity = hasActivity ? (body.activity as string).trim() : undefined;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const log = mockLogs.find((l) => l.id === id);
    if (!log) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({
      data: {
        ...log,
        ...(status ? { status, isNew: status === "new" } : {}),
        ...(activity !== undefined ? { activity: activity || "—", activitySuggested: false } : {}),
      },
      live: false,
    });
  }

  // Resolve the activity name against the farm's catalog before writing.
  let activityTypeId: number | null | undefined;
  if (activity !== undefined && activity !== "") {
    const { data: acts, error: actsErr } = await supabase
      .from("activity_types")
      .select("id, name");
    if (actsErr) {
      return Response.json({ error: "Update failed" }, { status: 500 });
    }
    const match = ((acts ?? []) as Array<{ id: number; name: string }>).find(
      (a) => a.name.trim().toLowerCase() === activity.toLowerCase()
    );
    if (!match) {
      return Response.json(
        { error: `Unknown activity "${activity}"` },
        { status: 400 }
      );
    }
    activityTypeId = match.id;
  }

  const update: Record<string, unknown> = {};
  if (status !== undefined) update.status = status;
  if (activity !== undefined) {
    update.activity_type_id = activityTypeId ?? null;
    update.activity_suggested = false; // a human decided — no longer a guess
  }

  const { data, error } = await supabase
    .from("voice_logs")
    .update(update)
    .eq("id", id)
    .select(VOICE_LOG_SELECT_TAGS)
    .single()
    .overrideTypes<VoiceLogRow>();
  if (error) {
    const code = (error as { code?: string }).code;
    return Response.json(
      { error: "Update failed" },
      { status: code === "PGRST116" ? 404 : 500 }
    );
  }
  return Response.json({ data: toEmployeeLog(data), live: true });
}

function mockDetail(id: string) {
  const log = mockLogs.find((l) => l.id === id) ?? mockLogs[0];
  return {
    ...log,
    transcript: null,
    durationSec: null,
    accuracyScore: null,
    gps: null,
    answers: [],
    tags: [],
  };
}
