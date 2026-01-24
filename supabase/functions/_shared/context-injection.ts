/**
 * Context injection utility for AI calls
 * Retrieves and formats member/church context for VAPI prompt enhancement
 */

import { createEmbedding } from "./embeddings.ts";

export interface InjectedContext {
    memberContext: string;
    churchContext: string;
    preferences: string;
}

interface MemoryRecord {
    id: string;
    content: string;
    memory_type: string;
    similarity?: number;
    created_at: string;
}

interface ChurchMemoryRecord {
    id: string;
    content: string;
    metadata: Record<string, unknown>;
    similarity: number;
    organization_id: string;
}

/**
 * Retrieve relevant context for a call
 */
export async function getCallContext(
    supabase: any,
    personId: string,
    organizationId: string
): Promise<InjectedContext> {
    try {
        // Generate embedding for a generic context query
        const queryText = "recent conversations, prayer requests, and personal information";
        const queryEmbedding = await createEmbedding(queryText);

        // 1. Get relevant member memories via vector search
        const { data: memberMemories, error: memberError } = await supabase.rpc("match_member_memories", {
            p_person_id: personId,
            query_embedding: queryEmbedding,
            match_threshold: 0.5,
            match_count: 5,
        });

        if (memberError) {
            console.error("Error fetching member memories:", memberError);
        }

        // 2. Get recent member memories (recency-based, no embedding needed)
        const { data: recentMemories, error: recentError } = await supabase.rpc("get_recent_member_memories", {
            p_person_id: personId,
            p_limit: 3,
        });

        if (recentError) {
            console.error("Error fetching recent memories:", recentError);
        }

        // 3. Get church context (1536-dim embedding for church_memories)
        let churchMemories: ChurchMemoryRecord[] = [];
        try {
            const { createEmbedding1536 } = await import("./embeddings.ts");
            const churchQueryEmbedding = await createEmbedding1536(queryText);

            const { data: churchData, error: churchError } = await supabase.rpc("match_church_memories", {
                query_embedding: churchQueryEmbedding,
                match_threshold: 0.5,
                match_count: 5,
                p_organization_id: organizationId,
            });

            if (churchError) {
                console.error("Error fetching church memories:", churchError);
            } else {
                churchMemories = churchData || [];
            }
        } catch (err) {
            console.error("Error with church context:", err);
        }

        // Format contexts
        const memberContext = formatMemberContext(memberMemories || [], recentMemories || []);
        const churchContext = formatChurchContext(churchMemories);
        const preferences = extractPreferences(memberMemories || []);

        return {
            memberContext,
            churchContext,
            preferences,
        };
    } catch (error) {
        console.error("Error getting call context:", error);
        return {
            memberContext: "",
            churchContext: "",
            preferences: "",
        };
    }
}

function formatMemberContext(vectorMemories: MemoryRecord[], recentMemories: MemoryRecord[]): string {
    const allMemories = [...(vectorMemories || []), ...(recentMemories || [])];

    // Deduplicate by ID
    const unique = allMemories.filter((m, i, arr) =>
        arr.findIndex(x => x.id === m.id) === i
    );

    if (unique.length === 0) return "";

    const items = unique.slice(0, 5).map(m => {
        const type = m.memory_type === "call_summary" ? "Previous call" :
            m.memory_type === "prayer_request" ? "Prayer request" :
                m.memory_type === "personal_note" ? "Note" : "Info";
        return `- ${type}: ${m.content}`;
    });

    return items.join("\n");
}

function formatChurchContext(memories: ChurchMemoryRecord[]): string {
    if (!memories?.length) return "";

    const items = memories.slice(0, 5).map(m => {
        const category = (m.metadata?.category as string) || "general";
        return `- ${category}: ${m.content}`;
    });

    return items.join("\n");
}

function extractPreferences(memories: MemoryRecord[]): string {
    const prefs = (memories || []).filter(m => m.memory_type === "preference");
    if (prefs.length === 0) return "";

    return prefs.map(p => `- ${p.content}`).join("\n");
}

/**
 * Build an enhanced prompt with injected context
 */
export async function buildEnhancedPrompt(
    basePrompt: string,
    supabase: any,
    personId: string,
    organizationId: string
): Promise<string> {
    const context = await getCallContext(supabase, personId, organizationId);

    let enhancedPrompt = basePrompt;

    if (context.memberContext) {
        enhancedPrompt += `\n\n## Previous Conversations with This Person:\n${context.memberContext}`;
    }

    if (context.churchContext) {
        enhancedPrompt += `\n\n## Current Church Context:\n${context.churchContext}`;
    }

    if (context.preferences) {
        enhancedPrompt += `\n\n## Known Preferences:\n${context.preferences}`;
    }

    // Add guidance for using context
    if (context.memberContext || context.churchContext) {
        enhancedPrompt += `\n\n## Context Usage Guidelines:
- Reference previous conversations naturally when relevant
- If there's an upcoming church event, consider mentioning it
- Remember any prayer requests they've shared
- Do not explicitly say "I see from our records..." - weave context naturally like a caring friend would`;
    }

    // Ensure we don't exceed limits
    const MAX_PROMPT_LENGTH = 8000;
    if (enhancedPrompt.length > MAX_PROMPT_LENGTH) {
        enhancedPrompt = enhancedPrompt.slice(0, MAX_PROMPT_LENGTH) + "...";
    }

    return enhancedPrompt;
}
