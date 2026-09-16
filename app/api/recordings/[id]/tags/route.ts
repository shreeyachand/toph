import { getSupabaseAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/recordings/:id/tags — tags on a recording (Add Tag button state).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json({ data: [], live: false });

  const { data, error } = await supabase
    .from("log_tags")
    .select("tags(id, name, color)")
    .eq("log_id", id);
  if (error) return Response.json({ error: "Failed to load tags" }, { status: 500 });
  const tags = (data ?? []).flatMap((r: { tags: unknown }) =>
    Array.isArray(r.tags) ? r.tags : r.tags ? [r.tags] : []
  );
  return Response.json({ data: tags, live: true });
}

/**
 * POST /api/recordings/:id/tags — attach a tag (Add Tag button).
 * Body: { "tag_id": number }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let tag_id: unknown;
  try {
    ({ tag_id } = (await req.json()) as { tag_id: unknown });
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof tag_id !== "number") {
    return Response.json({ error: "tag_id must be a number" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json({ error: "Database not connected" }, { status: 503 });

  const { error } = await supabase
    .from("log_tags")
    .upsert({ log_id: id, tag_id }, { onConflict: "log_id,tag_id" });
  if (error) return Response.json({ error: "Failed to add tag" }, { status: 500 });
  return Response.json({ data: { log_id: id, tag_id }, live: true }, { status: 201 });
}

/**
 * DELETE /api/recordings/:id/tags?tag_id=3 — remove a tag.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tag_id = Number(new URL(req.url).searchParams.get("tag_id"));
  if (!Number.isInteger(tag_id)) {
    return Response.json({ error: "tag_id query param must be a number" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json({ error: "Database not connected" }, { status: 503 });

  const { error } = await supabase
    .from("log_tags")
    .delete()
    .eq("log_id", id)
    .eq("tag_id", tag_id);
  if (error) return Response.json({ error: "Failed to remove tag" }, { status: 500 });
  return Response.json({ data: { log_id: id, tag_id }, live: true });
}
