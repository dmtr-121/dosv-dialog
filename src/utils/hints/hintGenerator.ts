// src/utils/hints/hintGenerator.ts
// Simplified version - only for first and second hints since third attempt shows answer directly

import { HintGeneratorOptions } from '../../types/hint';
import { HINT_MESSAGES } from './hintMessages';
import { getAudioUrlForMessage } from '../audio/audioAssets';

export function generateHint({ answer, attempt, totalWords, firstWord }: HintGeneratorOptions): string {
  switch (attempt) {
    case 1: {
      // First hint that's suitable for short answers
      if (totalWords <= 2) {
        // For very short answers (1-2 words), give more abstract hints
        const firstLetter = answer.trim().charAt(0).toUpperCase();
        const answerLength = answer.length;
        
        return `💡 The answer begins with "${firstLetter}" and has ${answerLength} characters total`;
      } else {
        // For longer answers, keep the original hint
        return `💡 The sentence starts with "${firstWord}" and has ${totalWords} words`;
      }
    }
    
    case 2:
      // Second hint with partially masked answer
      return `🎯 Try this one: ${generatePartialAnswer(answer)}`;
    
    // No case 3 or default needed - DialogueContext now handles these cases directly
    default:
      return `🎯 Try this one: ${generatePartialAnswer(answer)}`;
  }
}

// Get the audio URL for a hint based on the attempt number
export function getHintAudioUrl(attempt: number): string | undefined {
  return getAudioUrlForMessage('hint', undefined, attempt);
}

function generatePartialAnswer(answer: string): string {
  return answer.split(' ').map(word => {
    if (word.length <= 2) return word;
    
    // Show approximately half of each word
    const showLength = Math.ceil(word.length / 2);
    const revealed = word.slice(0, showLength);
    const hidden = '_'.repeat(word.length - showLength);
    
    return revealed + hidden;
  }).join(' ');
}