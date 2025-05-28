// textProcessing.ts
// Enhanced text processing with improved validation and similarity calculation
// Changes:
// - Added progressive sequence detection
// - Improved variation matching
// - Better handling of common speech errors
// - More forgiving thresholds

import stringSimilarity from 'string-similarity';

// Common filler words to ignore
const FILLER_WORDS = ['um', 'uh', 'eh', 'ah', 'like', 'you know', 'well', 'so'];

// Common speech recognition substitutions
const SPEECH_SUBSTITUTIONS: Record<string, string[]> = {
  'to': ['too', 'two'],
  'there': ['their', 'theyre'],
  'your': ['youre'],
  'its': ['its'],
  'then': ['than'],
  'accept': ['except'],
  'affect': ['effect'],
  'were': ['where'],
  'we': ['wee'],
  'see': ['sea'],
  'be': ['bee'],
  'no': ['know'],
  'right': ['write'],
  'here': ['hear'],
};

// Enhanced text normalization for comparison
const normalizeText = (text: string): string => {
  let normalized = text
    .toLowerCase()
    .replace(/[.,!?;:'"()\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Remove filler words
  FILLER_WORDS.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'g');
    normalized = normalized.replace(regex, '');
  });
  
  // Clean up extra spaces after filler removal
  return normalized.replace(/\s+/g, ' ').trim();
};

// Improved text formatting with sophisticated rules
const formatText = (text: string): string => {
  let formattedText = text
    .replace(/\s+/g, ' ')
    .trim();

  // Add proper spacing after punctuation
  formattedText = formattedText
    .replace(/([.,!?;:])\s*/g, '$1 ')
    .trim();

  // Detect questions based on question words and context
  const questionWords = /^(what|where|when|why|how|who|which|whose|whom|are|is|can|could|would|will|does|do|did|has|have|should|shall|may|might)/i;
  const hasQuestionWord = questionWords.test(formattedText);
  const hasQuestionContext = /\b(you|your|anyone|someone|anybody|somebody)\b/i.test(formattedText);
  
  if ((hasQuestionWord || hasQuestionContext) && !formattedText.endsWith('?') && !formattedText.endsWith('.') && !formattedText.endsWith('!')) {
    formattedText += '?';
  }

  // Add periods to statements if no ending punctuation
  if (!/[.!?]$/.test(formattedText)) {
    if (!hasQuestionWord) {
      formattedText += '.';
    }
  }

  // Capitalize sentences
  formattedText = formattedText
    .split(/([.!?]\s+)/)
    .map((segment, index) => {
      if (index === 0 || /[.!?]\s+$/.test(segment)) {
        return segment;
      }
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join('');

  // Ensure first character is capitalized
  formattedText = formattedText.charAt(0).toUpperCase() + formattedText.slice(1);

  // Fix common capitalization for medical and professional terms
  const properNouns = ['COVID', 'CT', 'MRI', 'ECG', 'EKG', 'BP', 'ICU', 'ER', 'IV', 'OR', 'COPD', 'ADHD'];
  properNouns.forEach(term => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    formattedText = formattedText.replace(regex, term);
  });

  return formattedText;
};

// Find best matching sequence in user answer
const findBestSequence = (userWords: string[], correctWords: string[], minMatchRatio: number = 0.75): number => {
  if (correctWords.length === 0) return 0;
  
  const minRequiredWords = Math.max(2, Math.floor(correctWords.length * minMatchRatio));
  let bestScore = 0;
  
  // Try different starting positions in user answer
  for (let start = 0; start <= userWords.length - minRequiredWords; start++) {
    let matchCount = 0;
    let correctIdx = 0;
    let totalScore = 0;
    
    for (let userIdx = start; userIdx < userWords.length && correctIdx < correctWords.length; userIdx++) {
      const userWord = userWords[userIdx];
      const correctWord = correctWords[correctIdx];
      
      // Check exact match or phonetic similarity
      let wordScore = 0;
      if (userWord === correctWord) {
        wordScore = 1;
      } else if (SPEECH_SUBSTITUTIONS[correctWord]?.includes(userWord)) {
        wordScore = 0.95;
      } else if (SPEECH_SUBSTITUTIONS[userWord]?.includes(correctWord)) {
        wordScore = 0.95;
      } else if (userWord.length > 3 && correctWord.length > 3) {
        // Check prefix match for longer words
        const prefixLen = Math.floor(Math.min(userWord.length, correctWord.length) * 0.7);
        if (userWord.substring(0, prefixLen) === correctWord.substring(0, prefixLen)) {
          wordScore = 0.85;
        }
      }
      
      if (wordScore >= 0.8) {
        matchCount++;
        totalScore += wordScore;
        correctIdx++;
      } else if (correctIdx > 0 && correctIdx < correctWords.length - 1) {
        // Allow one skip
        correctIdx++;
        if (userWord === correctWords[correctIdx] || SPEECH_SUBSTITUTIONS[correctWords[correctIdx]]?.includes(userWord)) {
          matchCount++;
          totalScore += 0.8; // Penalty for skip
          correctIdx++;
        } else {
          correctIdx--; // Reset if skip didn't help
        }
      }
    }
    
    const matchRatio = matchCount / correctWords.length;
    if (matchRatio >= minMatchRatio) {
      const avgScore = totalScore / matchCount;
      bestScore = Math.max(bestScore, matchRatio * avgScore);
    }
  }
  
  return bestScore;
};

// Enhanced string similarity with medical context
const calculateSimilarity = (text1: string, text2: string): number => {
  const base = stringSimilarity.compareTwoStrings(text1, text2);
  
  // Check for speech substitution matches
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  let substitutionBonus = 0;
  words1.forEach((word1, idx) => {
    if (idx < words2.length) {
      const word2 = words2[idx];
      if (SPEECH_SUBSTITUTIONS[word1]?.includes(word2) || SPEECH_SUBSTITUTIONS[word2]?.includes(word1)) {
        substitutionBonus += 0.02;
      }
    }
  });
  
  // Give bonus for medical term matches
  const medicalTerms = ['patient', 'symptoms', 'diagnosis', 'treatment', 'medication', 'pain', 'doctor', 'nurse', 'hospital'];
  const medicalBonus = medicalTerms.reduce((bonus, term) => {
    const inText1 = text1.toLowerCase().includes(term);
    const inText2 = text2.toLowerCase().includes(term);
    return bonus + (inText1 === inText2 ? 0.01 : 0);
  }, 0);

  return Math.min(1, base + substitutionBonus + medicalBonus);
};

export interface ValidationResult {
  isCorrect: boolean;
  similarity: number;
  closestMatch: string;
  correctedText: string;
  isProgressiveMatch?: boolean;
}

export const validateAnswer = (
  userAnswer: string,
  correctAnswer: string,
  variations: string[] = []
): ValidationResult => {
  const normalizedUserAnswer = normalizeText(userAnswer);
  const normalizedCorrectAnswer = normalizeText(correctAnswer);
  const normalizedVariations = variations.map(normalizeText);

  // Check exact matches first
  if (normalizedUserAnswer === normalizedCorrectAnswer) {
    return {
      isCorrect: true,
      similarity: 1,
      closestMatch: correctAnswer,
      correctedText: formatText(correctAnswer),
      isProgressiveMatch: false
    };
  }

  // Check variations
  const variationIndex = normalizedVariations.indexOf(normalizedUserAnswer);
  if (variationIndex !== -1) {
    return {
      isCorrect: true,
      similarity: 1,
      closestMatch: variations[variationIndex],
      correctedText: formatText(variations[variationIndex]),
      isProgressiveMatch: false
    };
  }

  // Split into words for progressive matching
  const userWords = normalizedUserAnswer.split(/\s+/).filter(w => w.length > 0);
  const correctWords = normalizedCorrectAnswer.split(/\s+/).filter(w => w.length > 0);
  
  // Check for progressive sequence match
  const progressiveScore = findBestSequence(userWords, correctWords, 0.7);
  const isProgressiveMatch = progressiveScore >= 0.75;

  // Find best match using enhanced similarity
  const allPossibleAnswers = [correctAnswer, ...variations];
  const similarities = allPossibleAnswers.map(answer => {
    const normalizedAnswer = normalizeText(answer);
    let similarity = calculateSimilarity(normalizedUserAnswer, normalizedAnswer);
    
    // Boost similarity for progressive matches
    if (isProgressiveMatch && answer === correctAnswer) {
      similarity = Math.max(similarity, progressiveScore);
    }
    
    return {
      text: answer,
      similarity
    };
  });

  const bestMatch = similarities.reduce((best, current) => 
    current.similarity > best.similarity ? current : best
  );

  // Lower acceptance threshold to 0.75 (from 0.8)
  const acceptanceThreshold = isProgressiveMatch ? 0.7 : 0.75;
  const isAccepted = bestMatch.similarity >= acceptanceThreshold;

  return {
    isCorrect: isAccepted,
    similarity: bestMatch.similarity,
    closestMatch: bestMatch.text,
    correctedText: isAccepted ? formatText(bestMatch.text) : formatText(userAnswer),
    isProgressiveMatch
  };
};