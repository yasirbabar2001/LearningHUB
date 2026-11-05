import { createFileRoute } from "@tanstack/react-router";

import { StatusSwitch } from "@/components/admin/StatusSwitch";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { SectionCard } from "@/components/admin/Kpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, useQuestions, type Question } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/questions")({
  head: () => ({
    meta: [
      { title: "Questionnaire Builder | ABHI Learning HUB" },
      {
        name: "description",
        content: "Configure the feedback questions shown for classroom and virtual trainings.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: QuestionsPage,
});

const CATEGORIES = ["venue", "content", "trainer", "overall"] as const;

function QuestionsPage() {
  const qc = useQueryClient();
  const { data: questions = [], isLoading } = useQuestions();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Question>>({});
  const invalidate = () => qc.invalidateQueries({ queryKey: ["questions"] });

  const save = useMutation({
    mutationFn: async (d: Partial<Question>) => {
      if (!d.question_text?.trim()) throw new Error("Question text is required.");
      const payload = {
        question_text: d.question_text.trim(),
        category: d.category ?? "content",
        training_type: d.training_type ?? "both",
        question_type: d.question_type ?? "rating",
        display_order: d.display_order ?? questions.length + 1,
        status: d.status ?? "active",
      };
      if (d.id) {
        const { error } = await supabase.from("feedback_questions").update(payload).eq("id", d.id);
        if (error) throw error;
        await logAudit("update", "question", d.id, { text: payload.question_text });
      } else {
        const { error } = await supabase.from("feedback_questions").insert(payload);
        if (error) throw error;
        await logAudit("create", "question", undefined, { text: payload.question_text });
      }
    },
    onSuccess: () => {
      invalidate();
      setOpen(false);
      setDraft({});
      toast.success("Question saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Question> }) => {
      const { error } = await supabase.from("feedback_questions").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feedback_questions").delete().eq("id", id);
      if (error)
        throw new Error("This question has responses. Set it to inactive instead of deleting.");
      await logAudit("delete", "question", id);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Question deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = (q: Question, dir: -1 | 1) => {
    const sameCat = questions
      .filter((x) => x.category === q.category)
      .sort((a, b) => a.display_order - b.display_order);
    const idx = sameCat.findIndex((x) => x.id === q.id);
    const other = sameCat[idx + dir];
    if (!other) return;
    patch.mutate({ id: q.id, values: { display_order: other.display_order } });
    patch.mutate({ id: other.id, values: { display_order: q.display_order } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Venue questions are only shown for classroom trainings.
          </p>
        </div>
        <Button
          onClick={() => {
            setDraft({});
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> Add Question
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      {CATEGORIES.map((cat) => {
        const list = questions
          .filter((q) => q.category === cat)
          .sort((a, b) => a.display_order - b.display_order);
        return (
          <SectionCard key={cat} title={`${cat[0]!.toUpperCase()}${cat.slice(1)} Questions`}>
            <div className="divide-y rounded-lg border">
              {list.map((q) => (
                <div key={q.id} className="flex flex-wrap items-center gap-2 p-2">
                  <span className="min-w-[240px] flex-1 text-sm">{q.question_text}</span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-xs capitalize">
                    {q.question_type}
                  </span>
                  <select
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                    value={q.training_type}
                    onChange={(e) =>
                      patch.mutate({
                        id: q.id,
                        values: { training_type: e.target.value as Question["training_type"] },
                      })
                    }
                  >
                    <option value="both">Both</option>
                    <option value="classroom">Classroom</option>
                    <option value="virtual">Virtual</option>
                  </select>
                  <StatusSwitch
                    status={q.status}
                    onChange={(status) => patch.mutate({ id: q.id, values: { status } })}
                  />

                  <Button variant="ghost" size="icon" onClick={() => move(q, -1)}>
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => move(q, 1)}>
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => confirm("Delete this question?") && remove.mutate(q.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {!list.length ? (
                <p className="p-3 text-sm text-muted-foreground">No questions in this category.</p>
              ) : null}
            </div>
          </SectionCard>
        );
      })}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Question Text *</Label>
              <Input
                value={draft.question_text ?? ""}
                onChange={(e) => setDraft({ ...draft, question_text: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={draft.category ?? "content"}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value as Question["category"] })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Applies To</Label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={draft.training_type ?? "both"}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      training_type: e.target.value as Question["training_type"],
                    })
                  }
                >
                  <option value="both">Both</option>
                  <option value="classroom">Classroom</option>
                  <option value="virtual">Virtual</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Answer Type</Label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={draft.question_type ?? "rating"}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      question_type: e.target.value as Question["question_type"],
                    })
                  }
                >
                  <option value="rating">Rating 1–5</option>
                  <option value="yesno">Yes / No</option>
                  <option value="text">Text</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate(draft)} disabled={save.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
