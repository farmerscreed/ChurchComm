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
import StatusPage from '@/pages/reach/StatusPage';
import ApplicationPage from '@/pages/reach/ApplicationPage';
// ATTRACT module
import GrantDashboardPage from '@/pages/dashboard/GrantDashboardPage';
import ConnectPage from '@/pages/attract/ConnectPage';
// Billing / module gating
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';
import { TrialExpiredPrompt } from '@/components/billing/TrialExpiredPrompt';
import { usePlanModules } from '@/hooks/usePlanModules';
import { Toaster } from '@/components/ui/toaster';

// ── Route guard ──────────────────────────────────────────────────────────────
// Wraps a route and shows an UpgradePrompt or TrialExpiredPrompt when the org
// lacks the module or the trial has expired.
//
// For /reach/* routes:
//   Allow if plan_modules includes 'reach' OR reach trial is still active.
//   If trial expired: show TrialExpiredPrompt.
//   If no trial and no plan: show UpgradePrompt.
//
// For /attract/* routes:
//   Allow if plan_modules includes 'attract' OR attract trial is still active.
//   Same expiry/no-trial logic.

function RouteGuard({
  module,
  price,
  children,
}: {
  module: 'reach' | 'attract' | 'engage';
  price: string;
  children: React.ReactNode;
}) {
  const {
    hasModule,
    reachTrialExpired,
    attractTrialExpired,
  } = usePlanModules();

  // hasModule already returns true when an active trial is present
  if (hasModule(module)) {
    return <>{children}</>;
  }

  // Trial has expired — show the trial-expired prompt for reach/attract
  if (module === 'reach' && reachTrialExpired) {
    return <TrialExpiredPrompt module="reach" price={price} />;
  }
  if (module === 'attract' && attractTrialExpired) {
    return <TrialExpiredPrompt module="attract" price={price} />;
  }

  // No trial and no paid plan — show standard upgrade prompt
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
            <Route
              path="reach/status"
              element={
                <RouteGuard module="reach" price="49">
                  <StatusPage />
                </RouteGuard>
              }
            />
            <Route
              path="reach/apply"
              element={
                <RouteGuard module="reach" price="49">
                  <ApplicationPage />
                </RouteGuard>
              }
            />
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
