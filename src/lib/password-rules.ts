export const PASSWORD_RULES_TEXT =
  "At least 8 characters, one capital letter and one special character (e.g. !@#$%^&*+-_=).";

export function passwordRuleError(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must include at least one capital letter.";
  if (!/[^A-Za-z0-9\s]/.test(pw))
    return "Password must include at least one special character like !@#$%^&*+-_=.";
  return null;
}
