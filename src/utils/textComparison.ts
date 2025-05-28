// textComparison.ts
// Enhanced text comparison utility with improved similarity calculation
// Changes:
// - Added progressive sequence matching
// - Improved word correction detection
// - Better handling of speech recognition errors
// - More intelligent similarity thresholds

import * as stringSimilarity from 'string-similarity';

interface WordCorrection {
  original: string;
  correct: string;
  isCorrect: boolean;
}

// Common filler words that speech recognition might add
const FILLER_WORDS = ['um', 'uh', 'eh', 'ah', 'like', 'you know', 'well'];

// Common speech recognition errors
const PHONETIC_CORRECTIONS: Record<string, string[]> = {
  'to': ['too', 'two'],
  'there': ['their', 'theyre'],
  'your': ['youre'],
  'its': ['its'],
  'then': ['than'],
  'accept': ['except'],
  'affect': ['effect'],
};

// Enhanced text normalization
function normalizeTextForComparison(text: string): string {
  let normalized = text
    .toLowerCase()
    .replace(/[.,!?;:'"()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Remove filler words
  FILLER_WORDS.forEach(filler => {
    normalized = normalized.replace(new RegExp(`\\b${filler}\\b`, 'g'), '');
  });
  
  return normalized.replace(/\s+/g, ' ').trim();
}

// Check if two words are phonetically similar
function areWordsPhoneticallySimilar(word1: string, word2: string): boolean {
  // Check direct phonetic corrections
  const corrections = PHONETIC_CORRECTIONS[word1];
  if (corrections && corrections.includes(word2)) return true;
  
  // Check reverse
  for (const [key, values] of Object.entries(PHONETIC_CORRECTIONS)) {
    if (values.includes(word1) && key === word2) return true;
  }
  
  // Check for article flexibility
  if (['a', 'an', 'the'].includes(word1) && ['a', 'an', 'the'].includes(word2)) {
    return true;
  }
  
  return false;
}

// Calculate word-level similarity with position awareness
function calculateWordSimilarity(word1: string, word2: string, positionMatch: boolean): number {
  if (word1 === word2) return positionMatch ? 1.1 : 1.0;
  
  if (areWordsPhoneticallySimilar(word1, word2)) return 0.9;
  
  // For very short words, require exact match
  if (word1.length <= 2 || word2.length <= 2) return 0;
  
  // For short words (3-4 chars), allow 1 difference
  if (word1.length <= 4 || word2.length <= 4) {
    const diffCount = levenshteinDistance(word1, word2);
    if (diffCount <= 1) return 0.85;
    return 0;
  }
  
  // For longer words, check prefix match
  const prefixLength = Math.floor(Math.min(word1.length, word2.length) * 0.75);
  if (prefixLength >= 4 && word1.substring(0, prefixLength) === word2.substring(0, prefixLength)) {
    return 0.9;
  }
  
  // Calculate similarity based on edit distance
  const distance = levenshteinDistance(word1, word2);
  const maxLength = Math.max(word1.length, word2.length);
  const similarity = 1 - (distance / maxLength);
  
  return similarity > 0.7 ? similarity * 0.9 : 0;
}

// Simple Levenshtein distance implementation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Find progressive matches in the spoken text
function findProgressiveMatch(spokenWords: string[], expectedWords: string[]): number {
  if (expectedWords.length === 0) return 0;
  
  const minRequiredWords = Math.max(2, Math.floor(expectedWords.length * 0.75));
  let bestMatchScore = 0;
  
  // Try to find the expected sequence anywhere in the spoken text
  for (let startIdx = 0; startIdx <= spokenWords.length - minRequiredWords; startIdx++) {
    let matchedWords = 0;
    let totalScore = 0;
    let expectedIdx = 0;
    
    for (let spokenIdx = startIdx; spokenIdx < spokenWords.length && expectedIdx < expectedWords.length; spokenIdx++) {
      const spokenWord = spokenWords[spokenIdx];
      const expectedWord = expectedWords[expectedIdx];
      const positionMatch = spokenIdx - startIdx === expectedIdx;
      
      const wordScore = calculateWordSimilarity(spokenWord, expectedWord, positionMatch);
      
      if (wordScore >= 0.8) {
        matchedWords++;
        totalScore += wordScore;
        expectedIdx++;
      } else if (matchedWords > 0 && expectedIdx < expectedWords.length - 1) {
        // Allow one word skip
        expectedIdx++;
        const nextWordScore = calculateWordSimilarity(spokenWord, expectedWords[expectedIdx], false);
        if (nextWordScore >= 0.8) {
          matchedWords++;
          totalScore += nextWordScore * 0.9; // Penalty for skip
          expectedIdx++;
        } else {
          expectedIdx--; // Reset if skip didn't help
        }
      }
    }
    
    const matchRatio = matchedWords / expectedWords.length;
    if (matchRatio >= 0.75) {
      const averageScore = totalScore / matchedWords;
      bestMatchScore = Math.max(bestMatchScore, matchRatio * averageScore);
    }
  }
  
  return bestMatchScore;
}

export function compareTexts(spoken: string, expected: string): {
  similarity: number;
  corrections: WordCorrection[];
  isProgressiveMatch: boolean;
} {
  // Normalize texts
  const cleanSpoken = normalizeTextForComparison(spoken);
  const cleanExpected = normalizeTextForComparison(expected);
  
  // Basic string similarity
  const basicSimilarity = stringSimilarity.compareTwoStrings(cleanSpoken, cleanExpected);
  
  // Word-level analysis
  const spokenWords = cleanSpoken.split(/\s+/).filter(w => w.length > 0);
  const expectedWords = cleanExpected.split(/\s+/).filter(w => w.length > 0);
  
  // Check for progressive match
  const progressiveScore = findProgressiveMatch(spokenWords, expectedWords);
  const isProgressiveMatch = progressiveScore >= 0.75;
  
  // Calculate detailed corrections
  const corrections: WordCorrection[] = [];
  const maxLength = Math.max(spokenWords.length, expectedWords.length);
  
  for (let i = 0; i < maxLength; i++) {
    const spokenWord = spokenWords[i] || '';
    const expectedWord = expectedWords[i] || '';
    
    if (!spokenWord && expectedWord) {
      // Missing word
      corrections.push({
        original: '',
        correct: expectedWord,
        isCorrect: false
      });
    } else if (spokenWord && !expectedWord) {
      // Extra word
      corrections.push({
        original: spokenWord,
        correct: '',
        isCorrect: false
      });
    } else {
      const wordSimilarity = calculateWordSimilarity(spokenWord, expectedWord, true);
      corrections.push({
        original: spokenWord,
        correct: expectedWord,
        isCorrect: wordSimilarity >= 0.9
      });
    }
  }
  
  // Calculate final similarity
  let finalSimilarity = basicSimilarity;
  
  // Boost similarity if progressive match found
  if (isProgressiveMatch) {
    finalSimilarity = Math.max(finalSimilarity, progressiveScore);
  }
  
  // Adjust for word count differences
  const wordCountRatio = Math.min(spokenWords.length, expectedWords.length) / 
                        Math.max(spokenWords.length, expectedWords.length);
  if (wordCountRatio > 0.8) {
    finalSimilarity += 0.05;
  }
  
  // Cap at 1.0
  finalSimilarity = Math.min(1.0, finalSimilarity);
  
  return { 
    similarity: finalSimilarity, 
    corrections,
    isProgressiveMatch 
  };
}

// Enhanced function to determine if corrections should be shown
export function shouldShowCorrections(similarity: number, isProgressiveMatch: boolean): boolean {
  // Show corrections for moderate similarity or progressive matches that aren't perfect
  if (isProgressiveMatch && similarity < 0.95) {
    return true;
  }
  return similarity >= 0.75 && similarity < 0.95;
}