// src/context/dialogue/DialogueContext.tsx
// Updated to remove speech synthesis dependencies and rely only on audio URLs
import React, { createContext, useReducer, useCallback, useEffect, ReactNode, useState, useRef } from 'react';
import { validateAnswer } from '../../utils/textProcessing';
import { generateHint } from '../../utils/hints/hintGenerator';
import { compareTexts } from '../../utils/textComparison';
import { DialogueContextType, DialogueStep } from '../../types/dialogue';
import { dialogueReducer, initialState, DialogueState } from './reducer';
import { useAudioPlayback } from '../../hooks/useAudioPlayback';
import { HINT_MESSAGES } from '../../utils/hints/hintMessages';
import { getAudioUrlForMessage } from '../../utils/audio/audioAssets';
import { 
  saveDialogueProgress, 
  loadDialogueProgress, 
  clearDialogueProgress,
  hasDialogueProgress,
  saveCompletedDialogue,
  isDialogueCompleted,
  resetDialogue,
  cleanupStorage
} from '../../utils/enhancedStorage';
import { MedicalDialogue } from '../../types/medicalDialogue';

export const DialogueContext = createContext<DialogueContextType | undefined>(undefined);

// Configuration for message timing and animations
const MESSAGE_CONFIG = {
  // Pause durations in milliseconds
  successToNextMessagePause: 200, // Extended pause after success message
  skipToNextMessagePause: 200,    // Pause after skipping
  messageTransitionDelay: 200,    // Smooth delay between messages for visual effect
  
  // Set to false to disable typing animation
  enableTypingAnimation: false,
  
  // Timeout for emergency fallbacks
  audioTimeout: 10000, // 10 seconds
  speakingTimeout: 15000 // 15 seconds 
};

export function DialogueProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dialogueReducer, initialState);
  const { playAudioFromUrl, stopAudio } = useAudioPlayback();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pendingStep, setPendingStep] = useState<DialogueStep | null>(null);
  const emergencyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track skip confirmation state
  const [skipConfirmationTimeout, setSkipConfirmationTimeout] = useState<NodeJS.Timeout | null>(null);

  // Enhanced delay calculation based on content length and type
  // Keeping infrastructure but setting values to minimal for smoother experience
  const calculateMessageDelay = useCallback((text: string, type: string): number => {
    if (!MESSAGE_CONFIG.enableTypingAnimation) return MESSAGE_CONFIG.messageTransitionDelay;
    
    const baseDelay = type === 'instruction' ? 0 : 0;
    const wordCount = text.trim().split(/\s+/).length;
    const estimatedSpeechTime = wordCount * 0;
    const lengthFactor = wordCount > 0 ? 0 : 0;
    
    return Math.min(
      Math.max(estimatedSpeechTime * lengthFactor, baseDelay),
      0
    );
  }, []);

  // Setup emergency timeout to prevent dialogue from getting stuck
  const setupEmergencyTimeout = useCallback((timeoutMs: number = 15000) => {
    // Clear any existing timeout
    if (emergencyTimeoutRef.current) {
      clearTimeout(emergencyTimeoutRef.current);
      emergencyTimeoutRef.current = null;
    }

    // Set a new timeout
    emergencyTimeoutRef.current = setTimeout(() => {
      console.warn(`⚠️ Emergency timeout triggered after ${timeoutMs}ms`);
      
      // Force stop all audio and continue dialogue
      stopAudio();
      setIsSpeaking(false);
      
      // Check if we need to move to the next step
      if (pendingStep) {
        showDialogueStep(pendingStep);
        setPendingStep(null);
      } else {
        const nextIndex = state.currentSentenceIndex + 1;
        if (state.currentDialogue && nextIndex < state.currentDialogue.conversation.length) {
          dispatch({ type: 'NEXT_SENTENCE' });
          showDialogueStep(state.currentDialogue.conversation[nextIndex]);
        } else if (state.currentDialogue) {
          dispatch({ type: 'SET_COMPLETE' });
        }
      }
    }, timeoutMs);

    return () => {
      if (emergencyTimeoutRef.current) {
        clearTimeout(emergencyTimeoutRef.current);
        emergencyTimeoutRef.current = null;
      }
    };
  }, [pendingStep, state.currentSentenceIndex, state.currentDialogue, stopAudio]);

  // Updated function to handle audio URLs only
  const speakContent = useCallback(async (text: string, audioUrl: string | undefined, callbacks: any) => {
    // Setup emergency timeout to prevent dialogue from getting stuck
    const cleanupTimeout = setupEmergencyTimeout(MESSAGE_CONFIG.speakingTimeout);
    
    if (audioUrl) {
      // Use audio URL if available
      try {
        await playAudioFromUrl(audioUrl, {
          onStart: () => {
            setIsSpeaking(true);
            callbacks.onStart?.();
          },
          onEnd: () => {
            cleanupTimeout();
            setIsSpeaking(false);
            callbacks.onEnd?.();
          },
          onError: (error) => {
            console.error(`❌ Error playing audio: ${error}`);
            // Continue dialogue without audio - no speech synthesis fallback
            cleanupTimeout();
            setIsSpeaking(false);
            callbacks.onEnd?.(); // Call onEnd to ensure dialogue continues
          },
          // Add timeout to ensure dialogue doesn't get stuck
          timeout: MESSAGE_CONFIG.audioTimeout
        });
      } catch (error) {
        console.error(`❌ Error playing audio URL: ${error}`);
        cleanupTimeout();
        setIsSpeaking(false);
        callbacks.onEnd?.(); // Call onEnd to ensure dialogue continues
      }
    } else {
      // No audio URL, continue dialogue without audio
      console.log('⚠️ No audio URL available, continuing dialogue without audio');
      cleanupTimeout();
      setIsSpeaking(false);
      callbacks.onEnd?.(); // Call onEnd to ensure dialogue continues
    }
  }, [playAudioFromUrl, setupEmergencyTimeout]);

  const showDialogueStep = useCallback((step: DialogueStep) => {
    if (isSpeaking) {
      setPendingStep(step);
      return;
    }
    
    const messageText = step.teacherApp || step.ukrainian || '';
    const delay = calculateMessageDelay(messageText, step.type);

    requestAnimationFrame(() => {
      setTimeout(() => {
        let finalText = '';
        const grammarNote = step.grammarNote;
        
        switch (step.type) {
          case 'vocabulary':
            finalText = `${step.teacherApp}`;
            break;
          case 'conversation':
            finalText = step.teacherApp || step.ukrainian || '';
            break;
          case 'instruction':
            finalText = step.teacherApp || '';
            break;
          default:
            finalText = step.teacherApp || '';
        }

        if (finalText) {
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: Date.now(),
              text: finalText,
              isUser: false,
              type: step.type,
              expectedResponse: step.expectedResponse,
              grammarNote: grammarNote,
              ukrainian: step.ukrainian,
              audioUrl: step.audioUrl // Pass the audio URL to the message
            }
          });
        }
        
        if (step.type === 'instruction' && !step.expectedResponse) {
          setIsSpeaking(true);
          // For instruction type, make sure we prioritize the audio URL if available
          const effectiveAudioUrl = step.audioUrl || getAudioUrlForMessage('instruction');
          
          speakContent(finalText, effectiveAudioUrl, {
            onStart: () => setIsSpeaking(true),
            onEnd: () => {
              setIsSpeaking(false);
              const nextIndex = state.currentSentenceIndex + 1;
              if (state.currentDialogue && nextIndex < state.currentDialogue.conversation.length) {
                dispatch({ type: 'NEXT_SENTENCE' });
                
                // Add a smooth transition delay before showing next message
                setTimeout(() => {
                  const nextStep = state.currentDialogue!.conversation[nextIndex];
                  showDialogueStep(nextStep);
                }, MESSAGE_CONFIG.messageTransitionDelay);
              } else {
                dispatch({ type: 'SET_COMPLETE' });
              }
            }
          });
        }
      }, delay);
    });
  }, [speakContent, calculateMessageDelay, isSpeaking, state.currentSentenceIndex, state.currentDialogue, dispatch]);

  // Load dialogue with progress if available
  const setDialogueWithProgress = useCallback((dialogue: MedicalDialogue): boolean => {
    if (!dialogue || !dialogue.id) {
      dispatch({ type: 'RESET' });
      dispatch({ type: 'SET_DIALOGUE', payload: dialogue });
      return false;
    }

    // Check for existing progress
    if (hasDialogueProgress(dialogue.id)) {
      const progress = loadDialogueProgress(dialogue.id);
      if (progress && progress.messages && progress.messages.length > 0) {
        console.log('🔄 Loading saved dialogue progress');
        // Set dialogue first, then load progress
        dispatch({ type: 'RESET' });
        dispatch({ type: 'SET_DIALOGUE', payload: dialogue });
        dispatch({ type: 'LOAD_PROGRESS', payload: progress });
        return true;
      }
    }
    
    // No saved progress, start fresh
    console.log('🆕 Starting dialogue from beginning');
    dispatch({ type: 'RESET' });
    dispatch({ type: 'SET_DIALOGUE', payload: dialogue });
    return false;
  }, [dispatch]);

  // Reset dialogue to start from beginning even if completed
  const resetDialogueProgress = useCallback((dialogueId: string): void => {
    if (!dialogueId) return;
    
    console.log('🔄 Resetting dialogue to start from beginning:', dialogueId);
    resetDialogue(dialogueId);
    
    // If this is the current dialogue, reset state
    if (state.currentDialogue?.id === dialogueId) {
      dispatch({ type: 'RESET' });
      
      // Show first step after a short delay for better UI
      setTimeout(() => {
        if (state.currentDialogue) {
          showDialogueStep(state.currentDialogue.conversation[0]);
        }
      }, 100);
    }
  }, [state.currentDialogue, dispatch, showDialogueStep]);

  // Handle pending steps when speech ends
  useEffect(() => {
    if (!isSpeaking && pendingStep) {
      // Add a slight delay for smoother transitions when handling pending steps
      setTimeout(() => {
        showDialogueStep(pendingStep);
        setPendingStep(null);
      }, MESSAGE_CONFIG.messageTransitionDelay);
    }
  }, [isSpeaking, pendingStep, showDialogueStep]);

  // Run cleanup on mount to remove any expired items
  useEffect(() => {
    cleanupStorage();
  }, []);

  // Save progress when relevant state changes
  useEffect(() => {
    if (state.currentDialogue?.id && !state.isComplete) {
      saveDialogueProgress(state.currentDialogue.id, {
        currentSentenceIndex: state.currentSentenceIndex,
        messages: state.messages,
        attempts: state.attempts,
        showingAnswer: state.showingAnswer,
        wordsSpoken: state.wordsSpoken,
        skippedPhrases: state.skippedPhrases,
        startTime: state.startTime,
        isRestoredState: true // Mark as restored state
      });
    }
  }, [
    state.currentSentenceIndex,
    state.messages.length, // Trigger only when message count changes
    state.attempts,
    state.showingAnswer,
    state.currentDialogue?.id,
    state.isComplete
  ]);

  // Save completion data when dialogue is completed
  useEffect(() => {
    if (state.isComplete && state.currentDialogue?.id) {
      // Save completion data to local storage
      saveCompletedDialogue(state.currentDialogue.id, new Date());
      
      // Progress data is automatically cleared by saveCompletedDialogue
    }
  }, [state.isComplete, state.currentDialogue?.id]);

  const handleTranscript = useCallback((text: string) => {
  if (!state.currentDialogue || !state.currentDialogue.conversation[state.currentSentenceIndex]) {
    return;
  }
  
  const currentStep = state.currentDialogue.conversation[state.currentSentenceIndex];
  const validation = validateAnswer(text, currentStep.expectedResponse || '', []);
  
  const { similarity, corrections } = compareTexts(text, currentStep.expectedResponse || '');
  
  dispatch({
    type: 'ADD_MESSAGE',
    payload: {
      id: Date.now(),
      text: validation.similarity >= 0.8 ? validation.correctedText : text,
      originalText: text,
      isUser: true,
      type: 'student-response',
      similarity: validation.similarity,
      expectedResponse: currentStep.expectedResponse,
      corrections: corrections // Always include corrections
    }
  });

  if (validation.similarity >= 0.8) {
    dispatch({
      type: 'UPDATE_LAST_MESSAGE',
      payload: {
        isCorrect: true,
        expectedResponse: currentStep.expectedResponse
      }
    });

    if (currentStep.expectedResponse) {
      setIsSpeaking(true);
      
      // Play the response audio if available
      const responseAudioUrl = currentStep.responseAudioUrl || getAudioUrlForMessage('success');
      
      speakContent(currentStep.expectedResponse, responseAudioUrl, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => {
          setIsSpeaking(false);
          
          // Add a slight delay before showing success message for smoother visual flow
          setTimeout(() => {
            const randomMessage = HINT_MESSAGES.SHORT_SUCCESS_MESSAGES[
              Math.floor(Math.random() * HINT_MESSAGES.SHORT_SUCCESS_MESSAGES.length)
            ];
            
            // Get a success audio URL for the success message
            const successAudioUrl = getAudioUrlForMessage('success');
            
            dispatch({
              type: 'ADD_MESSAGE',
              payload: {
                id: Date.now() + 1,
                text: randomMessage,
                isUser: false,
                isCorrect: true,
                type: 'conversation',
                audioUrl: successAudioUrl // Use success audio for correct responses
              }
            });

            // Add a significantly longer delay before showing the next step
            setTimeout(() => {
              const nextIndex = state.currentSentenceIndex + 1;
              if (state.currentDialogue && nextIndex < state.currentDialogue.conversation.length) {
                dispatch({ type: 'NEXT_SENTENCE' });
                showDialogueStep(state.currentDialogue.conversation[nextIndex]);
              } else {
                dispatch({ type: 'SET_COMPLETE' });
              }
            }, MESSAGE_CONFIG.successToNextMessagePause);
          }, MESSAGE_CONFIG.messageTransitionDelay);
        }
      });
    }
  } else {
    dispatch({ type: 'INCREMENT_ATTEMPTS' });
    
    // Check if this is the third attempt
    if (state.attempts + 1 === 3) {
      // For the third attempt, we DON'T dispatch the student's incorrect attempt
      // Instead, we immediately replace it with the correct answer
      
      // Update the last message (which was just added with the incorrect response)
      // to show the expected response instead, as if student said it correctly
      dispatch({
        type: 'UPDATE_LAST_MESSAGE',
        payload: {
          text: currentStep.expectedResponse || '',
          isCorrect: true,
          expectedResponse: currentStep.expectedResponse
        }
      });
      
      // Get audio URL for the correct response
      const responseAudioUrl = currentStep.responseAudioUrl || getAudioUrlForMessage('success');
      
      // Play the correct answer audio
      setIsSpeaking(true);
      speakContent(currentStep.expectedResponse || '', responseAudioUrl, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => {
          setIsSpeaking(false);
          
          // Add success message after a short delay
          setTimeout(() => {
            const randomMessage = HINT_MESSAGES.SHORT_SUCCESS_MESSAGES[
              Math.floor(Math.random() * HINT_MESSAGES.SHORT_SUCCESS_MESSAGES.length)
            ];
            
            // Get a success audio URL for the success message
            const successAudioUrl = getAudioUrlForMessage('success');
            
            dispatch({
              type: 'ADD_MESSAGE',
              payload: {
                id: Date.now() + 1,
                text: randomMessage,
                isUser: false,
                isCorrect: true,
                type: 'conversation',
                audioUrl: successAudioUrl
              }
            });
            
            // Move to next step after a delay
            setTimeout(() => {
              const nextIndex = state.currentSentenceIndex + 1;
              if (state.currentDialogue && nextIndex < state.currentDialogue.conversation.length) {
                dispatch({ type: 'NEXT_SENTENCE' });
                showDialogueStep(state.currentDialogue.conversation[nextIndex]);
              } else {
                dispatch({ type: 'SET_COMPLETE' });
              }
            }, MESSAGE_CONFIG.successToNextMessagePause);
          }, MESSAGE_CONFIG.messageTransitionDelay);
        }
      });
    } else {
      // First or second attempt - show appropriate hint
      const hint = generateHint({
        answer: currentStep.expectedResponse || '',
        attempt: state.attempts + 1,
        totalWords: (currentStep.expectedResponse || '').split(' ').length,
        firstWord: (currentStep.expectedResponse || '').split(' ')[0]
      });

      // Get appropriate hint audio for the current attempt
      const hintAudioUrl = getAudioUrlForMessage('hint', undefined, state.attempts + 1);

      // Add a small delay for smoother hint appearance
      setTimeout(() => {
        dispatch({
          type: 'ADD_MESSAGE',
          payload: {
            id: Date.now() + 1,
            text: hint,
            isUser: false,
            isHint: true,
            type: 'conversation',
            audioUrl: hintAudioUrl // Use predefined hint audio based on attempt number
          }
        });

        if (state.showingAnswer && currentStep.expectedResponse) {
          setIsSpeaking(true);
          // Use response audio URL if available, otherwise use predefined hint
          const finalHintAudio = currentStep.responseAudioUrl || getAudioUrlForMessage('hint', undefined, 3);
          
          speakContent(currentStep.expectedResponse, finalHintAudio, {
            onStart: () => setIsSpeaking(true),
            onEnd: () => setIsSpeaking(false)
          });
        }
      }, MESSAGE_CONFIG.messageTransitionDelay);
    }
  }
}, [state.currentDialogue, state.currentSentenceIndex, state.attempts, state.showingAnswer, speakContent, showDialogueStep]);

const handleSkip = useCallback(() => {
  if (!state.currentDialogue?.conversation) return;

  const currentStep = state.currentDialogue.conversation[state.currentSentenceIndex];
  
  if (skipConfirmationTimeout) {
    clearTimeout(skipConfirmationTimeout);
    setSkipConfirmationTimeout(null);
  }

  dispatch({
    type: 'SKIP_STEP',
    payload: {
      skippedIndex: state.currentSentenceIndex,
      timestamp: Date.now()
    }
  });
  
  // Small delay for consistent behavior
  setTimeout(() => {
    if (currentStep.expectedResponse) {
      // Get appropriate audio URL for the skipped answer
      const audioUrl = currentStep.responseAudioUrl || getAudioUrlForMessage('hint', undefined, 3);
      
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: Date.now(),
          text: currentStep.expectedResponse,
          isUser: false,
          type: 'correct-answer',
          isCorrect: true,
          audioUrl: audioUrl // Use response audio URL if available
        }
      });
      
      setIsSpeaking(true);
      speakContent(currentStep.expectedResponse, audioUrl, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => {
          setIsSpeaking(false);
          // Add a longer pause after showing the correct answer
          setTimeout(() => {
            const nextIndex = state.currentSentenceIndex + 1;
            if (nextIndex < state.currentDialogue!.conversation.length) {
              dispatch({ type: 'NEXT_SENTENCE' });
              showDialogueStep(state.currentDialogue!.conversation[nextIndex]);
            } else {
              dispatch({ type: 'SET_COMPLETE' });
            }
          }, MESSAGE_CONFIG.skipToNextMessagePause);
        }
      });
    }
  }, MESSAGE_CONFIG.messageTransitionDelay);
}, [state.currentDialogue, state.currentSentenceIndex, skipConfirmationTimeout, speakContent, showDialogueStep]);

// Check if dialogue is already completed
const isCurrentDialogueCompleted = useCallback(() => {
  if (!state.currentDialogue?.id) return false;
  return isDialogueCompleted(state.currentDialogue.id);
}, [state.currentDialogue?.id]);

// Initialize first step
useEffect(() => {
  if (state.currentDialogue?.conversation && !state.messages.length) {
    showDialogueStep(state.currentDialogue.conversation[0]);
  }
}, [state.currentDialogue, state.messages.length, showDialogueStep]);

// Cleanup audio playback
useEffect(() => {
  return () => {
    stopAudio();
    setIsSpeaking(false);
    setPendingStep(null);
    
    if (emergencyTimeoutRef.current) {
      clearTimeout(emergencyTimeoutRef.current);
      emergencyTimeoutRef.current = null;
    }
  };
}, [stopAudio]);

return (
  <DialogueContext.Provider value={{ 
    state, 
    dispatch, 
    handleTranscript,
    handleSkip,
    skipConfirmationTimeout,
    setSkipConfirmationTimeout,
    setDialogueWithProgress,
    resetDialogueProgress,
    isCurrentDialogueCompleted
  }}>
    {children}
  </DialogueContext.Provider>
);
}