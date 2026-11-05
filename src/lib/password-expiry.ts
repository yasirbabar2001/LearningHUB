/** Passwords expire every 3 months; warnings show for 10 days, then a reset is mandatory. */
export const PASSWORD_MAX_AGE_DAYS = 90;
export const PASSWORD_GRACE_DAYS = 10;
const DAY = 86_400_000;

export type PasswordExpiry =
  | { state: "ok" }
  | { state: "warning"; daysLeft: number }
  | { state: "expired" };

export function passwordExpiry(changedAt: string | null | undefined): PasswordExpiry {
  if (!changedAt) return { state: "ok" };
  const age = (Date.now() - new Date(changedAt).getTime()) / DAY;
  if (age >= PASSWORD_MAX_AGE_DAYS + PASSWORD_GRACE_DAYS) return { state: "expired" };
  if (age >= PASSWORD_MAX_AGE_DAYS)
    return { state: "warning", daysLeft: Math.max(1, Math.ceil(PASSWORD_MAX_AGE_DAYS + PASSWORD_GRACE_DAYS - age)) };
  return { state: "ok" };
}
