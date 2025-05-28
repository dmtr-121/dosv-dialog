// Updated audioAssets.ts - Removed SUCCESS and GENERAL sections, left only HINTS
// Central storage for predefined audio assets used across the app
export const AUDIO_ASSETS = {
  HINTS: {
    FIRST_HINT: "https://spk-cb.b-cdn.net/hint-as/Let's%20begin%20with%20a%20little%20hint.mp3",
    SECOND_HINT: "https://spk-cb.b-cdn.net/hint-as/Second%20hint.mp3", 
    FINAL_HINT: "https://spk-cb.b-cdn.net/hint-as/Repeat%20the%20correct%20answer%20shown%20on%20the%20screen.mp3"
  }
};

/**
 * Get a predefined audio URL for hint messages based on attempt number
 * @param attempt Current attempt number
 * @returns URL to audio file for this hint
 */
export function getHintAudioUrl(attempt: number): string {
  switch (attempt) {
    case 1:
      return AUDIO_ASSETS.HINTS.FIRST_HINT;
    case 2:
      return AUDIO_ASSETS.HINTS.SECOND_HINT;
    case 3:
    default:
      return AUDIO_ASSETS.HINTS.FINAL_HINT;
  }
}

/**
 * Get the appropriate audio URL for a specific message type
 * or use a provided URL if available
 * 
 * @param type Message type
 * @param customAudioUrl Custom audio URL from dialogue definition
 * @param attempt Current attempt number (for hints)
 * @returns The audio URL to use
 */
export function getAudioUrlForMessage(
  type: 'instruction' | 'hint' | 'success' | 'conversation' | 'vocabulary',
  customAudioUrl?: string,
  attempt: number = 0
): string | undefined {
  // Always prioritize custom audio URLs from dialogue definitions
  if (customAudioUrl) return customAudioUrl;
  
  // Fall back to predefined assets only for hints
  if (type === 'hint') {
    return getHintAudioUrl(attempt);
  }
  
  // For all other types, return undefined since we're not using other audio assets
  return undefined;
}