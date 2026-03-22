---
description: Update vapi-webhook to create member memories after calls
epic: Epic 6 - AI & Memory Enhancements
task_id: 6.2
---

## Context
Extract memories from call transcripts and store them for future context.

## Prerequisites
- Task 6.1 complete
- OpenAI API key for embeddings

## Implementation Steps

### 1. Add memory creation to vapi-webhook

In `supabase/functions/vapi-webhook/index.ts`, after processing call completion:

```typescript
import { createEmbedding } from "../_shared/embeddings.ts";

// In the end-of-call handler:
if (message.type === "end-of-call-report") {
  const transcript = message.transcript || message.call?.transcript;
  const summary = message.summary || message.call?.summary;
  
  if (transcript || summary) {
    await createMemberMemories(supabase, {
      personId: attempt.person_id,
      organizationId: attempt.organization_id,
      sourceCallId: attempt.id,
      transcript,
      summary,
    });
  }
}
```

### 2. Create memory extraction function

```typescript
async function createMemberMemories(
  supabase: any,
  params: {
    personId: string;
    organizationId: string;
    sourceCallId: string;
    transcript: string;
    summary: string;
  }
): Promise<void> {
  const { personId, organizationId, sourceCallId, transcript, summary } = params;

  // 1. Store call summary as memory
  if (summary) {
    const embedding = await createEmbedding(summary);
    
    await supabase.from("member_memories").insert({
      organization_id: organizationId,
      person_id: personId,
      content: summary,
      embedding,
      memory_type: "call_summary",
      source_call_id: sourceCallId,
    });
    
    console.log("Stored call summary memory");
  }

  // 2. Extract and store prayer requests
  const prayerRequests = extractPrayerRequests(transcript);
  for (const request of prayerRequests) {
    const embedding = await createEmbedding(request);
    
    await supabase.from("member_memories").insert({
      organization_id: organizationId,
      person_id: personId,
      content: request,
      embedding,
      memory_type: "prayer_request",
      source_call_id: sourceCallId,
    });
  }
  
  if (prayerRequests.length > 0) {
    console.log(`Stored ${prayerRequests.length} prayer request memories`);
  }

  // 3. Extract personal facts
  const personalFacts = extractPersonalFacts(transcript);
  for (const fact of personalFacts) {
    const embedding = await createEmbedding(fact);
    
    await supabase.from("member_memories").insert({
      organization_id: organizationId,
      person_id: personId,
      content: fact,
      embedding,
      memory_type: "personal_note",
      source_call_id: sourceCallId,
    });
  }
  
  if (personalFacts.length > 0) {
    console.log(`Stored ${personalFacts.length} personal notes`);
  }
}

function extractPrayerRequests(transcript: string): string[] {
  const requests: string[] = [];
  
  // Simple pattern matching - could be enhanced with Claude
  const prayerPatterns = [
    /pray for (?:my |our |the )?(.+?)(?:\.|$)/gi,
    /need(?:s)? prayer (?:for |about )?(.+?)(?:\.|$)/gi,
    /please pray (?:for |about )?(.+?)(?:\.|$)/gi,
  ];

  for (const pattern of prayerPatterns) {
    let match;
    while ((match = pattern.exec(transcript)) !== null) {
      requests.push(`Prayer request: ${match[1].trim()}`);
    }
  }

  return requests;
}

function extractPersonalFacts(transcript: string): string[] {
  const facts: string[] = [];
  
  // Pattern matching for life events and personal information
  const factPatterns = [
    /(?:my|our) (\w+ is (?:getting|going|starting|graduating|retiring).+?)(?:\.|$)/gi,
    /(?:we|I) (?:just|recently) (\w+.+?)(?:\.|$)/gi,
    /(?:my|our) (\w+ (?:had|has|is having) .+?)(?:\.|$)/gi,
  ];

  for (const pattern of factPatterns) {
    let match;
    while ((match = pattern.exec(transcript)) !== null) {
      facts.push(match[1].trim());
    }
  }

  return facts;
}
```

### 3. Create shared embedding utility

Create `supabase/functions/_shared/embeddings.ts`:

```typescript
export async function createEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 768,
    }),
  });

  const data = await response.json();
  return data.data[0].embedding;
}
```

## Environment Variables
- `OPENAI_API_KEY`

## Verification
1. Complete a test call with conversation content
2. Check member_memories table for new entries
3. Verify embeddings are 768-dimensional

## On Completion
Update `activity.md` and mark task 6.2 as `[x]`
