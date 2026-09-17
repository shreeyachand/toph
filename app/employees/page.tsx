import TabShell from "@/components/TabShell";
import EmployeesTab from "@/components/tabs/EmployeesTab";
import { getMeta } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

/** Server page: meta (farm/role) ships with the HTML, no client waterfall. */
export default async function EmployeesPage() {
  const meta = await getMeta();
  return (
    <TabShell farm={meta.farm} role={meta.role} active="employees">
      <EmployeesTab />
    </TabShell>
  );
}
