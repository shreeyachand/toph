import { getSupabaseAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

const FALLBACK = [
  {
    id: "c1", subject: "Spray crew FIELD A plan", updated_at: "2026-04-28T16:20:00Z",
    messages: [
      { id: "m1", sender: "Admin", body: "Morning crew: spray starts at 6 AM in FIELD A.", created_at: "2026-04-28T15:00:00Z" },
      { id: "m2", sender: "Isaac Wang", body: "Confirmed, gear checked.", created_at: "2026-04-28T16:20:00Z" },
    ],
  },
];

/** GET /api/conversations — threads with messages for the Messages tab. */
export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json({ data: FALLBACK, live: false });
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("id, subject, updated_at, messages(id, sender, body, created_at)")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as Array<{
      id: string; subject: string | null; updated_at: string;
      messages: Array<{ id: string; sender: string; body: string; created_at: string }>;
    }>;
    for (const r of rows) r.messages.sort((a, b) => a.created_at.localeCompare(b.created_at));
    return Response.json({ data: rows, live: true });
  } catch {
    return Response.json({ data: FALLBACK, live: false });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const supabase = getSupabaseAdmin();
  if (!body.conversation_id || !body.body) {
    return Response.json({ error: "conversation_id and body required" }, { status: 400 });
  }
  if (!supabase) {
    return Response.json({
      data: { id: `m-${Date.now()}`, sender: "Admin", body: body.body, created_at: new Date().toISOString() },
      live: false,
    });
  }
  try {
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: body.conversation_id, sender: "Admin", body: body.body })
      .select("id, sender, body, created_at")
      .single();
    if (error) throw error;
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", body.conversation_id);
    return Response.json({ data, live: true });
  } catch {
    return Response.json({ error: "send failed" }, { status: 500 });
  }
}
