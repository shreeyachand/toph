import { getSupabaseAdmin } from "@/lib/server/supabase";
import { gatherReportData, reportFilename, type ReportRecord } from "@/lib/server/reportPdf";
import { renderReportPdf } from "@/lib/server/reportPdfDoc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/reports/:id/pdf — build the report PDF deterministically at download time. Nothing is stored. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  let report: ReportRecord | null = null;
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("id, title, type, filters, created_at, employees(full_name)")
        .eq("id", id)
        .single();
      if (!error && data) {
        const row = data as {
          id: string;
          title: string;
          type: string;
          filters: Record<string, unknown> | null;
          created_at: string;
          employees: { full_name: string } | Array<{ full_name: string }> | null;
        };
        report = {
          id: row.id,
          title: row.title,
          type: row.type,
          filters: row.filters ?? {},
          created_at: row.created_at,
          generatedBy: Array.isArray(row.employees)
            ? (row.employees[0]?.full_name ?? "—")
            : (row.employees?.full_name ?? "—"),
        };
      }
    } catch {
      report = null;
    }
  }

  // Offline fallback mirrors GET /api/reports so downloads still work without Supabase.
  if (!report) {
    const fallback: ReportRecord[] = [
      { id: "r1", title: "Weekly Activity Summary Apr 19–26", type: "week", filters: { from: "2026-04-19", to: "2026-04-26" }, created_at: "2026-04-28T12:00:00Z", generatedBy: "Isaac Wang" },
      { id: "r2", title: "Monthly Activity Summary — April", type: "month", filters: { month: "2026-04" }, created_at: "2026-04-30T12:00:00Z", generatedBy: "Sophia Lee" },
    ];
    report = fallback.find((r) => r.id === id) ?? null;
  }
  if (!report) return Response.json({ error: "Report not found" }, { status: 404 });

  try {
    const data = await gatherReportData(supabase, report);
    const pdf = await renderReportPdf(data);
    const body = new Uint8Array(pdf);
    return new Response(body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${reportFilename(report.title)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
