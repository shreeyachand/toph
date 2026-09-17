import {
  Document,
  Font,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import path from "node:path";
import type { BreakdownRow, ReportData } from "./reportPdf";

/* Inter (the app's display face; Geist differs only in details) vendored
   under lib/server/fonts so the PDF sets the same type as the site. */
const FONT_DIR = path.join(process.cwd(), "lib", "server", "fonts");
for (const weight of [400, 500, 600, 700]) {
  Font.register({
    family: "Inter",
    src: path.join(FONT_DIR, `inter-latin-${weight}-normal.woff`),
    fontWeight: weight,
  });
}
Font.registerHyphenationCallback((word) => [word]);

/* Tokens distilled from ref/design-tokens.* + app/globals.css */
const INK = "#000000";
const BODY = "#4D4D4D";
const MUTED = "#B3B3B3";
const COLHEAD = "#C4C4C4";
const LINE = "#ECECEC";
const HAIRLINE = "#F0F0F0";
const CHIPLINE = "#E3E3E3";
const GREEN = "#146C44";
const BAR_BG = "#EDEDED";
const WHITE = "#FFFFFF";

/* ------------------------------------------------------------------ */
/* Icons — path data copied verbatim from ref/icons/*.svg (16×16,      */
/* stroke-width 1.33333, round caps/joins, same as <Icon> in the app)  */
/* ------------------------------------------------------------------ */

const ICON_PATHS: Record<string, { paths: string[]; stroke: string }> = {
  files: {
    stroke: "#4D4D4D",
    paths: [
      "M10 1.33334H7.33333C6.97971 1.33334 6.64057 1.47382 6.39052 1.72387C6.14048 1.97392 6 2.31305 6 2.66668V10C6 10.3536 6.14048 10.6928 6.39052 10.9428C6.64057 11.1929 6.97971 11.3333 7.33333 11.3333H12.6667C13.0203 11.3333 13.3594 11.1929 13.6095 10.9428C13.8595 10.6928 14 10.3536 14 10V5.33334",
      "M11.1373 1.80402C10.9882 1.65436 10.8109 1.53572 10.6157 1.45494C10.4205 1.37415 10.2113 1.33283 10 1.33335V4.66668C10 4.84349 10.0702 5.01306 10.1953 5.13809C10.3203 5.26311 10.4899 5.33335 10.6667 5.33335H14C14.0005 5.12209 13.9592 4.91282 13.8784 4.71761C13.7976 4.5224 13.679 4.34513 13.5293 4.19602L11.1373 1.80402Z",
      "M3.33333 4.66666C2.97971 4.66666 2.64057 4.80713 2.39052 5.05718C2.14048 5.30723 2 5.64637 2 5.99999V13.3333C2 13.6869 2.14048 14.0261 2.39052 14.2761C2.64057 14.5262 2.97971 14.6667 3.33333 14.6667H8.66667C8.90071 14.6667 9.13063 14.605 9.33331 14.488C9.536 14.371 9.70431 14.2027 9.82133 14",
    ],
  },
  calendar: {
    stroke: "#4D4D4D",
    paths: [
      "M5.33333 1.33334V4.00001",
      "M10.6667 1.33334V4.00001",
      "M12.6667 2.66666H3.33333C2.59695 2.66666 2 3.26361 2 3.99999V13.3333C2 14.0697 2.59695 14.6667 3.33333 14.6667H12.6667C13.403 14.6667 14 14.0697 14 13.3333V3.99999C14 3.26361 13.403 2.66666 12.6667 2.66666Z",
      "M2 6.66666H14",
    ],
  },
  users: {
    stroke: "#4D4D4D",
    paths: [
      "M10.6667 14V12.6667C10.6667 11.9594 10.3857 11.2811 9.88562 10.781C9.38552 10.281 8.70724 10 8 10H4C3.29275 10 2.61448 10.281 2.11438 10.781C1.61428 11.2811 1.33333 11.9594 1.33333 12.6667V14",
      "M10.6667 2.08533C11.2385 2.23357 11.7449 2.5675 12.1065 3.0347C12.468 3.5019 12.6641 4.07592 12.6641 4.66666C12.6641 5.2574 12.468 5.83142 12.1065 6.29862C11.7449 6.76582 11.2385 7.09975 10.6667 7.24799",
      "M14.6667 14V12.6667C14.6662 12.0758 14.4696 11.5019 14.1076 11.0349C13.7456 10.5679 13.2388 10.2344 12.6667 10.0867",
      "M6 7.33333C7.47276 7.33333 8.66667 6.13943 8.66667 4.66667C8.66667 3.19391 7.47276 2 6 2C4.52724 2 3.33333 3.19391 3.33333 4.66667C3.33333 6.13943 4.52724 7.33333 6 7.33333Z",
    ],
  },
  map: {
    stroke: "#4D4D4D",
    paths: [
      "M9.404 3.702C9.58906 3.79448 9.79311 3.84262 10 3.84262C10.2069 3.84262 10.4109 3.79448 10.596 3.702L13.0353 2.482C13.137 2.43117 13.2501 2.40721 13.3637 2.41238C13.4773 2.41755 13.5876 2.45169 13.6843 2.51155C13.781 2.57142 13.8607 2.65501 13.916 2.75439C13.9712 2.85377 14.0002 2.96563 14 3.07933V11.5887C13.9999 11.7124 13.9654 11.8338 13.9003 11.939C13.8352 12.0443 13.7421 12.1293 13.6313 12.1847L10.596 13.7027C10.4109 13.7951 10.2069 13.8433 10 13.8433C9.79311 13.8433 9.58906 13.7951 9.404 13.7027L6.596 12.2987C6.41093 12.2062 6.20688 12.158 6 12.158C5.79311 12.158 5.58906 12.2062 5.404 12.2987L2.96466 13.5187C2.8629 13.5695 2.74981 13.5935 2.63617 13.5883C2.52252 13.5831 2.4121 13.5489 2.31541 13.4889C2.21872 13.429 2.13897 13.3453 2.08376 13.2458C2.02855 13.1464 1.99972 13.0344 2 12.9207V4.412C2.00006 4.28823 2.03459 4.16691 2.0997 4.06165C2.16481 3.95639 2.25794 3.87133 2.36866 3.816L5.404 2.298C5.58906 2.20552 5.79311 2.15738 6 2.15738C6.20688 2.15738 6.41093 2.20552 6.596 2.298L9.404 3.702Z",
      "M10 3.84267V13.8427",
      "M6 2.15733V12.1573",
    ],
  },
  percent: {
    stroke: "black",
    paths: [
      "M12.6667 3.33333L3.33337 12.6667",
      "M4.33329 6.00001C5.25377 6.00001 5.99996 5.25381 5.99996 4.33334C5.99996 3.41286 5.25377 2.66667 4.33329 2.66667C3.41282 2.66667 2.66663 3.41286 2.66663 4.33334C2.66663 5.25381 3.41282 6.00001 4.33329 6.00001Z",
      "M11.6667 13.3333C12.5871 13.3333 13.3333 12.5871 13.3333 11.6667C13.3333 10.7462 12.5871 10 11.6667 10C10.7462 10 10 10.7462 10 11.6667C10 12.5871 10.7462 13.3333 11.6667 13.3333Z",
    ],
  },
  "chart-line": {
    stroke: "#4D4D4D",
    paths: [
      "M2 2V12.6667C2 13.0203 2.14048 13.3594 2.39052 13.6095C2.64057 13.8595 2.97971 14 3.33333 14H14",
      "M12.6667 6L9.33333 9.33333L6.66667 6.66667L4.66667 8.66667",
    ],
  },
  "audio-lines": {
    stroke: "#4D4D4D",
    paths: [
      "M1.33333 6.66667V8.66667",
      "M4 4V11.3333",
      "M6.66667 2V14",
      "M9.33334 5.33333V10",
      "M12 3.33333V12",
      "M14.6667 6.66667V8.66667",
    ],
  },
};

function PdfIcon({ name, size = 14 }: { name: keyof typeof ICON_PATHS; size?: number }) {
  const icon = ICON_PATHS[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      {icon.paths.map((d, i) => (
        <Path
          key={i}
          d={d}
          fill="none"
          stroke={icon.stroke}
          strokeWidth={1.33333}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Styles — mirrors PageHeader / StatCard / DataTable / ReportsTab     */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingLeft: 44,
    paddingRight: 44,
    fontFamily: "Inter",
    backgroundColor: WHITE,
  },
  /* PageHeader: 20px semibold tracking-tight + 14px #4d4d4d subtitle */
  headerTitle: { color: INK, fontSize: 20, fontWeight: 600, letterSpacing: -0.3 },
  headerSubtitle: { color: BODY, fontSize: 12, marginTop: 4 },
  /* ReportsTab detail chips: rounded-full border #e3e3e3, #4d4d4d text */
  chipRow: { flexDirection: "row", marginTop: 12 },
  chip: {
    borderColor: CHIPLINE,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  chipText: { color: BODY, fontSize: 10 },
  /* StatGrid + StatCard: rounded-2xl, border #ececec, icon + 15px label, */
  /* Inter display value */
  statRow: { flexDirection: "row", marginTop: 16 },
  statCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderColor: LINE,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  statLabelRow: { flexDirection: "row", alignItems: "center" },
  statLabel: { color: INK, fontSize: 12, fontWeight: 500, marginLeft: 7 },
  statValue: { color: INK, fontSize: 34, fontWeight: 500, letterSpacing: -0.5, marginTop: 8 },
  statSuffix: { color: BODY, fontSize: 11 },
  /* TableSection: rounded-2xl border #ececec; toolbar icon + 15px title */
  section: {
    backgroundColor: WHITE,
    borderColor: LINE,
    borderWidth: 1,
    borderRadius: 16,
    marginTop: 16,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  toolbarTitle: { color: INK, fontSize: 13, fontWeight: 500, marginLeft: 8 },
  toolbarCount: { color: MUTED, fontSize: 12, marginLeft: 4 },
  /* ColumnHeaders: 12px medium uppercase #c4c4c4, bordered top/bottom #f0f0f0 */
  colHead: {
    flexDirection: "row",
    alignItems: "center",
    borderTopColor: HAIRLINE,
    borderTopWidth: 1,
    borderBottomColor: HAIRLINE,
    borderBottomWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  colHeadCell: { color: COLHEAD, fontSize: 9, fontWeight: 500, letterSpacing: 0.5 },
  /* Rows: 14px app text → 11pt, #4d4d4d, hairline dividers */
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  rowDivider: { borderBottomColor: HAIRLINE, borderBottomWidth: 1, marginHorizontal: 16 },
  rowName: { color: INK, fontSize: 11 },
  rowMeta: { color: BODY, fontSize: 11 },
  rowPct: { color: MUTED, fontSize: 10, textAlign: "right" },
  barTrack: { backgroundColor: BAR_BG, height: 7, borderRadius: 3.5 },
  barFill: { backgroundColor: GREEN, height: 7, borderRadius: 3.5 },
  /* EmptyRow: centered 14px #b3b3b3 */
  emptyRow: { paddingVertical: 28, paddingHorizontal: 16, alignItems: "center" },
  emptyText: { color: MUTED, fontSize: 11 },
  moreText: { color: MUTED, fontSize: 9, paddingVertical: 8, paddingHorizontal: 16 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { color: MUTED, fontSize: 8 },
});

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDay(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS_SHORT[m - 1]} ${d}`;
}

function fmtLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const MONTHS_LONG = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${MONTHS_LONG[m - 1]} ${d}, ${y}`;
}

function Bar({ frac }: { frac: number }) {
  const width = frac <= 0 ? "0%" : `${Math.max(frac * 100, 5)}%`;
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width }]} />
    </View>
  );
}

function BreakdownSection({
  icon,
  heading,
  count,
  rows,
  total,
  emptyNote,
  headCols,
}: {
  icon: keyof typeof ICON_PATHS;
  heading: string;
  count: number;
  rows: BreakdownRow[];
  total: number;
  emptyNote: string;
  headCols: [string, string, string];
}) {
  const shown = rows.slice(0, 12);
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <View style={styles.section}>
      <View style={styles.toolbar}>
        <PdfIcon name={icon} size={14} />
        <Text style={styles.toolbarTitle}>{heading}</Text>
        <Text style={styles.toolbarCount}>({count})</Text>
      </View>
      {rows.length === 0 ? (
        <View style={styles.emptyRow}>
          <Text style={styles.emptyText}>{emptyNote}</Text>
        </View>
      ) : (
        <View>
          <View style={styles.colHead}>
            <Text style={[styles.colHeadCell, { width: "42%" }]}>{headCols[0]}</Text>
            <Text style={[styles.colHeadCell, { width: "12%" }]}>{headCols[1]}</Text>
            <Text style={[styles.colHeadCell, { width: "46%" }]}>{headCols[2]}</Text>
          </View>
          {shown.map((r, i) => (
            <View key={r.name} wrap={false}>
              <View style={styles.tableRow}>
                <Text style={[styles.rowName, { width: "42%", paddingRight: 8 }]}>{r.name}</Text>
                <Text style={[styles.rowMeta, { width: "12%" }]}>
                  {r.count}
                  {r.hours == null ? "" : ` · ${r.hours}h`}
                </Text>
                <View style={{ width: "34%", paddingRight: 8 }}>
                  <Bar frac={r.count / max} />
                </View>
                <Text style={[styles.rowPct, { width: "12%" }]}>
                  {total > 0 ? `${Math.round((r.count / total) * 100)}%` : "—"}
                </Text>
              </View>
              {i < shown.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
          {rows.length > shown.length && (
            <Text style={styles.moreText}>+ {rows.length - shown.length} more</Text>
          )}
        </View>
      )}
    </View>
  );
}

export function ReportDocument({ data }: { data: ReportData }) {
  const { report, period, farm } = data;
  const typeLabel = report.type === "month" ? "Monthly" : "Weekly";
  const generatedLong = fmtLong(report.created_at.slice(0, 10));

  const stats = [
    { icon: "files" as const, label: "Voice logs", value: String(data.totalLogs), suffix: null as string | null },
    { icon: "users" as const, label: "Active workers", value: String(data.workers), suffix: null },
    { icon: "map" as const, label: "Fields worked", value: String(data.fieldsWorked), suffix: null },
    {
      icon: "percent" as const,
      label: "Accuracy",
      value: data.avgAccuracy == null ? "—" : String(data.avgAccuracy),
      suffix: data.avgAccuracy == null ? null : "%",
    },
  ];

  return (
    <Document
      title={report.title}
      author="Toph Farm Dashboard"
      subject={`${typeLabel} activity summary`}
    >
      <Page size="LETTER" style={styles.page}>
        {/* PageHeader */}
        <Text style={styles.headerTitle}>{report.title}</Text>
        <Text style={styles.headerSubtitle}>
          {typeLabel} activity summary for {farm} · {period.label}
        </Text>
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{report.type}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{report.generatedBy}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{generatedLong}</Text>
          </View>
        </View>

        {/* StatGrid */}
        <View style={styles.statRow}>
          {stats.map((s, i) => (
            <View
              key={s.label}
              style={[styles.statCard, i < stats.length - 1 ? { marginRight: 10 } : {}]}
            >
              <View style={styles.statLabelRow}>
                <PdfIcon name={s.icon} size={14} />
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
              <Text style={styles.statValue}>
                {s.value}
                {s.suffix && <Text style={styles.statSuffix}> {s.suffix}</Text>}
              </Text>
            </View>
          ))}
        </View>

        {data.totalLogs === 0 && (
          <View style={styles.section}>
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No voice logs were recorded in this period.</Text>
            </View>
          </View>
        )}

        <BreakdownSection
          icon="audio-lines"
          heading="Activity breakdown"
          count={data.byActivity.length}
          rows={data.byActivity}
          total={data.totalLogs}
          emptyNote="No activities recorded in this period."
          headCols={["ACTIVITY", "LOGS", "SHARE"]}
        />
        <BreakdownSection
          icon="map"
          heading="Field breakdown"
          count={data.byField.length}
          rows={data.byField}
          total={data.totalLogs}
          emptyNote="No fields worked in this period."
          headCols={["FIELD", "LOGS", "SHARE"]}
        />
        <BreakdownSection
          icon="users"
          heading="Top contributors"
          count={data.byWorker.length}
          rows={data.byWorker}
          total={data.totalLogs}
          emptyNote="No contributors in this period."
          headCols={["WORKER", "LOGS", "SHARE"]}
        />

        {data.totalLogs > 0 && (
          <View style={styles.section}>
            <View style={styles.toolbar}>
              <PdfIcon name="chart-line" size={14} />
              <Text style={styles.toolbarTitle}>Daily volume</Text>
              <Text style={styles.toolbarCount}>({data.daily.length} days)</Text>
            </View>
            <View style={styles.colHead}>
              <Text style={[styles.colHeadCell, { width: "22%" }]}>DAY</Text>
              <Text style={[styles.colHeadCell, { width: "62%" }]}>VOLUME</Text>
              <Text style={[styles.colHeadCell, { width: "16%", textAlign: "right" }]}>LOGS</Text>
            </View>
            {(() => {
              const dailyMax = Math.max(1, ...data.daily.map((d) => d.count));
              return data.daily.map((d, i) => (
                <View key={d.day} wrap={false}>
                  <View style={styles.tableRow}>
                    <Text style={[styles.rowName, { width: "22%" }]}>{fmtDay(d.day)}</Text>
                    <View style={{ width: "62%", paddingRight: 8 }}>
                      <Bar frac={d.count / dailyMax} />
                    </View>
                    <Text style={[styles.rowMeta, { width: "16%", textAlign: "right" }]}>{d.count}</Text>
                  </View>
                  {i < data.daily.length - 1 && <View style={styles.rowDivider} />}
                </View>
              ));
            })()}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Toph Farm Dashboard · {farm}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderReportPdf(data: ReportData): Promise<Buffer> {
  return renderToBuffer(<ReportDocument data={data} />);
}
