import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure your organization settings and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Organization Settings
          </CardTitle>
          <CardDescription>
            This feature is coming soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Settings functionality will be available here. You'll be able to configure organization details, user permissions, integrations, and more.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
