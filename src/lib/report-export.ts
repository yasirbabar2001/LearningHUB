import ExcelJS from "exceljs";
import { addCoachSheets } from "@/lib/coach-report-export";
import {
  avg,
  groupStats,
  monthKey,
  type FeedbackRow,
  type GroupStat,
} from "@/lib/analytics";

const NAVY = "FF08182E";
const SEA = "FF71C7AC";

const DIMENSIONS: { id: string; label: string; keyFn: (r: FeedbackRow) => string | null }[] = [
  { id: "Training", label: "Training", keyFn: (r) => r.training_name },
  { id: "Trainer", label: "Trainer", keyFn: (r) => r.trainer_name },
  { id: "Department", label: "Department", keyFn: (r) => r.department_name },
  { id: "Region", label: "Region", keyFn: (r) => r.region_name },
  { id: "Location", label: "Location", keyFn: (r) => r.location_name },
  { id: "Wing", label: "Wing", keyFn: (r) => r.wing_name },
  { id: "Designation", label: "Designation", keyFn: (r) => r.designation_name },
  { id: "Gender", label: "Gender", keyFn: (r) => r.gender_name },
  { id: "Training Type", label: "Training Type", keyFn: (r) => r.training_type },
  {
    id: "Mandatory",
    label: "Mandatory Status",
    keyFn: (r) =>
      r.training_mandatory === "mandatory"
        ? "Mandatory"
        : r.training_mandatory === "non_mandatory"
          ? "Non Mandatory"
          : null,
  },
  { id: "Monthly", label: "Month", keyFn: monthKey },
];

function barChartPng(title: string, data: { label: string; value: number }[]): string | null {
  if (typeof document === "undefined" || !data.length) return null;
  const items = data.slice(0, 15);
  const width = 900;
  const height = 420;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#08182e";
  ctx.font = "bold 20px Arial";
  ctx.fillText(title, 24, 34);

  const left = 60;
  const right = width - 24;
  const top = 60;
  const bottom = height - 90;
  const max = 5;

  ctx.strokeStyle = "#dbe1e8";
  ctx.fillStyle = "#5b6672";
  ctx.font = "12px Arial";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = bottom - ((bottom - top) * i) / 5;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.fillText(String(i), 30, y + 4);
  }

  const slot = (right - left) / items.length;
  const barW = Math.min(60, slot * 0.6);
  items.forEach((d, i) => {
    const x = left + slot * i + (slot - barW) / 2;
    const h = ((bottom - top) * Math.min(d.value, max)) / max;
    ctx.fillStyle = i % 2 === 0 ? "#08182e" : "#71c7ac";
    ctx.fillRect(x, bottom - h, barW, h);
    ctx.fillStyle = "#08182e";
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(d.value.toFixed(2), x + barW / 2, bottom - h - 6);
    ctx.font = "11px Arial";
    ctx.fillStyle = "#5b6672";
    ctx.save();
    ctx.translate(x + barW / 2, bottom + 10);
    ctx.rotate(-Math.PI / 5);
    ctx.textAlign = "right";
    const label = d.label.length > 22 ? `${d.label.slice(0, 21)}…` : d.label;
    ctx.fillText(label, 0, 0);
    ctx.restore();
    ctx.textAlign = "left";
  });

  ctx.strokeStyle = "#08182e";
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();

  return canvas.toDataURL("image/png");
}

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial", size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  row.height = 22;
}

function titleRow(sheet: ExcelJS.Worksheet, text: string, span: number) {
  const row = sheet.addRow([text]);
  sheet.mergeCells(row.number, 1, row.number, span);
  row.getCell(1).font = { bold: true, size: 14, color: { argb: NAVY }, name: "Arial" };
  row.height = 26;
}

const num = (v: number | null | undefined) => (v === null || v === undefined ? null : Number(v.toFixed(2)));

function statSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  label: string,
  stats: GroupStat[],
) {
  const sheet = workbook.addWorksheet(name.slice(0, 31));
  sheet.properties.defaultRowHeight = 18;
  titleRow(sheet, `${label}-wise Feedback Analysis`, 9);
  const header = sheet.addRow([
    label,
    "Responses",
    "Trainings",
    "Content",
    "Trainer",
    "Venue",
    "Overall",
    "Quality Score %",
    "Recommendation %",
  ]);
  styleHeader(header);
  const sorted = [...stats].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
  for (const s of sorted) {
    sheet.addRow([
      s.key,
      s.responses,
      s.trainings,
      num(s.content),
      num(s.trainer),
      num(s.venue),
      num(s.overall),
      num(s.quality),
      num(s.recommendPct),
    ]);
  }
  sheet.columns.forEach((c, i) => {
    c.width = i === 0 ? 34 : 16;
    c.font = { name: "Arial", size: 11 };
  });
  sheet.getRow(2).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial", size: 11 };
  });

  const png = barChartPng(
    `${label}-wise Average Overall Rating (out of 5)`,
    sorted.filter((s) => s.overall !== null).map((s) => ({ label: s.key, value: s.overall! })),
  );
  if (png) {
    const imageId = workbook.addImage({ base64: png, extension: "png" });
    sheet.addImage(imageId, {
      tl: { col: 0, row: sorted.length + 4 },
      ext: { width: 900, height: 420 },
    });
  }
  return sheet;
}

export async function downloadDashboardReport(rows: FeedbackRow[], filterNote: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ABHI Microfinance Bank — L&D Portal";
  workbook.created = new Date();

  // Summary
  const summary = workbook.addWorksheet("Summary");
  titleRow(summary, "L&D Training Feedback Report", 4);
  summary.addRow(["Generated", new Date().toLocaleString()]);
  summary.addRow(["Filters", filterNote]);
  summary.addRow([]);
  const classroom = rows.filter((r) => r.training_type === "classroom");
  const virtual = rows.filter((r) => r.training_type === "virtual");
  const recs = rows.filter((r) => r.recommendation !== null);
  const kpiHeader = summary.addRow(["Metric", "Value"]);
  styleHeader(kpiHeader);
  const kpis: [string, string | number | null][] = [
    ["Total feedback responses", rows.length],
    ["Classroom feedback", classroom.length],
    ["Virtual feedback", virtual.length],
    ["Average overall rating", num(avg(rows.map((r) => r.overall_rating)))],
    ["Average content rating", num(avg(rows.map((r) => r.content_rating)))],
    ["Average trainer rating", num(avg(rows.map((r) => r.trainer_rating)))],
    ["Average venue rating (classroom)", num(avg(classroom.map((r) => r.venue_rating)))],
    ["Average quality score %", num(avg(rows.map((r) => r.quality_score)))],
    [
      "Recommendation rate %",
      recs.length ? Number(((recs.filter((r) => r.recommendation).length / recs.length) * 100).toFixed(1)) : null,
    ],
  ];
  kpis.forEach((k) => summary.addRow(k));
  summary.columns.forEach((c, i) => (c.width = i === 0 ? 38 : 34));

  const kpiPng = barChartPng("Average Ratings Overview (out of 5)", [
    { label: "Content", value: avg(rows.map((r) => r.content_rating)) ?? 0 },
    { label: "Trainer", value: avg(rows.map((r) => r.trainer_rating)) ?? 0 },
    { label: "Venue", value: avg(classroom.map((r) => r.venue_rating)) ?? 0 },
    { label: "Overall", value: avg(rows.map((r) => r.overall_rating)) ?? 0 },
  ]);
  if (kpiPng) {
    const id = workbook.addImage({ base64: kpiPng, extension: "png" });
    summary.addImage(id, { tl: { col: 0, row: kpis.length + 7 }, ext: { width: 900, height: 420 } });
  }

  // Detailed feedback
  const detail = workbook.addWorksheet("Detailed Feedback");
  const detailHeader = detail.addRow([
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
    "Content",
    "Trainer Rating",
    "Venue",
    "Overall",
    "Quality Score %",
    "Recommended",
    "Most Useful Aspect",
    "Improvement Suggestion",
    "Additional Comments",
  ]);
  styleHeader(detailHeader);
  detail.views = [{ state: "frozen", ySplit: 1 }];
  for (const r of rows) {
    detail.addRow([
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
      r.training_mandatory === "mandatory"
        ? "Mandatory"
        : r.training_mandatory === "non_mandatory"
          ? "Non Mandatory"
          : "",
      r.training_date,
      r.trainer_name,
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
  }
  detail.columns.forEach((c, i) => (c.width = i >= 20 ? 42 : 18));
  detail.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 24 } };

  // LOV-wise sheets with charts
  for (const dim of DIMENSIONS) {
    const stats = groupStats(rows, dim.keyFn);
    if (!stats.length) continue;
    statSheet(workbook, dim.id, dim.label, stats);
  }

  await addCoachSheets(workbook);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `LD-Feedback-Report-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export const SEA_GREEN = SEA;
