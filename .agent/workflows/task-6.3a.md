---
description: Create admin UI for church-level memories
epic: Epic 6 - AI & Memory Enhancements
task_id: 6.3a
---

## Context
Allow admins to manage church-wide context (events, announcements, etc.) that the AI can reference.

## Prerequisites
- church_memories table exists (from original codebase)

## Implementation Steps

### 1. Create ChurchContextManager component

Create `src/components/settings/ChurchContextManager.tsx`:

```tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, Calendar, Bell, BookOpen, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";

const MEMORY_CATEGORIES = [
  { value: "event", label: "Upcoming Event", icon: Calendar },
  { value: "announcement", label: "Announcement", icon: Bell },
  { value: "sermon_series", label: "Sermon Series", icon: BookOpen },
  { value: "pastoral_note", label: "Pastoral Note", icon: Heart },
];

interface ChurchMemory {
  id: string;
  content: string;
  category: string;
  metadata: any;
  created_at: string;
}

export function ChurchContextManager() {
  const [memories, setMemories] = useState<ChurchMemory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState("event");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { currentOrganization } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    fetchMemories();
  }, [currentOrganization]);

  const fetchMemories = async () => {
    const { data } = await supabase
      .from("church_memories")
      .select("*")
      .eq("organization_id", currentOrganization?.id)
      .order("created_at", { ascending: false });
    
    setMemories(data || []);
  };

  const handleSave = async () => {
    if (!content.trim()) {
      toast({ title: "Please enter content", variant: "destructive" });
      return;
    }

    setLoading(true);

    // Generate embedding via edge function
    const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke(
      "generate-embedding",
      { body: { text: content } }
    );

    if (embeddingError) {
      toast({ title: "Failed to generate embedding", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (editingId) {
      // Update existing
      await supabase
        .from("church_memories")
        .update({
          content,
          metadata: { category },
          embedding: embeddingData.embedding,
        })
        .eq("id", editingId);
    } else {
      // Create new
      await supabase.from("church_memories").insert({
        organization_id: currentOrganization?.id,
        content,
        metadata: { category },
        embedding: embeddingData.embedding,
      });
    }

    toast({ title: editingId ? "Memory updated" : "Memory added" });
    setContent("");
    setCategory("event");
    setEditingId(null);
    setShowForm(false);
    setLoading(false);
    fetchMemories();
  };

  const handleEdit = (memory: ChurchMemory) => {
    setEditingId(memory.id);
    setContent(memory.content);
    setCategory(memory.metadata?.category || "event");
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("church_memories").delete().eq("id", id);
    toast({ title: "Memory deleted" });
    fetchMemories();
  };

  const getCategoryIcon = (cat: string) => {
    const found = MEMORY_CATEGORIES.find(c => c.value === cat);
    const Icon = found?.icon || Bell;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Church Context</h3>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Context
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Add information for the AI to reference during calls (upcoming events, announcements, etc.)
      </p>

      {showForm && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMORY_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea
                placeholder="E.g., 'Our annual Christmas service is on December 24th at 6pm and 8pm'"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={loading}>
                {loading ? "Saving..." : editingId ? "Update" : "Add"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setContent("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {memories.map((memory) => (
          <Card key={memory.id}>
            <CardContent className="py-3 flex items-start justify-between">
              <div className="flex items-start gap-3">
                {getCategoryIcon(memory.metadata?.category)}
                <div>
                  <p className="text-sm">{memory.content}</p>
                  <Badge variant="secondary" className="mt-1">
                    {MEMORY_CATEGORIES.find(c => c.value === memory.metadata?.category)?.label || "General"}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(memory)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(memory.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### 2. Create generate-embedding edge function

Create `supabase/functions/generate-embedding/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createEmbedding } from "../_shared/embeddings.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { text } = await req.json();
  const embedding = await createEmbedding(text);

  return new Response(JSON.stringify({ embedding }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

### 3. Add to Settings page

```tsx
import { ChurchContextManager } from "@/components/settings/ChurchContextManager";

// Add a new tab or section
<TabsContent value="context">
  <ChurchContextManager />
</TabsContent>
```

## Verification
1. Navigate to Settings → Church Context
2. Add a new context item
3. Verify it saves with embedding
4. Edit and delete items

## On Completion
Update `activity.md` and mark task 6.3a as `[x]`
