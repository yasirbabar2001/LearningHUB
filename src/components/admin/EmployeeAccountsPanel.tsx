import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SectionCard } from "@/components/admin/Kpi";
import { StatusSwitch } from "@/components/admin/StatusSwitch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { supabase } from "@/integrations/supabase/client";
import { useLov, logAudit } from "@/lib/data";
import { regionWingForLocation } from "@/lib/branch-region-map";
import {
  bulkDeletePortalUsers,
  bulkSetPortalUserStatus,
  createPortalUsers,
  deletePortalUser,
  resetPortalPassword,
  setOnboardingEligibility,
  setPortalUserStatus,
  updatePortalUser,
  type PortalUserInput,
} from "@/lib/portal-users.functions";


const TEMPLATE_HEADERS = [
  "Employee ID",
  "CNIC",
  "Employee Name",
  "Designation",
  "Department",
  "Location",
  "Region",
  "Wing",
  "Gender",
  "Onboarding Status",
] as const;

type TextField = Exclude<keyof PortalUserInput, "onboarding_enabled">;

const ONBOARDING_HEADERS = new Set([
  "onboarding status",
  "onboarding",
  "onboarding attendance",
  "onboarding enabled",
  "onboarding access",
]);

const truthy = (v: string) =>
  ["on", "yes", "y", "true", "1", "active", "enabled", "allowed"].includes(
    v.trim().toLowerCase(),
  );

const HEADER_MAP: Record<string, TextField> = {
  "employee id": "employee_code",
  "employee code": "employee_code",
  "emp id": "employee_code",
  "emp code": "employee_code",
  "staff id": "employee_code",
  cnic: "cnic",
  "cnic number": "cnic",
  "employee name": "name",
  name: "name",
  designation: "designation",
  "job title": "designation",
  department: "department",
  dept: "department",
  location: "location",
  branch: "location",
  region: "region",
  wing: "wing",
  gender: "gender",
};

const normaliseHeader = (h: string) =>
  h.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const EMPTY: PortalUserInput = {
  employee_code: "",
  cnic: "",
  name: "",
  designation: "",
  department: "",
  location: "",
  region: "",
  wing: "",
  gender: "",
  onboarding_enabled: false,
};

async function downloadTemplate() {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet([], { header: [...TEMPLATE_HEADERS] });
  ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Employees");
  XLSX.writeFile(wb, "ABHI-portal-users-template.xlsx");
}

type Row = {
  id: string;
  employee_code: string;
  cnic: string | null;
  name: string;
  designation_name: string | null;
  department_name: string | null;
  location_name: string | null;
  region_name: string | null;
  wing_name: string | null;
  gender_name: string | null;
  status: string;
  must_change_password: boolean;
  onboarding_enabled: boolean | null;
  locked_at: string | null;
  created_at: string;
};

export function PortalUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<PortalUserInput>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [issued, setIssued] = useState<{ employee_code: string; password: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const designations = useLov("designations");
  const departments = useLov("departments");
  const locations = useLov("locations");
  const regions = useLov("regions");
  const wings = useLov("wings");
  const genders = useLov("genders");

  const users = useQuery({
    queryKey: ["portal-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_users")
        .select("*")
        .order("employee_code");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const OWNER_EMAILS = ["yasir.starr2001@gmail.com", "yasir.babar@abhibank.com"];
  const me = useQuery({
    queryKey: ["me-email"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.email?.toLowerCase() ?? null;
    },
  });
  const isOwner = !!me.data && OWNER_EMAILS.includes(me.data);
  const roles = useQuery({
    queryKey: ["admin-role-rows"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("user_id,role");
      return data ?? [];
    },
  });
  const ownerIds = useQuery({
    queryKey: ["owner-profile-ids"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,email");
      return (data ?? [])
        .filter((p) => p.email && OWNER_EMAILS.includes(p.email.toLowerCase()))
        .map((p) => p.id);
    },
  });
  const isAdminId = (id: string) =>
    (roles.data ?? []).some((r) => r.user_id === id && r.role === "admin");
  const setAdmin = useMutation({
    mutationFn: async ({ userId, grant }: { userId: string; grant: boolean }) => {
      const q = grant
        ? supabase.from("user_roles").insert({ user_id: userId, role: "admin" })
        : supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      const { error } = await q;
      if (error) throw error;
      await logAudit(grant ? "grant_admin" : "revoke_admin", "user_roles", userId);
    },
    onSuccess: (_d, v) => {
      toast.success(v.grant ? "Admin rights granted." : "Admin rights removed.");
      qc.invalidateQueries({ queryKey: ["admin-role-rows"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Only the owner can change admin rights."),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users.data ?? [];
    return (users.data ?? []).filter((u) =>
      [u.employee_code, u.name, u.department_name, u.designation_name, u.location_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [users.data, search]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["portal-users"] });

  const create = useMutation({
    mutationFn: async (list: PortalUserInput[]) => {
      // Upload in chunks so large files don't time out mid-way.
      const CHUNK = 100;
      const total = {
        created: 0,
        skipped: 0,
        errors: [] as string[],
        credentials: [] as { employee_code: string; password: string }[],
      };
      for (let i = 0; i < list.length; i += CHUNK) {
        const res = await createPortalUsers({ data: { users: list.slice(i, i + CHUNK) } });
        total.created += res.created;
        total.skipped += res.skipped;
        total.errors.push(...res.errors);
        total.credentials.push(...res.credentials);
      }
      return { ...total, errors: total.errors.slice(0, 20) };
    },
    onSuccess: async (res) => {
      if (res.created) {
        setIssued(res.credentials);
        toast.success(
          `${res.created} account(s) created. Copy or download the one-time passwords below.`,
        );
      }
      if (res.skipped) toast.info(`${res.skipped} Employee ID(s) already existed and were skipped.`);
      res.errors.forEach((e) => toast.error(e));
      await logAudit("create_portal_users", "portal_users", undefined, { created: res.created });
      setForm(EMPTY);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Unable to create accounts."),
  });

  const update = useMutation({
    mutationFn: async (v: { id: string; user: PortalUserInput }) => updatePortalUser({ data: v }),
    onSuccess: () => {
      toast.success("Employee details updated.");
      setEditingId(null);
      setForm(EMPTY);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Unable to update."),
  });

  const toggle = useMutation({
    mutationFn: async (v: { id: string; status: "active" | "inactive" }) =>
      setPortalUserStatus({ data: v }),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Unable to change status."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deletePortalUser({ data: { id } }),
    onSuccess: () => {
      toast.success("Account deleted.");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Unable to delete."),
  });

  const reset = useMutation({
    mutationFn: async (id: string) => resetPortalPassword({ data: { id } }),
    onSuccess: (res) =>
      toast.success(`Password reset to ${res.password}. The user must change it at sign in.`),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Unable to reset password."),
  });

  const bulkStatus = useMutation({
    mutationFn: async (v: { ids: string[]; status: "active" | "inactive" }) =>
      bulkSetPortalUserStatus({ data: v }),
    onSuccess: async (res, v) => {
      toast.success(
        `${res.updated} account(s) ${v.status === "inactive" ? "deactivated" : "activated"}.`,
      );
      await logAudit("bulk_portal_user_status", "portal_users", undefined, {
        count: res.updated,
        status: v.status,
      });
      setSelected(new Set());
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Unable to update accounts."),
  });

  const bulkRemove = useMutation({
    mutationFn: async (ids: string[]) => bulkDeletePortalUsers({ data: { ids } }),
    onSuccess: async (res) => {
      toast.success(`${res.deleted} account(s) deleted.`);
      res.errors.forEach((e) => toast.error(e));
      await logAudit("bulk_delete_portal_users", "portal_users", undefined, {
        deleted: res.deleted,
      });
      setSelected(new Set());
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Unable to delete accounts."),
  });

  const onboarding = useMutation({
    mutationFn: async (v: { ids: string[]; enabled: boolean }) =>
      setOnboardingEligibility({ data: v }),
    onSuccess: (res, v) => {
      toast.success(
        `Onboarding Attendance ${v.enabled ? "enabled" : "disabled"} for ${res.updated} employee(s).`,
      );
      setSelected(new Set());
      invalidate();
      qc.invalidateQueries({ queryKey: ["portal-user"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Unable to change onboarding access."),
  });

  const allIds = useMemo(() => (users.data ?? []).map((u) => u.id), [users.data]);
  const filteredIds = useMemo(() => filtered.map((u) => u.id), [filtered]);
  const selectedIds = useMemo(() => [...selected], [selected]);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const bulkBusy = bulkStatus.isPending || bulkRemove.isPending;

  const toggleOne = (id: string, checked: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const toggleAllFiltered = (checked: boolean) =>
    setSelected((s) => {
      const next = new Set(s);
      filteredIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });

  const confirmBulkStatus = (ids: string[], status: "active" | "inactive") => {
    if (!ids.length) return;
    const verb = status === "inactive" ? "deactivate" : "activate";
    if (confirm(`Are you sure you want to ${verb} ${ids.length} account(s)?`))
      bulkStatus.mutate({ ids, status });
  };

  const confirmBulkDelete = (ids: string[]) => {
    if (!ids.length) return;
    if (
      confirm(
        `Permanently delete ${ids.length} account(s)? This cannot be undone and their logins will stop working.`,
      )
    )
      bulkRemove.mutate(ids);
  };

  const handleUpload = async (file: File) => {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("The file has no sheets.");
      const sheet = wb.Sheets[sheetName];
      if (!sheet) throw new Error("The file has no sheets.");
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const list: PortalUserInput[] = [];
      for (const r of raw) {
        const rec: PortalUserInput = { ...EMPTY };
        for (const [k, v] of Object.entries(r)) {
          const header = normaliseHeader(k);
          if (ONBOARDING_HEADERS.has(header)) {
            rec.onboarding_enabled = truthy(String(v ?? ""));
            continue;
          }
          const key = HEADER_MAP[header];
          if (key) rec[key] = String(v ?? "").trim();
        }
        if (!rec.employee_code || !rec.name) continue;
        if (!rec.region || !rec.wing) {
          const hit = regionWingForLocation(rec.location);
          if (hit) {
            if (!rec.region) rec.region = hit.region;
            if (!rec.wing) rec.wing = hit.wing;
          }
        }
        list.push(rec);
      }
      if (!list.length) {
        toast.error("No valid rows found. Please use the template.");
        return;
      }
      create.mutate(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read the file.");
    }
  };

  const setLocation = (name: string) => {
    const hit = regionWingForLocation(name);
    setForm((f) => ({
      ...f,
      location: name,
      region: hit?.region ?? f.region,
      wing: hit?.wing ?? f.wing,
    }));
  };

  const lovField = (
    label: string,
    key: TextField,
    items: { id: string; name: string }[] | undefined,
  ) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <SearchableSelect
        options={(items ?? []).map((i) => ({ value: i.name, label: i.name }))}
        value={form[key]}
        onChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
        placeholder={`Select ${label.toLowerCase()}`}
        searchPlaceholder={`Search ${label.toLowerCase()}…`}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          Create employee logins in bulk or one by one. Every new account gets a unique, randomly
          generated one-time password that is shown here once after creation — share it with the
          employee privately; they must set their own password at first sign in. The details saved
          here are filled automatically into feedback, survey, evaluation and TNA forms.
        </p>
      </div>

      {issued.length > 0 && (
        <SectionCard title="One-time passwords (shown once)">
          <p className="mb-3 text-sm text-muted-foreground">
            Share each password privately with the employee. They cannot be viewed again — use
            Reset password to issue a new one.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const csv = [
                  "Employee ID,One-time password",
                  ...issued.map((c) => `${c.employee_code},${c.password}`),
                ].join("\n");
                const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                const a = document.createElement("a");
                a.href = url;
                a.download = "one-time-passwords.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download list
            </Button>
            <Button variant="ghost" onClick={() => setIssued([])}>
              Hide
            </Button>
          </div>
          <div className="max-h-64 overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <tbody>
                {issued.map((c) => (
                  <tr key={c.employee_code} className="border-b last:border-0">
                    <td className="px-3 py-1.5 font-medium">{c.employee_code}</td>
                    <td className="px-3 py-1.5 font-mono text-xs">{c.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Bulk upload">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void downloadTemplate()}>
            Download template
          </Button>
          <Button onClick={() => fileRef.current?.click()} disabled={create.isPending}>
            {create.isPending ? "Creating accounts…" : "Upload filled template"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f);
              e.target.value = "";
            }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Download the template, fill in Employee ID, CNIC, Name, Designation, Department, Location,
          Region, Wing, Gender and Onboarding Status (On/Off), then upload it. Existing Employee IDs are skipped. Region and
          Wing are filled from the branch list when left blank.
        </p>
      </SectionCard>

      <SectionCard title={editingId ? "Edit employee" : "Add employee manually"}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Employee ID</Label>
            <Input
              value={form.employee_code}
              maxLength={50}
              onChange={(e) => setForm({ ...form, employee_code: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>CNIC</Label>
            <Input
              value={form.cnic}
              inputMode="numeric"
              maxLength={13}
              placeholder="0000000000000"
              onChange={(e) =>
                setForm({ ...form, cnic: e.target.value.replace(/\D/g, "").slice(0, 13) })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Employee Name</Label>
            <Input
              value={form.name}
              maxLength={120}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          {lovField("Designation", "designation", designations.data)}
          {lovField("Department", "department", departments.data)}
          <div className="space-y-1.5">
            <Label>Location</Label>
            <SearchableSelect
              options={(locations.data ?? []).map((i) => ({ value: i.name, label: i.name }))}
              value={form.location}
              onChange={setLocation}
              placeholder="Select location"
              searchPlaceholder="Search location…"
            />
          </div>
          {lovField("Region", "region", regions.data)}
          {lovField("Wing", "wing", wings.data)}
          {lovField("Gender", "gender", genders.data)}
          <div className="space-y-1.5">
            <Label>Onboarding Status</Label>
            <div className="flex h-10 items-center gap-3 rounded-md border border-input px-3">
              <StatusSwitch
                status={form.onboarding_enabled ? "active" : "inactive"}
                onChange={(status) =>
                  setForm((f) => ({ ...f, onboarding_enabled: status === "active" }))
                }
              />
              <span className="text-xs text-muted-foreground">
                {form.onboarding_enabled
                  ? "On — can record Onboarding Attendance"
                  : "Off — Onboarding Attendance hidden"}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            disabled={create.isPending || update.isPending}
            onClick={() => {
              if (!form.employee_code.trim() || form.name.trim().length < 2) {
                toast.error("Employee ID and name are required.");
                return;
              }
              if (editingId) update.mutate({ id: editingId, user: form });
              else create.mutate([form]);
            }}
          >
            {editingId ? "Save changes" : "Create account"}
          </Button>
          {editingId ? (
            <Button
              variant="outline"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY);
              }}
            >
              Cancel
            </Button>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title={`Employees (${filtered.length})`}>
        <Input
          value={search}
          placeholder="Search by ID, name, department, designation or location…"
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4 max-w-md"
        />
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!selectedIds.length || bulkBusy}
            onClick={() => confirmBulkStatus(selectedIds, "inactive")}
          >
            Deactivate selected ({selectedIds.length})
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!selectedIds.length || bulkBusy}
            onClick={() => confirmBulkStatus(selectedIds, "active")}
          >
            Activate selected
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!selectedIds.length || bulkBusy}
            onClick={() => confirmBulkDelete(selectedIds)}
          >
            Delete selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!selectedIds.length || onboarding.isPending}
            onClick={() => onboarding.mutate({ ids: selectedIds, enabled: true })}
          >
            Allow onboarding
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!selectedIds.length || onboarding.isPending}
            onClick={() => onboarding.mutate({ ids: selectedIds, enabled: false })}
          >
            Remove onboarding
          </Button>
          <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <Button
            size="sm"
            variant="outline"
            disabled={!allIds.length || bulkBusy}
            onClick={() => confirmBulkStatus(allIds, "inactive")}
          >
            Deactivate all
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!allIds.length || bulkBusy}
            onClick={() => confirmBulkDelete(allIds)}
          >
            Delete all
          </Button>
          {selectedIds.length ? (
            <button
              type="button"
              className="text-xs text-muted-foreground underline"
              onClick={() => setSelected(new Set())}
            >
              Clear selection
            </button>
          ) : null}
        </div>
        {users.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">
                    <input
                      type="checkbox"
                      aria-label="Select all shown employees"
                      checked={allFilteredSelected}
                      onChange={(e) => toggleAllFiltered(e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                  </th>
                  <th className="py-2 pr-3">Employee ID</th>
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Designation</th>
                  <th className="py-2 pr-3">Department</th>
                  <th className="py-2 pr-3">Location</th>
                  <th className="py-2 pr-3">Password</th>
                  <th className="py-2 pr-3">Active</th>
                  <th className="py-2 pr-3">Onboarding</th>
                  <th className="py-2 pr-3">Admin</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${u.employee_code}`}
                        checked={selected.has(u.id)}
                        onChange={(e) => toggleOne(u.id, e.target.checked)}
                        className="h-4 w-4 accent-primary"
                      />
                    </td>
                    <td className="py-2 pr-3 font-medium">{u.employee_code}</td>
                    <td className="py-2 pr-3">{u.name}</td>
                    <td className="py-2 pr-3">{u.designation_name ?? "—"}</td>
                    <td className="py-2 pr-3">{u.department_name ?? "—"}</td>
                    <td className="py-2 pr-3">{u.location_name ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs">
                      {u.locked_at ? (
                        <span className="font-medium text-destructive">
                          Locked — reset password to unblock
                        </span>
                      ) : u.must_change_password ? (
                        <span className="text-muted-foreground">
                          {(() => {
                            const d = (u.cnic ?? "").replace(/\D/g, "");
                            return d.length === 13 ? (
                              <span className="font-mono text-foreground">{`Abhi@${d}`}</span>
                            ) : (
                              "One-time password not yet changed (no CNIC on file)"
                            );
                          })()}
                        </span>
                      ) : (
                        <span className="text-success">Set by user</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <StatusSwitch
                        status={u.status}
                        disabled={toggle.isPending}
                        onChange={(status) =>
                          toggle.mutate({ id: u.id, status: status as "active" | "inactive" })
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <StatusSwitch
                        status={u.onboarding_enabled ? "active" : "inactive"}
                        disabled={onboarding.isPending}
                        onChange={(status) =>
                          onboarding.mutate({ ids: [u.id], enabled: status === "active" })
                        }
                      />
                    </td>
                    <td className="py-2 pr-3">
                      {(ownerIds.data ?? []).includes(u.id) ? (
                        <span className="text-xs font-medium text-muted-foreground">{"Owner"}</span>
                      ) : (
                        <StatusSwitch
                          status={isAdminId(u.id) ? "active" : "inactive"}
                          disabled={!isOwner || setAdmin.isPending}
                          onChange={(status) =>
                            setAdmin.mutate({ userId: u.id, grant: status === "active" })
                          }
                        />
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(u.id);
                            setForm({
                              employee_code: u.employee_code,
                              cnic: u.cnic ?? "",
                              name: u.name,
                              designation: u.designation_name ?? "",
                              department: u.department_name ?? "",
                              location: u.location_name ?? "",
                              region: u.region_name ?? "",
                              wing: u.wing_name ?? "",
                              gender: u.gender_name ?? "",
                              onboarding_enabled: u.onboarding_enabled ?? false,
                            });
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={reset.isPending}
                          onClick={() => reset.mutate(u.id)}
                        >
                          Reset password
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={remove.isPending}
                          onClick={() => {
                            if (confirm(`Delete the account for ${u.employee_code}?`))
                              remove.mutate(u.id);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
