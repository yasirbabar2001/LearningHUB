import { KeyRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, House, Lightbulb, Loader2, LogOut, MonitorPlay, ShieldCheck, Trash2, User } from "lucide-react";
import { usePortalUser, portalSignOut, getPortalSessionKey, setPortalSessionKey } from "@/lib/portal-session";
import { updateOwnProfilePhoto, touchPortalSession } from "@/lib/portal-users.functions";
import { submitProfileChangeRequest } from "@/lib/profile-requests.functions";
import { getIdeasContext } from "@/lib/ideas.functions";
import { NotificationBell } from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const HIDE_ON = ["/login", "/change-password", "/set-password"];
/** First path segments that belong to the admin (back-office) area. */
const ADMIN_SEGMENTS = new Set([
  "dashboard",
  "trainings",
  "training-calendar",
  "tna-admin",
  "onboarding-report",
  "feedback",
  "trainer-reports",
  "evaluations",
  "survey-report",
  "leaderboard-admin", "ideas-admin", "ideas-review",
  "lov",
  "questions",
  "portal-users",
  "users",
  "audit",
  "settings",
]);
/** Auto sign-out after 15 minutes without any user activity. */
const IDLE_LIMIT_MS = 15 * 60 * 1000;
/** How often this device checks in to keep ownership of the account. */
const HEARTBEAT_MS = 30 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"] as const;

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Signed-in employee chip shown in the top-right corner, with profile details and sign out. */
export function PortalUserBadge() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdminView = ADMIN_SEGMENTS.has(pathname.split("/")[1] ?? "");
  const { data: user } = usePortalUser();
  const { data: isAdmin } = useQuery({
    queryKey: ["portal-user-is-admin", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      return Boolean(data);
    },
  });
  const { data: ideasContext } = useQuery({
    queryKey: ["ideas-ctx"],
    enabled: Boolean(user?.id),
    staleTime: 60_000,
    queryFn: () => getIdeasContext(),
  });
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    if (!user?.avatar_path) {
      setPhotoUrl(undefined);
      return () => {
        active = false;
      };
    }
    void supabase.storage
      .from("profile-photos")
      .createSignedUrl(user.avatar_path, 60 * 60)
      .then(({ data }) => {
        if (active) setPhotoUrl(data?.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [user?.avatar_path]);

  const signOutRef = useRef<() => Promise<void>>(async () => {});
  signOutRef.current = async () => {
    await qc.cancelQueries();
    await portalSignOut();
    qc.clear();
    navigate({ to: "/login", replace: true });
  };

  // Auto sign-out after 30 minutes of inactivity; any mouse/keyboard/touch activity resets the timer.
  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void signOutRef.current();
      }, IDLE_LIMIT_MS);
    };
    reset();
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, reset, { passive: true });
    }
    return () => {
      clearTimeout(timer);
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, reset);
      }
    };
  }, [user]);

  // One device at a time: check in regularly; if another device owns the account, sign out here.
  useEffect(() => {
    if (!user?.id) return;
    let stopped = false;
    const beat = async () => {
      try {
        const res = await touchPortalSession({ data: { key: getPortalSessionKey() } });
        if (stopped) return;
        if (res.ok) {
          setPortalSessionKey(res.key);
        } else {
          stopped = true;
          await qc.cancelQueries();
          await portalSignOut({ release: false });
          qc.clear();
          toast.error("Your account is signed in on another device. Please log out there first.");
          navigate({ to: "/login", replace: true });
        }
      } catch {
        /* network hiccup: try again next beat */
      }
    };
    void beat();
    const id = setInterval(() => void beat(), HEARTBEAT_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [user?.id, qc, navigate]);

  if (!user || HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  const rows: [string, string | null][] = [
    ["Employee ID", user.employee_code],
    ["Designation", user.designation_name],
    ["Department", user.department_name],
    ["Location", user.location_name],
    ["Region", user.region_name],
    ["Wing", user.wing_name],
  ];

  const signOut = () => signOutRef.current();

  const choosePhoto = async (file?: File) => {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile picture must be 5 MB or smaller.");
      return;
    }
    setPhotoBusy(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/pending-${Date.now()}.${extension}`;
      const { error } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      await submitProfileChangeRequest({
        data: {
          avatar_path: path,
          designation_id: user.designation_id,
          department_id: user.department_id,
          location_id: user.location_id,
          region_id: user.region_id,
          wing_id: user.wing_id,
        } as never,
      });
      toast.success("Sent to the L&D team for approval. It appears once approved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update profile picture.");
    } finally {
      setPhotoBusy(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const removePhoto = async () => {
    if (!user?.avatar_path) return;
    setPhotoBusy(true);
    try {
      const { error } = await supabase.storage.from("profile-photos").remove([user.avatar_path]);
      if (error) throw error;
      await updateOwnProfilePhoto({ data: { avatarPath: null } });
      setPhotoUrl(undefined);
      await qc.invalidateQueries({ queryKey: ["portal-user"] });
      toast.success("Profile picture removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove profile picture.");
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex h-10 items-center justify-center sm:justify-end gap-1 whitespace-nowrap [&>*]:shrink-0 sm:gap-1.5 overflow-x-auto border-b border-sidebar-border bg-sidebar px-2 sm:inset-x-auto sm:right-3 sm:top-3 sm:h-auto sm:overflow-visible sm:border-0 sm:bg-transparent sm:px-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Virtual Learning"
            className="flex h-6 items-center gap-1 rounded-full border border-border bg-card/95 px-2 sm:px-2.5 shadow-md backdrop-blur transition-colors hover:bg-accent"
          >
            <MonitorPlay className="size-3.5" />
            <span className="whitespace-nowrap text-[10px] font-bold">Virtual Learning</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-[11px] font-semibold"
            onClick={() => navigate({ to: "/virtual" })}
          >
            <MonitorPlay className="size-3.5" />
            Virtual Sessions
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {ideasContext?.settings.enabled && (
        <Link
          to="/ideas"
          search={{}}
          title="Have an idea? Keh Do ABHI!"
          className="animate-pulse flex h-6 items-center gap-1 rounded-full border border-primary bg-primary px-2 sm:px-2.5 text-primary-foreground shadow-md transition-colors hover:bg-primary/90 motion-reduce:animate-none"
        >
          <Lightbulb className="size-3.5" />
          <span className="whitespace-nowrap text-[10px] font-bold">ABHI IDEAS</span>
        </Link>
      )}
      <NotificationBell />
      {isAdmin && (
        <button
          type="button"
          title={isAdminView ? "Switch to employee view" : "Switch to admin view"}
          onClick={() => navigate({ to: isAdminView ? "/leaderboard" : "/dashboard" })}
          className="flex h-6 items-center gap-1 rounded-full border border-border bg-card/95 px-2 sm:px-2.5 text-black shadow-md backdrop-blur transition-colors hover:bg-accent"
        >
          <ShieldCheck className="size-3.5" />
          <span className="whitespace-nowrap text-[10px] font-bold"><span className="hidden sm:inline">{"Switch to "}</span>{isAdminView ? "Employee" : "Admin"}</span>
        </button>
      )}
      {pathname !== "/" && (
        <button
          type="button"
          aria-label="Home"
          title="Home"
          onClick={() => navigate({ to: "/" })}
          className="grid size-6 place-items-center rounded-full border border-border bg-card/95 text-foreground shadow-md backdrop-blur transition-colors hover:bg-accent"
        >
          <House className="size-3" />
        </button>
      )}
      <button
        type="button"
        aria-label="Log out"
        title="Log out"
        onClick={signOut}
        className="grid size-6 place-items-center rounded-full border border-destructive/50 bg-card/95 text-destructive shadow-md backdrop-blur transition-colors hover:bg-destructive/15"
      >
        <LogOut className="size-3" />
      </button>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full border border-border bg-card/95 py-0.5 pl-0.5 pr-2.5 shadow-md backdrop-blur transition-colors hover:bg-accent"
          >
            <Avatar className="size-5">
              <AvatarImage src={photoUrl} alt={`${user.name}'s profile`} className="object-cover" />
              <AvatarFallback className="bg-primary text-[9px] font-semibold text-primary-foreground">
                {initials(user.name) || <User className="size-2.5" />}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-[100px] truncate text-[10px] font-semibold">
                {user.name}
              </span>
              <span className="block text-[8px] text-muted-foreground">
                {user.employee_code}
              </span>
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72">
          <div className="mb-3 flex items-center gap-3">
            <Avatar className="size-14">
              <AvatarImage src={photoUrl} alt={`${user.name}'s profile`} className="object-cover" />
              <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                {initials(user.name) || <User className="size-5" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-muted-foreground">Signed in</p>
            </div>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => void choosePhoto(event.target.files?.[0])}
          />
          <div className="mb-3 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="flex-1"
              disabled={photoBusy}
              onClick={() => photoInputRef.current?.click()}
            >
              {photoBusy ? <Loader2 className="animate-spin" /> : <Camera />}
              {user.avatar_path ? "Change photo" : "Add photo"}
            </Button>
            {user.avatar_path && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label="Remove profile picture"
                title="Remove profile picture"
                disabled={photoBusy}
                onClick={() => void removePhoto()}
              >
                <Trash2 className="text-destructive" />
              </Button>
            )}
          </div>
          <dl className="space-y-1.5 border-t border-border pt-3 text-xs">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="truncate font-medium">{value || "—"}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            {"These details are maintained by the L&D Team. You can change your profile picture above; it appears once approved. For any correction, contact Learningdevelopment@abhibank.com."}
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-3 w-full"
            onClick={() => navigate({ to: "/change-password" })}
          >
            <KeyRound />
            {"Change password"}
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
