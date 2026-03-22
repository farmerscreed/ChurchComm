import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LoginPage } from '@/components/auth/LoginPage';
import { AppLayout } from '@/components/layout/AppLayout';
import { ModuleGate } from '@/components/ModuleGate';
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
// REACH pages (lazy loaded)
const ReachDashboard = lazy(() => import('@/pages/ReachDashboard'));
const EligibilityPage = lazy(() => import('@/pages/reach/EligibilityPage'));
const PreflightPage = lazy(() => import('@/pages/reach/PreflightPage'));
const ApplicationPage = lazy(() => import('@/pages/reach/ApplicationPage'));
const StatusPage = lazy(() => import('@/pages/reach/StatusPage'));
// ATTRACT pages (lazy loaded)
const AttractDashboard = lazy(() => import('@/pages/AttractDashboard'));
const ConnectPage = lazy(() => import('@/pages/attract/ConnectPage'));

import { Toaster } from '@/components/ui/toaster';

function LazyLoad({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      {children}
    </Suspense>
  );
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

          {/* Public eligibility check — no auth required */}
          <Route path="/eligibility-check" element={
            <LazyLoad><EligibilityPage /></LazyLoad>
          } />

          {/* Onboarding route */}
          <Route
            path="/onboarding"
            element={user ? <OnboardingPage /> : <Navigate to="/login" replace />}
          />

          {/* Landing page */}
          <Route
            path="/"
            element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />}
          />

          {/* Protected routes */}
          <Route element={user ? <AppLayout /> : <Navigate to="/login" replace />}>
            <Route path="dashboard" element={<Dashboard />} />

            {/* ENGAGE module routes (accessible during trial or with engage module) */}
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

            {/* REACH module routes */}
            <Route path="reach" element={
              <ModuleGate module="reach"><LazyLoad><ReachDashboard /></LazyLoad></ModuleGate>
            } />
            <Route path="reach/eligibility" element={
              <ModuleGate module="reach"><LazyLoad><EligibilityPage /></LazyLoad></ModuleGate>
            } />
            <Route path="reach/preflight" element={
              <ModuleGate module="reach"><LazyLoad><PreflightPage /></LazyLoad></ModuleGate>
            } />
            <Route path="reach/apply" element={
              <ModuleGate module="reach"><LazyLoad><ApplicationPage /></LazyLoad></ModuleGate>
            } />
            <Route path="reach/status" element={
              <ModuleGate module="reach"><LazyLoad><StatusPage /></LazyLoad></ModuleGate>
            } />

            {/* ATTRACT module routes */}
            <Route path="attract" element={
              <ModuleGate module="attract"><LazyLoad><AttractDashboard /></LazyLoad></ModuleGate>
            } />
            <Route path="attract/connect" element={
              <ModuleGate module="attract"><LazyLoad><ConnectPage /></LazyLoad></ModuleGate>
            } />

            <Route path="settings" element={<Settings />} />
            <Route path="system-test" element={<SystemTest />} />
          </Route>

          {/* Catch all */}
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
