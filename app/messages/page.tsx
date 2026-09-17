import TabShell from "@/components/TabShell";
import MessagesTab from "@/components/tabs/MessagesTab";
import { getMeta } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

/** Server page: meta (farm/role) ships with the HTML, no client waterfall. */
export default async function MessagesPage() {
  const meta = await getMeta();
  return (
    <TabShell farm={meta.farm} role={meta.role} active="messages">
      <MessagesTab />
    </TabShell>
  );
}
