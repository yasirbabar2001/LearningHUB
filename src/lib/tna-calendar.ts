import { programForSkill } from "./tna-programs";

export type CalendarAssessment = {
  id: string;
  employee_code: string;
  employee_name: string;
  designation: string | null;
  department: string | null;
  sub_department?: string | null;
  branch?: string | null;
  region?: string | null;
  wing?: string | null;
};

export type CalendarInputs = {
  assessments: CalendarAssessment[];
  ratings: { assessment_id: string; skill_name: string; skill_type: string; rating: number }[];
  minAffected: number;
  gapAt: number;
  /** Calendar year — the trainings are planned for this year. */
  year: number;
  /** Maximum participants in one session; larger groups are split into batches. */
  batchSize?: number;
};

export type CalendarItem = {
  year: number;
  skill_name: string;
  skill_type: string;
  priority: "high" | "medium" | "low";
  priority_score: number;
  affected_count: number;
  avg_rating: number;
  audience: string;
  month: number;
  quarter: number;
  delivery_mode: string;
  notes: string;
  skills_covered: string[];
};

export type CalendarParticipant = {
  year: number;
  program_name: string;
  employee_code: string;
  employee_name: string;
  designation: string | null;
  department: string | null;
  sub_department: string | null;
  branch: string | null;
  region: string | null;
  wing: string | null;
  skills: string[];
  avg_rating: number;
  priority: "high" | "medium" | "low";
  month: number;
  quarter: number;
  /** ISO date (yyyy-mm-dd) of the session this employee is scheduled in. */
  training_date: string;
  delivery_mode: string;
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Every Monday–Friday date in a month. */
function weekdays(year: number, month: number): Date[] {
  const out: Date[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/**
 * Groups skill gaps into training programmes so one course covers several related
 * gaps for many employees, ranks the programmes by gap volume and severity, drops
 * anything below the minimum headcount, spreads the rest across the twelve months
 * and schedules every employee onto a dated session.
 */
export function buildCalendar(input: CalendarInputs): { items: CalendarItem[]; participants: CalendarParticipant[] } {
  const staff = new Map(input.assessments.map((a) => [a.id, a]));
  const batchSize = Math.max(5, input.batchSize ?? 30);

  type Prog = {
    skillTypes: Map<string, number>;
    skills: Set<string>;
    total: number;
    sum: number;
    gapSum: number;
    /** assessment id -> skills with a gap + their ratings */
    people: Map<string, { skills: string[]; sum: number }>;
    depts: Map<string, number>;
  };

  const progs = new Map<string, Prog>();

  for (const r of input.ratings) {
    const key = programForSkill(r.skill_name);
    const p =
      progs.get(key) ??
      ({ skillTypes: new Map(), skills: new Set(), total: 0, sum: 0, gapSum: 0, people: new Map(), depts: new Map() } as Prog);
    p.total += 1;
    p.sum += r.rating;
    p.skillTypes.set(r.skill_type, (p.skillTypes.get(r.skill_type) ?? 0) + 1);
    if (r.rating <= input.gapAt) {
      p.skills.add(r.skill_name);
      p.gapSum += input.gapAt + 1 - r.rating;
      const person = p.people.get(r.assessment_id) ?? { skills: [], sum: 0 };
      person.skills.push(r.skill_name);
      person.sum += r.rating;
      p.people.set(r.assessment_id, person);
      const d = staff.get(r.assessment_id)?.department ?? "All Departments";
      p.depts.set(d, (p.depts.get(d) ?? 0) + 1);
    }
    progs.set(key, p);
  }

  const shortlist = [...progs.entries()]
    .filter(([, p]) => p.people.size >= input.minAffected)
    .map(([name, p]) => {
      const avg = Math.round((p.sum / p.total) * 100) / 100;
      const affected = p.people.size;
      const severity = p.gapSum / Math.max(affected, 1);
      const score = Math.round(affected * severity * 100) / 100;
      const coverage = affected / Math.max(staff.size, 1);
      const priority: CalendarItem["priority"] =
        avg <= 2.5 || coverage >= 0.5 ? "high" : avg <= 3.2 || coverage >= 0.3 ? "medium" : "low";
      const skillType = [...p.skillTypes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "technical";
      const audience = [...p.depts.entries()]
        .sort((x, y) => y[1] - x[1])
        .slice(0, 3)
        .map(([d, n]) => `${d} (${n})`)
        .join(", ");
      return { name, p, avg, affected, score, priority, skillType, audience: audience || "All Departments" };
    })
    .sort((x, y) => y.score - x.score);

  const perMonth = Math.max(1, Math.ceil(shortlist.length / 12));
  const items: CalendarItem[] = [];
  const participants: CalendarParticipant[] = [];
  const slotUsed = new Map<number, number>();

  shortlist.forEach((s, i) => {
    const month = Math.min(12, Math.floor(i / perMonth) + 1);
    const quarter = Math.ceil(month / 3);
    const skills = [...s.p.skills].sort();
    const mode = s.skillType === "soft" ? "classroom" : "classroom";

    items.push({
      year: input.year,
      skill_name: s.name,
      skill_type: s.skillType,
      priority: s.priority,
      priority_score: s.score,
      affected_count: s.affected,
      avg_rating: s.avg,
      audience: s.audience,
      month,
      quarter,
      delivery_mode: mode,
      notes: `Covers ${skills.length} skill gap(s): ${skills.slice(0, 6).join(", ")}${skills.length > 6 ? "…" : ""}. ${s.affected} staff rated at or below ${input.gapAt}.`,
      skills_covered: skills,
    });

    // Schedule the affected employees into dated batches inside the month.
    const days = weekdays(input.year, month);
    const people = [...s.p.people.entries()].sort((a, b) => {
      const an = staff.get(a[0])?.employee_name ?? "";
      const bn = staff.get(b[0])?.employee_name ?? "";
      return an.localeCompare(bn);
    });

    people.forEach(([assessmentId, person], idx) => {
      const emp = staff.get(assessmentId);
      if (!emp) return;
      const batch = Math.floor(idx / batchSize);
      const used = slotUsed.get(month) ?? 0;
      const slot = used + batch;
      const date = days[Math.min(days.length - 1, 2 + slot * 3)] ?? days[0]!;
      participants.push({
        year: input.year,
        program_name: s.name,
        employee_code: emp.employee_code,
        employee_name: emp.employee_name,
        designation: emp.designation ?? null,
        department: emp.department ?? null,
        sub_department: emp.sub_department ?? null,
        branch: emp.branch ?? null,
        region: emp.region ?? null,
        wing: emp.wing ?? null,
        skills: person.skills,
        avg_rating: Math.round((person.sum / person.skills.length) * 100) / 100,
        priority: s.priority,
        month,
        quarter,
        training_date: iso(date!),
        delivery_mode: mode,
      });
    });

    const batches = Math.max(1, Math.ceil(people.length / batchSize));
    slotUsed.set(month, (slotUsed.get(month) ?? 0) + batches);
  });

  return { items, participants };
}
