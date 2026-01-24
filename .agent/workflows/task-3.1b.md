---
description: Integrate template gallery into Settings script management
epic: Epic 3 - Enhanced Script Management & AI Builder
task_id: 3.1b
---

## Context
Add a "Templates" tab in the Settings calling scripts section alongside the existing script list.

## Prerequisites
- Task 3.1a complete (ScriptTemplateGallery component exists)

## Implementation Steps

### 1. Update Settings.tsx calling scripts section

Add tabs for "My Scripts" and "Templates":

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScriptTemplateGallery } from "@/components/communications/ScriptTemplateGallery";

// In the calling scripts section:
<Tabs defaultValue="scripts" className="w-full">
  <TabsList>
    <TabsTrigger value="scripts">My Scripts</TabsTrigger>
    <TabsTrigger value="templates">Templates</TabsTrigger>
  </TabsList>
  
  <TabsContent value="scripts">
    {/* Existing script list */}
    <div className="space-y-4">
      {scripts.filter(s => !s.is_system).map(script => (
        <ScriptCard 
          key={script.id} 
          script={script} 
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  </TabsContent>
  
  <TabsContent value="templates">
    <ScriptTemplateGallery onClone={() => {
      // Switch to scripts tab and refresh
      setActiveTab("scripts");
      refetchScripts();
    }} />
  </TabsContent>
</Tabs>
```

### 2. Update script query to filter out system templates

```tsx
const fetchScripts = async () => {
  const { data, error } = await supabase
    .from("call_scripts")
    .select("*")
    .eq("organization_id", currentOrganization?.id)
    .order("created_at", { ascending: false });
    
  // Filter out system templates from org scripts
  if (data) {
    setScripts(data.filter(s => !s.is_system));
  }
};
```

### 3. Mark templates as read-only in UI

Templates should not have edit/delete buttons:

```tsx
const ScriptCard = ({ script, onEdit, onDelete }) => (
  <Card>
    <CardHeader>
      <div className="flex justify-between items-center">
        <CardTitle>{script.name}</CardTitle>
        {!script.is_system && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(script)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(script)}>
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </CardHeader>
  </Card>
);
```

### 4. Show distinction between templates and custom scripts

Add a badge or icon to indicate script origin:

```tsx
{script.template_type && !script.is_system && (
  <Badge variant="outline" className="ml-2">
    From template
  </Badge>
)}
```

## Verification
1. Navigate to Settings → Calling Scripts
2. See "My Scripts" and "Templates" tabs
3. Templates tab shows all 6 system templates
4. Click "Use Template" clones to My Scripts
5. Cloned scripts are editable
6. System templates have no edit/delete buttons

## On Completion
Update `activity.md` and mark task 3.1b as `[x]` in `implementation-order.md`
