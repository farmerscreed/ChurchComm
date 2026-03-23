import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LoginPage } from '@/components/auth/LoginPage';
import { AppLayout } from '@/components/layout/AppLayout';
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
// ATTRACT module
import GrantDashboardPage from '@/pages/dashboard/GrantDashboardPage';
// Billing / module gating
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';
import { usePlanModules } from '@/hooks/usePlanModules';
import { Toaster } from '@/components/ui/toaster';

// ── Route guard ──────────────────────────────────────────────────────────────
// Wraps a route and shows an UpgradePrompt when the org lacks the module.

function RouteGuard({
  module,
  price,
  children,
}: {
  module: 'reach' | 'attract' | 'engage';
  price: string;
  children: React.ReactNode;
}) {
  const { hasModule } = usePlanModules();
  if (!hasModule(module)) {
    return <UpgradePrompt module={module} price={price} />;
  }
  return <>{children}</>;
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
            {false && (
              // ghost feature — EventTriggers (group_join) has no backend processor in auto-call-trigger
              <Route path="automations/triggers" element={<EventTriggers />} />
            )}
            <Route path="automations/docs" element={<AutomationDocs />} />
            <Route path="settings" element={<Settings />} />
            <Route path="system-test" element={<SystemTest />} />
            {/* REACH module — gated to 'reach' plan */}
            <Route
              path="reach/eligibility"
              element={
                <RouteGuard module="reach" price="49">
                  <EligibilityPage />
                </RouteGuard>
              }
            />
            <Route
              path="reach/preflight"
              element={
                <RouteGuard module="reach" price="49">
                  <PreflightPage />
                </RouteGuard>
              }
            />
            <Route
              path="reach/google-verification"
              element={
                <RouteGuard module="reach" price="49">
                  <GoogleVerificationPage />
                </RouteGuard>
              }
            />
            {/* ATTRACT module — gated to 'attract' plan */}
            <Route
              path="attract/grant-dashboard"
              element={
                <RouteGuard module="attract" price="199">
                  <GrantDashboardPage />
                </RouteGuard>
              }
            />
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
