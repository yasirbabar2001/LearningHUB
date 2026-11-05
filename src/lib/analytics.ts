export type FeedbackRow = {
  id: string;
  training_id: string;
  submitted_at: string;
  recommendation: boolean | null;
  useful_aspect: string | null;
  improvement_suggestion: string | null;
  additional_comments: string | null;
  employee_code: string | null;
  employee_name: string | null;
  designation_name: string | null;
  department_name: string | null;
  location_name: string | null;
  region_name: string | null;
  wing_name: string | null;
  gender_name: string | null;
  training_name: string | null;
  training_code: string | null;
  training_type: string | null;
  training_mandatory: string | null;
  training_date: string | null;
  trainer_name: string | null;
  content_rating: number | null;
  trainer_rating: number | null;
  venue_rating: number | null;
  overall_rating: number | null;
  quality_score: number | null;
};

export type Filters = {
  dateFrom: string;
  dateTo: string;
  training: string;
  trainingType: string;
  trainer: string;
  department: string;
  location: string;
  region: string;
  wing: string;
  designation: string;
  gender: string;
};

export const emptyFilters: Filters = {
  dateFrom: "",
  dateTo: "",
  training: "",
  trainingType: "",
  trainer: "",
  department: "",
  location: "",
  region: "",
  wing: "",
  designation: "",
  gender: "",
};

export const ALL = "__all__";

const matches = (value: string | null, filter: string) =>
  !filter || filter === ALL || value === filter;

export function applyFilters(rows: FeedbackRow[], f: Filters): FeedbackRow[] {
  return rows.filter((r) => {
    const d = r.training_date ?? r.submitted_at.slice(0, 10);
    if (f.dateFrom && d < f.dateFrom) return false;
    if (f.dateTo && d > f.dateTo) return false;
    return (
      matches(r.training_name, f.training) &&
      matches(r.training_type, f.trainingType) &&
      matches(r.trainer_name, f.trainer) &&
      matches(r.department_name, f.department) &&
      matches(r.location_name, f.location) &&
      matches(r.region_name, f.region) &&
      matches(r.wing_name, f.wing) &&
      matches(r.designation_name, f.designation) &&
      matches(r.gender_name, f.gender)
    );
  });
}

export const avg = (values: (number | null | undefined)[]): number | null => {
  const nums = values.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
};

export const pct = (rating: number | null): number | null =>
  rating === null ? null : (rating / 5) * 100;

export const fmtRating = (v: number | null) => (v === null ? "—" : v.toFixed(2));
export const fmtPct = (v: number | null) => (v === null ? "—" : `${v.toFixed(1)}%`);

export type GroupStat = {
  key: string;
  responses: number;
  trainings: number;
  content: number | null;
  trainer: number | null;
  venue: number | null;
  overall: number | null;
  quality: number | null;
  recommendPct: number | null;
};

export function groupStats(
  rows: FeedbackRow[],
  keyFn: (r: FeedbackRow) => string | null,
): GroupStat[] {
  const map = new Map<string, FeedbackRow[]>();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k) continue;
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  return [...map.entries()].map(([key, list]) => statsFor(key, list));
}

export function statsFor(key: string, list: FeedbackRow[]): GroupStat {
  const recs = list.filter((r) => r.recommendation !== null);
  return {
    key,
    responses: list.length,
    trainings: new Set(list.map((r) => r.training_id)).size,
    content: avg(list.map((r) => r.content_rating)),
    trainer: avg(list.map((r) => r.trainer_rating)),
    venue: avg(list.map((r) => r.venue_rating)),
    overall: avg(list.map((r) => r.overall_rating)),
    quality: avg(list.map((r) => r.quality_score)),
    recommendPct: recs.length
      ? (recs.filter((r) => r.recommendation).length / recs.length) * 100
      : null,
  };
}

export const monthKey = (r: FeedbackRow) =>
  (r.training_date ?? r.submitted_at).slice(0, 7);
export const quarterKey = (r: FeedbackRow) => {
  const d = r.training_date ?? r.submitted_at;
  return `${d.slice(0, 4)}-Q${Math.floor(Number(d.slice(5, 7)) / 3.01) + 1}`;
};
export const yearKey = (r: FeedbackRow) => (r.training_date ?? r.submitted_at).slice(0, 4);

/* ---------------- sentiment (lexicon based, presented as an aid) ------------- */

const POSITIVE = [
  "good","great","excellent","helpful","useful","informative","clear","engaging","best",
  "amazing","wonderful","knowledgeable","practical","interactive","satisfied","enjoyed",
  "well","perfect","valuable","professional","effective","loved","like","liked","superb",
];
const NEGATIVE = [
  "bad","poor","boring","waste","confusing","unclear","short","rushed","weak","difficult",
  "problem","issue","noisy","uncomfortable","late","disappointed","lacking","insufficient",
  "slow","hard","not good","improve","improvement","limited","inadequate",
];

export type Sentiment = "positive" | "neutral" | "negative";

export function classifySentiment(text: string): Sentiment {
  const t = ` ${text.toLowerCase()} `;
  let score = 0;
  for (const w of POSITIVE) if (t.includes(` ${w}`)) score += 1;
  for (const w of NEGATIVE) if (t.includes(` ${w}`)) score -= 1;
  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

export const THEMES: Record<string, string[]> = {
  Trainer: ["trainer", "instructor", "facilitator", "teacher"],
  Content: ["content", "material", "topic", "syllabus", "curriculum"],
  Duration: ["duration", "time", "long", "short", "hours", "days", "pace"],
  Venue: ["venue", "room", "hall", "seating", "chair", "air", "location"],
  "Practical Examples": ["example", "case study", "scenario", "practical", "real"],
  Activities: ["activity", "activities", "exercise", "group work", "role play"],
  Technology: ["technology", "zoom", "teams", "internet", "connection", "audio", "video", "screen"],
  "Training Material": ["handout", "slide", "presentation", "booklet", "notes", "manual"],
};

export function themeCounts(comments: string[]): { theme: string; count: number }[] {
  return Object.entries(THEMES)
    .map(([theme, words]) => ({
      theme,
      count: comments.filter((c) => {
        const t = c.toLowerCase();
        return words.some((w) => t.includes(w));
      }).length,
    }))
    .sort((a, b) => b.count - a.count);
}

export const allComments = (rows: FeedbackRow[]) =>
  rows.flatMap((r) =>
    [r.useful_aspect, r.improvement_suggestion, r.additional_comments].filter(
      (c): c is string => !!c && c.trim().length > 0,
    ),
  );

/* --------------------------------- insights -------------------------------- */

export const INSUFFICIENT = "Insufficient data to generate this insight.";

export function buildInsights(rows: FeedbackRow[], minSample: number): string[] {
  const out: string[] = [];
  if (rows.length < 1) return [INSUFFICIENT];

  const overall = avg(rows.map((r) => r.overall_rating));
  if (overall !== null)
    out.push(
      `Overall training satisfaction is ${overall.toFixed(2)}/5 (${pct(overall)!.toFixed(1)}%) across ${rows.length} responses.`,
    );

  const cls = rows.filter((r) => r.training_type === "classroom");
  const vir = rows.filter((r) => r.training_type === "virtual");
  const co = avg(cls.map((r) => r.overall_rating));
  const vo = avg(vir.map((r) => r.overall_rating));
  if (co !== null && vo !== null && cls.length >= 3 && vir.length >= 3) {
    const diff = ((co - vo) / vo) * 100;
    out.push(
      diff >= 0
        ? `Classroom trainings are rated ${diff.toFixed(1)}% higher than virtual trainings.`
        : `Virtual trainings are rated ${Math.abs(diff).toFixed(1)}% higher than classroom trainings.`,
    );
  }

  const cats: [string, number | null][] = [
    ["Training content", avg(rows.map((r) => r.content_rating))],
    ["Trainer effectiveness", avg(rows.map((r) => r.trainer_rating))],
    ["Venue quality", avg(rows.map((r) => r.venue_rating))],
  ];
  const rated = cats.filter((c) => c[1] !== null) as [string, number][];
  if (rated.length >= 2) {
    const best = rated.reduce((a, b) => (b[1] > a[1] ? b : a));
    const worst = rated.reduce((a, b) => (b[1] < a[1] ? b : a));
    out.push(`${best[0]} is the highest-rated category at ${best[1].toFixed(2)}/5.`);
    out.push(`${worst[0]} is the lowest-rated category at ${worst[1].toFixed(2)}/5.`);
  }

  const regions = groupStats(rows, (r) => r.region_name).filter(
    (g) => g.overall !== null && g.responses >= Math.min(minSample, 3),
  );
  if (regions.length >= 2) {
    const low = regions.reduce((a, b) => (b.overall! < a.overall! ? b : a));
    out.push(
      `${low.key} region has the lowest average training rating at ${low.overall!.toFixed(2)}/5 (${low.responses} responses).`,
    );
  }

  const trainings = groupStats(rows, (r) => r.training_name).filter(
    (g) => g.content !== null && g.responses >= Math.min(minSample, 3),
  );
  if (trainings.length >= 2) {
    const low = trainings.reduce((a, b) => (b.content! < a.content! ? b : a));
    out.push(
      `"${low.key}" received the lowest content rating at ${low.content!.toFixed(2)}/5 (${low.responses} responses).`,
    );
  }

  const improve = rows
    .map((r) => r.improvement_suggestion)
    .filter((c): c is string => !!c);
  if (improve.length >= 3) {
    const top = themeCounts(improve)[0];
    if (top && top.count > 0)
      out.push(
        `"${top.theme}" is the most frequently mentioned theme in improvement comments (${top.count} mentions).`,
      );
  }

  const monthly = groupStats(rows, monthKey).sort((a, b) => a.key.localeCompare(b.key));
  if (monthly.length >= 2) {
    const last = monthly[monthly.length - 1]!;
    const prev = monthly[monthly.length - 2]!;
    if (last.overall !== null && prev.overall !== null) {
      const delta = last.overall - prev.overall;
      out.push(
        delta >= 0
          ? `Ratings improved by ${delta.toFixed(2)} points versus the previous period (${last.key}).`
          : `Ratings declined by ${Math.abs(delta).toFixed(2)} points versus the previous period (${last.key}).`,
      );
    }
  }

  return out.length ? out : [INSUFFICIENT];
}

export const maskCnic = (cnic: string | null | undefined) => {
  if (!cnic) return "—";
  const digits = cnic.replace(/\D/g, "");
  if (digits.length < 4) return "*****";
  return `*****-*******-${digits.slice(-1)}`.replace("*****-*******", "*****-****" + digits.slice(-4, -1));
};

/* --------------------------------- exports --------------------------------- */

function download(content: BlobPart, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Prefixes cells starting with =, +, -, @, tab or CR so spreadsheets treat them as text. */
export function neutralizeFormula(v: unknown): unknown {
  if (typeof v !== "string") return v;
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

export function neutralizeRows<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, neutralizeFormula(v)])) as T);
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const esc = (v: unknown) => `"${String(neutralizeFormula(v) ?? "").replace(/"/g, '""')}"`;
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ].join("\n");
}

export function exportCsv(rows: Record<string, unknown>[], name: string) {
  download("\uFEFF" + toCsv(rows), `${name}.csv`, "text/csv;charset=utf-8");
}

export function exportExcel(rows: Record<string, unknown>[], name: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]!);
  const esc = (v: unknown) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"/></head><body><table border="1"><thead><tr>${headers
    .map((h) => `<th>${esc(h)}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${headers.map((h) => `<td>${esc(r[h])}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></body></html>`;
  download(html, `${name}.xls`, "application/vnd.ms-excel");
}

export function exportPdf() {
  window.print();
}
