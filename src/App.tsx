import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
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
import { Toaster } from '@/components/ui/toaster';

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
          <Route path="groups" element={<Groups />} />
          <Route path="communications" element={<Communications />} />
          <Route path="call-history" element={<CallHistory />} />
          <Route path="settings" element={<Settings />} />
          <Route path="system-test" element={<SystemTest />} />
        </Route>

        {/* Catch all - redirect to dashboard or login */}
        <Route
          path="*"
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
