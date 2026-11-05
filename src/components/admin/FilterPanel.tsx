import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { ALL, emptyFilters, type FeedbackRow, type Filters } from "@/lib/analytics";
import { setFilters, useGlobalFilters } from "@/lib/filter-store";

function uniq(rows: FeedbackRow[], key: keyof FeedbackRow) {
  return [...new Set(rows.map((r) => r[key]).filter((v): v is string => !!v))].sort();
}

export function FilterPanel({ rows }: { rows: FeedbackRow[] }) {
  const applied = useGlobalFilters();
  const [draft, setDraft] = useState<Filters>(applied);

  const options = useMemo(
    () => ({
      training: uniq(rows, "training_name"),
      trainer: uniq(rows, "trainer_name"),
      department: uniq(rows, "department_name"),
      location: uniq(rows, "location_name"),
      region: uniq(rows, "region_name"),
      wing: uniq(rows, "wing_name"),
      designation: uniq(rows, "designation_name"),
      gender: uniq(rows, "gender_name"),
    }),
    [rows],
  );

  const set = (k: keyof Filters, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const selects: [keyof Filters, string, string[]][] = [
    ["training", "Training Name", options.training],
    ["trainingType", "Training Type", ["classroom", "virtual"]],
    ["trainer", "Trainer", options.trainer],
    ["department", "Department", options.department],
    ["location", "Location", options.location],
    ["region", "Region", options.region],
    ["wing", "Wing", options.wing],
    ["designation", "Designation", options.designation],
    ["gender", "Gender", options.gender],
  ];

  return (
    <div className="stat-card no-print p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label className="text-xs">Date From</Label>
          <Input
            type="date"
            value={draft.dateFrom}
            onChange={(e) => set("dateFrom", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Date To</Label>
          <Input type="date" value={draft.dateTo} onChange={(e) => set("dateTo", e.target.value)} />
        </div>
        {selects.map(([key, label, values]) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs">{label}</Label>
            <SearchableSelect
              options={[
                { value: ALL, label: "All" },
                ...values.map((v) => ({ value: v, label: v })),
              ]}
              value={draft[key] || ALL}
              onChange={(v) => set(key, !v || v === ALL ? "" : v)}
              placeholder="All"
              searchPlaceholder={`Search ${label.toLowerCase()}…`}
              className="capitalize"
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Button onClick={() => setFilters(draft)}>Apply Filters</Button>
        <Button
          variant="outline"
          onClick={() => {
            setDraft({ ...emptyFilters });
            setFilters({ ...emptyFilters });
          }}
        >
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
