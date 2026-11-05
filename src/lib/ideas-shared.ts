export const IDEA_STATUSES = [
  "Submitted",
  "Under Initial Review",
  "Under Detailed Assessment",
  "Shortlisted",
  "Pilot / Proof of Concept",
  "Approved for Implementation",
  "Implementation in Progress",
  "Implemented",
  "On Hold",
  "Not Pursued",
  "Merged with Existing Initiative",
] as const;

export const REVIEW_STATUSES = ["Under Initial Review", "Under Detailed Assessment"];
export const PIPELINE_STATUSES = [
  "Approved for Implementation",
  "Implementation in Progress",
];

export const IMPACT_LEVELS = ["Low", "Medium", "High", "Transformational"] as const;
export const LMH = ["Low", "Medium", "High"] as const;
export const SCOPES = ["Branch", "Region", "Wing", "Head Office", "Bank-wide"] as const;
export const COMPLEXITIES = ["Easy", "Moderate", "Complex", "Not Sure"] as const;
export const IMPL_TIMES = ["< 1 Month", "1–3 Months", "3–6 Months", "6–12 Months", "12+ Months"] as const;

export type IdeasSettings = {
  enabled: boolean;
  allow_anonymous: boolean;
  explore_enabled: boolean;
  leaderboard_enabled: boolean;
  show_comments_to_employee: boolean;
};

export const DEFAULT_IDEAS_SETTINGS: IdeasSettings = {
  enabled: true,
  allow_anonymous: false,
  explore_enabled: false,
  leaderboard_enabled: false,
  show_comments_to_employee: true,
};

export type IdeaOption = {
  id: string;
  kind: "category" | "type" | "benefit" | "beneficiary" | "recognition";
  code: string | null;
  name: string;
  description: string | null;
  sort_order: number;
  status: string;
};

export function statusTone(s: string) {
  if (s === "Implemented") return "bg-primary/20 text-foreground border-primary";
  if (s === "Not Pursued" || s === "On Hold") return "bg-muted text-muted-foreground border-border";
  if (s === "Shortlisted" || s.startsWith("Pilot") || s.startsWith("Approved") || s.startsWith("Implementation"))
    return "bg-sidebar text-sidebar-foreground border-sidebar";
  return "bg-card text-foreground border-border";
}

export const ALLOWED_ATTACHMENT = /\.(pdf|docx?|xlsx?|csv|pptx?|png|jpe?g|webp|gif|txt)$/i;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
