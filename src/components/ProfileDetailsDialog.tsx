import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { submitProfileChangeRequest } from "@/lib/profile-requests.functions";
import type { PortalUser } from "@/lib/portal-session";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type LovRow = { id: string; name: string };

const FIELDS = [
  { key: "designation_id", table: "designations", label: "Designation" },
  { key: "department_id", table: "departments", label: "Department" },
  { key: "location_id", table: "locations", label: "Location" },
  { key: "region_id", table: "regions", label: "Region" },
  { key: "wing_id", table: "wings", label: "Wing" },
] as const;

function useActiveLov(table: string) {
  return useQuery({
    queryKey: ["active-lov", table],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<LovRow[]> => {
      const { data, error } = await supabase
        .from(table as "departments")
        .select("id,name")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return (data ?? []) as LovRow[];
    },
  });
}

function LovSelect({
  table,
  label,
  value,
  onChange,
}: {
  table: string;
  label: string;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { data: rows = [], isLoading } = useActiveLov(table);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value ?? "none"} onValueChange={(v) => onChange(v === "none" ? null : v)}>
        <SelectTrigger>
          <SelectValue placeholder={isLoading ? "Loading…" : "Select"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Not set</SelectItem>
          {rows.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Lets an employee correct their own profile details from the approved list values. */
export function ProfileDetailsDialog({
  user,
  open,
  onOpenChange,
}: {
  user: PortalUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [values, setValues] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!open) return;
    setValues({
      designation_id: user.designation_id,
      department_id: user.department_id,
      location_id: user.location_id,
      region_id: user.region_id,
      wing_id: user.wing_id,
    });
  }, [open, user]);

  const save = useMutation({
    mutationFn: async () => submitProfileChangeRequest({ data: values as never }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["portal-user"] });
      toast.success("Sent to the L&D team for approval. Changes appear once approved.");
      onOpenChange(false);
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Could not save your details."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit my details</DialogTitle>
          <DialogDescription>
            {"Choose your correct designation, department, location, region and wing. Changes are sent to the L&D team and appear after approval."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {FIELDS.map((f) => (
            <LovSelect
              key={f.key}
              table={f.table}
              label={f.label}
              value={values[f.key] ?? null}
              onChange={(id) => setValues((prev) => ({ ...prev, [f.key]: id }))}
            />
          ))}
        </div>
        <p className="rounded-md border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
          {
            "Can't find the right option in the list? In case of any issue, please contact the L&D Team at Learningdevelopment@abhibank.com."
          }
        </p>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button asChild type="button" variant="secondary">
            <a href="/change-password">
              <KeyRound />
              Change password
            </a>
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending && <Loader2 className="animate-spin" />}
            Save details
          </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
