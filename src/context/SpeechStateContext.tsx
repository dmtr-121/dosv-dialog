import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

// Define the InterimResultStatus interface inline since the import is unresolved
interface InterimResultStatus {
  confidence?: number;
  isAudioReady?: boolean;
  retentionTimeRemaining?: number;
  lastUpdateTime?: number;
}

interface SpeechState {
  isSpeaking: boolean;
  isRecording: boolean;
  isBlocked: boolean;
  transcript: string;
  interimTranscript: string;
  interimStatus?: InterimResultStatus;
  retentionTime: number;
  speechQueue: string[];
  isReadingExpectedResponse: boolean;
  isStudentInputExpected: boolean;
  lastSpeakingTime: number | null;
  isPlayingStudentResponse: boolean;
  isAudioBlockedForRestoration: boolean; // Flag for audio blocking during restoration
}

interface SpeechStateContextType {
  state: SpeechState;
  startSpeaking: () => void;
  stopSpeaking: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  blockSpeechInput: () => void;
  unblockSpeechInput: () => void;
  updateTranscript: (text: string) => void;
  updateInterimTranscript: (text: string, status?: InterimResultStatus) => void;
  setRetentionTime: (time: number) => void;
  clearTranscripts: () => void;
  addToSpeechQueue: (text: string) => void;
  clearSpeechQueue: () => void;
  startReadingExpectedResponse: () => void;
  stopReadingExpectedResponse: () => void;
  expectStudentInput: () => void;
  stopExpectingStudentInput: () => void;
  startPlayingStudentResponse: () => void;
  stopPlayingStudentResponse: () => void;
  blockAudioForRestoration: () => void; // Function to block audio during restoration
  unblockAudioForRestoration: () => void; // Function to unblock audio after restoration
}

const DEFAULT_RETENTION_TIME = 5000;
const SPEECH_COOLDOWN = 1000;

const SpeechStateContext = createContext<SpeechStateContextType | undefined>(undefined);

export function SpeechStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SpeechState>({
    isSpeaking: false,
    isRecording: false,
    isBlocked: true,
    transcript: '',
    interimTranscript: '',
    retentionTime: DEFAULT_RETENTION_TIME,
    speechQueue: [],
    isReadingExpectedResponse: false,
    isStudentInputExpected: false,
    lastSpeakingTime: null,
    isPlayingStudentResponse: false,
    isAudioBlockedForRestoration: false
  });

  // 🆕 Add ref to track if we're currently in restoration mode
  const restorationBlockedRef = useRef(false);
  
  // 🆕 Add ref to track any active audio elements
  const activeAudioElementsRef = useRef<HTMLAudioElement[]>([]);

  const interimTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const blockingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      [interimTimeoutRef, speakingTimeoutRef, blockingTimeoutRef].forEach(ref => {
        if (ref.current) clearTimeout(ref.current);
      });
    };
  }, []);

  const shouldBeBlocked = useCallback((currentState: SpeechState): boolean => {
    // If audio is blocked for restoration, always return true
    if (currentState.isAudioBlockedForRestoration || restorationBlockedRef.current) {
      return true;
    }
    
    const isAnySpeechActive = 
      currentState.isSpeaking || 
      currentState.speechQueue.length > 0 || 
      currentState.isReadingExpectedResponse ||
      currentState.isPlayingStudentResponse;

    const isInCooldown = currentState.lastSpeakingTime && 
                        Date.now() - currentState.lastSpeakingTime < SPEECH_COOLDOWN;

    return !currentState.isStudentInputExpected || 
           isAnySpeechActive || 
           isInCooldown;
  }, []);

  useEffect(() => {
    const newBlockedState = shouldBeBlocked(state);
    if (newBlockedState !== state.isBlocked) {
      if (blockingTimeoutRef.current) {
        clearTimeout(blockingTimeoutRef.current);
      }
      setState(prev => ({ ...prev, isBlocked: newBlockedState }));
    }
  }, [
    state.isStudentInputExpected,
    state.isSpeaking,
    state.speechQueue,
    state.isReadingExpectedResponse,
    state.isPlayingStudentResponse,
    state.lastSpeakingTime,
    state.isAudioBlockedForRestoration,
    shouldBeBlocked
  ]);

  // 🆕 Optimized function to block audio during session restoration
  const blockAudioForRestoration = useCallback(() => {
    console.log('🔇 Blocking audio for session restoration');
    
    // Update our ref to track restoration blocking immediately
    restorationBlockedRef.current = true;
    
    // Cancel any ongoing speech synthesis immediately
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.error('❌ Error cancelling speech synthesis:', e);
      }
    }
    
    // Stop any audio elements that might be playing
    document.querySelectorAll('audio').forEach(audio => {
      try {
        audio.pause();
        // Keep track of paused audio elements
        activeAudioElementsRef.current.push(audio);
      } catch (e) {
        // Ignore any errors
      }
    });
    
    // Clear all timers that might trigger audio
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }
    
    // Make sure we reset all speech-related states
    setState(prev => ({ 
      ...prev, 
      isAudioBlockedForRestoration: true,
      isSpeaking: false,
      isPlayingStudentResponse: false,
      isRecording: false,
      speechQueue: [], // Clear the speech queue to prevent any pending speech
      isBlocked: true  // Ensure input is blocked
    }));
  }, []);

  // 🆕 Enhanced function to unblock audio after session restoration
  const unblockAudioForRestoration = useCallback(() => {
    console.log('🔈 Unblocking audio after session restoration');
    
    // Update our ref to track restoration blocking
    restorationBlockedRef.current = false;
    
    // Clear tracked audio elements
    activeAudioElementsRef.current = [];
    
    // Only change the blocking flag, don't reset other states
    // This prevents unexpected behavior when audio resumes
    setState(prev => ({ 
      ...prev, 
      isAudioBlockedForRestoration: false,
      // Recalculate blocked state based on current conditions
      isBlocked: shouldBeBlocked({
        ...prev,
        isAudioBlockedForRestoration: false
      })
    }));
  }, [shouldBeBlocked]);

  const startPlayingStudentResponse = useCallback(() => {
    // Don't start playing if audio is blocked for restoration
    if (state.isAudioBlockedForRestoration || restorationBlockedRef.current) {
      console.log('🔇 Cannot start student response playback - audio blocked for restoration');
      return;
    }
    
    console.log('[SpeechStateContext].startPlayingStudentResponse()', state);
    setState(prev => ({
      ...prev,
      isPlayingStudentResponse: true,
      isBlocked: true,
      isRecording: false
    }));
  }, [state.isAudioBlockedForRestoration]);

  const stopPlayingStudentResponse = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPlayingStudentResponse: false,
      lastSpeakingTime: Date.now(),
      isBlocked: shouldBeBlocked({
        ...prev,
        isPlayingStudentResponse: false,
        lastSpeakingTime: Date.now()
      })
    }));
  }, [shouldBeBlocked]);

  const startSpeaking = useCallback(() => {
    // Don't start speaking if audio is blocked for restoration
    if (state.isAudioBlockedForRestoration || restorationBlockedRef.current) {
      console.log('🔇 Cannot start speaking - audio blocked for restoration');
      return;
    }
    
    setState(prev => ({ 
      ...prev, 
      isSpeaking: true,
      isRecording: false,
      isBlocked: true,
      isStudentInputExpected: false,
      lastSpeakingTime: Date.now()
    }));
  }, [state.isAudioBlockedForRestoration]);

  const stopSpeaking = useCallback(() => {
    setState(prev => {
      const newState = { 
        ...prev, 
        isSpeaking: false,
        speechQueue: prev.speechQueue.slice(1),
        lastSpeakingTime: Date.now()
      };
      
      if (newState.speechQueue.length > 0 && !prev.isAudioBlockedForRestoration && !restorationBlockedRef.current) {
        if (speakingTimeoutRef.current) {
          clearTimeout(speakingTimeoutRef.current);
        }
        speakingTimeoutRef.current = setTimeout(() => {
          startSpeaking();
        }, SPEECH_COOLDOWN);
      }
      
      return newState;
    });
  }, [startSpeaking]);

  const startRecording = useCallback(() => {
    setState(prev => {
      if (shouldBeBlocked(prev) || prev.isAudioBlockedForRestoration || restorationBlockedRef.current) {
        return prev;
      }
      return { 
        ...prev, 
        isRecording: true, 
        isSpeaking: false,
        isPlayingStudentResponse: false
      };
    });
  }, [shouldBeBlocked]);

  const stopRecording = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isRecording: false 
    }));
  }, []);

  const addToSpeechQueue = useCallback((text: string) => {
    // Don't add to speech queue if audio is blocked for restoration
    if (state.isAudioBlockedForRestoration || restorationBlockedRef.current) {
      console.log('🔇 Cannot add to speech queue - audio blocked for restoration');
      return;
    }
    
    setState(prev => {
      const newQueue = [...prev.speechQueue, text];
      const newState = {
        ...prev,
        speechQueue: newQueue,
        isBlocked: true,
        isStudentInputExpected: false
      };

      if (!prev.isSpeaking && newQueue.length === 1) {
        if (speakingTimeoutRef.current) {
          clearTimeout(speakingTimeoutRef.current);
        }
        speakingTimeoutRef.current = setTimeout(() => {
          startSpeaking();
        }, SPEECH_COOLDOWN);
      }

      return newState;
    });
  }, [startSpeaking, state.isAudioBlockedForRestoration]);

  const clearSpeechQueue = useCallback(() => {
    setState(prev => ({
      ...prev,
      speechQueue: [],
      isBlocked: shouldBeBlocked({ ...prev, speechQueue: [] })
    }));
  }, [shouldBeBlocked]);

  const expectStudentInput = useCallback(() => {
    // Don't expect input if audio is blocked for restoration
    if (state.isAudioBlockedForRestoration || restorationBlockedRef.current) {
      console.log('🔇 Cannot expect student input - audio blocked for restoration');
      return;
    }
    
    setState(prev => ({
      ...prev,
      isStudentInputExpected: true,
      isBlocked: shouldBeBlocked({ ...prev, isStudentInputExpected: true })
    }));
  }, [shouldBeBlocked, state.isAudioBlockedForRestoration]);

  const stopExpectingStudentInput = useCallback(() => {
    setState(prev => ({
      ...prev,
      isStudentInputExpected: false,
      isBlocked: true
    }));
  }, []);

  const startReadingExpectedResponse = useCallback(() => {
    // Don't start reading if audio is blocked for restoration
    if (state.isAudioBlockedForRestoration || restorationBlockedRef.current) {
      console.log('🔇 Cannot read expected response - audio blocked for restoration');
      return;
    }
    
    setState(prev => ({
      ...prev,
      isReadingExpectedResponse: true,
      isBlocked: true,
      isStudentInputExpected: false
    }));
  }, [state.isAudioBlockedForRestoration]);

  const stopReadingExpectedResponse = useCallback(() => {
    setState(prev => ({
      ...prev,
      isReadingExpectedResponse: false,
      lastSpeakingTime: Date.now(),
      isBlocked: shouldBeBlocked({ 
        ...prev, 
        isReadingExpectedResponse: false,
        lastSpeakingTime: Date.now()
      })
    }));
  }, [shouldBeBlocked]);

  const updateTranscript = useCallback((text: string) => {
    setState(prev => ({ 
      ...prev, 
      transcript: text 
    }));
  }, []);

  const updateInterimTranscript = useCallback((text: string, status?: InterimResultStatus) => {
    if (interimTimeoutRef.current) {
      clearTimeout(interimTimeoutRef.current);
    }

    setState(prev => ({ 
      ...prev, 
      interimTranscript: text,
      interimStatus: status ? {
        ...status,
        retentionTimeRemaining: prev.retentionTime,
        lastUpdateTime: Date.now()
      } : undefined
    }));

    if (text) {
      interimTimeoutRef.current = setTimeout(() => {
        setState(prev => {
          if (prev.interimStatus?.lastUpdateTime === Date.now()) {
            return {
              ...prev,
              interimTranscript: '',
              interimStatus: undefined
            };
          }
          return prev;
        });
      }, state.retentionTime);
    }
  }, [state.retentionTime]);

  const setRetentionTime = useCallback((time: number) => {
    setState(prev => ({
      ...prev,
      retentionTime: time
    }));
  }, []);

  const clearTranscripts = useCallback(() => {
    if (interimTimeoutRef.current) {
      clearTimeout(interimTimeoutRef.current);
    }
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      interimStatus: undefined
    }));
  }, []);

  const blockSpeechInput = useCallback(() => {
    setState(prev => ({ ...prev, isBlocked: true }));
  }, []);

  const unblockSpeechInput = useCallback(() => {
    // Don't unblock if audio is blocked for restoration
    if (state.isAudioBlockedForRestoration || restorationBlockedRef.current) {
      console.log('🔇 Cannot unblock speech input - audio blocked for restoration');
      return;
    }
    
    setState(prev => ({ 
      ...prev, 
      isBlocked: shouldBeBlocked(prev)
    }));
  }, [shouldBeBlocked, state.isAudioBlockedForRestoration]);

  return (
    <SpeechStateContext.Provider 
      value={{ 
        state, 
        startSpeaking, 
        stopSpeaking, 
        startRecording, 
        stopRecording,
        blockSpeechInput,
        unblockSpeechInput,
        updateTranscript,
        updateInterimTranscript,
        setRetentionTime,
        clearTranscripts,
        addToSpeechQueue,
        clearSpeechQueue,
        startReadingExpectedResponse,
        stopReadingExpectedResponse,
        expectStudentInput,
        stopExpectingStudentInput,
        startPlayingStudentResponse,
        stopPlayingStudentResponse,
        blockAudioForRestoration,
        unblockAudioForRestoration
      }}
    >
      {children}
    </SpeechStateContext.Provider>
  );
}

export function useSpeechState() {
  const context = useContext(SpeechStateContext);
  if (!context) {
    throw new Error('useSpeechState must be used within a SpeechStateProvider');
  }
  return context;
}