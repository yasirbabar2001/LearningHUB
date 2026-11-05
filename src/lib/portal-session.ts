import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { endPortalSession } from "@/lib/portal-users.functions";

export const SESSION_KEY_STORAGE = "portal_session_key";

export function getPortalSessionKey(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY_STORAGE);
  } catch {
    return null;
  }
}

export function setPortalSessionKey(key: string | null) {
  try {
    if (key) localStorage.setItem(SESSION_KEY_STORAGE, key);
    else localStorage.removeItem(SESSION_KEY_STORAGE);
  } catch {
    /* ignore */
  }
}

export type PortalUser = {
  id: string;
  employee_code: string;
  cnic: string | null;
  name: string;
  designation_id: string | null;
  department_id: string | null;
  location_id: string | null;
  region_id: string | null;
  wing_id: string | null;
  gender_id: string | null;
  designation_name: string | null;
  department_name: string | null;
  location_name: string | null;
  region_name: string | null;
  wing_name: string | null;
  gender_name: string | null;
  avatar_path: string | null;
  status: string;
  must_change_password: boolean;
  password_changed_at?: string | null;
  onboarding_enabled?: boolean | null;
};

export function usePortalUser() {
  return useQuery({
    queryKey: ["portal-user"],
    staleTime: 60_000,
    queryFn: async (): Promise<PortalUser | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from("portal_users")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      return (data as PortalUser | null) ?? null;
    },
  });
}

/** Signs out and frees the account for another device. */
export async function portalSignOut(opts: { release?: boolean } = {}) {
  if (opts.release !== false) {
    await endPortalSession({ data: { key: getPortalSessionKey() } }).catch(() => undefined);
  }
  setPortalSessionKey(null);
  await supabase.auth.signOut();
}
