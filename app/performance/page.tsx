import TabShell from "@/components/TabShell";
import PerformanceTab from "@/components/tabs/PerformanceTab";
import { getMeta } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

/** Server page: meta (farm/role) ships with the HTML, no client waterfall. */
export default async function PerformancePage() {
  const meta = await getMeta();
  return (
    <TabShell farm={meta.farm} role={meta.role} active="performance">
      <PerformanceTab />
    </TabShell>
  );
}
