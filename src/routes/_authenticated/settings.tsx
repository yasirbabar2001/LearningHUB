import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SectionCard } from "@/components/admin/Kpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_SETTINGS, logAudit, useSaveSetting, useSettings } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Portal Settings | ABHI Learning HUB" },
      {
        name: "description",
        content: "Configure rating thresholds, minimum sample size and quality score weightings.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data } = useSettings();
  const save = useSaveSetting();
  const [threshold, setThreshold] = useState("4");
  const [minSample, setMinSample] = useState("10");
  const [multi, setMulti] = useState(false);
  const [passing, setPassing] = useState("60");
  const [weights, setWeights] = useState(DEFAULT_SETTINGS.quality_weights);

  useEffect(() => {
    if (!data) return;
    setThreshold(String(data.rating_threshold));
    setMinSample(String(data.min_sample_size));
    setMulti(data.allow_multiple_submissions);
    setPassing(String(data.passing_percentage ?? 60));
    setWeights(data.quality_weights);
  }, [data]);

  const persist = async () => {
    const t = Number(threshold);
    const m = Number(minSample);
    if (!(t >= 1 && t <= 5)) {
      toast.error("Threshold must be between 1 and 5.");
      return;
    }
    if (!(m >= 1)) {
      toast.error("Minimum sample size must be at least 1.");
      return;
    }
    const pass = Number(passing);
    if (!(pass >= 1 && pass <= 100)) {
      toast.error("Passing percentage must be between 1 and 100.");
      return;
    }
    await Promise.all([
      save.mutateAsync({ key: "rating_threshold", value: t }),
      save.mutateAsync({ key: "min_sample_size", value: m }),
      save.mutateAsync({ key: "allow_multiple_submissions", value: multi }),
      save.mutateAsync({ key: "quality_weights", value: weights }),
      save.mutateAsync({ key: "passing_percentage", value: pass }),
    ]);
    await logAudit("update", "settings", undefined, { rating_threshold: t, min_sample_size: m });
    toast.success("Settings saved");
  };

  const setWeight = (type: "classroom" | "virtual", key: string, value: number) =>
    setWeights((w) => ({ ...w, [type]: { ...w[type], [key]: value } }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          These values drive alerts, small-sample warnings and quality score calculations.
        </p>
      </div>

      <SectionCard title="Analytics Thresholds">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Low rating threshold (1–5)</Label>
            <Input value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Trainings and trainers below this average are flagged for attention.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Minimum sample size</Label>
            <Input value={minSample} onChange={(e) => setMinSample(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Below this response count, results display a small-sample warning.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Feedback Submission">
        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Allow multiple submissions per employee</p>
            <p className="text-xs text-muted-foreground">
              When off, each employee can submit feedback for a training only once.
            </p>
          </div>
          <Switch checked={multi} onCheckedChange={setMulti} />
        </div>
      </SectionCard>

      <SectionCard title="Pre & Post Evaluation">
        <div className="space-y-1.5 sm:max-w-xs">
          <Label>Passing percentage (1-100)</Label>
          <Input value={passing} onChange={(e) => setPassing(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Evaluations scoring at or above this percentage are marked as passed.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Quality Score Weightings"
        description="Weights are applied to category averages to produce the composite quality score."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {(["classroom", "virtual"] as const).map((type) => (
            <div key={type} className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium capitalize">{type}</p>
              {Object.entries(weights[type] ?? {}).map(([k, v]) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="w-24 text-sm capitalize">{k}</span>
                  <Input
                    className="h-8"
                    value={String(v)}
                    onChange={(e) => setWeight(type, k, Number(e.target.value) || 0)}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Sum:{" "}
                {Object.values(weights[type] ?? {})
                  .reduce((a, b) => a + b, 0)
                  .toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <Button onClick={persist} disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save Settings"}
      </Button>
    </div>
  );
}
