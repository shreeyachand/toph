import { getSupabaseAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

/** GET /api/fields — field list with acreage + center for the Map tab. */
export async function GET() {
  const fallback = [
    { id: "field-a", name: "FIELD A", block: "Block A", acreage: 12.5, center_lat: 37.7749, center_lng: -122.4194, logs: 1 },
    { id: "field-b", name: "FIELD B", block: "Block B", acreage: 8.2, center_lat: 37.7759, center_lng: -122.4184, logs: 1 },
  ];
  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json({ data: fallback, live: false });

  try {
    const { data: fields, error } = await supabase
      .from("fields")
      .select("id, name, block, acreage, center_lat, center_lng")
      .order("name");
    if (error) throw error;
    const { data: logs } = await supabase.from("voice_logs").select("field_id");
    const counts = new Map<string, number>();
    for (const l of (logs ?? []) as Array<{ field_id: string | null }>) {
      if (!l.field_id) continue;
      counts.set(l.field_id, (counts.get(l.field_id) ?? 0) + 1);
    }
    return Response.json({
      data: (fields ?? []).map((f) => ({
        ...f,
        logs: counts.get(f.id) ?? 0,
      })),
      live: true,
    });
  } catch {
    return Response.json({ data: fallback, live: false });
  }
}
