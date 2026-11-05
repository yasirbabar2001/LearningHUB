import ExcelJS from "exceljs";
import { pairStats, type EvaluationAttempt } from "@/lib/evaluation-data";

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
      max = Math.min(48, Math.max(max, String(cell.value ?? "").length + 2));
    });
    col.width = max;
  });
}

function titleBlock(ws: ExcelJS.Worksheet, title: string, span: number) {
  ws.mergeCells(1, 1, 1, span);
  const cell = ws.getCell(1, 1);
  cell.value = title;
  cell.font = { bold: true, size: 14, color: { argb: NAVY }, name: "Arial" };
  cell.alignment = { vertical: "middle" };
  ws.getRow(1).height = 26;
  ws.mergeCells(2, 1, 2, span);
  const sub = ws.getCell(2, 1);
  sub.value = `Generated ${new Date().toLocaleString()}`;
  sub.font = { size: 10, color: { argb: "FF666666" }, name: "Arial" };
  ws.addRow([]);
}

const num = (v: number | null) => (v == null ? "" : Math.round(v * 100) / 100);

function statSheet(
  wb: ExcelJS.Workbook,
  name: string,
  label: string,
  rows: EvaluationAttempt[],
  keyFn: (r: EvaluationAttempt) => string | null,
) {
  const ws = wb.addWorksheet(name);
  titleBlock(ws, `Pre & Post Evaluation — ${label} wise`, 7);
  headerRow(ws, [
    label,
    "Pre Attempts",
    "Post Attempts",
    "Pre Avg %",
    "Post Avg %",
    "Improvement %",
    "Post Pass Rate %",
  ]);
  for (const s of pairStats(rows, keyFn)) {
    const r = ws.addRow([
      s.key,
      s.preCount,
      s.postCount,
      num(s.preAvg),
      num(s.postAvg),
      num(s.improvement),
      num(s.passRate),
    ]);
    if (s.improvement != null) {
      r.getCell(6).font = {
        name: "Arial",
        color: { argb: s.improvement >= 0 ? "FF157347" : "FFB02A37" },
        bold: true,
      };
    }
  }
  autoWidth(ws);
}

export async function exportEvaluationReport(rows: EvaluationAttempt[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "L&D Portal";

  const summary = wb.addWorksheet("Summary");
  titleBlock(summary, "Pre & Post Training Evaluation Summary", 3);
  const pre = rows.filter((r) => r.phase === "pre");
  const post = rows.filter((r) => r.phase === "post");
  const mean = (a: EvaluationAttempt[]) =>
    a.length ? a.reduce((s, r) => s + Number(r.score_pct), 0) / a.length : null;
  headerRow(summary, ["Metric", "Value", ""]);
  const metrics: [string, string | number][] = [
    ["Total evaluations", rows.length],
    ["Pre evaluations", pre.length],
    ["Post evaluations", post.length],
    ["Average pre score %", num(mean(pre))],
    ["Average post score %", num(mean(post))],
    [
      "Average improvement %",
      mean(pre) != null && mean(post) != null ? num(mean(post)! - mean(pre)!) : "",
    ],
    [
      "Post pass rate %",
      post.length ? num((post.filter((r) => r.passed).length / post.length) * 100) : "",
    ],
    ["Unique employees", new Set(rows.map((r) => r.employee_code.toLowerCase())).size],
    ["Trainings covered", new Set(rows.map((r) => r.training_name ?? "")).size],
  ];
  for (const [k, v] of metrics) {
    const r = summary.addRow([k, v, ""]);
    r.getCell(1).font = { bold: true, name: "Arial" };
    r.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2FAF7" } };
  }
  autoWidth(summary);

  statSheet(wb, "By Training", "Training", rows, (r) => r.training_name);
  statSheet(wb, "By Trainer", "Trainer", rows, (r) => r.trainer_name);
  statSheet(wb, "By Department", "Department", rows, (r) => r.department_name);
  statSheet(wb, "By Region", "Region", rows, (r) => r.region_name);
  statSheet(wb, "By Location", "Location", rows, (r) => r.location_name);
  statSheet(wb, "By Wing", "Wing", rows, (r) => r.wing_name);
  statSheet(wb, "By Designation", "Designation", rows, (r) => r.designation_name);
  statSheet(wb, "By Gender", "Gender", rows, (r) => r.gender_name);

  // Employee level pre vs post
  const emp = wb.addWorksheet("Employee Pre vs Post");
  titleBlock(emp, "Employee Pre vs Post Comparison", 8);
  headerRow(emp, [
    "Employee ID",
    "Name",
    "Training",
    "Department",
    "Location",
    "Pre Score %",
    "Post Score %",
    "Improvement %",
  ]);
  const byEmp = new Map<string, EvaluationAttempt[]>();
  for (const r of rows) {
    const k = `${r.employee_code.toLowerCase()}|${r.training_id}`;
    byEmp.set(k, [...(byEmp.get(k) ?? []), r]);
  }
  for (const list of byEmp.values()) {
    const p = list.find((x) => x.phase === "pre");
    const q = list.find((x) => x.phase === "post");
    const base = p ?? q!;
    emp.addRow([
      base.employee_code,
      base.employee_name,
      base.training_name ?? "",
      base.department_name ?? "",
      base.location_name ?? "",
      p ? Number(p.score_pct) : "",
      q ? Number(q.score_pct) : "",
      p && q ? Math.round((Number(q.score_pct) - Number(p.score_pct)) * 100) / 100 : "",
    ]);
  }
  autoWidth(emp);

  const detail = wb.addWorksheet("All Attempts");
  titleBlock(detail, "All Evaluation Attempts", 15);
  headerRow(detail, [
    "Submitted",
    "Phase",
    "Employee ID",
    "Name",
    "Designation",
    "Department",
    "Location",
    "Region",
    "Wing",
    "Gender",
    "Training",
    "Training Type",
    "Trainer",
    "Correct / Total",
    "Score %",
  ]);
  for (const r of rows) {
    const row = detail.addRow([
      new Date(r.submitted_at).toLocaleString(),
      r.phase === "pre" ? "Pre" : "Post",
      r.employee_code,
      r.employee_name,
      r.designation_name ?? "",
      r.department_name ?? "",
      r.location_name ?? "",
      r.region_name ?? "",
      r.wing_name ?? "",
      r.gender_name ?? "",
      r.training_name ?? "",
      r.training_type ?? "",
      r.trainer_name ?? "",
      `${r.correct_count} / ${r.total_questions}`,
      Number(r.score_pct),
    ]);
    row.getCell(2).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: r.phase === "post" ? SEA : "FFE9EEF4" },
    };
  }
  autoWidth(detail);

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pre-post-evaluation-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Question-by-question answer sheet for one training (admin). */
export async function exportAnswerSheets(
  trainingLabel: string,
  attempts: import("@/lib/evaluation-data").EvaluationAttempt[],
  answers: import("@/lib/evaluation-data").EvaluationAnswer[],
) {
  const { questionStats } = await import("@/lib/evaluation-data");
  const wb = new ExcelJS.Workbook();

  const qs = questionStats(attempts, answers);
  const summary = wb.addWorksheet("Question Analysis");
  titleBlock(summary, `Question Analysis — ${trainingLabel}`, 8);
  headerRow(summary, [
    "#",
    "Question",
    "Correct Option",
    "Pre Attempts",
    "Pre Correct %",
    "Post Attempts",
    "Post Correct %",
    "Improvement",
  ]);
  qs.forEach((q, i) => {
    const pre = q.preTotal ? (q.preCorrect / q.preTotal) * 100 : null;
    const post = q.postTotal ? (q.postCorrect / q.postTotal) * 100 : null;
    summary.addRow([
      i + 1,
      q.questionText,
      q.correctOption ?? "",
      q.preTotal,
      pre == null ? "" : Number(pre.toFixed(1)),
      q.postTotal,
      post == null ? "" : Number(post.toFixed(1)),
      pre != null && post != null ? Number((post - pre).toFixed(1)) : "",
    ]);
  });
  autoWidth(summary);

  const byAttempt = new Map(attempts.map((a) => [a.id, a]));
  const detail = wb.addWorksheet("Employee Answers");
  titleBlock(detail, `Employee-wise Answers — ${trainingLabel}`, 9);
  headerRow(detail, [
    "Employee ID",
    "Employee",
    "Designation",
    "Department",
    "Phase",
    "Submitted",
    "Question",
    "Answered",
    "Correct Answer",
    "Result",
  ]);
  for (const ans of answers) {
    const a = byAttempt.get(ans.attempt_id);
    if (!a) continue;
    const row = detail.addRow([
      a.employee_code,
      a.employee_name,
      a.designation_name ?? "",
      a.department_name ?? "",
      a.phase === "pre" ? "Pre" : "Post",
      new Date(a.submitted_at).toLocaleString(),
      ans.question_text ?? "",
      ans.selected_option ?? "Not answered",
      ans.correct_option ?? "",
      ans.is_correct ? "Correct" : "Wrong",
    ]);
    row.getCell(10).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: ans.is_correct ? SEA : "FFF4D3D3" },
    };
  }
  autoWidth(detail);

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `answer-sheets-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
