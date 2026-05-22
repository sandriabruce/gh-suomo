import { Navigate, NavLink, Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Compass, Heart, MessageCircle, ShieldCheck, User, ShieldAlert, Crown, Menu, LogOut, Settings, Flame } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { computeTrial } from "@/features/trial/entitlements";
import { toast } from "sonner";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";

const tabs = [
  { to: "/app/discover", label: "Discover", icon: Compass },
  { to: "/app/matches", label: "Matches", icon: Heart },
  { to: "/app/chat", label: "Chat", icon: MessageCircle },
  { to: "/app/spicy", label: "Spicy", icon: Flame },
  { to: "/app/verify", label: "Verify", icon: ShieldCheck },
  { to: "/app/profile", label: "Profile", icon: User },
  { to: "/app/safety", label: "Safety", icon: ShieldAlert },
];

export function AppShell() {
  const { isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: unread } = useUnreadMessages();
  const allTabs = isAdmin ? [...tabs, { to: "/app/admin", label: "Admin", icon: Crown }] : tabs;
  const shouldGateProfile = !location.pathname.startsWith("/app/admin");
  const profileIncomplete = shouldGateProfile && !profileLoading && (
    !profile?.first_name?.trim() ||
    !profile?.gender ||
    !profile?.interested_in
  );

  // One-time toast confirming Premium activation + new trial end date.
  useEffect(() => {
    if (!profile?.id) return;
    if (profile.plan !== "premium" && profile.plan !== "diamond") return;
    const key = `premium-activated-notice:${profile.id}`;
    if (localStorage.getItem(key)) return;
    const trial = computeTrial(profile.trial_start);
    const endsAt = trial.endsAt
      ? trial.endsAt.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
      : null;
    toast.success("Premium activated 🎉", {
      description: endsAt
        ? `Your trial now runs through ${endsAt}. Enjoy unlimited matches and chat.`
        : "Enjoy unlimited matches, chat, and the verified badge.",
      duration: 8000,
    });
    localStorage.setItem(key, new Date().toISOString());
  }, [profile?.id, profile?.plan, profile?.trial_start]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-warm">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur">
        <Link to="/app/discover" aria-label="Go to discover" className="rounded-md focus:outline-none focus:ring-2 focus:ring-ghana-gold">
          <Logo size="sm" />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate("/app/profile")}>
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/app/profile/edit")}>
              <Settings className="mr-2 h-4 w-4" /> Edit profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => { await signOut(); navigate("/", { replace: true }); }}
              className="text-ghana-red focus:text-ghana-red"
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-4 pb-24">
        {shouldGateProfile && profileLoading ? (
          <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : profileIncomplete ? (
          <Navigate to="/onboarding" replace />
        ) : (
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        )}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-stretch justify-between px-2">
          {allTabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                  isActive ? "text-ghana-green" : "text-muted-foreground",
                )
              }
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {(to === "/app/matches" || to === "/app/chat") && unread && unread.total > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ghana-red px-1 text-[9px] font-bold text-white">
                    {unread.total > 9 ? "9+" : unread.total}
                  </span>
                )}
              </span>
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}