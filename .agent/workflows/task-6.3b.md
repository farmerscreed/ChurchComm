---
description: Inject member and church context into VAPI calls
epic: Epic 6 - AI & Memory Enhancements
task_id: 6.3b
---

## Context
Before making a call, retrieve relevant memories and inject them into the AI prompt.

## Prerequisites
- Tasks 6.1, 6.2, 6.3a complete

## Implementation Steps

### 1. Create context retrieval utility

Create `supabase/functions/_shared/context-injection.ts`:

```typescript
import { createEmbedding } from "./embeddings.ts";

export interface InjectedContext {
  memberContext: string;
  churchContext: string;
  preferences: string;
}

export async function getCallContext(
  supabase: any,
  personId: string,
  organizationId: string
): Promise<InjectedContext> {
  // Generate embedding for the query
  const queryText = "recent conversations and personal information";
  const queryEmbedding = await createEmbedding(queryText);

  // 1. Get relevant member memories (vector search)
  const { data: memberMemories } = await supabase.rpc("match_member_memories", {
    p_person_id: personId,
    p_query_embedding: queryEmbedding,
    p_match_threshold: 0.5,
    p_match_count: 5,
  });

  // 2. Get recent member memories (recency-based)
  const { data: recentMemories } = await supabase.rpc("get_recent_member_memories", {
    p_person_id: personId,
    p_limit: 3,
  });

  // 3. Get church context
  const { data: churchMemories } = await supabase.rpc("match_memories", {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: 5,
  });

  // Filter church memories by org
  const orgChurchMemories = (churchMemories || []).filter(
    (m: any) => m.organization_id === organizationId
  );

  // Format contexts
  const memberContext = formatMemberContext(memberMemories, recentMemories);
  const churchContext = formatChurchContext(orgChurchMemories);
  const preferences = extractPreferences(memberMemories);

  return {
    memberContext,
    churchContext,
    preferences,
  };
}

function formatMemberContext(vectorMemories: any[], recentMemories: any[]): string {
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

function formatChurchContext(memories: any[]): string {
  if (!memories?.length) return "";

  const items = memories.slice(0, 5).map(m => {
    const category = m.metadata?.category || "general";
    return `- ${category}: ${m.content}`;
  });

  return items.join("\n");
}

function extractPreferences(memories: any[]): string {
  const prefs = (memories || []).filter(m => m.memory_type === "preference");
  if (prefs.length === 0) return "";
  
  return prefs.map(p => `- ${p.content}`).join("\n");
}
```

### 2. Update send-group-call with context injection

```typescript
import { getCallContext, InjectedContext } from "../_shared/context-injection.ts";

// Before making the VAPI call:
async function buildEnhancedPrompt(
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

  // Ensure we don't exceed limits
  const MAX_PROMPT_LENGTH = 8000; // Leave room for conversation
  if (enhancedPrompt.length > MAX_PROMPT_LENGTH) {
    enhancedPrompt = enhancedPrompt.slice(0, MAX_PROMPT_LENGTH) + "...";
  }

  return enhancedPrompt;
}

// Use it:
const enhancedPrompt = await buildEnhancedPrompt(
  script.prompt,
  supabase,
  person.id,
  organizationId
);

// Pass to VAPI
const vapiPayload = {
  assistant: {
    model: {
      messages: [{ role: "system", content: enhancedPrompt }],
    },
  },
};
```

### 3. Update auto-call-trigger with same pattern

Apply the same context injection before executing scheduled calls.

### 4. Add instructions for the AI to use context

Update script templates to include guidance:

```
You have access to information about previous conversations with this person and current church events. 
Reference this context naturally when relevant:
- If they mentioned something in a previous call, follow up on it
- If there's an upcoming church event, invite them
- Remember any prayer requests they've shared

Do not explicitly say "I see from our records..." - instead, naturally weave it into conversation like a caring friend would.
```

## Verification
1. Add some member memories for a test person
2. Add church context items
3. Make a test call
4. Check that the VAPI prompt includes the context
5. Verify the AI references the context appropriately

## On Completion
Update `activity.md` and mark task 6.3b as `[x]`
