import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PeopleDirectory } from '@/components/people/PeopleDirectory';
import { CSVUpload } from '@/components/people/CSVUpload';
import { Users, Upload } from 'lucide-react';

export default function People() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadComplete = () => {
    // Force refresh of the people directory
    setRefreshKey(prev => prev + 1);
  };

  const handleDirectoryRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">People Directory</h1>
        <p className="text-muted-foreground mt-2">
          Manage your church members, visitors, and prospects all in one place.
        </p>
      </div>

      <Tabs defaultValue="directory" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="directory" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Directory
          </TabsTrigger>
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Bulk Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="mt-6">
          <PeopleDirectory key={refreshKey} onRefresh={handleDirectoryRefresh} />
        </TabsContent>

        <TabsContent value="import" className="mt-6">
          <div className="max-w-3xl mx-auto">
            <CSVUpload onUploadComplete={handleUploadComplete} />

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Import Tips</CardTitle>
                <CardDescription>
                  Follow these guidelines for a successful import
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Required Fields</h4>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">first_name</code> - Person's first name</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">last_name</code> - Person's last name</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Optional Fields</h4>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">email</code> - Email address</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">phone_number</code> - Phone number</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">address</code> - Street address</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">city</code> - City</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">state</code> - State</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">zip_code</code> - ZIP code</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">date_of_birth</code> - Birthday (YYYY-MM-DD format)</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">notes</code> - Additional notes</li>
                    <li><code className="text-xs bg-muted px-1 py-0.5 rounded">groups</code> - Comma-separated group names</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Important Notes</h4>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Column headers are case-insensitive and spaces will be converted to underscores</li>
                    <li>Email addresses will be validated for proper format</li>
                    <li>All people imported will be marked as "First Time Visitor" by default</li>
                    <li>You can update their status individually after import</li>
                    <li>Groups must already exist in your system to be linked</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
