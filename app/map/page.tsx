import TabShell from "@/components/TabShell";
import MapTab from "@/components/tabs/MapTab";
import { getMeta } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

/** Server page: meta (farm/role) ships with the HTML, no client waterfall. */
export default async function MapPage() {
  const meta = await getMeta();
  return (
    <TabShell farm={meta.farm} role={meta.role} active="map">
      <MapTab />
    </TabShell>
  );
}
