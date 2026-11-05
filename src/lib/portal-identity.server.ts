/**
 * Resolves the acting employee from the authenticated session.
 * Never trust an employee code supplied by the client — always use this.
 */
export type PortalIdentity = {
  id: string;
  employee_code: string;
  name: string;
  designation_id: string | null;
  department_id: string | null;
  location_id: string | null;
  region_id: string | null;
  wing_id: string | null;
  gender_id: string | null;
};

export async function requirePortalEmployee(userId: string): Promise<PortalIdentity> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("portal_users")
    .select(
      "id,employee_code,name,designation_id,department_id,location_id,region_id,wing_id,gender_id,status",
    )
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[requirePortalEmployee]", error);
    throw new Error("Unable to verify your account. Please sign in again.");
  }
  if (!data) throw new Error("No employee account is linked to this login.");
  if (data.status !== "active") throw new Error("Your account is not active. Please contact the L&D team.");
  return data as PortalIdentity;
}
