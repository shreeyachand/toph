import TabShell from "@/components/TabShell";
import ActivityLogsTab from "@/components/tabs/ActivityLogsTab";
import { getMeta } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

/**
 * Server page: `field` comes from searchParams on the server (no
 * useSearchParams/Suspense boundary needed) and meta ships with the HTML.
 * The key remounts the tab when a client navigation changes ?field= so the
 * table can't hold a stale filter (same pattern as /schedule's `person`).
 */
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string; field?: string }>;
}) {
  const [{ field }, meta] = await Promise.all([searchParams, getMeta()]);
  return (
    <TabShell farm={meta.farm} role={meta.role} active="activity">
      <ActivityLogsTab key={field ?? "all"} initialField={field ?? null} />
    </TabShell>
  );
}
