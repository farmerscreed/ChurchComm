import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LoginPage } from '@/components/auth/LoginPage';
import { AppLayout } from '@/components/layout/AppLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import Dashboard from '@/pages/Dashboard';
import People from '@/pages/People';
import Groups from '@/pages/Groups';
import Communications from '@/pages/Communications';
import CallHistory from '@/pages/CallHistory';
import Settings from '@/pages/Settings';
import SystemTest from '@/pages/SystemTest';
import AcceptInvite from '@/pages/AcceptInvite';
import OnboardingPage from '@/pages/OnboardingPage';
import PricingPage from '@/pages/PricingPage';
import LandingPage from '@/pages/LandingPage';
import DemoPage from '@/pages/DemoPage';
import CheckEligibilityPage from '@/pages/CheckEligibilityPage';
import PrivacyPage from '@/pages/PrivacyPage';
import TermsPage from '@/pages/TermsPage';
// Automations pages
import AutomationsOverview from '@/pages/automations/AutomationsOverview';
import BirthdayAutomations from '@/pages/automations/BirthdayAutomations';
import ScheduledOutreach from '@/pages/automations/ScheduledOutreach';
import EventTriggers from '@/pages/automations/EventTriggers';
import AutomationDocs from '@/pages/automations/AutomationDocs';
import PeopleDocs from '@/pages/PeopleDocs';
import CommunicationsDocs from '@/pages/CommunicationsDocs';
// REACH module
import EligibilityPage from '@/pages/reach/EligibilityPage';
import PreflightPage from '@/pages/reach/PreflightPage';
import GoogleVerificationPage from '@/pages/reach/GoogleVerificationPage';
import StatusPage from '@/pages/reach/StatusPage';
import ApplicationPage from '@/pages/reach/ApplicationPage';
// ATTRACT module
import GrantDashboardPage from '@/pages/dashboard/GrantDashboardPage';
import ConnectPage from '@/pages/attract/ConnectPage';
import OAuthCallbackPage from '@/pages/attract/OAuthCallbackPage';
import AdPilotPage from '@/pages/attract/AdPilotPage';
import AdPilotPreviewPage from '@/pages/attract/AdPilotPreviewPage';
import AdPilotCampaignDetailPage from '@/pages/attract/AdPilotCampaignDetailPage';
// Admin pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import LeadPipeline from '@/pages/admin/LeadPipeline';
import CustomerManagement from '@/pages/admin/CustomerManagement';
import CommunicationLog from '@/pages/admin/CommunicationLog';
// Billing / module gating
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';
import { TrialExpiredPrompt } from '@/components/billing/TrialExpiredPrompt';
import { usePlanModules } from '@/hooks/usePlanModules';
import { Toaster } from '@/components/ui/toaster';

// ── Route guard ──────────────────────────────────────────────────────────────
// Wraps a route and shows an UpgradePrompt or TrialExpiredPrompt when the org
// lacks the module or the trial has expired.
// REACH is free — no RouteGuard needed for /reach/* routes.

function RouteGuard({
  module,
  price,
  children,
}: {
  module: 'attract' | 'engage';
  price: string;
  children: React.ReactNode;
}) {
  const {
    hasModule,
    attractTrialExpired,
  } = usePlanModules();

  if (hasModule(module)) {
    return <>{children}</>;
  }

  if (module === 'attract' && attractTrialExpired) {
    return <TrialExpiredPrompt module="attract" price={price} />;
  }

  return <UpgradePrompt module={module} price={price} />;
}


function App() {
  const { fetchSession, user, loading } = useAuthStore();

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
          />
          <Route
            path="/invite/:token"
            element={user ? <Navigate to="/dashboard" replace /> : <AcceptInvite />}
          />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/check" element={<CheckEligibilityPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />

          {/* Onboarding route (authenticated but outside AppLayout) */}
          <Route
            path="/onboarding"
            element={user ? <OnboardingPage /> : <Navigate to="/login" replace />}
          />

          {/* Landing page - public */}
          <Route
            path="/"
            element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />}
          />

          {/* Protected routes */}
          <Route element={user ? <AppLayout /> : <Navigate to="/login" replace />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="people" element={<People />} />
            <Route path="people/docs" element={<PeopleDocs />} />
            <Route path="groups" element={<Groups />} />
            <Route path="communications" element={<Communications />} />
            <Route path="communications/docs" element={<CommunicationsDocs />} />
            <Route path="call-history" element={<CallHistory />} />
            {/* Automations routes */}
            <Route path="automations" element={<AutomationsOverview />} />
            <Route path="automations/birthdays" element={<BirthdayAutomations />} />
            <Route path="automations/scheduled" element={<ScheduledOutreach />} />
            <Route path="automations/triggers" element={<EventTriggers />} />
            <Route path="automations/docs" element={<AutomationDocs />} />
            <Route path="settings" element={<Settings />} />
            <Route path="system-test" element={<SystemTest />} />
            {/* REACH module — free for all authenticated users */}
            <Route path="reach/eligibility" element={<EligibilityPage />} />
            <Route path="reach/preflight" element={<PreflightPage />} />
            <Route path="reach/google-verification" element={<GoogleVerificationPage />} />
            <Route path="reach/status" element={<StatusPage />} />
            <Route path="reach/apply" element={<ApplicationPage />} />
            {/* ATTRACT module — gated to 'attract' plan */}
            <Route
              path="attract/connect"
              element={
                <RouteGuard module="attract" price="199">
                  <ConnectPage />
                </RouteGuard>
              }
            />
            <Route
              path="attract/grant-dashboard"
              element={
                <RouteGuard module="attract" price="199">
                  <GrantDashboardPage />
                </RouteGuard>
              }
            />
            {/* ATTRACT AdPilot routes */}
            <Route
              path="attract/adpilot"
              element={
                <RouteGuard module="attract" price="199">
                  <AdPilotPage />
                </RouteGuard>
              }
            />
            <Route
              path="attract/adpilot/preview"
              element={
                <RouteGuard module="attract" price="199">
                  <AdPilotPreviewPage />
                </RouteGuard>
              }
            />
            <Route
              path="attract/adpilot/:id"
              element={
                <RouteGuard module="attract" price="199">
                  <AdPilotCampaignDetailPage />
                </RouteGuard>
              }
            />
            {/* ATTRACT OAuth callback */}
            <Route path="attract/oauth-callback" element={<OAuthCallbackPage />} />
          </Route>

          {/* Admin routes — standalone layout, separate from church app */}
          <Route element={user ? <AdminLayout /> : <Navigate to="/login" replace />}>
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/leads" element={<LeadPipeline />} />
            <Route path="admin/customers" element={<CustomerManagement />} />
            <Route path="admin/communications" element={<CommunicationLog />} />
          </Route>

          {/* Catch all - redirect to dashboard or login */}
          <Route
            path="*"
            element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
