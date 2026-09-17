import TabShell from "@/components/TabShell";
import SettingsTab from "@/components/tabs/SettingsTab";
import { getMeta } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

/** Server page: meta (farm/role) ships with the HTML, no client waterfall. */
export default async function SettingsPage() {
  const meta = await getMeta();
  return (
    <TabShell farm={meta.farm} role={meta.role} active="settings">
      <SettingsTab />
    </TabShell>
  );
}
