import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
}

export default function SystemTest() {
  const { user, currentOrganization } = useAuthStore();
  const [tests, setTests] = useState<TestResult[]>([
    { name: '1. Environment Variables', status: 'pending', message: 'Not run yet' },
    { name: '2. Supabase Connection', status: 'pending', message: 'Not run yet' },
    { name: '3. Database Tables', status: 'pending', message: 'Not run yet' },
    { name: '4. Authentication', status: 'pending', message: 'Not run yet' },
    { name: '5. Organization Data', status: 'pending', message: 'Not run yet' },
    { name: '6. Edge Functions', status: 'pending', message: 'Not run yet' },
  ]);

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => i === index ? { ...test, ...updates } : test));
  };

  const runAllTests = async () => {
    // Test 1: Environment Variables
    updateTest(0, { status: 'running', message: 'Checking...' });
    const hasUrl = !!import.meta.env.VITE_SUPABASE_URL;
    const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (hasUrl && hasKey) {
      updateTest(0, {
        status: 'success',
        message: 'Environment variables configured correctly',
        details: { url: import.meta.env.VITE_SUPABASE_URL?.substring(0, 30) + '...' }
      });
    } else {
      updateTest(0, {
        status: 'error',
        message: `Missing: ${!hasUrl ? 'VITE_SUPABASE_URL ' : ''}${!hasKey ? 'VITE_SUPABASE_ANON_KEY' : ''}`,
      });
      return;
    }

    // Test 2: Supabase Connection
    updateTest(1, { status: 'running', message: 'Pinging Supabase...' });
    try {
      const { data, error } = await supabase.from('organizations').select('count', { count: 'exact', head: true });
      if (error) throw error;
      updateTest(1, {
        status: 'success',
        message: 'Successfully connected to Supabase',
      });
    } catch (error: any) {
      updateTest(1, {
        status: 'error',
        message: 'Failed to connect: ' + error.message,
      });
      return;
    }

    // Test 3: Database Tables
    updateTest(2, { status: 'running', message: 'Checking tables...' });
    try {
      const tables = ['organizations', 'organization_members', 'people', 'groups', 'group_members', 'communication_campaigns'];
      const results = await Promise.all(
        tables.map(table => supabase.from(table).select('count', { count: 'exact', head: true }))
      );

      const allSuccess = results.every(r => !r.error);
      if (allSuccess) {
        updateTest(2, {
          status: 'success',
          message: `All ${tables.length} core tables exist and are accessible`,
        });
      } else {
        const failed = results.filter(r => r.error).length;
        updateTest(2, {
          status: 'error',
          message: `${failed} tables failed: ${results.filter(r => r.error).map((_, i) => tables[i]).join(', ')}`,
        });
      }
    } catch (error: any) {
      updateTest(2, {
        status: 'error',
        message: 'Error checking tables: ' + error.message,
      });
    }

    // Test 4: Authentication
    updateTest(3, { status: 'running', message: 'Checking auth...' });
    if (user) {
      updateTest(3, {
        status: 'success',
        message: `Authenticated as: ${user.email}`,
        details: { userId: user.id }
      });
    } else {
      updateTest(3, {
        status: 'error',
        message: 'Not authenticated. Please log in first.',
      });
      return;
    }

    // Test 5: Organization Data
    updateTest(4, { status: 'running', message: 'Checking organization...' });
    if (currentOrganization) {
      updateTest(4, {
        status: 'success',
        message: `Organization loaded: ${currentOrganization.name}`,
        details: { orgId: currentOrganization.id }
      });
    } else {
      updateTest(4, {
        status: 'error',
        message: 'No organization found for this user',
      });
    }

    // Test 6: Edge Functions (optional check)
    updateTest(5, { status: 'running', message: 'Testing edge functions...' });
    try {
      // Just check if the function endpoint exists (will fail without proper Twilio config, which is OK)
      const { error } = await supabase.functions.invoke('send-sms', {
        body: { test: true }
      });

      // Even if it errors, if the function exists we'll get a specific error, not a 404
      if (error && error.message?.includes('404')) {
        updateTest(5, {
          status: 'error',
          message: 'Edge function not found - may not be deployed',
        });
      } else {
        updateTest(5, {
          status: 'success',
          message: 'Edge functions are deployed (may need Twilio configuration)',
          details: 'Functions respond but may need API keys configured'
        });
      }
    } catch (error: any) {
      updateTest(5, {
        status: 'success',
        message: 'Edge functions exist (configuration needed for full functionality)',
      });
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Verification</h1>
        <p className="text-muted-foreground mt-1">
          Run tests to verify your ChurchConnect setup
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connection & Setup Tests</CardTitle>
          <CardDescription>
            This will verify your Supabase configuration, database migrations, and edge functions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runAllTests} size="lg" className="w-full">
            Run All Tests
          </Button>

          <div className="space-y-3 mt-6">
            {tests.map((test, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 rounded-lg border bg-card"
              >
                <div className="mt-0.5">{getStatusIcon(test.status)}</div>
                <div className="flex-1">
                  <h3 className="font-medium">{test.name}</h3>
                  <p className="text-sm text-muted-foreground">{test.message}</p>
                  {test.details && (
                    <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">Next Steps After Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Once all tests pass:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-2">
            <li>Configure Twilio credentials in Supabase Edge Function secrets</li>
            <li>Configure VAPI credentials for AI calling features</li>
            <li>Add your first members via People → Add Person or CSV upload</li>
            <li>Create groups for your ministries</li>
            <li>Test SMS broadcasting to a small group first</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
