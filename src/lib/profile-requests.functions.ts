import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LOV_TABLES: Record<string, string> = {
  designation_id: "designations",
  department_id: "departments",
  location_id: "locations",
  region_id: "regions",
  wing_id: "wings",
};

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
  if (!data) throw new Error("Only administrators can review profile changes.");
}

/** Employee submits profile changes; they stay pending until an admin approves. */
export const submitProfileChangeRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        avatar_path: z.string().max(500).nullable().optional(),
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

    if (data.avatar_path && !data.avatar_path.startsWith(`${userId}/`)) {
      throw new Error("Invalid profile photo location.");
    }

    const { data: me } = await supabaseAdmin
      .from("portal_users")
      .select(
        "employee_code,name,designation_name,department_name,location_name,region_name,wing_name",
      )
      .eq("id", userId)
      .maybeSingle();
    if (!me) throw new Error("Your employee profile could not be found.");

    const row: Record<string, unknown> = {
      user_id: userId,
      employee_code: me.employee_code,
      employee_name: me.name,
      status: "pending",
      avatar_path: data.avatar_path ?? null,
      current_designation_name: me.designation_name,
      current_department_name: me.department_name,
      current_location_name: me.location_name,
      current_region_name: me.region_name,
      current_wing_name: me.wing_name,
    };

    for (const [field, table] of Object.entries(LOV_TABLES)) {
      const id = (data as Record<string, string | null | undefined>)[field];
      const nameField = field.replace("_id", "_name");
      if (!id) {
        row[field] = null;
        row[nameField] = null;
        continue;
      }
      const { data: lov } = await supabaseAdmin
        .from(table as "designations")
        .select("id,name,status")
        .eq("id", id)
        .maybeSingle();
      if (!lov || lov.status !== "active") {
        throw new Error("That value is no longer available. Please contact the L&D team.");
      }
      row[field] = lov.id;
      row[nameField] = lov.name;
    }

    // Only one pending request per employee — replace any earlier one.
    await supabaseAdmin
      .from("profile_change_requests")
      .delete()
      .eq("user_id", userId)
      .eq("status", "pending");

    const { error } = await supabaseAdmin
      .from("profile_change_requests")
      .insert(row as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: approve or reject a pending profile change. */
export const reviewProfileChangeRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(data),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await assertAdmin(context as never);
    const reviewerId = (context as { userId: string }).userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req } = await supabaseAdmin
      .from("profile_change_requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!req) throw new Error("That request no longer exists.");
    if (req.status !== "pending") throw new Error("That request has already been reviewed.");

    if (data.approve) {
      const update: Record<string, unknown> = {
        designation_id: req.designation_id,
        department_id: req.department_id,
        location_id: req.location_id,
        region_id: req.region_id,
        wing_id: req.wing_id,
        designation_name: req.designation_name,
        department_name: req.department_name,
        location_name: req.location_name,
        region_name: req.region_name,
        wing_name: req.wing_name,
      };
      if (req.avatar_path) update['avatar_path'] = req.avatar_path;
      const { error } = await supabaseAdmin
        .from("portal_users")
        .update(update as never)
        .eq("id", req.user_id);
      if (error) throw new Error(error.message);
    } else if (req.avatar_path) {
      await supabaseAdmin.storage.from("profile-photos").remove([req.avatar_path]);
    }

    await supabaseAdmin
      .from("profile_change_requests")
      .update({
        status: data.approve ? "approved" : "rejected",
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", req.id);

    await supabaseAdmin.rpc("notify_user", {
      _user_id: req.user_id,
      _kind: "profile_change",
      _title: data.approve ? "Profile update approved" : "Profile update not approved",
      _body: data.approve
        ? "Your profile changes are now live."
        : "Please contact the L&D team for details.",
      _link: "",
    });

    return { ok: true };
  });
