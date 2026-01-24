import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit2, Calendar, Bell, BookOpen, Heart, Brain, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";

const MEMORY_CATEGORIES = [
    { value: "event", label: "Upcoming Event", icon: Calendar, color: "bg-blue-100 text-blue-800" },
    { value: "announcement", label: "Announcement", icon: Bell, color: "bg-yellow-100 text-yellow-800" },
    { value: "sermon_series", label: "Sermon Series", icon: BookOpen, color: "bg-purple-100 text-purple-800" },
    { value: "pastoral_note", label: "Pastoral Note", icon: Heart, color: "bg-pink-100 text-pink-800" },
];

interface ChurchMemory {
    id: string;
    content: string;
    metadata: { category?: string };
    created_at: string;
}

export function ChurchContextManager() {
    const [memories, setMemories] = useState<ChurchMemory[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [category, setCategory] = useState("event");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingMemories, setLoadingMemories] = useState(true);

    const { currentOrganization } = useAuthStore();
    const { toast } = useToast();

    useEffect(() => {
        if (currentOrganization?.id) {
            fetchMemories();
        }
    }, [currentOrganization]);

    const fetchMemories = async () => {
        if (!currentOrganization?.id) return;

        setLoadingMemories(true);
        const { data, error } = await supabase
            .from("church_memories")
            .select("*")
            .eq("organization_id", currentOrganization.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching church memories:", error);
        } else {
            setMemories((data as ChurchMemory[]) || []);
        }
        setLoadingMemories(false);
    };

    const handleSave = async () => {
        if (!content.trim()) {
            toast({ title: "Please enter content", variant: "destructive" });
            return;
        }

        if (!currentOrganization?.id) {
            toast({ title: "No organization selected", variant: "destructive" });
            return;
        }

        setLoading(true);

        try {
            // Generate embedding via edge function
            const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke(
                "generate-embedding",
                { body: { text: content } }
            );

            if (embeddingError) {
                throw new Error("Failed to generate embedding: " + embeddingError.message);
            }

            if (editingId) {
                // Update existing
                const { error } = await supabase
                    .from("church_memories")
                    .update({
                        content,
                        metadata: { category },
                        embedding: embeddingData.embedding,
                    })
                    .eq("id", editingId);

                if (error) throw error;
                toast({ title: "Context updated successfully" });
            } else {
                // Create new
                const { error } = await supabase.from("church_memories").insert({
                    organization_id: currentOrganization.id,
                    content,
                    metadata: { category },
                    embedding: embeddingData.embedding,
                });

                if (error) throw error;
                toast({ title: "Context added successfully" });
            }

            setContent("");
            setCategory("event");
            setEditingId(null);
            setShowForm(false);
            fetchMemories();
        } catch (error: any) {
            console.error("Error saving church memory:", error);
            toast({
                title: "Error saving context",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (memory: ChurchMemory) => {
        setEditingId(memory.id);
        setContent(memory.content);
        setCategory(memory.metadata?.category || "event");
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this context?")) return;

        const { error } = await supabase.from("church_memories").delete().eq("id", id);

        if (error) {
            toast({ title: "Error deleting context", variant: "destructive" });
        } else {
            toast({ title: "Context deleted" });
            fetchMemories();
        }
    };

    const getCategoryConfig = (cat?: string) => {
        return MEMORY_CATEGORIES.find(c => c.value === cat) || MEMORY_CATEGORIES[0];
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingId(null);
        setContent("");
        setCategory("event");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                    <h3 className="text-lg font-medium flex items-center gap-2">
                        <Brain className="h-5 w-5" />
                        Church Context
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Add information for the AI to reference during calls (upcoming events, announcements, etc.)
                    </p>
                </div>
                {!showForm && (
                    <Button onClick={() => setShowForm(true)} size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Context
                    </Button>
                )}
            </div>

            {showForm && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                            {editingId ? "Edit Context" : "Add New Context"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-2 block">Category</label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MEMORY_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                            <div className="flex items-center gap-2">
                                                <cat.icon className="h-4 w-4" />
                                                {cat.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-2 block">Content</label>
                            <Textarea
                                placeholder="E.g., 'Our annual Christmas service is on December 24th at 6pm and 8pm. All are welcome!'"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={3}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                This will be used by the AI during calls when relevant to the conversation.
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleSave} disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    editingId ? "Update" : "Add"
                                )}
                            </Button>
                            <Button variant="outline" onClick={handleCancel}>
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {loadingMemories ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : memories.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center">
                        <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No church context added yet.</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Add events, announcements, or other info for the AI to reference.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {memories.map((memory) => {
                        const categoryConfig = getCategoryConfig(memory.metadata?.category);
                        const CategoryIcon = categoryConfig.icon;

                        return (
                            <Card key={memory.id} className="hover:shadow-sm transition-shadow">
                                <CardContent className="py-4 flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className={`p-2 rounded-lg ${categoryConfig.color}`}>
                                            <CategoryIcon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm break-words">{memory.content}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge variant="secondary" className="text-xs">
                                                    {categoryConfig.label}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(memory.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(memory)}>
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(memory.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
