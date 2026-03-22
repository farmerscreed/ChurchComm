---
description: Add voice selection to scripts
epic: Epic 3 - Enhanced Script Management & AI Builder
task_id: 3.4
---

## Context
Allow users to select from preset AI voices for their call scripts.

## Prerequisites
- Task 3.1b complete (script management in Settings)

## Implementation Steps

### 1. Create migration for voice fields

```sql
ALTER TABLE call_scripts 
ADD COLUMN IF NOT EXISTS voice_id VARCHAR,
ADD COLUMN IF NOT EXISTS voice_name VARCHAR;
```

### 2. Define voice presets

Create constant in a shared location:

```tsx
// src/lib/voice-presets.ts
export const VOICE_PRESETS = [
  { id: "rachel", name: "Rachel", description: "Warm Female", provider: "11labs" },
  { id: "josh", name: "Josh", description: "Professional Male", provider: "11labs" },
  { id: "paula", name: "Paula", description: "Friendly Female (Default)", provider: "11labs" },
  { id: "adam", name: "Adam", description: "Calm Male", provider: "11labs" },
  { id: "bella", name: "Bella", description: "Energetic Female", provider: "11labs" },
];

export const DEFAULT_VOICE = VOICE_PRESETS.find(v => v.id === "paula")!;
```

### 3. Add voice selection to script editor

```tsx
import { VOICE_PRESETS, DEFAULT_VOICE } from "@/lib/voice-presets";

// In script creation/editing form:
<div>
  <label className="text-sm font-medium">Voice</label>
  <Select 
    value={selectedVoice} 
    onValueChange={setSelectedVoice}
    defaultValue={DEFAULT_VOICE.id}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select voice" />
    </SelectTrigger>
    <SelectContent>
      {VOICE_PRESETS.map((voice) => (
        <SelectItem key={voice.id} value={voice.id}>
          <div className="flex items-center gap-2">
            <span>{voice.name}</span>
            <span className="text-muted-foreground text-xs">- {voice.description}</span>
          </div>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### 4. Update send-group-call to use script's voice

```typescript
// In the VAPI call configuration:
const voiceId = script.voice_id || "paula"; // Default to Paula

const vapiPayload = {
  // ... other config
  assistant: {
    voice: {
      provider: "11labs",
      voiceId: voiceId,
    },
    // ... rest of assistant config
  },
};
```

### 5. Show voice in script list

```tsx
// In ScriptCard component:
<div className="flex items-center gap-2 mt-2">
  <Volume2 className="h-4 w-4 text-muted-foreground" />
  <span className="text-sm text-muted-foreground">
    {VOICE_PRESETS.find(v => v.id === script.voice_id)?.name || "Paula"}
  </span>
</div>
```

### 6. Optional: Add voice preview button

```tsx
const handlePreviewVoice = async (voiceId: string) => {
  // This would require implementing a preview endpoint
  // Could use 11Labs API directly or create an edge function
  // For now, can link to 11Labs voice library
  window.open(`https://elevenlabs.io/voice-library`, "_blank");
};

<Button variant="ghost" size="sm" onClick={() => handlePreviewVoice(selectedVoice)}>
  <Play className="h-4 w-4 mr-1" /> Preview
</Button>
```

## Verification
1. Edit a script and select a different voice
2. Save the script
3. Make a test call
4. Verify the call uses the selected voice
5. Verify default fallback to Paula works

## On Completion
Update `activity.md` and mark task 3.4 as `[x]`
