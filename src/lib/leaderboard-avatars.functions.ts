import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getLeaderboardAvatarUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ authorIds: z.array(z.string().uuid()).max(200) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<Record<string, string>> => {
    const authorIds = [...new Set(data.authorIds)];
    if (!authorIds.length) return {};

    // This user-scoped read only admits authors from posts the viewer may see.
    const { data: visiblePosts, error: postsError } = await context.supabase
      .from("leaderboard_posts")
      .select("author_user_id")
      .in("author_user_id", authorIds);
    if (postsError) throw new Error(postsError.message);

    const visibleAuthorIds = [...new Set((visiblePosts ?? []).map((post) => post.author_user_id))];
    if (!visibleAuthorIds.length) return {};

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("portal_users")
      .select("id,avatar_path")
      .in("id", visibleAuthorIds)
      .not("avatar_path", "is", null);
    if (profilesError) throw new Error(profilesError.message);

    const rows = (profiles ?? []).filter(
      (profile): profile is typeof profile & { avatar_path: string } => Boolean(profile.avatar_path),
    );
    if (!rows.length) return {};

    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from("profile-photos")
      .createSignedUrls(rows.map((profile) => profile.avatar_path), 60 * 60);
    if (signedError) throw new Error(signedError.message);

    return Object.fromEntries(
      rows.flatMap((profile, index) => {
        const url = signed?.[index]?.signedUrl;
        return url ? [[profile.id, url]] : [];
      }),
    );
  });