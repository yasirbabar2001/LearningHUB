import ExcelJS from "exceljs";
import { supabase } from "@/integrations/supabase/client";
import type { FeedbackRow } from "@/lib/analytics";

const NAVY = "FF08182E";

export type ResponseRow = {
  id: string;
  feedback_id: string;
  question_id: string;
  question_text: string | null;
  category: string | null;
  rating: number | null;
  answer_text: string | null;
};

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial", size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  row.height = 34;
}

const num = (v: number | null | undefined) =>
  v === null || v === undefined ? null : Number(Number(v).toFixed(2));

const mandatoryLabel = (v: string | null | undefined) =>
  v === "mandatory" ? "Mandatory" : v === "non_mandatory" ? "Non Mandatory" : "";

async function fetchResponses(feedbackIds: string[]): Promise<ResponseRow[]> {
  const out: ResponseRow[] = [];
  const chunk = 200;
  for (let i = 0; i < feedbackIds.length; i += chunk) {
    const ids = feedbackIds.slice(i, i + chunk);
    const { data, error } = await supabase
      .from("feedback_responses")
      .select("id,feedback_id,question_id,question_text,category,rating,answer_text")
      .in("feedback_id", ids)
      .limit(50000);
    if (error) throw error;
    out.push(...((data ?? []) as ResponseRow[]));
  }
  return out;
}

export async function downloadMisReport(rows: FeedbackRow[], filterNote: string) {
  const responses = await fetchResponses(rows.map((r) => r.id));

  // Ordered question list (stable by first appearance, grouped by category)
  const qOrder: { id: string; text: string; category: string }[] = [];
  const seen = new Set<string>();
  const catRank: Record<string, number> = { content: 1, trainer: 2, venue: 3, overall: 4 };
  for (const r of responses) {
    if (seen.has(r.question_id)) continue;
    seen.add(r.question_id);
    qOrder.push({
      id: r.question_id,
      text: r.question_text ?? "Question",
      category: r.category ?? "other",
    });
  }
  qOrder.sort((a, b) => (catRank[a.category] ?? 9) - (catRank[b.category] ?? 9));

  const byFeedback = new Map<string, Map<string, ResponseRow>>();
  for (const r of responses) {
    if (!byFeedback.has(r.feedback_id)) byFeedback.set(r.feedback_id, new Map());
    byFeedback.get(r.feedback_id)!.set(r.question_id, r);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ABHI Microfinance Bank — L&D Portal";
  workbook.created = new Date();

  // ---- Sheet 1: MIS Detail (one row per feedback, one column per question) ----
  const sheet = workbook.addWorksheet("MIS Detail");
  const baseHeaders = [
    "Sr.",
    "Feedback ID",
    "Submitted At",
    "Employee Code",
    "Employee Name",
    "Gender",
    "Designation",
    "Department",
    "Wing",
    "Region",
    "Location",
    "Training",
    "Training Code",
    "Training Type",
    "Mandatory / Non Mandatory",
    "Training Date",
    "Trainer",
  ];
  const tailHeaders = [
    "Content Avg",
    "Trainer Avg",
    "Venue Avg",
    "Overall Avg",
    "Quality Score %",
    "Recommended",
    "Most Useful Aspect",
    "Improvement Suggestion",
    "Additional Comments",
  ];
  const header = sheet.addRow([
    ...baseHeaders,
    ...qOrder.map((q) => `[${q.category.toUpperCase()}] ${q.text}`),
    ...tailHeaders,
  ]);
  styleHeader(header);
  sheet.views = [{ state: "frozen", xSplit: 5, ySplit: 1 }];

  rows.forEach((r, idx) => {
    const answers = byFeedback.get(r.id) ?? new Map<string, ResponseRow>();
    sheet.addRow([
      idx + 1,
      r.id,
      new Date(r.submitted_at).toLocaleString(),
      r.employee_code,
      r.employee_name,
      r.gender_name,
      r.designation_name,
      r.department_name,
      r.wing_name,
      r.region_name,
      r.location_name,
      r.training_name,
      r.training_code,
      r.training_type,
      mandatoryLabel((r as FeedbackRow & { training_mandatory?: string | null }).training_mandatory),
      r.training_date,
      r.trainer_name,
      ...qOrder.map((q) => {
        const a = answers.get(q.id);
        if (!a) return "";
        return a.rating ?? a.answer_text ?? "";
      }),
      num(r.content_rating),
      num(r.trainer_rating),
      num(r.venue_rating),
      num(r.overall_rating),
      num(r.quality_score),
      r.recommendation === null ? "" : r.recommendation ? "Yes" : "No",
      r.useful_aspect,
      r.improvement_suggestion,
      r.additional_comments,
    ]);
  });
  const totalCols = baseHeaders.length + qOrder.length + tailHeaders.length;
  sheet.columns.forEach((c, i) => {
    c.width = i === 0 ? 6 : i === 1 ? 38 : i < baseHeaders.length ? 20 : 26;
  });
  if (rows.length) {
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: totalCols } };
  }

  // ---- Sheet 2: Question-wise Summary ----
  const summary = workbook.addWorksheet("Question Summary");
  const sHeader = summary.addRow([
    "Category",
    "Question",
    "Type",
    "Responses",
    "Average Rating",
    "5 ★",
    "4 ★",
    "3 ★",
    "2 ★",
    "1 ★",
  ]);
  styleHeader(sHeader);
  for (const q of qOrder) {
    const list = responses.filter((r) => r.question_id === q.id);
    const rated = list.filter((r) => r.rating !== null);
    const dist = (n: number) => rated.filter((r) => r.rating === n).length;
    summary.addRow([
      q.category,
      q.text,
      rated.length ? "Rating" : "Text / Choice",
      list.length,
      rated.length ? num(rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length) : null,
      dist(5),
      dist(4),
      dist(3),
      dist(2),
      dist(1),
    ]);
  }
  summary.columns.forEach((c, i) => (c.width = i === 1 ? 70 : 16));

  // ---- Sheet 3: Raw Responses ----
  const raw = workbook.addWorksheet("Raw Responses");
  const rHeader = raw.addRow([
    "Feedback ID",
    "Submitted At",
    "Employee Code",
    "Employee Name",
    "Training",
    "Mandatory / Non Mandatory",
    "Trainer",
    "Category",
    "Question",
    "Rating",
    "Answer Text",
  ]);
  styleHeader(rHeader);
  const fbById = new Map(rows.map((r) => [r.id, r]));
  for (const resp of responses) {
    const f = fbById.get(resp.feedback_id);
    if (!f) continue;
    raw.addRow([
      f.id,
      new Date(f.submitted_at).toLocaleString(),
      f.employee_code,
      f.employee_name,
      f.training_name,
      mandatoryLabel((f as FeedbackRow & { training_mandatory?: string | null }).training_mandatory),
      f.trainer_name,
      resp.category,
      resp.question_text,
      resp.rating,
      resp.answer_text,
    ]);
  }
  raw.columns.forEach((c, i) => (c.width = i === 8 ? 60 : i === 10 ? 50 : 20));
  raw.views = [{ state: "frozen", ySplit: 1 }];

  // ---- Sheet 4: Report Info ----
  const info = workbook.addWorksheet("Report Info");
  info.addRow(["MIS Feedback Report"]).font = { bold: true, size: 14, name: "Arial" };
  info.addRow(["Generated", new Date().toLocaleString()]);
  info.addRow(["Filters", filterNote]);
  info.addRow(["Feedback records", rows.length]);
  info.addRow(["Question answers", responses.length]);
  info.columns.forEach((c, i) => (c.width = i === 0 ? 28 : 60));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `LD-MIS-Report-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
