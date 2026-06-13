import { ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

export function ProtectedRoute({
  children,
  adminOnly = false,
  requireCompleteProfile = true,
}: {
  children: ReactNode;
  adminOnly?: boolean;
  requireCompleteProfile?: boolean;
}) {
  const { user, loading, isAdmin, roleLoaded } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();

  // In PWA standalone mode, block the system back gesture from
  // escaping the app shell back to the sign-in page
  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as any).standalone === true;
    if (isStandalone && user) {
      // Push a duplicate entry so back gesture hits this same route, not the landing
      window.history.pushState(null, "", window.location.href);
      const handlePop = () => {
        window.history.pushState(null, "", window.location.href);
      };
      window.addEventListener("popstate", handlePop);
      return () => window.removeEventListener("popstate", handlePop);
    }
  }, [user]);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (adminOnly && !roleLoaded) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Checking access…</div>;
  if (adminOnly && !isAdmin) return <Navigate to="/app/discover" replace />;
  // Onboarding gate: require core profile fields before accessing the app.
  const onOnboarding = location.pathname.startsWith("/onboarding");
  if (requireCompleteProfile && !adminOnly && !onOnboarding) {
    if (profileLoading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
    const incomplete =
      !profile?.first_name?.trim() ||
      !profile?.gender ||
      !profile?.interested_in;
    if (incomplete) return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}