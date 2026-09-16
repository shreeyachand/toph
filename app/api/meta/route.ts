import { mockLogs, mockUser } from "@/lib/mock-data";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/meta — small lookups the dashboard shell needs: farm name + user
 * role for the Sidebar, and activity/field/tag options for the LogsPanel
 * filter dropdowns.
 */
export async function GET() {
  const fallback = {
    farm: mockUser.farm,
    role: mockUser.role,
    activities: Array.from(new Set(mockLogs.map((l) => l.activity))).sort(),
    fields: Array.from(new Set(mockLogs.map((l) => l.field))).sort(),
    tags: [],
    live: false,
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json(fallback);

  try {
    const [farmRes, activitiesRes, fieldsRes, tagsRes] = await Promise.all([
      supabase.from("farm_settings").select("value").eq("key", "farm_name").single(),
      supabase.from("activity_types").select("name").order("name"),
      supabase.from("fields").select("name").order("name"),
      supabase.from("tags").select("id, name, color").order("name"),
    ]);
    if (activitiesRes.error) throw activitiesRes.error;
    if (fieldsRes.error) throw fieldsRes.error;

    return Response.json({
      farm:
        typeof farmRes.data?.value === "string" ? farmRes.data.value : mockUser.farm,
      role: mockUser.role,
      activities: (activitiesRes.data ?? []).map((a: { name: string }) => a.name),
      fields: (fieldsRes.data ?? []).map((f: { name: string }) => f.name),
      tags: tagsRes.error ? [] : (tagsRes.data ?? []),
      live: true,
    });
  } catch {
    return Response.json(fallback);
  }
}
