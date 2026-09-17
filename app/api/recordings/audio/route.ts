import { getSupabaseAdmin } from "@/lib/server/supabase";
import { VOICE_BUCKET } from "@/lib/server/recordings";

export const dynamic = "force-dynamic";

/**
 * GET /api/recordings/audio?path=<storage path> — short-lived signed URL for
 * playing back a captured log. The `voice-logs` bucket stays private; the
 * browser never sees storage credentials.
 */
export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get("path") ?? "";
  if (!path || path.includes("..") || path.startsWith("/")) {
    return Response.json({ error: "Invalid path" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return Response.json({ error: "Storage not configured" }, { status: 503 });
  }

  try {
    const { data, error } = await supabase.storage
      .from(VOICE_BUCKET)
      .createSignedUrl(path, 3600);
    if (error) throw error;
    return Response.json({ url: data.signedUrl, live: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sign failed";
    const missing = /not found|object not found|bucket not found/i.test(msg);
    return Response.json({ error: missing ? "Audio not found" : "Audio unavailable" }, { status: missing ? 404 : 503 });
  }
}
