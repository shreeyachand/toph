import { getSupabaseAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

const FALLBACK = [
  { id: "t1", subject: "Microphone not recording offline", body: "Voice log saved without audio.", status: "open", requester: "Emma Davis", created_at: "2026-04-28T12:00:00Z" },
];

/** GET /api/support — tickets. POST files a new ticket. */
export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json({ data: FALLBACK, live: false });
  try {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id, subject, body, status, requester, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json({ data, live: true });
  } catch {
    return Response.json({ data: FALLBACK, live: false });
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.subject) return Response.json({ error: "subject required" }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return Response.json({
      data: { id: `t-${Date.now()}`, subject: body.subject, body: body.body ?? "", status: "open", requester: "Admin", created_at: new Date().toISOString() },
      live: false,
    });
  }
  try {
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({ subject: body.subject, body: body.body ?? null, requester: body.requester ?? "Admin" })
      .select("id, subject, body, status, requester, created_at")
      .single();
    if (error) throw error;
    return Response.json({ data, live: true });
  } catch {
    return Response.json({ error: "create failed" }, { status: 500 });
  }
}
