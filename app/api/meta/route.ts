import { getMeta } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/meta — small lookups the dashboard shell needs: farm name + user
 * role for the Sidebar, and activity/field/tag options for the LogsPanel
 * filter dropdowns.
 */
export async function GET() {
  return Response.json(await getMeta());
}
