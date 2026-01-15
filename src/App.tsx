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
        {/* Public route - login */}
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={user ? <AppLayout /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
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
