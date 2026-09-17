import { getStats } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats — the three stat cards. "Today" is the most recent log day
 * (the crew logs daily, so the latest day is their today).
 */
export async function GET() {
  return Response.json(await getStats());
}
