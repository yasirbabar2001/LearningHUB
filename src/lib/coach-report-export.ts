import type ExcelJS from "exceljs";

const NAVY = "FF08182E";

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial", size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  row.height = 22;
}

const IMPACT_KEYS = [
  "Behavior Applied",
  "Application Frequency",
  "Improvement Observed",
  "Evidence Quality",
  "Overall Behavior Change",
  "Barrier",
  "At Risk",
];

type Row = {
  id: string;
  employee_code: string | null;
  employee_name: string | null;
  department_name: string | null;
  designation_name: string | null;
  session_id: string;
  role: string;
  body: string;
  is_error: boolean;
  response_ms: number | null;
  rating: number | null;
  created_at: string;
};

/** Learning Impact Coach sheets (admin-only data via RLS). */
export async function addCoachSheets(workbook: ExcelJS.Workbook) {
  const { supabase } = await import("@/integrations/supabase/client");
  const all: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("coach_messages")
      .select(
        "id,employee_code,employee_name,department_name,designation_name,session_id,role,body,is_error,response_ms,rating,created_at",
      )
      .order("created_at")
      .range(from, from + 999);
    if (error || !data?.length) break;
    all.push(...(data as Row[]));
    if (data.length < 1000) break;
  }

  const coach = all.filter((m) => m.role === "coach" && !m.is_error);
  const rated = coach.filter((m) => m.rating !== null);
  const times = coach.map((m) => m.response_ms).filter((v): v is number => typeof v === "number");

  const s = workbook.addWorksheet("Coach Summary");
  const t = s.addRow(["Learning Impact Coach — Summary"]);
  t.getCell(1).font = { bold: true, size: 14, color: { argb: NAVY }, name: "Arial" };
  styleHeader(s.addRow(["Metric", "Value"]));
  const rows: [string, string | number | null][] = [
    ["Employees who chatted", new Set(all.map((m) => m.employee_code).filter(Boolean)).size],
    ["Conversations", new Set(all.map((m) => m.session_id)).size],
    ["Employee questions", all.filter((m) => m.role === "user").length],
    ["Coach replies", coach.length],
    ["Failed replies", all.filter((m) => m.is_error).length],
    [
      "Average reply time (sec)",
      times.length ? Number((times.reduce((a, b) => a + b, 0) / times.length / 1000).toFixed(1)) : null,
    ],
    ["Rated replies", rated.length],
    [
      "Satisfaction %",
      rated.length ? Number(((rated.filter((m) => m.rating === 1).length / rated.length) * 100).toFixed(1)) : null,
    ],
  ];
  rows.forEach((r) => s.addRow(r));
  s.columns.forEach((c, i) => (c.width = i === 0 ? 34 : 20));

  const im = workbook.addWorksheet("Coach Impact Assessments");
  styleHeader(
    im.addRow(["Date", "Employee Code", "Employee Name", "Department", "Designation", ...IMPACT_KEYS, "Assessment Summary"]),
  );
  im.views = [{ state: "frozen", ySplit: 1 }];
  for (const m of coach) {
    const line = m.body.split("\n").find((l) => /Behavior Applied\s*:/i.test(l));
    if (!line) continue;
    const vals: Record<string, string> = {};
    for (const part of line.replace(/[*_`]/g, "").split("|")) {
      const [k, ...v] = part.split(":");
      if (k) vals[k.trim().toLowerCase()] = v.join(":").trim();
    }
    const summary =
      m.body
        .split("\n")
        .find((l) => /^\W*Assessment\s*:/i.test(l))
        ?.replace(/^\W*Assessment\s*:\s*/i, "")
        .replace(/[*_`]/g, "") ?? "";
    im.addRow([
      new Date(m.created_at).toLocaleString(),
      m.employee_code,
      m.employee_name,
      m.department_name,
      m.designation_name,
      ...IMPACT_KEYS.map((k) => vals[k.toLowerCase()] ?? ""),
      summary,
    ]);
  }
  im.columns.forEach((c, i) => (c.width = i === 12 ? 60 : 18));

  const cv = workbook.addWorksheet("Coach Conversations");
  styleHeader(
    cv.addRow([
      "Date", "Conversation", "Employee Code", "Employee Name", "Department", "Designation",
      "From", "Message", "Reply Time (sec)", "Rating", "Failed",
    ]),
  );
  cv.views = [{ state: "frozen", ySplit: 1 }];
  for (const m of all) {
    const body = /^[=+\-@\t\r]/.test(m.body) ? `'${m.body}` : m.body;
    cv.addRow([
      new Date(m.created_at).toLocaleString(),
      m.session_id.slice(0, 8),
      m.employee_code,
      m.employee_name,
      m.department_name,
      m.designation_name,
      m.role === "user" ? "Employee" : "Coach",
      body.slice(0, 32000),
      m.response_ms ? Number((m.response_ms / 1000).toFixed(1)) : null,
      m.rating === 1 ? "👍" : m.rating === -1 ? "👎" : "",
      m.is_error ? "Yes" : "",
    ]);
  }
  cv.columns.forEach((c, i) => (c.width = i === 7 ? 80 : 16));
  cv.getColumn(8).alignment = { wrapText: true, vertical: "top" };
  cv.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 11 } };
}
