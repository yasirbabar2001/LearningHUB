import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { SectionCard } from "@/components/admin/Kpi";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { reviewProfileChangeRequest } from "@/lib/profile-requests.functions";

export const Route = createFileRoute("/_authenticated/profile-requests")({
  head: () => ({
    meta: [
      { title: "Profile Change Approvals | ABHI Learning HUB" },
      {
        name: "description",
        content:
          "Review and approve employee profile changes before they appear across the portal.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfileRequestsPage,
});

type RequestRow = {
  id: string;
  user_id: string;
  employee_code: string | null;
  employee_name: string | null;
  avatar_path: string | null;
  designation_name: string | null;
  department_name: string | null;
  location_name: string | null;
  region_name: string | null;
  wing_name: string | null;
  current_designation_name: string | null;
  current_department_name: string | null;
  current_location_name: string | null;
  current_region_name: string | null;
  current_wing_name: string | null;
  created_at: string;
};

const PAIRS: Array<[string, keyof RequestRow, keyof RequestRow]> = [
  ["Designation", "current_designation_name", "designation_name"],
  ["Department", "current_department_name", "department_name"],
  ["Location", "current_location_name", "location_name"],
  ["Region", "current_region_name", "region_name"],
  ["Wing", "current_wing_name", "wing_name"],
];

function PhotoPreview({ path }: { path: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let active = true;
    void supabase.storage
      .from("profile-photos")
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [path]);
  if (!url) return null;
  return (
    <img
      src={url}
      alt="Requested profile picture"
      className="h-20 w-20 rounded-full border border-border object-cover"
    />
  );
}

function ProfileRequestsPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["profile-change-requests"],
    queryFn: async (): Promise<RequestRow[]> => {
      const { data, error } = await supabase
        .from("profile_change_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RequestRow[];
    },
  });

  const review = useMutation({
    mutationFn: async (vars: { id: string; approve: boolean }) =>
      reviewProfileChangeRequest({ data: vars }),
    onSuccess: (_res, vars) => {
      toast.success(vars.approve ? "Change approved and applied." : "Change rejected.");
      qc.invalidateQueries({ queryKey: ["profile-change-requests"] });
      qc.invalidateQueries({ queryKey: ["portal-users"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not update the request."),
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">
          Employee profile edits stay pending here until you approve them.
        </p>
      </div>

      <SectionCard title={`Pending requests (${data.length})`}>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending profile changes.</p>
        ) : (
          <div className="space-y-3">
            {data.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {r.avatar_path ? <PhotoPreview path={r.avatar_path} /> : null}
                    <div>
                      <p className="text-sm font-medium">
                        {r.employee_name ?? "Employee"}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({r.employee_code ?? "—"})
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested {new Date(r.created_at).toLocaleString()}
                      </p>
                      <ul className="mt-2 space-y-0.5 text-xs">
                        {r.avatar_path ? <li>Profile picture: new photo attached</li> : null}
                        {PAIRS.filter(([, cur, next]) => (r[cur] ?? null) !== (r[next] ?? null)).map(
                          ([label, cur, next]) => (
                            <li key={label}>
                              <span className="font-medium">{label}:</span>{" "}
                              <span className="text-muted-foreground line-through">
                                {(r[cur] as string) ?? "Not set"}
                              </span>{" "}
                              → <span className="text-primary">{(r[next] as string) ?? "Not set"}</span>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={review.isPending}
                      onClick={() => review.mutate({ id: r.id, approve: true })}
                    >
                      <Check className="size-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={review.isPending}
                      onClick={() => review.mutate({ id: r.id, approve: false })}
                    >
                      <X className="size-4" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
