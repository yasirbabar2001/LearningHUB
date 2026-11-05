import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, Trash2 } from "lucide-react";
import { SectionCard } from "@/components/admin/Kpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteOnboardingAttendance,
  listOnboardingAttendance,
} from "@/lib/onboarding.functions";
import { exportCsv, exportExcel } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/onboarding-report")({
  head: () => ({
    meta: [
      { title: "Onboarding Session Report | L&D Portal" },
      {
        name: "description",
        content:
          "New joiner onboarding attendance with trainer, venue, training picture and trainee feedback ratings.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingReportPage,
});

function OnboardingReportPage() {
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["onboarding-report"],
    queryFn: () => listOnboardingAttendance(),
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((r) =>
      [r.cnic, r.new_joiner_name, r.designation_name, r.location_name, r.trainer_name, r.venue_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [data, search]);

  const qc = useQueryClient();
  const remove = useMutation({
    mutationFn: async (ids: string[]) => deleteOnboardingAttendance({ data: { ids } }),
    onSuccess: (res) => {
      toast.success(`${res.deleted} record(s) deleted.`);
      qc.invalidateQueries({ queryKey: ["onboarding-report"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Unable to delete the record."),
  });

  const exportRows = rows.map((r) => ({
    CNIC: r.cnic,
    "New Joiner": r.new_joiner_name,
    Designation: r.designation_name ?? "",
    Location: r.location_name ?? "",
    Region: r.region_name ?? "",
    Wing: r.wing_name ?? "",
    "Training Name": "Onboarding Session",
    "Training Date": r.training_date,
    Venue: r.venue_name ?? "",
    Trainer: r.trainer_name ?? "",
    "Trainer ID": r.trainer_employee_code ?? "",
    "Trainer Designation": r.trainer_designation ?? "",
    "Recorded At": new Date(r.created_at).toLocaleString(),
    "Feedback Submitted": r.feedback_submitted_at
      ? new Date(r.feedback_submitted_at).toLocaleString()
      : "",
    Content: r.content_rating ?? "",
    Trainer_Rating: r.trainer_rating ?? "",
    Venue_Rating: r.venue_rating ?? "",
    Overall: r.overall_rating ?? "",
    "Quality Score": r.quality_score ?? "",
    Recommended: r.recommendation === null ? "" : r.recommendation ? "Yes" : "No",
    "Most Useful": r.useful_aspect ?? "",
    Improvements: r.improvement_suggestion ?? "",
    "Additional Comments": r.additional_comments ?? "",
    Picture: r.photo_url ?? "",
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            New joiners are identified by CNIC as they do not have an employee ID yet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!exportRows.length}
            onClick={() => exportCsv(exportRows, "onboarding-session-report")}
          >
            <FileText className="size-4" /> CSV
          </Button>
          <Button
            size="sm"
            disabled={!exportRows.length}
            onClick={() => exportExcel(exportRows, "onboarding-session-report")}
          >
            <FileSpreadsheet className="size-4" /> Excel
          </Button>
        </div>
      </div>

      <SectionCard
        title={`Records (${rows.length})`}
        description="Trainer, new joiner details, venue, training picture and trainee feedback."
      >
        <Input
          className="mb-4 max-w-sm"
          placeholder="Search by CNIC, name, branch or trainer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3">CNIC</th>
                <th className="py-2 pr-3">New Joiner</th>
                <th className="py-2 pr-3">Designation</th>
                <th className="py-2 pr-3">Location</th>
                <th className="py-2 pr-3">Region</th>
                <th className="py-2 pr-3">Wing</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">Venue</th>
                <th className="py-2 pr-3">Trainer</th>
                <th className="py-2 pr-3">Overall</th>
                <th className="py-2 pr-3">Picture</th>
                <th className="py-2 pr-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={12} className="py-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-6 text-center text-muted-foreground">
                    No onboarding sessions recorded yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 tabular-nums">{r.cnic}</td>
                    <td className="py-2 pr-3 font-medium">{r.new_joiner_name}</td>
                    <td className="py-2 pr-3">{r.designation_name ?? "—"}</td>
                    <td className="py-2 pr-3">{r.location_name ?? "—"}</td>
                    <td className="py-2 pr-3">{r.region_name ?? "—"}</td>
                    <td className="py-2 pr-3">{r.wing_name ?? "—"}</td>
                    <td className="py-2 pr-3">{r.training_date}</td>
                    <td className="py-2 pr-3">{r.venue_name ?? "—"}</td>
                    <td className="py-2 pr-3">
                      {r.trainer_name ?? "—"}
                      {r.trainer_employee_code ? ` (${r.trainer_employee_code})` : ""}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {r.overall_rating?.toFixed(2) ?? "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {r.photo_url ? (
                        <a
                          href={r.photo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent underline"
                        >
                          View
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={remove.isPending}
                        onClick={() => {
                          if (
                            confirm(
                              `Delete the onboarding record for ${r.new_joiner_name} (${r.cnic})? This cannot be undone.`,
                            )
                          )
                            remove.mutate([r.id]);
                        }}
                      >
                        <Trash2 className="size-4" /> Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
