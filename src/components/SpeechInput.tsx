// SpeechInput.tsx
// Enhanced with stricter recognition requirements and fixed question mark issue
// Changes:
// - Increased progressive match threshold to 90% for longer sentences
// - Fixed inappropriate question mark addition
// - Removed confidence indicator
// - Stricter length requirements to prevent early cutoffs
// - Better threshold scaling for longer sentences

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, KeySquare } from 'lucide-react';
import { useSpeechInput } from '../hooks/useSpeechInput';
import { useSpeechState } from '../context/SpeechStateContext';
import ErrorMessage from './speech/ErrorMessage';
import TranscriptDisplay from './speech/TranscriptDisplay';
import { useDialogueContext } from '../context/dialogue';
import { isMobileDevice } from "../utils/deviceDetection";
import { CompactWordOrderInput } from './CompactWordOrderInput';

interface SpeechInputProps {
  onTranscript: (text: string) => void;
  canSkip?: boolean;
  buttonSize?: 'small' | 'medium' | 'large';
}

export default function SpeechInput({ 
  onTranscript, 
  canSkip = true,
  buttonSize = isMobileDevice() ? 'small' : 'medium'
}: SpeechInputProps) {
  const [autoSubmitInProgress, setAutoSubmitInProgress] = useState<boolean>(false);
  const [isCorrectAnswer, setIsCorrectAnswer] = useState<boolean>(false);
  const [microphoneBlocked, setMicrophoneBlocked] = useState<boolean>(false);
  const [displayText, setDisplayText] = useState<string>('');
  const [showSpaceNotification, setShowSpaceNotification] = useState<boolean>(false);
  const [potentiallyCorrect, setPotentiallyCorrect] = useState<boolean>(false);

  // refs for timing and control
  const correctAnswerTimeRef = useRef<number | null>(null);
  const autoSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const micBlockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const finalSubmitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const potentiallyCorrectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const keyBlockerRef = useRef<(e: KeyboardEvent) => void | null>(null);
  const skipNextDisplayRef = useRef(false);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Configuration constants - Stricter for better accuracy
  const BASE_SIMILARITY_THRESHOLD = 0.7; // Increased back from 0.65
  const MIN_SIMILARITY_THRESHOLD = 0.5; // Keep minimum
  const MIN_TEXT_LENGTH_RATIO = 0.85; // Increased from 0.75 - require 85% of text
  const COLOR_CHANGE_DELAY = 1000;
  const PRE_SUBMIT_DELAY = 750;
  const POST_SUBMIT_BLOCK_TIME = 1000;
  const NOTIFICATION_DISPLAY_TIME = 2000;
  const WORD_COUNT_THRESHOLD = 4;
  const THRESHOLD_REDUCTION_PER_WORD = 0.022; // Reduced from 0.025
  const CONFIDENCE_DECAY_PER_SECOND = 0.008; // Reduced from 0.01
  const PROGRESSIVE_MATCH_THRESHOLD = 0.85; // Increased from 0.75 - require 90% match

  const {
    isRecording,
    error,
    currentText,
    startRecording,
    stopRecording,
  } = useSpeechInput({ onTranscript });

  const { state: speechState } = useSpeechState();
  const { state: dialogueState } = useDialogueContext();

  const isDisabled = speechState.isSpeaking || autoSubmitInProgress || microphoneBlocked;
  const isMobile = isMobileDevice();

  const currentStep = dialogueState.currentDialogue?.conversation[dialogueState.currentSentenceIndex];
  const expectedResponse = currentStep?.expectedResponse || '';

  const prevMessage = dialogueState.messages.length > 0 ? 
    dialogueState.messages[dialogueState.messages.length - 1] : null;
  const doctorMessage = prevMessage && !prevMessage.isUser ? prevMessage.text : '';

  // Sync displayText with currentText, but skip when answer is correct or potentiallyCorrect
  useEffect(() => {
    if (skipNextDisplayRef.current) {
      skipNextDisplayRef.current = false;
      return;
    }
    
    if (!isCorrectAnswer && !potentiallyCorrect && !autoSubmitInProgress) {
      setDisplayText(currentText);
    }
  }, [currentText, isCorrectAnswer, potentiallyCorrect, autoSubmitInProgress]);

  // Clear all timeouts
  const clearAllTimeouts = useCallback(() => {
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
      autoSubmitTimeoutRef.current = null;
    }
    if (micBlockTimeoutRef.current) {
      clearTimeout(micBlockTimeoutRef.current);
      micBlockTimeoutRef.current = null;
    }
    if (finalSubmitTimeoutRef.current) {
      clearTimeout(finalSubmitTimeoutRef.current);
      finalSubmitTimeoutRef.current = null;
    }
    if (potentiallyCorrectTimeoutRef.current) {
      clearTimeout(potentiallyCorrectTimeoutRef.current);
      potentiallyCorrectTimeoutRef.current = null;
    }
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }
  }, []);

  const safeStopRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  const handleSubmitCorrectAnswer = useCallback(() => {
    if (expectedResponse.trim()) {
      console.log('✅ Submitting correct answer:', expectedResponse);
      onTranscript(expectedResponse.trim());
      setMicrophoneBlocked(true);
      setAutoSubmitInProgress(false);

      skipNextDisplayRef.current = true;

      micBlockTimeoutRef.current = setTimeout(() => {
        setMicrophoneBlocked(false);
        setIsCorrectAnswer(false);
        setPotentiallyCorrect(false);
        correctAnswerTimeRef.current = null;
        
        console.log('🔄 Clearing display text after submission');
        requestAnimationFrame(() => {
          setDisplayText('');
        });
      }, POST_SUBMIT_BLOCK_TIME);
    }
  }, [expectedResponse, onTranscript]);
  
  // Calculate adaptive threshold based on recording time
  const calculateTimeAdjustedThreshold = useCallback((baseThreshold: number): number => {
    if (!recordingStartTimeRef.current || !isRecording) return baseThreshold;
    
    const recordingDuration = (Date.now() - recordingStartTimeRef.current) / 1000; // in seconds
    const decay = Math.min(recordingDuration * CONFIDENCE_DECAY_PER_SECOND, 0.1); // Max 0.1 reduction
    
    return Math.max(baseThreshold - decay, MIN_SIMILARITY_THRESHOLD);
  }, [isRecording]);
  
  // Enhanced adaptive threshold calculation - stricter for longer sentences
  const calculateAdaptiveThreshold = useCallback((expectedText: string): number => {
    if (!expectedText) return BASE_SIMILARITY_THRESHOLD;
    
    const normalizedText = expectedText
      .toLowerCase()
      .replace(/[.,!?;:'"()]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    const wordCount = normalizedText.split(/\s+/).length;
    
    let threshold = BASE_SIMILARITY_THRESHOLD;
    
    // Less aggressive threshold reduction for longer sentences
    if (wordCount > WORD_COUNT_THRESHOLD) {
      const reduction = Math.min(
        (wordCount - WORD_COUNT_THRESHOLD) * THRESHOLD_REDUCTION_PER_WORD,
        BASE_SIMILARITY_THRESHOLD - MIN_SIMILARITY_THRESHOLD
      );
      threshold -= reduction;
    }
    
    // Apply time-based adjustment
    threshold = calculateTimeAdjustedThreshold(threshold);
    
    return Math.max(threshold, MIN_SIMILARITY_THRESHOLD);
  }, [calculateTimeAdjustedThreshold]);
  
  // Enhanced dictionaries for better recognition
  const contractions: Record<string, string> = {
    'im': 'i am',
    'ive': 'i have',
    'id': 'i would',
    'ill': 'i will',
    'youre': 'you are',
    'youve': 'you have',
    'youd': 'you would',
    'youll': 'you will',
    'hes': 'he is',
    'shes': 'she is',
    'its': 'it is',
    'theyre': 'they are',
    'weve': 'we have',
    'theyve': 'they have',
    'dont': 'do not',
    'cant': 'cannot',
    'wont': 'will not',
    'isnt': 'is not',
    'arent': 'are not',
    'wasnt': 'was not',
    'werent': 'were not',
    'havent': 'have not',
    'hasnt': 'has not',
    'hadnt': 'had not',
    'doesnt': 'does not',
    'didnt': 'did not',
    'shouldnt': 'should not',
    'wouldnt': 'would not',
    'couldnt': 'could not',
  };
  
  const abbreviations: Record<string, string[]> = {
    'dr': ['dr', 'doctor'],
    'mr': ['mr', 'mister'],
    'mrs': ['mrs', 'missus'],
    'ms': ['ms', 'miss'],
  };

  // Common speech recognition errors and their corrections
  const phoneticCorrections: Record<string, string[]> = {
    'to': ['too', 'two'],
    'there': ['their', 'theyre'],
    'your': ['youre'],
    'its': ['its'],
    'then': ['than'],
    'accept': ['except'],
    'affect': ['effect'],
  };

  // Words that speech recognition often adds unnecessarily
  const fillerWords = ['um', 'uh', 'eh', 'ah', 'like', 'you know', 'well'];
  
  // Progressive matching function - now requires 90% match
  const findProgressiveMatch = useCallback((spoken: string, expected: string): { match: boolean, confidence: number } => {
    const spokenWords = spoken.toLowerCase().split(/\s+/).filter(w => !fillerWords.includes(w));
    const expectedWords = expected.toLowerCase().split(/\s+/);
    
    if (expectedWords.length === 0) return { match: false, confidence: 0 };
    
    // Require 90% of words for longer sentences
    const requiredMatchRatio = expectedWords.length > 5 ? 0.9 : 0.85;
    const minRequiredWords = Math.max(2, Math.floor(expectedWords.length * requiredMatchRatio));
    
    for (let startIdx = 0; startIdx <= spokenWords.length - minRequiredWords; startIdx++) {
      let matchedWords = 0;
      let expectedIdx = 0;
      
      for (let spokenIdx = startIdx; spokenIdx < spokenWords.length && expectedIdx < expectedWords.length; spokenIdx++) {
        const spokenWord = spokenWords[spokenIdx];
        const expectedWord = expectedWords[expectedIdx];
        
        // Check for exact match or close match
        if (spokenWord === expectedWord || 
            (spokenWord.length > 3 && expectedWord.length > 3 && 
             spokenWord.substring(0, Math.min(3, spokenWord.length)) === expectedWord.substring(0, Math.min(3, expectedWord.length)))) {
          matchedWords++;
          expectedIdx++;
        } else if (matchedWords > 0 && expectedIdx < expectedWords.length - 1) {
          // Allow one word skip in the middle
          expectedIdx++;
          if (spokenWord === expectedWords[expectedIdx]) {
            matchedWords++;
            expectedIdx++;
          } else {
            expectedIdx--; // Reset if skip didn't help
          }
        }
      }
      
      const matchRatio = matchedWords / expectedWords.length;
      if (matchRatio >= requiredMatchRatio) {
        console.log(`🎯 Progressive match found: ${matchedWords}/${expectedWords.length} words (${(matchRatio * 100).toFixed(0)}%)`);
        return { match: true, confidence: matchRatio };
      }
    }
    
    return { match: false, confidence: 0 };
  }, [fillerWords]);
  
  // Enhanced text comparison with multiple improvements
  const calculateImprovedSimilarity = useCallback((text1: string, text2: string): number => {
    if (!text1 || !text2) return 0;
    
    // Enhanced text normalization
    const normalizeText = (text: string): string => {
      let normalized = text
        .toLowerCase()
        .replace(/[.,!?;:'"()]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Remove filler words
      fillerWords.forEach(filler => {
        normalized = normalized.replace(new RegExp(`\\b${filler}\\b`, 'g'), '');
      });
      
      // Normalize contractions
      normalized = normalized
        .replace(/i'm/g, "im")
        .replace(/you're/g, "youre")
        .replace(/he's/g, "hes")
        .replace(/she's/g, "shes")
        .replace(/it's/g, "its")
        .replace(/we're/g, "were")
        .replace(/they're/g, "theyre")
        .replace(/i've/g, "ive")
        .replace(/you've/g, "youve")
        .replace(/we've/g, "weve")
        .replace(/they've/g, "theyve")
        .replace(/don't/g, "dont")
        .replace(/can't/g, "cant")
        .replace(/won't/g, "wont")
        .replace(/isn't/g, "isnt")
        .replace(/aren't/g, "arent")
        .replace(/wasn't/g, "wasnt")
        .replace(/weren't/g, "werent")
        .replace(/haven't/g, "havent")
        .replace(/hasn't/g, "hasnt")
        .replace(/hadn't/g, "hadnt")
        .replace(/doesn't/g, "doesnt")
        .replace(/didn't/g, "didnt")
        .replace(/shouldn't/g, "shouldnt")
        .replace(/wouldn't/g, "wouldnt")
        .replace(/couldn't/g, "couldnt");
      
      // Remove all apostrophes
      normalized = normalized.replace(/'/g, "");
      
      return normalized.replace(/\s+/g, ' ').trim();
    };
    
    const normalizedText1 = normalizeText(text1);
    const normalizedText2 = normalizeText(text2);
    
    // First check for progressive match
    const progressiveResult = findProgressiveMatch(normalizedText1, normalizedText2);
    if (progressiveResult.match) {
      return progressiveResult.confidence;
    }
    
    // Create alternative versions
    const createAlternatives = (text: string): string[] => {
      const alternatives = [text];
      
      let alternativeWithContractions = text;
      let alternativeWithoutContractions = text;
      
      // Apply contractions and expansions
      for (const [contraction, full] of Object.entries(contractions)) {
        const regex = new RegExp(`\\b${contraction}\\b`, 'g');
        alternativeWithoutContractions = alternativeWithoutContractions.replace(regex, full);
        
        const reverseRegex = new RegExp(`\\b${full}\\b`, 'g');
        alternativeWithContractions = alternativeWithContractions.replace(reverseRegex, contraction);
      }
      
      alternatives.push(alternativeWithContractions);
      alternatives.push(alternativeWithoutContractions);
      
      return [...new Set(alternatives)];
    };
    
    const alternatives1 = createAlternatives(normalizedText1);
    const alternatives2 = createAlternatives(normalizedText2);
    
    let bestSimilarity = 0;
    
    for (const alt1 of alternatives1) {
      for (const alt2 of alternatives2) {
        const words1 = alt1.split(/\s+/);
        const words2 = alt2.split(/\s+/);
        
        let matchCount = 0;
        let partialMatchCount = 0;
        let phoneticMatchCount = 0;
        
        // Enhanced word matching with phonetic similarity
        words1.forEach((word1, idx1) => {
          let bestMatch = 0;
          
          for (let idx2 = 0; idx2 < words2.length; idx2++) {
            const word2 = words2[idx2];
            
            // Exact match
            if (word1 === word2) {
              bestMatch = 1;
              if (idx1 === idx2) bestMatch = 1.1; // Bonus for position match
              break;
            }
            
            // Check phonetic corrections
            const phoneticMatches = phoneticCorrections[word1];
            if (phoneticMatches && phoneticMatches.includes(word2)) {
              bestMatch = Math.max(bestMatch, 0.9);
              continue;
            }
            
            // Article flexibility (a/an/the)
            if (['a', 'an', 'the'].includes(word1) && ['a', 'an', 'the'].includes(word2)) {
              bestMatch = Math.max(bestMatch, 0.95);
              continue;
            }
            
            // For short words (1-3 chars), require exact match
            if (word1.length <= 3 || word2.length <= 3) {
              continue;
            }
            
            // For medium words (4-6 chars), allow 1 difference
            if (word1.length <= 6 || word2.length <= 6) {
              let diffCount = 0;
              const minLength = Math.min(word1.length, word2.length);
              
              for (let i = 0; i < minLength; i++) {
                if (word1[i] !== word2[i]) diffCount++;
              }
              
              diffCount += Math.abs(word1.length - word2.length);
              if (diffCount <= 1) {
                bestMatch = Math.max(bestMatch, 0.85);
              }
              continue;
            }
            
            // For longer words, check prefix and allow more flexibility
            const checkPrefixLength = Math.floor(Math.min(word1.length, word2.length) * 0.75);
            if (checkPrefixLength >= 4 && word1.substring(0, checkPrefixLength) === word2.substring(0, checkPrefixLength)) {
              bestMatch = Math.max(bestMatch, 0.9);
              continue;
            }
            
            // Levenshtein-like distance for longer words
            let diffCount = 0;
            const maxDiff = Math.max(2, Math.floor(Math.max(word1.length, word2.length) * 0.25));
            
            for (let i = 0; i < Math.min(word1.length, word2.length); i++) {
              if (word1[i] !== word2[i]) diffCount++;
              if (diffCount > maxDiff) break;
            }
            
            diffCount += Math.abs(word1.length - word2.length);
            
            if (diffCount <= maxDiff) {
              const similarity = 1 - (diffCount / Math.max(word1.length, word2.length));
              bestMatch = Math.max(bestMatch, similarity * 0.9);
            }
          }
          
          if (bestMatch >= 0.95) {
            matchCount += bestMatch;
          } else if (bestMatch >= 0.8) {
            partialMatchCount += bestMatch;
          } else if (bestMatch >= 0.7) {
            phoneticMatchCount += bestMatch * 0.8;
          }
        });
        
        // Calculate final similarity with weighted components
        const totalMatches = matchCount + (partialMatchCount * 0.9) + (phoneticMatchCount * 0.8);
        const maxWords = Math.max(words1.length, words2.length);
        const baseSimilarity = maxWords === 0 ? 0 : totalMatches / maxWords;
        
        // Bonus for similar word count
        const wordCountRatio = Math.min(words1.length, words2.length) / Math.max(words1.length, words2.length);
        const wordCountBonus = wordCountRatio > 0.85 ? 0.03 : 0; // Reduced bonus
        
        const similarity = Math.min(1, baseSimilarity + wordCountBonus);
        bestSimilarity = Math.max(bestSimilarity, similarity);
      }
    }
    
    return bestSimilarity;
  }, [contractions, phoneticCorrections, fillerWords, findProgressiveMatch]);
  
  // Stricter length checking - require more of the sentence
  const isTextLongEnough = useCallback((text: string, expectedText: string): boolean => {
    if (!text || !expectedText) return false;
    
    const normalizeForLength = (str: string): string => {
      return str
        .toLowerCase()
        .replace(/[.,!?;:'"()]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    const normalizedText = normalizeForLength(text);
    const normalizedExpected = normalizeForLength(expectedText);
    
    const textWordCount = normalizedText.split(/\s+/).filter(w => !fillerWords.includes(w)).length;
    const expectedWordCount = normalizedExpected.split(/\s+/).length;
    
    // Very short responses (1-2 words) - require at least 1 word
    if (expectedWordCount <= 2) {
      return textWordCount >= expectedWordCount * 0.9;
    }
    
    // Short responses (3-5 words) - require at least 80% of words
    if (expectedWordCount <= 5) {
      return textWordCount >= expectedWordCount * 0.8;
    }
    
    // Medium responses (6-10 words) - require at least 85% of words
    if (expectedWordCount <= 10) {
      return textWordCount >= expectedWordCount * 0.85;
    }
    
    // Long responses - require at least 90% of words
    const charLengthRatio = normalizedText.length / normalizedExpected.length;
    const wordLengthRatio = textWordCount / expectedWordCount;
    
    // For long sentences, be stricter
    const requiredRatio = expectedWordCount > 10 ? 0.9 : MIN_TEXT_LENGTH_RATIO;
    
    return charLengthRatio >= requiredRatio || wordLengthRatio >= requiredRatio;
  }, [fillerWords]);
  
  // Block space key function
  const keyBlockerFunction = useCallback((e: KeyboardEvent) => {
    if ((autoSubmitInProgress || microphoneBlocked || isCorrectAnswer || potentiallyCorrect) && e.code === 'Space') {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [autoSubmitInProgress, microphoneBlocked, isCorrectAnswer, potentiallyCorrect]);
  
  // Setup space key blocking
  useEffect(() => {
    keyBlockerRef.current = keyBlockerFunction;
    window.addEventListener('keydown', keyBlockerFunction, true);
    
    return () => {
      window.removeEventListener('keydown', keyBlockerFunction, true);
    };
  }, [keyBlockerFunction]);
  
  // Track recording start time
  useEffect(() => {
    if (isRecording && !recordingStartTimeRef.current) {
      recordingStartTimeRef.current = Date.now();
    } else if (!isRecording) {
      recordingStartTimeRef.current = null;
    }
  }, [isRecording]);
  
  // Main recognition effect with enhanced algorithm
  useEffect(() => {
    if (isMobile || autoSubmitInProgress || !isRecording || !expectedResponse || !currentText || potentiallyCorrect) {
      return;
    }

    const currentThreshold = calculateAdaptiveThreshold(expectedResponse);
    const similarity = calculateImprovedSimilarity(currentText, expectedResponse);
    
    console.log(`📊 Recognition Analysis:
      Similarity: ${(similarity * 100).toFixed(1)}%
      Threshold: ${(currentThreshold * 100).toFixed(1)}%
      Text Length OK: ${isTextLongEnough(currentText, expectedResponse) ? 'Yes' : 'No'}
      Recording Time: ${recordingStartTimeRef.current ? ((Date.now() - recordingStartTimeRef.current) / 1000).toFixed(1) + 's' : 'N/A'}
    `);

    if (similarity >= currentThreshold && isTextLongEnough(currentText, expectedResponse)) {
      console.log('✅ High confidence match detected:', similarity.toFixed(2), '>=', currentThreshold.toFixed(2));
      
      setPotentiallyCorrect(true);
      skipNextDisplayRef.current = true;
      
      clearAllTimeouts();

      potentiallyCorrectTimeoutRef.current = setTimeout(() => {
        if (isRecording) {
          console.log('🎯 Auto-accepting answer with high confidence');
          setIsCorrectAnswer(true);
          setAutoSubmitInProgress(true);
          setMicrophoneBlocked(true);
          
          setDisplayText(expectedResponse);
          skipNextDisplayRef.current = true;
          
          safeStopRecording();

          finalSubmitTimeoutRef.current = setTimeout(() => {
            handleSubmitCorrectAnswer();
          }, PRE_SUBMIT_DELAY);
        } else {
          setPotentiallyCorrect(false);
        }
      }, COLOR_CHANGE_DELAY);
    } else if (potentiallyCorrect) {
      clearAllTimeouts();
      setPotentiallyCorrect(false);
    }
  }, [
    currentText,
    expectedResponse,
    isRecording,
    autoSubmitInProgress,
    isMobile,
    clearAllTimeouts,
    safeStopRecording,
    handleSubmitCorrectAnswer,
    calculateImprovedSimilarity,
    isTextLongEnough,
    potentiallyCorrect,
    calculateAdaptiveThreshold
  ]);

  // Handle microphone click
  const handleMicrophoneClick = useCallback(() => {
    if (isDisabled || isCorrectAnswer || potentiallyCorrect) return;
    
    if (!isMobile) {
      setShowSpaceNotification(true);
      
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
      
      notificationTimeoutRef.current = setTimeout(() => {
        setShowSpaceNotification(false);
      }, NOTIFICATION_DISPLAY_TIME);
    } else {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  }, [isDisabled, isCorrectAnswer, potentiallyCorrect, isRecording, startRecording, stopRecording, isMobile]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, [clearAllTimeouts]);
  
  // Reset state on dialogue change
  useEffect(() => {
    clearAllTimeouts();
    
    setAutoSubmitInProgress(false);
    setIsCorrectAnswer(false);
    setMicrophoneBlocked(false);
    setPotentiallyCorrect(false);
    setDisplayText('');
    correctAnswerTimeRef.current = null;
    recordingStartTimeRef.current = null;
  }, [dialogueState.currentSentenceIndex, dialogueState.currentDialogue, clearAllTimeouts]);
  
  // Size classes
  const sizeClasses = {
    small: {
      button: 'w-12 h-12',
      icon: 'w-5 h-5',
      border: 'w-14 h-14'
    },
    medium: {
      button: 'w-16 h-16',
      icon: 'w-6 h-6',
      border: 'w-20 h-20'
    },
    large: {
      button: 'w-20 h-20',
      icon: 'w-8 h-8',
      border: 'w-24 h-24'
    }
  }[buttonSize];
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white z-50 border-t border-gray-300 shadow-lg">
      <div className="absolute bottom-full left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
      
      {error && (
        <div className="absolute -top-16 left-4 right-4">
          <ErrorMessage message={error} />
        </div>
      )}
      
      {/* Space Key Notification */}
      {!isMobile && showSpaceNotification && (
        <div className="fixed top-1/8 left-1/2 transform -translate-x-1/8 -translate-y-1/8 z-50">
          <div className="bg-indigo-600 text-white px-5 py-4 rounded-lg shadow-md flex items-center gap-3 animate-fade-in max-w-xs">
            <KeySquare className="h-6 w-6 flex-shrink-0" />
            <div>
              <p className="font-medium text-base mb-0.5">Використовуйте "ПРОБІЛ"</p>
              <p className="text-sm text-indigo-100">Натисніть "Пробіл", щоб активувати мікрофон</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-3xl mx-auto px-2 pt-2 pb-3">
        {isMobile ? (
          <>
            <div className="h-[160px] flex flex-col">
              <CompactWordOrderInput 
                onSubmit={onTranscript}
                expectedResponse={expectedResponse}
                disabled={isDisabled}
                isMinimal={true}
                undoLastWordOnly={true}
              />
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 transition-all duration-300 ease-in-out">
              <TranscriptDisplay
                text={displayText}
                onSubmit={handleSubmitCorrectAnswer}
                isRecording={isRecording}
                readonly={true}
                isCorrect={isCorrectAnswer}
              />
            </div>
            
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className={`relative ${sizeClasses.border} flex items-center justify-center`}>
                <div className={`
                  absolute inset-0 rounded-full
                  border-2 ${isCorrectAnswer ? 'border-green-300' : 'border-indigo-200'}
                  transition-all duration-300
                  ${isRecording ? 'animate-pulse' : ''}
                `} />
                
                <div className={`
                  absolute inset-[-2px] rounded-full
                  transition-all duration-300
                  ${isRecording 
                    ? `bg-gradient-to-r ${isCorrectAnswer 
                        ? 'from-green-400 via-green-500 to-green-700' 
                        : 'from-indigo-600 via-indigo-700 to-purple-700'} animate-spin-slow opacity-20`
                    : 'bg-transparent'
                  }
                `} />
                
                <button
                  onClick={handleMicrophoneClick}
                  disabled={isDisabled || isCorrectAnswer || potentiallyCorrect}
                  className={`
                    relative ${sizeClasses.button} rounded-full
                    flex items-center justify-center
                    transition-all duration-300
                    ${(isDisabled || isCorrectAnswer || potentiallyCorrect)
                      ? 'bg-gray-100 cursor-not-allowed'
                      : isRecording
                        ? 'bg-white ring-2 ring-indigo-500'
                        : 'bg-indigo-50 hover:bg-indigo-100 hover:shadow-md active:scale-95'
                    }
                    focus:outline-none focus:ring-2 
                    ${isCorrectAnswer ? 'focus:ring-green-500' : 'focus:ring-indigo-500'} 
                    focus:ring-opacity-50
                    group
                  `}
                  aria-label={
                    isDisabled || isCorrectAnswer || potentiallyCorrect
                      ? 'Please wait' 
                      : isRecording 
                        ? 'Stop recording' 
                        : 'Start recording'
                  }
                >
                  <div className="relative flex items-center justify-center">
                    {isRecording ? (
                      <div className="flex items-center justify-center gap-1">
                        {[...Array(4)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 ${isCorrectAnswer ? 'bg-green-600' : 'bg-indigo-600'} animate-soundwave`}
                            style={{
                              height: buttonSize === 'large' ? '24px' : '16px',
                              animationDelay: `${i * 0.1}s`
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <Mic className={`
                        ${sizeClasses.icon}
                        transition-all duration-300
                        ${(isDisabled || isCorrectAnswer || potentiallyCorrect)
                          ? 'text-gray-400' 
                          : `text-indigo-700 group-hover:scale-110`
                        }
                      `} />
                    )}
                  </div>
                  {isRecording && !isCorrectAnswer && (
                    <div className="absolute -right-1 -top-1 w-3 h-3">
                      <div className="absolute w-full h-full rounded-full bg-rose-600 animate-ping opacity-75" />
                      <div className="relative w-full h-full rounded-full bg-rose-600" />
                    </div>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <style>{`
        @keyframes soundwave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
        .animate-soundwave {
          animation: soundwave 1s ease-in-out infinite;
          border-radius: 1px;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fade-in {
          0% { opacity: 0; transform: translate(-50%, -40%); }
          100% { opacity: 1; transform: translate(-50%, -50%); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}