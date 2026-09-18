import { getSupabaseAdmin } from "@/lib/server/supabase";
import {
  isHexColor,
  normalizeTagName,
  resolveOrCreateTags,
  setLogTags,
  type TagRow,
} from "@/lib/server/tags";

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
 * PUT /api/recordings/:id/tags — replace the log's full tag set in one call
 * (the Add Tag box's Confirm button). Body:
 *   { "tags": [ { "tag_id": 3 } | { "name": "Roundup", "color": "#b3261e" } ] }
 *
 * Named tags resolve case-insensitively against the shared `tags` vocabulary
 * and are created on first use; `tag_id` entries must already exist (stale
 * ids are silently dropped). The log ends up with exactly this set.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let tags: unknown;
  try {
    ({ tags } = (await req.json()) as { tags: unknown });
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!Array.isArray(tags) || tags.length > 20) {
    return Response.json({ error: "tags must be an array of at most 20 entries" }, { status: 400 });
  }

  const byId: number[] = [];
  const byName: Array<{ name: string; color: string | null }> = [];
  for (const entry of tags) {
    if (typeof entry !== "object" || entry === null) {
      return Response.json({ error: "Each tag needs a tag_id or a name" }, { status: 400 });
    }
    const { tag_id, name, color } = entry as { tag_id?: unknown; name?: unknown; color?: unknown };
    if (typeof tag_id === "number" && Number.isInteger(tag_id)) {
      byId.push(tag_id);
    } else if (typeof name === "string" && name.trim()) {
      byName.push({ name: normalizeTagName(name), color: isHexColor(color) ? color : null });
    } else {
      return Response.json({ error: "Each tag needs a tag_id or a name" }, { status: 400 });
    }
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json({ error: "Database not connected" }, { status: 503 });

  try {
    const rows = new Map<number, TagRow>();
    if (byId.length > 0) {
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, color")
        .in("id", byId);
      if (error) throw error;
      for (const row of (data ?? []) as TagRow[]) rows.set(row.id, row);
    }
    for (const row of await resolveOrCreateTags(supabase, byName)) rows.set(row.id, row);

    await setLogTags(supabase, id, [...rows.keys()]);
    return Response.json({ data: [...rows.values()], live: true });
  } catch (e) {
    if (/invalid input syntax for type uuid/i.test(e instanceof Error ? e.message : "")) {
      return Response.json({ error: "Log not found" }, { status: 404 });
    }
    return Response.json({ error: "Failed to save tags" }, { status: 500 });
  }
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
