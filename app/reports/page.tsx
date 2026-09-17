import TabShell from "@/components/TabShell";
import ReportsTab from "@/components/tabs/ReportsTab";
import { getMeta } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

/** Server page: meta (farm/role) ships with the HTML, no client waterfall. */
export default async function ReportsPage() {
  const meta = await getMeta();
  return (
    <TabShell farm={meta.farm} role={meta.role} active="reports">
      <ReportsTab />
    </TabShell>
  );
}
