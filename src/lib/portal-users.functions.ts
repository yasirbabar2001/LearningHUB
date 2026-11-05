import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * One-time password issued when an account is created or reset.
 * Owner-mandated format: "Abhi@" + 13-digit CNIC. Falls back to a random
 * password when no valid CNIC is on file. Must be changed at first sign-in.
 */
export function oneTimePassword(cnic?: string | null) {
  const digits = (cnic ?? "").replace(/\D/g, "");
  if (digits.length === 13) return `Abhi@${digits}`;
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `Abhi@${body}#7`;
}
export const PORTAL_EMAIL_DOMAIN = "abhi.local";
/** Wrong-password attempts allowed before the account is locked. */
export const MAX_LOGIN_ATTEMPTS = 4;

export function portalEmail(employeeCode: string) {
  const slug = employeeCode
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
  return `${slug}@${PORTAL_EMAIL_DOMAIN}`;
}

const personSchema = z.object({
  employee_code: z.string().trim().min(1).max(50),
  cnic: z.string().trim().max(20).optional().default(""),
  name: z.string().trim().min(2).max(120),
  designation: z.string().trim().max(120).optional().default(""),
  department: z.string().trim().max(120).optional().default(""),
  location: z.string().trim().max(120).optional().default(""),
  region: z.string().trim().max(120).optional().default(""),
  wing: z.string().trim().max(120).optional().default(""),
  gender: z.string().trim().max(40).optional().default(""),
  onboarding_enabled: z.boolean().optional().default(false),
});

export type PortalUserInput = z.infer<typeof personSchema>;

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const sb = context.supabase as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (a: string, b: string) => {
          eq: (a: string, b: string) => { maybeSingle: () => Promise<{ data: unknown }> };
        };
      };
    };
  };
  const { data } = await sb
    .from("user_roles")
    .select("id")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Only administrators can manage portal users.");
}

type LovMaps = Record<string, Map<string, string>>;

async function loadLovs(admin: {
  from: (t: string) => {
    select: (c: string) => Promise<{ data: { id: string; name: string }[] | null }>;
  };
}): Promise<LovMaps> {
  const tables = ["designations", "departments", "locations", "regions", "wings", "genders"];
  const out: LovMaps = {};
  await Promise.all(
    tables.map(async (t) => {
      const { data } = await admin.from(t).select("id,name");
      out[t] = new Map((data ?? []).map((r) => [r.name.trim().toLowerCase(), r.id]));
    }),
  );
  return out;
}

function lovFields(lovs: LovMaps, p: PortalUserInput) {
  const pick = (table: string, value: string) =>
    value ? (lovs[table]?.get(value.trim().toLowerCase()) ?? null) : null;
  return {
    designation_id: pick("designations", p.designation),
    department_id: pick("departments", p.department),
    location_id: pick("locations", p.location),
    region_id: pick("regions", p.region),
    wing_id: pick("wings", p.wing),
    gender_id: pick("genders", p.gender),
    designation_name: p.designation || null,
    department_name: p.department || null,
    location_name: p.location || null,
    region_name: p.region || null,
    wing_name: p.wing || null,
    gender_name: p.gender || null,
  };
}

export const createPortalUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ users: z.array(personSchema).min(1).max(2000) }).parse(data))
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      created: number;
      skipped: number;
      errors: string[];
      credentials: { employee_code: string; password: string }[];
    }> => {
      await assertAdmin(context as never);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const admin = supabaseAdmin as never as Parameters<typeof loadLovs>[0];
      const lovs = await loadLovs(admin);

      let created = 0;
      let skipped = 0;
      const errors: string[] = [];
      const credentials: { employee_code: string; password: string }[] = [];

      // Pre-load existing employee codes in one query instead of one per row.
      const { data: existingRows } = await supabaseAdmin
        .from("portal_users")
        .select("employee_code");
      const existingCodes = new Set(
        (existingRows ?? []).map((r: { employee_code: string }) =>
          r.employee_code.trim().toLowerCase(),
        ),
      );

      // De-duplicate within the uploaded file itself.
      const queue: PortalUserInput[] = [];
      for (const p of data.users) {
        const key = p.employee_code.trim().toLowerCase();
        if (!key) continue;
        if (existingCodes.has(key)) {
          skipped += 1;
          continue;
        }
        existingCodes.add(key);
        queue.push(p);
      }

      const createOne = async (p: PortalUserInput) => {
        const code = p.employee_code.trim();
        const password = oneTimePassword(p.cnic);
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email: portalEmail(code),
          password,
          email_confirm: true,
          user_metadata: { full_name: p.name, employee_code: code },
        });
        if (authErr || !authUser?.user) {
          errors.push(`${code}: ${authErr?.message ?? "could not create account"}`);
          return;
        }

        const { error: insErr } = await supabaseAdmin.from("portal_users").insert({
          id: authUser.user.id,
          employee_code: code,
          cnic: p.cnic ? p.cnic.replace(/\D/g, "").slice(0, 13) : null,
          name: p.name,
          status: "active",
          must_change_password: true,
          onboarding_enabled: p.onboarding_enabled ?? false,
          ...lovFields(lovs, p),
        });
        if (insErr) {
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
          errors.push(`${code}: ${insErr.message}`);
          return;
        }
        created += 1;
        credentials.push({ employee_code: code, password });
      };

      const BATCH = 5;
      for (let i = 0; i < queue.length; i += BATCH) {
        await Promise.all(queue.slice(i, i + BATCH).map(createOne));
      }

      return { created, skipped, errors: errors.slice(0, 20), credentials };
    },
  );

export const updatePortalUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), user: personSchema }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const lovs = await loadLovs(supabaseAdmin as never as Parameters<typeof loadLovs>[0]);
    const { error } = await supabaseAdmin
      .from("portal_users")
      .update({
        employee_code: data.user.employee_code.trim(),
        cnic: data.user.cnic ? data.user.cnic.replace(/\D/g, "").slice(0, 13) : null,
        name: data.user.name,
        onboarding_enabled: data.user.onboarding_enabled ?? false,
        ...lovFields(lovs, data.user),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setPortalUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["active", "inactive"]) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("portal_users")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.status === "inactive") {
      await supabaseAdmin.auth.admin.signOut(data.id).catch(() => undefined);
    }
    return { ok: true };
  });

export const deletePortalUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("portal_users").delete().eq("id", data.id);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Bulk activate/deactivate many accounts at once (admin only). */
export const bulkSetPortalUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(5000),
        status: z.enum(["active", "inactive"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ updated: number }> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("portal_users")
      .update({ status: data.status })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    if (data.status === "inactive") {
      const BATCH = 10;
      for (let i = 0; i < data.ids.length; i += BATCH) {
        await Promise.all(
          data.ids.slice(i, i + BATCH).map((id) =>
            supabaseAdmin.auth.admin.signOut(id).catch(() => undefined),
          ),
        );
      }
    }
    return { updated: data.ids.length };
  });

/** Admin only: marks which employees may record Onboarding Attendance. */
export const setOnboardingEligibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        ids: z.array(z.string().uuid()).min(1).max(5000),
        enabled: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ updated: number }> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("portal_users")
      .update({ onboarding_enabled: data.enabled })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { updated: data.ids.length };
  });

/** Bulk delete many accounts at once (admin only). */
export const bulkDeletePortalUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(5000) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ deleted: number; errors: string[] }> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("portal_users").delete().in("id", data.ids);
    const errors: string[] = [];
    const BATCH = 5;
    for (let i = 0; i < data.ids.length; i += BATCH) {
      await Promise.all(
        data.ids.slice(i, i + BATCH).map(async (id) => {
          const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
          if (error) errors.push(`${id}: ${error.message}`);
        }),
      );
    }
    return { deleted: data.ids.length, errors: errors.slice(0, 10) };
  });

export const resetPortalPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true; password: string }> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("portal_users")
      .select("employee_code,cnic")
      .eq("id", data.id)
      .maybeSingle();
    if (!row?.employee_code) throw new Error("Employee account not found.");
    const password = oneTimePassword(row.cnic);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { password });
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("portal_users")
      .update({ must_change_password: true, failed_attempts: 0, locked_at: null })
      .eq("id", data.id);
    return { ok: true, password };
  });

/** Called after a successful sign-in to clear the wrong-attempt counter. */
export const clearFailedPortalLogins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("portal_users")
      .update({ failed_attempts: 0, locked_at: null })
      .eq("id", (context as { userId: string }).userId);
    return { ok: true };
  });

/**
 * Called by the signed-in employee right after they set their own password.
 * Clears the "must change password" flag with service-role rights, because
 * RLS does not let an employee update their own portal_users row.
 */
export const completePortalPasswordChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("portal_users")
      .update({ must_change_password: false, password_changed_at: new Date().toISOString() })
      .eq("id", (context as { userId: string }).userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Saves the signed-in employee's private profile-photo location. */
export const updateOwnProfilePhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ avatarPath: z.string().max(500).nullable() }).parse(data),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const userId = (context as { userId: string }).userId;
    if (data.avatarPath && !data.avatarPath.startsWith(`${userId}/`)) {
      throw new Error("Invalid profile photo location.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("portal_users")
      .update({ avatar_path: data.avatarPath })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Lets the signed-in employee correct their own designation/department/location/region/wing. */
export const updateOwnProfileDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        designation_id: z.string().uuid().nullable().optional(),
        department_id: z.string().uuid().nullable().optional(),
        location_id: z.string().uuid().nullable().optional(),
        region_id: z.string().uuid().nullable().optional(),
        wing_id: z.string().uuid().nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    const userId = (context as { userId: string }).userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tables: Record<string, string> = {
      designation_id: "designations",
      department_id: "departments",
      location_id: "locations",
      region_id: "regions",
      wing_id: "wings",
    };
    const update: Record<string, string | null> = {};
    for (const [field, table] of Object.entries(tables)) {
      const id = (data as Record<string, string | null | undefined>)[field];
      if (id === undefined) continue;
      const nameField = field.replace("_id", "_name");
      if (!id) {
        update[field] = null;
        update[nameField] = null;
        continue;
      }
      const { data: row } = await supabaseAdmin
        .from(table as "designations")
        .select("id,name,status")
        .eq("id", id)
        .maybeSingle();
      if (!row || row.status !== "active") {
        throw new Error("That value is no longer available. Please contact the L&D team.");
      }
      update[field] = row.id;
      update[nameField] = row.name;
    }
    if (Object.keys(update).length === 0) return { ok: true };
    const { error } = await supabaseAdmin
      .from("portal_users")
      .update(update as never)
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Public sign-in: verifies the Employee ID and password on the server and
 * returns session tokens. The sign-in address is never sent to the browser,
 * and the wrong-attempt counter only moves after a real failed password check.
 */
export const portalSignIn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        employeeCode: z.string().trim().min(1).max(50),
        password: z.string().min(1).max(200),
      })
      .parse(data),
  )
  .handler(
    async ({
      data,
    }): Promise<
      | { ok: true; access_token: string; refresh_token: string; session_key: string }
      | { ok: false; message: string }
    > => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { createClient } = await import("@supabase/supabase-js");
      const { data: row } = await supabaseAdmin
        .from("portal_users")
        .select("id,status,locked_at,failed_attempts,must_change_password,cnic")
        .ilike("employee_code", data.employeeCode.trim())
        .maybeSingle();
      if (!row) return { ok: false, message: "No account found for this Employee ID." };
      if (row.status !== "active") return { ok: false, message: "This account has been deactivated." };
      if (row.locked_at)
        return {
          ok: false,
          message:
            "This account is locked after 4 wrong password attempts. Please contact the L&D team to reset your password.",
        };
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(row.id);
      const email = authUser?.user?.email ?? portalEmail(data.employeeCode);

      // Accounts that never changed their one-time password accept Abhi@CNIC.
      const cnicDigits = (row.cnic ?? "").replace(/\D/g, "");
      if (row.must_change_password && cnicDigits.length === 13 && data.password === `Abhi@${cnicDigits}`) {
        await supabaseAdmin.auth.admin.updateUserById(row.id, { password: data.password });
      }

      const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
      const pub = createClient(process.env["SUPABASE_URL"]!, key, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { data: auth, error } = await pub.auth.signInWithPassword({ email, password: data.password });
      if (error || !auth.session) {
        const attempts = (row.failed_attempts ?? 0) + 1;
        const locked = attempts >= MAX_LOGIN_ATTEMPTS;
        await supabaseAdmin
          .from("portal_users")
          .update({ failed_attempts: attempts, locked_at: locked ? new Date().toISOString() : null })
          .eq("id", row.id);
        if (locked) {
          await supabaseAdmin.auth.admin.signOut(row.id).catch(() => undefined);
          return {
            ok: false,
            message:
              "Account locked after 4 wrong password attempts. Please contact the L&D team to reset your password.",
          };
        }
        const left = Math.max(MAX_LOGIN_ATTEMPTS - attempts, 0);
        return {
          ok: false,
          message: `Incorrect password. ${left} attempt${left === 1 ? "" : "s"} left before the account is locked.`,
        };
      }
      await supabaseAdmin.from("portal_users").update({ failed_attempts: 0, locked_at: null }).eq("id", row.id);

      // One device at a time: refuse if another device is still active.
      const { data: active } = await supabaseAdmin
        .from("portal_active_sessions")
        .select("last_seen")
        .eq("user_id", row.id)
        .maybeSingle();
      if (active && Date.now() - new Date(active.last_seen).getTime() < SESSION_STALE_MS) {
        await pub.auth.signOut({ scope: "local" }).catch(() => undefined);
        return {
          ok: false,
          message:
            "You are already signed in on another device or browser. Please log out there first, then sign in here.",
        };
      }
      const sessionKey = crypto.randomUUID();
      await supabaseAdmin
        .from("portal_active_sessions")
        .upsert({ user_id: row.id, session_key: sessionKey, last_seen: new Date().toISOString() });
      return {
        ok: true,
        access_token: auth.session.access_token,
        refresh_token: auth.session.refresh_token,
        session_key: sessionKey,
      };
    },
  );

/** A device that stops checking in for this long is treated as gone. */
const SESSION_STALE_MS = 2 * 60 * 1000;

/** Heartbeat from the signed-in device. Returns ok:false when another device owns the account. */
export const touchPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ key: z.string().max(100).nullable() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("portal_active_sessions")
      .select("session_key,last_seen")
      .eq("user_id", context.userId)
      .maybeSingle();
    const now = new Date().toISOString();
    if (row && row.session_key === data.key) {
      await supabaseAdmin.from("portal_active_sessions").update({ last_seen: now }).eq("user_id", context.userId);
      return { ok: true as const, key: data.key };
    }
    const stale = !row || Date.now() - new Date(row.last_seen).getTime() >= SESSION_STALE_MS;
    if (stale) {
      const key = crypto.randomUUID();
      await supabaseAdmin
        .from("portal_active_sessions")
        .upsert({ user_id: context.userId, session_key: key, last_seen: now });
      return { ok: true as const, key };
    }
    return { ok: false as const, key: null };
  });

/** Releases the account so the employee can sign in on another device. */
export const endPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ key: z.string().max(100).nullable() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.key) {
      await supabaseAdmin
        .from("portal_active_sessions")
        .delete()
        .eq("user_id", context.userId)
        .eq("session_key", data.key);
    }
    return { ok: true };
  });


