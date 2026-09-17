import { getSupabaseAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

/** GET /api/settings — farm settings. PATCH updates farm_name/timezone. */
export async function GET() {
  const fallback = { farm: "Bays Ranch", timezone: "America/Los_Angeles", live: false };
  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json(fallback);
  try {
    const { data, error } = await supabase.from("farm_settings").select("key, value");
    if (error) throw error;
    const map = new Map(((data ?? []) as Array<{ key: string; value: unknown }>).map((r) => [r.key, r.value]));
    const str = (k: string, fb: string) => (typeof map.get(k) === "string" ? (map.get(k) as string) : fb);
    return Response.json({ farm: str("farm_name", fallback.farm), timezone: str("timezone", fallback.timezone), live: true });
  } catch {
    return Response.json(fallback);
  }
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json({ ...body, live: false });
  try {
    if (body.farm !== undefined) {
      await supabase.from("farm_settings").upsert({ key: "farm_name", value: body.farm });
    }
    if (body.timezone !== undefined) {
      await supabase.from("farm_settings").upsert({ key: "timezone", value: body.timezone });
    }
    return Response.json({ farm: body.farm, timezone: body.timezone, live: true });
  } catch {
    return Response.json({ error: "save failed" }, { status: 500 });
  }
}
