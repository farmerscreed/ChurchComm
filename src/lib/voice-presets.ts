export interface VoicePreset {
  id: string;
  name: string;
  description: string;
  provider: string;
}

export const VOICE_PRESETS: VoicePreset[] = [
  { id: "rachel", name: "Rachel", description: "Warm Female", provider: "11labs" },
  { id: "josh", name: "Josh", description: "Professional Male", provider: "11labs" },
  { id: "paula", name: "Paula", description: "Friendly Female (Default)", provider: "11labs" },
  { id: "adam", name: "Adam", description: "Calm Male", provider: "11labs" },
  { id: "bella", name: "Bella", description: "Energetic Female", provider: "11labs" },
];

export const DEFAULT_VOICE = VOICE_PRESETS.find(v => v.id === "paula")!;
