import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Image, Loader2, Send, ThumbsDown, ThumbsUp, Trash2, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MentionText } from "./MentionText";
import { usePortalUser } from "@/lib/portal-session";
import {
  REACTIONS,
  createLeaderboardComment,
  createLeaderboardPost,
  deleteComment,
  deletePost,
  fetchLeaderboard,
  moderateComment,
  moderatePost,
  toggleCommentLike,
  toggleReaction,
  uploadLeaderboardMedia,
  type LeaderboardPost,
  type ReactionKind,
} from "@/lib/leaderboard-data";

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function LeaderboardComposer({ userId, isAdmin }: { userId: string; isAdmin?: boolean }) {
  const qc = useQueryClient();
  const { data: portalUser } = usePortalUser();
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    if (!portalUser?.avatar_path) {
      setPhotoUrl(undefined);
      return () => {
        active = false;
      };
    }
    void import("@/integrations/supabase/client").then(({ supabase }) =>
      supabase.storage
        .from("profile-photos")
        .createSignedUrl(portalUser.avatar_path ?? "", 60 * 60)
        .then(({ data }) => {
          if (active) setPhotoUrl(data?.signedUrl);
        }),
    );
    return () => {
      active = false;
    };
  }, [portalUser?.avatar_path]);

  // Show the chosen picture/video straight away, before anything is uploaded.
  const chooseFile = (next: File | null) => {
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return next ? URL.createObjectURL(next) : null;
    });
    setFile(next);
  };
  const clearFile = () => {
    chooseFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);


  const post = useMutation({
    mutationFn: async () => {
      if (!body.trim() && !file) throw new Error("Write something or attach a picture or video.");
      let mediaPath: string | null = null;
      let mediaType: "image" | "video" | null = null;
      if (file) {
        if (file.size > 50 * 1024 * 1024) throw new Error("File is larger than 50 MB.");
        mediaType = file.type.startsWith("video") ? "video" : "image";
        mediaPath = await uploadLeaderboardMedia(file, userId);
      }
      await createLeaderboardPost({ body, mediaPath, mediaType, asTeam: Boolean(isAdmin) });
    },
    onSuccess: () => {
      setBody("");
      clearFile();
      qc.invalidateQueries({ queryKey: ["leaderboard"] });
      toast.success("Posted — it will appear once the L&D team approves it.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="flex items-start gap-3 p-4">
        <Avatar className="mt-1 size-11 shrink-0 border border-border">
          <AvatarImage src={photoUrl} alt={portalUser?.name ?? "Your profile"} className="object-cover" />
          <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
            {initials(isAdmin ? "ABHI L&D Team" : portalUser?.name ?? "Employee")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-3">
          {!expanded ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="min-w-0 flex-1 rounded-full bg-muted px-5 py-3 text-left text-base text-muted-foreground transition-colors hover:bg-secondary"
              >
                Share your achievement{portalUser?.name ? `, ${portalUser.name.split(" ")[0]}` : ""}! — Keh Do ABHI!
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 text-success"
                title="Add picture"
                aria-label="Add picture"
                onClick={() => {
                  setExpanded(true);
                  setTimeout(() => fileRef.current?.click());
                }}
              >
                <Image className="size-6" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-10 text-destructive"
                title="Add video"
                aria-label="Add video"
                onClick={() => {
                  setExpanded(true);
                  setTimeout(() => fileRef.current?.click());
                }}
              >
                <Video className="size-6" />
              </Button>
            </div>
          ) : (
            <>
              {isAdmin && (
                <p className="text-xs text-muted-foreground">You will appear as “ABHI L&amp;D Team”.</p>
              )}
              <Textarea
                id="leaderboard-post-text"
                autoFocus
                rows={3}
                placeholder="Share an achievement, success story or acknowledgement… Tag colleagues with @EmployeeID"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
              />
            </>
          )}
          {expanded && (
            <div className="space-y-3 border-t bg-background p-4">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => chooseFile(e.target.files?.[0] ?? null)}
              />
              {preview && file && (
                <div className="relative overflow-hidden rounded-md border bg-muted">
                  {file.type.startsWith("video") ? (
                    <video src={preview} controls className="max-h-[560px] w-full bg-foreground" />
                  ) : (
                    <img src={preview} alt="Attachment preview" className="max-h-[560px] w-full object-contain" />
                  )}
                  <Button
                    type="button"
                    onClick={clearFile}
                    aria-label="Remove attachment"
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-2 size-8 rounded-full shadow"
                  >
                    <X className="size-4" />
                  </Button>
                  <p className="truncate border-t px-3 py-1.5 text-xs text-muted-foreground">{file.name}</p>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Image className="size-4" /> {file ? "Change attachment" : "Add picture or video"}
                </Button>
                <Button
                  size="sm"
                  className="ml-auto"
                  disabled={post.isPending}
                  onClick={() => post.mutate()}
                >
                  {post.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Post
                </Button>
              </div>
              <p className="text-center text-[11px] text-muted-foreground">
                Every post is reviewed by the L&amp;D team before it goes live.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Counts everything still waiting for the L&D team: pending posts + pending comments. */
export function usePendingLeaderboardCount() {
  const { data } = useQuery({ queryKey: ["leaderboard"], queryFn: () => fetchLeaderboard() });
  return (data ?? []).reduce(
    (n, p) =>
      n +
      (p.status === "pending" ? 1 : 0) +
      p.comments.filter((c) => c.status === "pending").length,
    0,
  );
}

export function LeaderboardFeed({
  moderate = false,
  pendingOnly = false,
}: {
  moderate?: boolean;
  pendingOnly?: boolean;
}) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => fetchLeaderboard(),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["leaderboard"] });

  const posts = pendingOnly
    ? (data ?? []).filter(
        (p) => p.status === "pending" || p.comments.some((c) => c.status === "pending"),
      )
    : (data ?? []);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading posts…</p>;
  if (!posts.length)
    return (
      <p className="text-sm text-muted-foreground">
        {pendingOnly
          ? "Nothing is waiting for approval right now."
          : "No posts yet. Be the first to share!"}
      </p>
    );

  return (
    <div className="space-y-5">
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          moderate={moderate}
          pendingOnly={pendingOnly}
          refresh={refresh}
        />
      ))}
    </div>
  );
}

function PostCard({
  post,
  moderate,
  pendingOnly = false,
  refresh,
}: {
  post: LeaderboardPost;
  moderate: boolean;
  pendingOnly?: boolean;
  refresh: () => void;
}) {
  const visibleComments = pendingOnly
    ? post.comments.filter((c) => c.status === "pending")
    : post.comments;
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const react = async (kind: ReactionKind) => {
    try {
      await toggleReaction(post.id, kind, post.mine.includes(kind));
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const sendComment = async () => {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await createLeaderboardComment(post.id, comment, undefined, moderate);
      setComment("");
      toast.success("Comment sent for approval.");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn: () => Promise<void>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const sendReply = async (parentId: string) => {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await createLeaderboardComment(post.id, reply, parentId, moderate);
      setReply("");
      setReplyTo(null);
      toast.success("Reply sent for approval.");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const renderComment = (c: LeaderboardPost["comments"][number]) => {
    const parent = c.parent_id ? post.comments.find((x) => x.id === c.parent_id) : null;
    return (
      <div className="flex items-start gap-2 text-sm">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-semibold">
          {initials(c.author_name)}
        </span>
        <div className="min-w-0 flex-1 rounded-lg bg-card px-3 py-2">
          <p>
            <span className="font-medium">{c.author_name}</span>
            {c.author_designation && (
              <span className="text-xs text-muted-foreground"> · {c.author_designation}</span>
            )}
            {c.status !== "approved" && (
              <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] capitalize">
                {c.status === "pending" ? "Awaiting approval" : c.status}
              </span>
            )}
          </p>
          {pendingOnly && parent && (
            <p className="text-[11px] text-muted-foreground">{`Reply to ${parent.author_name}`}</p>
          )}
          <MentionText text={c.body} className="whitespace-pre-wrap text-sm text-muted-foreground" />
          <div className="mt-1 flex items-center gap-1">
            <Button
              type="button"
              onClick={() =>
                act(() => toggleCommentLike(c.id, c.liked), c.liked ? "Like removed." : "Liked.")
              }
              aria-label={c.liked ? "Unlike comment" : "Like comment"}
              variant="ghost"
              size="sm"
              className={`h-6 rounded-full px-1.5 text-[11px] ${c.liked ? "bg-accent/15 font-semibold" : "text-muted-foreground"}`}
            >
              <ThumbsUp className="size-3" />
              {c.likes > 0 && <span>{c.likes}</span>}
            </Button>
            {!c.parent_id && !pendingOnly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 rounded-full px-2 text-[11px] text-muted-foreground"
                onClick={() => {
                  setReplyTo(replyTo === c.id ? null : c.id);
                  setReply("");
                }}
              >
                Reply
              </Button>
            )}
          </div>
        </div>
        {moderate && (
          <span className="flex gap-1">
            {c.status !== "approved" && (
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() => act(() => moderateComment(c.id, "approved"), "Comment approved.")}
              >
                <Check className="size-4" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-destructive"
              title="Reject and delete"
              onClick={() => act(() => deleteComment(c.id), "Comment rejected and removed.")}
            >
              <Trash2 className="size-4" />
            </Button>
          </span>
        )}
      </div>
    );
  };

  return (
    <article className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <header className="flex items-start gap-3 p-4 pb-3">
        <Avatar className="size-11 shrink-0 border border-border">
          <AvatarImage
            src={post.is_admin_post ? undefined : post.avatarSrc ?? undefined}
            alt={`${post.author_name}'s profile`}
            className="object-cover"
          />
          <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
            {post.is_admin_post ? "L&D" : initials(post.author_name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-bold">{post.author_name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {[post.author_designation, post.author_location].filter(Boolean).join(" · ") ||
              "Learning & Development"}
          </p>
        </div>
        <span className="ml-auto whitespace-nowrap text-right text-[11px] text-muted-foreground">
          {when(post.created_at)}
          {post.status !== "approved" && (
            <span className="mt-1 block rounded bg-secondary px-1.5 py-0.5 font-medium capitalize">
              {post.status === "pending" ? "Awaiting approval" : post.status}
            </span>
          )}
        </span>
      </header>

      {post.body && <MentionText text={post.body} className="whitespace-pre-wrap px-4 pb-3 text-[15px] leading-relaxed" />}
      {post.mediaSrc && post.media_type === "image" && (
        <img
          src={post.mediaSrc}
          alt={post.body?.slice(0, 80) || "Leaderboard post"}
          loading="lazy"
          className="max-h-[680px] w-full border-y bg-muted object-contain"
        />
      )}
      {post.mediaSrc && post.media_type === "video" && (
        <video src={post.mediaSrc} controls className="max-h-[680px] w-full border-y bg-foreground" />
      )}

      <div className="flex flex-wrap items-center gap-1 px-4 py-2.5">
        {REACTIONS.map((r) => {
          const active = post.mine.includes(r.kind);
          return (
            <Button
              key={r.kind}
              type="button"
              onClick={() => react(r.kind)}
              aria-label={r.label}
              title={r.label}
              variant="ghost"
              size="sm"
              className={`h-8 rounded-full px-2.5 ${active ? "bg-accent/15 font-semibold" : "text-muted-foreground"}`}
            >
              <span>{r.emoji}</span>
              {post.counts[r.kind] > 0 && <span>{post.counts[r.kind]}</span>}
            </Button>
          );
        })}
        {moderate && (
          <span className="ml-auto flex gap-2">
            {post.status !== "approved" && (
              <Button size="sm" onClick={() => act(() => moderatePost(post.id, "approved"), "Post approved.")}>
                <Check className="size-4" /> Approve
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => act(() => deletePost(post.id), "Post rejected and removed.")}
            >
              <X className="size-4" /> Reject
            </Button>
          </span>
        )}
      </div>

      <div className="space-y-3 border-t bg-muted/40 px-4 py-3">
        {(pendingOnly
          ? visibleComments
          : visibleComments.filter((c) => !c.parent_id || !visibleComments.some((x) => x.id === c.parent_id))
        ).map((c) => (
          <div key={c.id} className="space-y-2">
            {renderComment(c)}
            {!pendingOnly &&
              visibleComments
                .filter((r) => r.parent_id === c.id)
                .map((r) => (
                  <div key={r.id} className="ml-9">
                    {renderComment(r)}
                  </div>
                ))}
            {replyTo === c.id && (
              <div className="ml-9 flex items-center gap-2">
                <Textarea
                  rows={1}
                  autoFocus
                  value={reply}
                  placeholder={`Reply to ${c.author_name}…`}
                  onChange={(e) => setReply(e.target.value)}
                  className="min-h-9 resize-none rounded-full bg-card px-4 py-2"
                />
                <Button size="icon" variant="outline" className="size-9 rounded-full" disabled={busy} onClick={() => sendReply(c.id)}>
                  <Send className="size-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            ME
          </span>
          <Textarea
            rows={1}
            value={comment}
            placeholder="Write a comment… (tag with @EmployeeID)"
            onChange={(e) => setComment(e.target.value)}
            className="min-h-9 resize-none rounded-full bg-card px-4 py-2"
          />
          <Button size="icon" variant="outline" className="size-9 rounded-full" disabled={busy} onClick={sendComment}>
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}
