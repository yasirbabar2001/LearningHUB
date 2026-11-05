import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const OWNER_EMAILS = ["yasir.starr2001@gmail.com", "yasir.babar@abhibank.com"];
const isOwnerEmail = (email: string) => OWNER_EMAILS.includes(email.toLowerCase());

const schema = z.object({
  email: z.string().trim().email().max(200),
  redirectTo: z.string().trim().url().max(500).optional(),
});

type Result = { status: "granted" | "already_admin" | "invited"; email: string };

export const grantAdminByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }): Promise<Result> => {
    const callerEmail = String(
      (context.claims as Record<string, unknown> | null)?.["email"] ?? "",
    ).toLowerCase();
    if (!isOwnerEmail(callerEmail)) {
      throw new Error("Only the portal owner can grant admin rights.");
    }

    const email = data.email.toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id,email")
      .ilike("email", email)
      .maybeSingle();

    if (profile) {
      const { data: existing } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", profile.id)
        .eq("role", "admin")
        .maybeSingle();
      if (existing) return { status: "already_admin", email };

      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: profile.id, role: "admin" });
      if (error) throw new Error(error.message);
      return { status: "granted", email };
    }

    const { error: pendErr } = await supabaseAdmin
      .from("pending_admins")
      .upsert({ email }, { onConflict: "email" });
    if (pendErr) throw new Error(pendErr.message);

    const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      ...(data.redirectTo ? { redirectTo: data.redirectTo } : {}),
    });
    if (inviteErr) throw new Error(inviteErr.message);

    return { status: "invited", email };
  });

export const sendAdminPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: isAdmin } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) throw new Error("Only administrators can send password resets.");

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(data.email.toLowerCase(), {
      ...(data.redirectTo ? { redirectTo: data.redirectTo } : {}),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelPendingAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const callerEmail = String(
      (context.claims as Record<string, unknown> | null)?.["email"] ?? "",
    ).toLowerCase();
    if (!isOwnerEmail(callerEmail)) {
      throw new Error("Only the portal owner can manage admin invitations.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("pending_admins")
      .delete()
      .eq("email", data.email.toLowerCase());
    if (error) throw new Error(error.message);
    return { ok: true };
  });
