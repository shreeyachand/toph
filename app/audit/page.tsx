import TabShell from "@/components/TabShell";
import AuditTab from "@/components/tabs/AuditTab";
import { getMeta } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

/** Server page: meta (farm/role) ships with the HTML, no client waterfall. */
export default async function AuditPage() {
  const meta = await getMeta();
  return (
    <TabShell farm={meta.farm} role={meta.role} active="audit">
      <AuditTab />
    </TabShell>
  );
}
