import DashboardRouter from "@/components/DashboardRouter";
import { getDashboardData } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

/**
 * Dashboard route — async server component. Data is fetched on the server
 * in parallel (recordings + stats + meta) so the HTML streams with content:
 * no "Loading dashboard…" shell, no client-side waterfall.
 */
export default async function DashboardPage() {
  const serverData = await getDashboardData();
  return <DashboardRouter data={serverData} active="dashboard" />;
}
