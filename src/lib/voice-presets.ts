export interface VoicePreset {
  id: string;           // Friendly ID for UI
  voiceId: string;      // Actual ElevenLabs voice ID
  name: string;
  description: string;
  provider: string;
}

// ElevenLabs voice IDs - these are the actual API identifiers
export const VOICE_PRESETS: VoicePreset[] = [
  { id: "rachel", voiceId: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", description: "Warm Female", provider: "11labs" },
  { id: "josh", voiceId: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", description: "Professional Male", provider: "11labs" },
  { id: "bella", voiceId: "EXAVITQu4vr4xnSDxMaL", name: "Bella", description: "Energetic Female", provider: "11labs" },
  { id: "adam", voiceId: "pNInz6obpgDQGcFmaJgB", name: "Adam", description: "Calm Male", provider: "11labs" },
  { id: "domi", voiceId: "AZnzlk1XvdvUeBnXmlld", name: "Domi", description: "Friendly Female", provider: "11labs" },
];

export const DEFAULT_VOICE = VOICE_PRESETS.find(v => v.id === "rachel")!;

// Helper to get voice ID from friendly name
export function getVoiceId(friendlyId: string): string {
  const voice = VOICE_PRESETS.find(v => v.id === friendlyId);
  return voice?.voiceId || DEFAULT_VOICE.voiceId;
}
