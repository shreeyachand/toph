import TabShell from "@/components/TabShell";
import SupportTab from "@/components/tabs/SupportTab";
import { getMeta } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

/** Server page: meta (farm/role) ships with the HTML, no client waterfall. */
export default async function SupportPage() {
  const meta = await getMeta();
  return (
    <TabShell farm={meta.farm} role={meta.role} active="support">
      <SupportTab />
    </TabShell>
  );
}
