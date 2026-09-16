import { mockLogs } from "@/lib/mock-data";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import {
  VOICE_LOG_SELECT,
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
      .select(VOICE_LOG_SELECT)
      .eq("id", id)
      .single()
      .overrideTypes<VoiceLogRow>();
    if (error) throw error;

    const [answersRes, tagsRes] = await Promise.all([
      supabase
        .from("log_answers")
        .select("id, question_key, question_text, answer_text, is_confident")
        .eq("log_id", id)
        .order("created_at"),
      supabase.from("log_tags").select("tags(id, name, color)").eq("log_id", id),
    ]);
    if (answersRes.error) throw answersRes.error;
    if (tagsRes.error) throw tagsRes.error;

    return Response.json({
      data: {
        ...toEmployeeLog(row),
        transcript: row.transcript,
        audioPath: row.audio_path ?? undefined,
        durationSec: row.duration_sec,
        accuracyScore: row.accuracy_score == null ? null : Number(row.accuracy_score),
        gps:
          row.gps_lat != null && row.gps_lng != null
            ? { lat: row.gps_lat, lng: row.gps_lng }
            : null,
        answers: answersRes.data ?? [],
        // log_tags rows come back as { tags: {...} | {...}[] } — normalize.
        tags: (tagsRes.data ?? []).flatMap((r: { tags: unknown }) =>
          Array.isArray(r.tags) ? r.tags : r.tags ? [r.tags] : []
        ),
      },
      live: true,
    });
  } catch {
    return Response.json({ data: mockDetail(id), live: false });
  }
}

/**
 * PATCH /api/recordings/:id — review actions from the log detail view.
 * Body: { "status": "new" | "reviewed" | "flagged" }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let status: unknown;
  try {
    ({ status } = (await req.json()) as { status: unknown });
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (status !== "new" && status !== "reviewed" && status !== "flagged") {
    return Response.json(
      { error: 'status must be "new", "reviewed" or "flagged"' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const log = mockLogs.find((l) => l.id === id);
    if (!log) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({
      data: { ...log, status, isNew: status === "new" },
      live: false,
    });
  }

  const { data, error } = await supabase
    .from("voice_logs")
    .update({ status })
    .eq("id", id)
    .select(VOICE_LOG_SELECT)
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
