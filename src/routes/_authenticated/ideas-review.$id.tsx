import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { IdeaReview } from "@/components/ideas/IdeaReview";

export const Route = createFileRoute("/_authenticated/ideas-review/$id")({
  head: () => ({
    meta: [
      { title: "Idea Review | ABHI IDEAS" },
      { name: "description", content: "Review, assess and track an ABHI IDEAS submission." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-4">
      <Link to="/ideas-admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All ideas
      </Link>
      <IdeaReview id={id} />
    </div>
  );
}
