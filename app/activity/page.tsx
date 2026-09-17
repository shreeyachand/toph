import TabShell from "@/components/TabShell";
import ActivityLogsTab from "@/components/tabs/ActivityLogsTab";
import { getMeta } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

/** Server page: meta (farm/role) ships with the HTML, no client waterfall. */
export default async function ActivityPage() {
  const meta = await getMeta();
  return (
    <TabShell farm={meta.farm} role={meta.role} active="activity">
      <ActivityLogsTab />
    </TabShell>
  );
}
