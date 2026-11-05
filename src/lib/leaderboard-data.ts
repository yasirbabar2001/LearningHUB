import { supabase } from "@/integrations/supabase/client";
import { getLeaderboardAvatarUrls } from "@/lib/leaderboard-avatars.functions";

export const REACTIONS = [
  { kind: "heart", emoji: "❤️", label: "Heart" },
  { kind: "like", emoji: "👍", label: "Like" },
  { kind: "dislike", emoji: "👎", label: "Dislike" },
  { kind: "clap", emoji: "👏", label: "Clap" },
] as const;

export type ReactionKind = (typeof REACTIONS)[number]["kind"];

export type LeaderboardComment = {
  id: string;
  post_id: string;
  author_name: string;
  parent_id: string | null;
  author_designation: string | null;
  is_admin_post: boolean;
  body: string;
  status: string;
  created_at: string;
  like_count: number;
  likes: number;
  liked: boolean;
};

export type LeaderboardPost = {
  id: string;
  author_user_id: string;
  author_name: string;
  author_designation: string | null;
  author_location: string | null;
  is_admin_post: boolean;
  body: string | null;
  media_url: string | null;
  media_type: "image" | "video" | null;
  status: string;
  created_at: string;
  heart_count: number;
  like_count: number;
  dislike_count: number;
  clap_count: number;
  mediaSrc?: string | null;
  avatarSrc?: string | null;
  comments: LeaderboardComment[];
  counts: Record<ReactionKind, number>;
  mine: ReactionKind[];
};

/** Turns stored media paths into short-lived signed URLs (the bucket is private). */
async function signMedia(paths: string[]) {
  const map = new Map<string, string>();
  if (!paths.length) return map;
  const { data } = await supabase.storage
    .from("leaderboard-media")
    .createSignedUrls(paths, 60 * 60);
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) map.set(row.path, row.signedUrl);
  }
  return map;
}

/**
 * Loads the leaderboard feed. Row-level security already limits rows to
 * approved posts, the viewer's own pending posts, and everything for admins.
 */
export async function fetchLeaderboard(options?: { status?: string }): Promise<LeaderboardPost[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id ?? null;

  let query = supabase
    .from("leaderboard_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (options?.status) query = query.eq("status", options.status);
  const { data: posts, error } = await query;
  if (error) throw new Error(error.message);

  const ids = (posts ?? []).map((p) => p.id);
  const [{ data: comments }, { data: reactions }, signed, avatarUrls] = await Promise.all([
    ids.length
      ? supabase
          .from("leaderboard_comments")
          .select("*")
          .in("post_id", ids)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as LeaderboardComment[] }),
    ids.length
      ? supabase.from("leaderboard_reactions").select("post_id,kind,user_id").in("post_id", ids)
      : Promise.resolve({ data: [] as { post_id: string; kind: ReactionKind; user_id: string }[] }),
    signMedia((posts ?? []).map((p) => p.media_url).filter((p): p is string => Boolean(p))),
    getLeaderboardAvatarUrls({ data: { authorIds: [...new Set((posts ?? []).map((p) => p.author_user_id))] } }),
  ]);

  const commentIds = ((comments ?? []) as LeaderboardComment[]).map((c) => c.id);
  const { data: commentLikes } = commentIds.length
    ? await supabase
        .from("leaderboard_comment_reactions")
        .select("comment_id,user_id")
        .in("comment_id", commentIds)
    : { data: [] as { comment_id: string; user_id: string }[] };

  const withLikes = ((comments ?? []) as LeaderboardComment[]).map((c) => {
    const rows = (commentLikes ?? []).filter((r) => r.comment_id === c.id);
    return {
      ...c,
      likes: c.like_count ?? 0,
      liked: Boolean(uid) && rows.some((r) => r.user_id === uid),
    };
  });

  return (posts ?? []).map((p) => {
    const counts: Record<ReactionKind, number> = {
      heart: p.heart_count ?? 0,
      like: p.like_count ?? 0,
      dislike: p.dislike_count ?? 0,
      clap: p.clap_count ?? 0,
    };
    const mine: ReactionKind[] = [];
    for (const r of (reactions ?? []) as { post_id: string; kind: ReactionKind; user_id: string }[]) {
      if (r.post_id !== p.id) continue;
      if (uid && r.user_id === uid) mine.push(r.kind);
    }
    return {
      ...(p as unknown as LeaderboardPost),
      mediaSrc: p.media_url ? (signed.get(p.media_url) ?? null) : null,
      avatarSrc: avatarUrls[p.author_user_id] ?? null,
      comments: withLikes.filter((c) => c.post_id === p.id),
      counts,
      mine,
    };
  });
}

/** Uploads a picture or video and returns its storage path. */
export async function uploadLeaderboardMedia(file: File, userId: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("leaderboard-media").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function createLeaderboardPost(input: {
  body: string;
  mediaPath: string | null;
  mediaType: "image" | "video" | null;
  asTeam?: boolean;
}) {
  const { error } = await supabase.from("leaderboard_posts").insert({
    is_admin_post: input.asTeam ?? false,
    body: input.body.trim() || null,
    media_url: input.mediaPath,
    media_type: input.mediaType,
  });
  if (error) throw new Error(error.message);
}

export async function createLeaderboardComment(postId: string, body: string, parentId?: string, asTeam = false) {
  const { error } = await supabase
    .from("leaderboard_comments")
    .insert({ post_id: postId, body: body.trim(), parent_id: parentId ?? null, is_admin_post: asTeam });
  if (error) throw new Error(error.message);
}

/** One reaction per person per post: picking a new one replaces the previous one. */
export async function toggleReaction(postId: string, kind: ReactionKind, active: boolean) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Please sign in first.");
  const { error: delErr } = await supabase
    .from("leaderboard_reactions")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", uid);
  if (delErr) throw new Error(delErr.message);
  if (!active) {
    const { error } = await supabase
      .from("leaderboard_reactions")
      .insert({ post_id: postId, kind, user_id: uid });
    if (error) throw new Error(error.message);
  }
}

export async function moderatePost(id: string, status: "approved" | "rejected") {
  const { error } = await supabase
    .from("leaderboard_posts")
    .update({ status, approved_at: status === "approved" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function moderateComment(id: string, status: "approved" | "rejected") {
  const { error } = await supabase.from("leaderboard_comments").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePost(id: string) {
  const { error } = await supabase.from("leaderboard_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from("leaderboard_comments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Like / unlike a single comment. */
export async function toggleCommentLike(commentId: string, liked: boolean) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Please sign in first.");
  if (liked) {
    const { error } = await supabase
      .from("leaderboard_comment_reactions")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", uid)
      .eq("kind", "like");
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("leaderboard_comment_reactions")
      .insert({ comment_id: commentId, user_id: uid, kind: "like" });
    if (error) throw new Error(error.message);
  }
}
