import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Plus, Search, Trash2, Upload, XCircle } from "lucide-react";
import { SectionCard } from "@/components/admin/Kpi";
import { StatusSwitch } from "@/components/admin/StatusSwitch";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { LOV_TABLES, logAudit, useLov, type LovTable } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/lov")({
  head: () => ({
    meta: [
      { title: "Lists of Values | ABHI Learning HUB" },
      {
        name: "description",
        content:
          "Manage departments, locations, regions, wings, designations and trainers used across the portal.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LovPage,
});

const LABELS: Record<LovTable, string> = {
  departments: "Departments",
  locations: "Locations",
  regions: "Regions",
  wings: "Wings",
  designations: "Designations",
  trainers: "Trainers",
  genders: "Gender",
};


function LovPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          These lists populate every dropdown in the employee feedback form.
        </p>
      </div>
      <Tabs defaultValue="departments">
        <TabsList className="flex-wrap">
          {LOV_TABLES.map((t) => (
            <TabsTrigger key={t} value={t}>
              {LABELS[t]}
            </TabsTrigger>
          ))}
        </TabsList>
        {LOV_TABLES.map((t) => (
          <TabsContent key={t} value={t}>
            <LovEditor table={t} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function LovEditor({ table }: { table: LovTable }) {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useLov(table);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [empCode, setEmpCode] = useState("");
  const isTrainers = table === "trainers";
  const fileRef = useRef<HTMLInputElement>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["lov", table] });
  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const add = useMutation({
    mutationFn: async (value: string) => {
      if (!value.trim()) throw new Error("Name is required.");
      const payload: Record<string, unknown> = { name: value.trim() };
      if (isTrainers) payload['employee_code'] = empCode.trim() || null;
      const { error } = await (supabase.from(table) as any).insert(payload);
      if (error) throw new Error(error.message.includes("duplicate") ? "That value already exists." : error.message);
      await logAudit("create", table, undefined, payload);
    },
    onSuccess: () => {
      setName("");
      setEmpCode("");
      invalidate();
      toast.success("Value added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setEmployeeCode = useMutation({
    mutationFn: async ({ id, code }: { id: string; code: string }) => {
      const value = code.trim() || null;
      const { error } = await (supabase.from(table) as any).update({ employee_code: value }).eq("id", id);
      if (error)
        throw new Error(
          error.message.includes("duplicate")
            ? "That employee ID is already assigned to another trainer."
            : error.message,
        );
      await logAudit("update", table, id, { employee_code: value });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Trainer employee ID saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rename = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const { error } = await supabase.from(table).update({ name: value }).eq("id", id);
      if (error) throw error;
      await logAudit("update", table, id, { name: value });
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from(table).update({ status }).eq("id", id);
      if (error) throw error;
      await logAudit("update", table, id, { status });
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const setAll = useMutation({
    mutationFn: async (status: string) => {
      const ids = items.filter((i) => i.status !== status).map((i) => i.id);
      if (!ids.length) return 0;
      const { error } = await supabase.from(table).update({ status }).in("id", ids);
      if (error) throw error;
      await logAudit("update", table, undefined, { status, count: ids.length });
      return ids.length;
    },
    onSuccess: (n) => {
      invalidate();
      toast.success(n ? `${n} value(s) updated` : "Nothing to update");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importXlsx = useMutation({
    mutationFn: async (file: File) => {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]!];
      if (!sheet) throw new Error("The file has no worksheets.");
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
      const names: string[] = [];
      for (const row of rows) {
        const cell = row?.[0];
        const value = cell == null ? "" : String(cell).trim();
        if (!value) continue;
        if (/^(name|title|value)$/i.test(value)) continue;
        if (!names.some((n) => n.toLowerCase() === value.toLowerCase())) names.push(value);
      }
      const existing = new Set(items.map((i) => i.name.toLowerCase()));
      const fresh = names.filter((n) => !existing.has(n.toLowerCase()));
      if (!fresh.length) throw new Error("No new values found in the first column.");
      const { error } = await supabase.from(table).insert(fresh.map((name) => ({ name })));
      if (error) throw error;
      await logAudit("import", table, undefined, { count: fresh.length });
      return { added: fresh.length, skipped: names.length - fresh.length };
    },
    onSuccess: ({ added, skipped }) => {
      invalidate();
      toast.success(`Imported ${added} value(s)${skipped ? `, skipped ${skipped} duplicate(s)` : ""}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error)
        throw new Error(
          "This value is used by existing records. Set it to inactive instead of deleting it.",
        );
      await logAudit("delete", table, id);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Value deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <SectionCard
      title={LABELS[table]}
      description="Inactive values stay on historical feedback but are hidden from new submissions."
    >
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={`Search ${LABELS[table].toLowerCase()}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
        {search ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {filtered.length} of {items.length}
          </span>
        ) : null}
      </div>
      <div className="mb-4 flex gap-2">
        <Input
          placeholder={`New ${LABELS[table].replace(/s$/, "").toLowerCase()} name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add.mutate(name)}
        />
        {isTrainers ? (
          <Input
            placeholder="Trainer employee ID"
            value={empCode}
            onChange={(e) => setEmpCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add.mutate(name)}
            className="max-w-[200px]"
          />
        ) : null}
        <Button onClick={() => add.mutate(name)} disabled={add.isPending}>
          <Plus className="size-4" /> Add
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importXlsx.mutate(f);
            e.target.value = "";
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={importXlsx.isPending}
        >
          <Upload className="size-4" /> {importXlsx.isPending ? "Importing…" : "Upload Excel"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAll.mutate("active")}
          disabled={setAll.isPending || !items.length}
        >
          <CheckCircle2 className="size-4" /> Turn all on
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAll.mutate("inactive")}
          disabled={setAll.isPending || !items.length}
        >
          <XCircle className="size-4" /> Turn all off
        </Button>

        <span className="text-xs text-muted-foreground">
          Excel/CSV: put one value per row in the first column.
        </span>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {filtered.map((i) => (
            <div key={i.id} className="flex items-center gap-2 p-2">
              <Input
                defaultValue={i.name}
                className="h-8 border-transparent bg-transparent hover:border-input focus:border-input"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== i.name) rename.mutate({ id: i.id, value: v });
                }}
              />
              {isTrainers ? (
                <Input
                  defaultValue={i.employee_code ?? ""}
                  placeholder="Employee ID"
                  className="h-8 max-w-[160px] border-transparent bg-transparent hover:border-input focus:border-input"
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== (i.employee_code ?? "")) setEmployeeCode.mutate({ id: i.id, code: v });
                  }}
                />
              ) : null}
              <StatusSwitch
                status={i.status}
                onChange={(status) => toggle.mutate({ id: i.id, status })}
              />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => confirm(`Delete "${i.name}"?`) && remove.mutate(i.id)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
          {!filtered.length ? (
            <p className="p-3 text-sm text-muted-foreground">
              {items.length ? "No values match your search." : "No values yet."}
            </p>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}
