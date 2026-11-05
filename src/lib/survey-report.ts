import ExcelJS from "exceljs";
import {
  SURVEY_QUESTIONS,
  SURVEY_SECTION_TITLES,
} from "@/lib/survey-spec";
import { avgOf, countsOf, npsScore, type SurveyResponse } from "@/lib/survey-data";

const NAVY = "FF08182E";
const SEA = "FF71C7AC";

function headerRow(ws: ExcelJS.Worksheet, headers: string[]) {
  const row = ws.addRow(headers);
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial", size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  row.height = 24;
}

function autoWidth(ws: ExcelJS.Worksheet) {
  ws.columns.forEach((col) => {
    let max = 12;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      max = Math.min(60, Math.max(max, String(cell.value ?? "").length + 2));
    });
    col.width = max;
  });
}

function titleBlock(ws: ExcelJS.Worksheet, title: string, span: number) {
  ws.mergeCells(1, 1, 1, span);
  const cell = ws.getCell(1, 1);
  cell.value = title;
  cell.font = { bold: true, size: 14, color: { argb: NAVY }, name: "Arial" };
  ws.getRow(1).height = 26;
  ws.mergeCells(2, 1, 2, span);
  const sub = ws.getCell(2, 1);
  sub.value = `Generated ${new Date().toLocaleString()}`;
  sub.font = { size: 10, color: { argb: "FF666666" }, name: "Arial" };
  ws.addRow([]);
}

const num = (v: number | null) => (v == null ? "" : Math.round(v * 100) / 100);

export async function exportSurveyReport(
  rows: SurveyResponse[],
  allQuestions: typeof SURVEY_QUESTIONS = SURVEY_QUESTIONS,
) {
  const questionList = allQuestions.length ? allQuestions : SURVEY_QUESTIONS;
  const ratingList = questionList.filter((q) => q.type === "scale5" || q.type === "stars");
  const choiceList = questionList.filter((q) => q.type === "choice" || q.type === "multi");
  const textList = questionList.filter((q) => q.type === "long");
  const wb = new ExcelJS.Workbook();
  wb.creator = "ABHI Microfinance Bank — L&D";

  // Summary
  const sum = wb.addWorksheet("Summary");
  titleBlock(sum, "L&D Effectiveness Survey 2026 — Summary", 4);
  headerRow(sum, ["Metric", "Value"]);
  const overall = rows
    .map((r) => r.overall_rating)
    .filter((v): v is number => typeof v === "number");
  sum.addRow(["Total responses", rows.length]);
  sum.addRow([
    "Overall effectiveness (avg / 5)",
    overall.length ? num(overall.reduce((a, b) => a + b, 0) / overall.length) : "",
  ]);
  sum.addRow(["Learning NPS", num(npsScore(rows))]);
  const bySection = new Map<string, number[]>();
  for (const q of ratingList) {
    const a = avgOf(rows, q.id);
    if (a != null) bySection.set(q.section, [...(bySection.get(q.section) ?? []), a]);
  }
  sum.addRow([]);
  headerRow(sum, ["Section", "Average score (/5)"]);
  for (const [key, vals] of bySection) {
    sum.addRow([
      SURVEY_SECTION_TITLES[key] ?? key,
      num(vals.reduce((a, b) => a + b, 0) / vals.length),
    ]);
  }
  autoWidth(sum);

  // Question averages
  const qa = wb.addWorksheet("Question Averages");
  titleBlock(qa, "Average score per question", 5);
  headerRow(qa, ["#", "Section", "Question", "Responses", "Average (/5)"]);
  for (const q of ratingList) {
    const answered = rows.filter((r) => typeof r.ratings?.[q.id] === "number").length;
    qa.addRow([q.num, SURVEY_SECTION_TITLES[q.section] ?? q.section, q.text, answered, num(avgOf(rows, q.id))]);
  }
  autoWidth(qa);

  // Choice distributions
  const ch = wb.addWorksheet("Choice Analysis");
  titleBlock(ch, "Multiple choice & multi-select distribution", 5);
  for (const q of choiceList) {
    ch.addRow([]);
    const t = ch.addRow([`Q${q.num}. ${q.text}`]);
    t.getCell(1).font = { bold: true, color: { argb: NAVY } };
    headerRow(ch, ["Option", "Count", "% of responses"]);
    for (const c of countsOf(rows, q.id, q.options ?? [])) {
      const r = ch.addRow([c.option, c.count, rows.length ? num((c.count / rows.length) * 100) : ""]);
      r.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F7F5" } };
    }
  }
  autoWidth(ch);

  // Demographics
  const demo = wb.addWorksheet("Demographics");
  titleBlock(demo, "Responses by department, designation and tenure", 3);
  const groupBy = (fn: (r: SurveyResponse) => string | null, label: string) => {
    const map = new Map<string, { n: number; sum: number; cnt: number }>();
    for (const r of rows) {
      const k = fn(r) ?? "Not specified";
      const e = map.get(k) ?? { n: 0, sum: 0, cnt: 0 };
      e.n += 1;
      if (typeof r.overall_rating === "number") {
        e.sum += r.overall_rating;
        e.cnt += 1;
      }
      map.set(k, e);
    }
    demo.addRow([]);
    const t = demo.addRow([label]);
    t.getCell(1).font = { bold: true, color: { argb: NAVY } };
    headerRow(demo, [label, "Responses", "Avg overall (/5)"]);
    for (const [k, v] of [...map].sort((a, b) => b[1].n - a[1].n)) {
      demo.addRow([k, v.n, v.cnt ? num(v.sum / v.cnt) : ""]);
    }
  };
  groupBy((r) => r.department_name, "Department");
  groupBy((r) => r.designation_name, "Designation");
  groupBy((r) => r.tenure, "Tenure");
  autoWidth(demo);

  // Open feedback
  const open = wb.addWorksheet("Open Feedback");
  titleBlock(open, "Open-ended feedback", 4);
  headerRow(open, ["Submitted", "Employee ID", "Question", "Response"]);
  for (const r of rows) {
    for (const q of textList) {
      const v = r.comments?.[q.id];
      if (v && v.trim()) {
        const row = open.addRow([
          new Date(r.submitted_at).toLocaleString(),
          r.employee_code ?? "Anonymous",
          `Q${q.num}. ${q.text}`,
          v,
        ]);
        row.getCell(4).alignment = { wrapText: true, vertical: "top" };
      }
    }
  }
  open.getColumn(4).width = 70;
  autoWidth(open);

  // Raw data
  const raw = wb.addWorksheet("Raw Responses");
  const cols = [
    "Submitted",
    "Employee ID",
    "Department",
    "Designation",
    "Tenure",
    ...questionList.map((q) => `Q${q.num}`),
    "NPS (Q53)",
  ];
  headerRow(raw, cols);
  for (const r of rows) {
    raw.addRow([
      new Date(r.submitted_at).toLocaleString(),
      r.employee_code ?? "Anonymous",
      r.department_name ?? "",
      r.designation_name ?? "",
      r.tenure ?? "",
      ...questionList.map((q) => {
        if (q.type === "nps") return r.nps ?? "";
        if (q.type === "long") return r.comments?.[q.id] ?? "";
        if (q.type === "choice" || q.type === "multi") {
          const v = r.choices?.[q.id];
          return Array.isArray(v) ? v.join("; ") : (v ?? "");
        }
        return r.ratings?.[q.id] ?? "";
      }),
      r.nps ?? "",
    ]);
  }
  raw.views = [{ state: "frozen", ySplit: 1 }];
  autoWidth(raw);
  raw.getRow(1).eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SEA } };
    c.font = { bold: true, color: { argb: NAVY }, name: "Arial" };
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `LnD-Effectiveness-Survey-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
