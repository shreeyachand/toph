import TabShell from "@/components/TabShell";
import ScheduleTab from "@/components/tabs/ScheduleTab";
import { getMeta } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

/**
 * Server page: `person` comes from searchParams on the server (no
 * useSearchParams/Suspense boundary needed) and meta ships with the HTML.
 */
export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string }>;
}) {
  const [{ person }, meta] = await Promise.all([searchParams, getMeta()]);
  return (
    <TabShell farm={meta.farm} role={meta.role} active="schedule">
      <ScheduleTab key={person ?? "all"} initialPerson={person ?? null} />
    </TabShell>
  );
}
