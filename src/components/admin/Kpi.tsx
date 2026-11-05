import { fmtPct, fmtRating, pct } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "accent" | "success" | "warning" | "destructive";
}) {
  const toneCls = {
    default: "text-foreground",
    accent: "text-accent-foreground",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  }[tone];
  return (
    <div className="stat-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-2 font-display text-2xl font-semibold", toneCls)}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function RatingKpi({
  label,
  rating,
  responses,
  minSample,
}: {
  label: string;
  rating: number | null;
  responses?: number;
  minSample?: number;
}) {
  const small =
    typeof responses === "number" && typeof minSample === "number" && responses < minSample;
  return (
    <div className="stat-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold">
        {fmtRating(rating)} <span className="text-sm font-normal text-muted-foreground">/ 5</span>
      </p>
      <p className="text-xs font-medium text-primary">{fmtPct(pct(rating))}</p>
      {typeof responses === "number" ? (
        <p className="mt-1 text-xs text-muted-foreground">Responses: {responses}</p>
      ) : null}
      {small ? (
        <p className="mt-1 text-xs font-medium text-warning">
          Small sample size — interpret with caution.
        </p>
      ) : null}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="stat-card p-5">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
