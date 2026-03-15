import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { lazy, Suspense, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Auth from "./pages/Auth";
import LandingPage from "./pages/LandingPage";
import JourneyPage from "./pages/JourneyPage";
import ChatLandingPage from "./pages/ChatLandingPage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NPSResponse from "./pages/NPSResponse";
import NPSEmbed from "./pages/NPSEmbed";
import NotFound from "./pages/NotFound";
import ChatWidget from "./pages/ChatWidget";
import AdminWorkspace from "./pages/AdminWorkspace";
import PendingApproval from "./pages/PendingApproval";
import UserPortal from "./pages/UserPortal";
import SidebarLayout from "./components/SidebarLayout";

// Lazy loaded pages — CS Module
const Home = lazy(() => import("./pages/Home"));

// Lazy loaded pages — NPS Module
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Contacts = lazy(() => import("./pages/Contacts"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const CampaignDetails = lazy(() => import("./pages/CampaignDetails"));
const Settings = lazy(() => import("./pages/Settings"));
const People = lazy(() => import("./pages/People"));
const NPSSettings = lazy(() => import("./pages/NPSSettings"));

// Lazy loaded pages — Chat Admin (keep AdminWorkspace eager for realtime)
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminAttendants = lazy(() => import("./pages/AdminAttendants"));
const AdminCSATReport = lazy(() => import("./pages/AdminCSATReport"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));

const AdminChatHistory = lazy(() => import("./pages/AdminChatHistory"));
const AdminBanners = lazy(() => import("./pages/AdminBanners"));
const AdminBroadcasts = lazy(() => import("./pages/AdminBroadcasts"));

// Lazy loaded pages — Other
const MyProfile = lazy(() => import("./pages/MyProfile"));
const Backoffice = lazy(() => import("./pages/Backoffice"));

// Help Center - lazy loaded
const HelpOverview = lazy(() => import("./pages/HelpOverview"));
const HelpArticles = lazy(() => import("./pages/HelpArticles"));
const HelpArticleEditor = lazy(() => import("./pages/HelpArticleEditor"));
const HelpCollections = lazy(() => import("./pages/HelpCollections"));
const HelpSettings = lazy(() => import("./pages/HelpSettings"));
const HelpImport = lazy(() => import("./pages/HelpImport"));
const HelpPublicHome = lazy(() => import("./pages/HelpPublicHome"));
const HelpPublicCollection = lazy(() => import("./pages/HelpPublicCollection"));
const HelpPublicArticle = lazy(() => import("./pages/HelpPublicArticle"));

const queryClient = new QueryClient();

// Helper component for dynamic campaign redirect
const CampaignRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/nps/campaigns/${id}`} replace />;
};

const SuspenseFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

// Redirect /admin/chat/:roomId → workspace (active) or history (closed)
const ChatRouteRedirect = () => {
  const { roomId } = useParams();
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => {
    if (!roomId) return;
    supabase.from("chat_rooms").select("status").eq("id", roomId).maybeSingle().then(({ data }) => {
      if (data?.status === "active" || data?.status === "waiting") {
        setTarget(`/admin/workspace/${roomId}`);
      } else {
        setTarget(`/admin/history?room=${roomId}`);
      }
    });
  }, [roomId]);
  if (target) return <Navigate to={target} replace />;
  return <SuspenseFallback />;
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/journey" element={<JourneyPage />} />
          
          {/* Chat Widget (public) */}
          <Route path="/widget" element={<ChatWidget />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/portal/:token" element={<UserPortal />} />
          
          {/* Auth & NPS Response */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/nps/:token" element={<NPSResponse />} />
          
          {/* Embedded NPS Widget */}
          <Route path="/embed" element={<NPSEmbed />} />

          {/* Public Help Center pages (with tenant slug) */}
          <Route path="/:tenantSlug/help" element={<Suspense fallback={<SuspenseFallback />}><HelpPublicHome /></Suspense>} />
          <Route path="/:tenantSlug/help/c/:collectionSlug" element={<Suspense fallback={<SuspenseFallback />}><HelpPublicCollection /></Suspense>} />
          <Route path="/:tenantSlug/help/a/:articleSlug" element={<Suspense fallback={<SuspenseFallback />}><HelpPublicArticle /></Suspense>} />
          
          {/* Public Help Center pages (without tenant slug - custom domain) */}
          <Route path="/help" element={<Suspense fallback={<SuspenseFallback />}><HelpPublicHome /></Suspense>} />
          <Route path="/help/c/:collectionSlug" element={<Suspense fallback={<SuspenseFallback />}><HelpPublicCollection /></Suspense>} />
          <Route path="/help/a/:articleSlug" element={<Suspense fallback={<SuspenseFallback />}><HelpPublicArticle /></Suspense>} />
          
          {/* Legacy routes redirect to new structure */}
          <Route path="/dashboard" element={<Navigate to="/nps/dashboard" replace />} />
          <Route path="/contacts" element={<Navigate to="/nps/contacts" replace />} />
          <Route path="/campaigns" element={<Navigate to="/nps/campaigns" replace />} />
          <Route path="/campaigns/:id" element={<CampaignRedirect />} />
          <Route path="/settings" element={<Navigate to="/nps/settings" replace />} />
          <Route path="/csms" element={<Navigate to="/nps/settings" replace />} />

          {/* Protected routes with persistent SidebarLayout */}
          <Route element={<SidebarLayout />}>
            {/* Home */}
            <Route path="/home" element={<Suspense fallback={<SuspenseFallback />}><Home /></Suspense>} />

            {/* Chat Module */}
            <Route path="/admin/dashboard" element={<Suspense fallback={<SuspenseFallback />}><AdminDashboard /></Suspense>} />
            <Route path="/admin/chat/:roomId" element={<ChatRouteRedirect />} />
            <Route path="/admin/workspace" element={<AdminWorkspace />} />
            <Route path="/admin/workspace/:roomId" element={<AdminWorkspace />} />
            <Route path="/admin/attendants" element={<Suspense fallback={<SuspenseFallback />}><AdminAttendants /></Suspense>} />
            <Route path="/admin/settings" element={<Suspense fallback={<SuspenseFallback />}><AdminSettings /></Suspense>} />
            <Route path="/admin/settings/:tab" element={<Suspense fallback={<SuspenseFallback />}><AdminSettings /></Suspense>} />
            
            <Route path="/admin/history" element={<Suspense fallback={<SuspenseFallback />}><AdminChatHistory /></Suspense>} />
            <Route path="/admin/banners" element={<Suspense fallback={<SuspenseFallback />}><AdminBanners /></Suspense>} />
            <Route path="/admin/csat" element={<Suspense fallback={<SuspenseFallback />}><AdminCSATReport /></Suspense>} />
            <Route path="/admin/broadcasts" element={<Suspense fallback={<SuspenseFallback />}><AdminBroadcasts /></Suspense>} />

            {/* NPS Module */}
            <Route path="/nps/dashboard" element={<Suspense fallback={<SuspenseFallback />}><Dashboard /></Suspense>} />
            <Route path="/nps/contacts" element={<Suspense fallback={<SuspenseFallback />}><Contacts /></Suspense>} />
            <Route path="/nps/contacts/:id" element={<Suspense fallback={<SuspenseFallback />}><Contacts /></Suspense>} />
            <Route path="/nps/people" element={<Suspense fallback={<SuspenseFallback />}><People /></Suspense>} />
            <Route path="/nps/people/:id" element={<Suspense fallback={<SuspenseFallback />}><People /></Suspense>} />
            <Route path="/nps/campaigns" element={<Suspense fallback={<SuspenseFallback />}><Campaigns /></Suspense>} />
            <Route path="/nps/campaigns/:id" element={<Suspense fallback={<SuspenseFallback />}><CampaignDetails /></Suspense>} />
            <Route path="/nps/settings" element={<Suspense fallback={<SuspenseFallback />}><Settings /></Suspense>} />
            <Route path="/nps/nps-settings" element={<Suspense fallback={<SuspenseFallback />}><NPSSettings /></Suspense>} />


            {/* Help Center Module */}
            <Route path="/help/overview" element={<Suspense fallback={<SuspenseFallback />}><HelpOverview /></Suspense>} />
            <Route path="/help/articles" element={<Suspense fallback={<SuspenseFallback />}><HelpArticles /></Suspense>} />
            <Route path="/help/articles/new" element={<Suspense fallback={<SuspenseFallback />}><HelpArticleEditor /></Suspense>} />
            <Route path="/help/articles/:id/edit" element={<Suspense fallback={<SuspenseFallback />}><HelpArticleEditor /></Suspense>} />
            <Route path="/help/collections" element={<Suspense fallback={<SuspenseFallback />}><HelpCollections /></Suspense>} />
            <Route path="/help/settings" element={<Suspense fallback={<SuspenseFallback />}><HelpSettings /></Suspense>} />
            <Route path="/help/import" element={<Suspense fallback={<SuspenseFallback />}><HelpImport /></Suspense>} />

            {/* Profile */}
            <Route path="/profile" element={<Suspense fallback={<SuspenseFallback />}><MyProfile /></Suspense>} />

            {/* Backoffice Master */}
            <Route path="/backoffice" element={<Suspense fallback={<SuspenseFallback />}><Backoffice /></Suspense>} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
