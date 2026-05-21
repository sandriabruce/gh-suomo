import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { AdinkraOverlay } from "@/components/brand/AdinkraOverlay";
import { useSpicyModeBootstrap } from "@/hooks/useSpicyTheme";
import Landing from "./pages/Landing";
import AuthPage from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Discover from "./pages/app/Discover";
import Matches from "./pages/app/Matches";
import Chat from "./pages/app/Chat";
import Verify from "./pages/app/Verify";
import Spicy from "./pages/app/Spicy";
import Profile from "./pages/app/Profile";
import EditProfile from "./pages/app/EditProfile";
import Safety from "./pages/app/Safety";
import Admin from "./pages/app/Admin";
import PaymentsAdmin from "./pages/app/PaymentsAdmin";
import PaymentEventsAdmin from "./pages/app/PaymentEventsAdmin";
import ChatDiagnostics from "./pages/app/ChatDiagnostics";
import SeedPhotosAdmin from "./pages/app/SeedPhotosAdmin";
import SeedRepliesAdmin from "./pages/app/SeedRepliesAdmin";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Allow react-query's in-memory cache to satisfy reads while offline.
      staleTime: 1000 * 60,            // 1 min
      gcTime: 1000 * 60 * 60 * 24,     // 24 h
      retry: 1,
      refetchOnWindowFocus: false,
      networkMode: "offlineFirst",
    },
  },
});

const guard = (node: ReactNode, label: string) => (
  <ErrorBoundary compact label={`${label} couldn't load`}>{node}</ErrorBoundary>
);

const App = () => {
  useSpicyModeBootstrap();
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AdinkraOverlay />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={guard(<Landing />, "Home")} />
            <Route path="/auth" element={guard(<AuthPage />, "Sign in")} />
            <Route path="/reset-password" element={guard(<ResetPassword />, "Reset password")} />
            <Route path="/onboarding" element={<ProtectedRoute>{guard(<Onboarding />, "Onboarding")}</ProtectedRoute>} />
            <Route path="/app" element={<ProtectedRoute requireCompleteProfile={false}><AppShell /></ProtectedRoute>}>
              <Route index element={<Navigate to="/app/discover" replace />} />
              <Route path="discover" element={guard(<Discover />, "Discover")} />
              <Route path="matches" element={guard(<Matches />, "Matches")} />
              <Route path="chat" element={guard(<Chat />, "Chat")} />
              <Route path="chat/:id" element={guard(<Chat />, "Chat")} />
              <Route path="verify" element={guard(<Verify />, "Verify")} />
              <Route path="spicy" element={guard(<Spicy />, "Spicy Mode")} />
              <Route path="profile" element={guard(<Profile />, "Profile")} />
              <Route path="profile/edit" element={guard(<EditProfile />, "Edit profile")} />
              <Route path="safety" element={guard(<Safety />, "Safety")} />
              <Route path="admin" element={<ProtectedRoute adminOnly>{guard(<Admin />, "Admin")}</ProtectedRoute>} />
              <Route path="admin/payments" element={<ProtectedRoute adminOnly>{guard(<PaymentsAdmin />, "Payments")}</ProtectedRoute>} />
              <Route path="admin/payment-events" element={<ProtectedRoute adminOnly>{guard(<PaymentEventsAdmin />, "Payment events")}</ProtectedRoute>} />
              <Route path="admin/chat-diagnostics" element={<ProtectedRoute adminOnly>{guard(<ChatDiagnostics />, "Chat diagnostics")}</ProtectedRoute>} />
              <Route path="admin/seed-photos" element={<ProtectedRoute adminOnly>{guard(<SeedPhotosAdmin />, "Seed photos")}</ProtectedRoute>} />
              <Route path="admin/seed-replies" element={<ProtectedRoute adminOnly>{guard(<SeedRepliesAdmin />, "Seed replies")}</ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
