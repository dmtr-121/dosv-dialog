import { useState, useCallback, useEffect, useRef } from 'react';
import { useSpeechState } from '../context/SpeechStateContext';
import { SpeechRecognitionService } from '../services/speechRecognition/speechRecognitionService';

const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

interface RecognitionState {
  isRecording: boolean;
  error: string | null;
  currentText: string;
  showShortcutHint?: boolean;
  isTimedOut?: boolean;
  isInitializing?: boolean; // 🆕 New state to track first-time initialization
  hasInitialized?: boolean; // 🆕 Track if mic has been initialized before
}

interface UseSpeechInputProps {
  onTranscript: (text: string) => void;
  language?: string;
}

interface ExtendedSpeechRecognition extends SpeechRecognition {
  mode?: 'ondevice-preferred' | 'ondevice-only' | 'cloud-only';
}

export function useSpeechInput({
  onTranscript, 
  language = 'en-UK' 
}: UseSpeechInputProps) {
  const [state, setState] = useState<RecognitionState>({
    isRecording: false,
    error: null,
    currentText: '',
    showShortcutHint: false,
    isTimedOut: false,
    isInitializing: false, // 🆕 Initialize as false
    hasInitialized: false  // 🆕 Initialize as false
  });
  const isDesktop = !isMobile();

  const { state: speechState, startRecording: startSpeechState, stopRecording: stopSpeechState } = useSpeechState();
  
  const recognitionServiceRef = useRef<SpeechRecognitionService | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 🆕 Reference for initialization timeout

  const setCurrentText = useCallback((text: string) => {
    setState(prev => ({ ...prev, currentText: text }));
  }, []);

  const onRecordingStarted = useCallback(() => {
    console.log('[useSpeechInput].onRecordingStarted()');
    playSoundRef.current?.play();
    setState(prev => ({
      ...prev,
      isRecording: true,
      error: null,
      currentText: '',
      isTimedOut: false,
      isInitializing: false, // 🆕 No longer initializing once recording starts
      hasInitialized: true   // 🆕 Mark as initialized
    }));
    
    // Set a 45-second timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      console.log('[useSpeechInput].timeout(): 45-second timeout reached');
      handleStopRecording(true);
    }, 45000);
  }, []);

  const cleanup = useCallback(() => {
    console.log('[useSpeechInput].cleanup(): cleanup in useSpeechInput');
    recognitionServiceRef.current?.stop();
    recognitionServiceRef.current?.cleanup();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // 🆕 Clear initialization timeout if exists
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
  }, []);

  const handleError = useCallback((error: string) => {
    errorSoundRef.current?.play();
    setState(prev => ({ 
      ...prev, 
      isRecording: false, 
      error,
      isInitializing: false // 🆕 No longer initializing if there's an error
    }));

    stopSpeechState();
  }, [stopSpeechState]);

  const handleTranscript = useCallback((text: string) => {
    console.log('[useSpeechInput].handleTranscript()');
    setState(prev => ({ ...prev, currentText: text }));
  }, []);

  const handleStopRecording = useCallback((isTimeout: boolean = false) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    recognitionServiceRef.current?.stop();
    
    setState(prev => ({
      ...prev,
      isRecording: false,
      error: null,
      isTimedOut: isTimeout,
      isInitializing: false // 🆕 No longer initializing when recording stops
    }));
    
    stopSpeechState();
  }, [stopSpeechState]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    console.log('[useSpeechInput].onKeyPress()]');
    if (!isDesktop || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

    if (event.code === 'Space') {
      event.preventDefault();
      
      if (state.isRecording) {
        handleStopRecording();
        if (state.currentText.trim()) {
          onTranscript(state.currentText.trim());
          setState(prev => ({ ...prev, currentText: '' }));
        }
      } else if (!speechState.isSpeaking) {
        handleStartRecording();
      }
    }
  }, [state.isRecording, state.currentText, speechState.isSpeaking, onTranscript, handleStopRecording]);

  useEffect(() => {
    if (isDesktop) {
      setState(prev => ({ ...prev, showShortcutHint: true }));
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, showShortcutHint: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isDesktop]);

  useEffect(() => {
    if (isDesktop) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [handleKeyPress, isDesktop]);

  const playSoundRef = useRef<HTMLAudioElement | null>(null);
  const errorSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!playSoundRef.current) {
        playSoundRef.current = new Audio('/navigation_forward-selection-minimal.wav');
        playSoundRef.current.preload = 'auto';
    }

    if (!errorSoundRef.current) {
        errorSoundRef.current = new Audio('/alert_error.wav');
        errorSoundRef.current.preload = 'auto';
    }

    return () => {
        if (playSoundRef.current) {
          playSoundRef.current.pause();
          playSoundRef.current.currentTime = 0;
        }
        if (errorSoundRef.current) {
          errorSoundRef.current.pause();
          errorSoundRef.current.currentTime = 0;
        }
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        // 🆕 Clear initialization timeout on unmount
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = null;
        }
    };
  }, []);

  const handleStartRecording = useCallback(() => {
    if (speechState.isSpeaking) {
      console.log('[useSpeechInput].handleStartRecording(): Cannot start recording while speech is playing');
      setState(prev => ({
        ...prev,
        error: 'Please wait for the speech to finish'
      }));
      return;
    }

    if (state.isRecording) {
      console.log('[useSpeechInput].handleStartRecording(): Already recording');
      setState(prev => ({
        ...prev,
        error: 'Recording is already in progress'
      }));
      return;
    }

    try {
      // 🆕 Show initialization message only on first use
      if (!state.hasInitialized) {
        console.log('[useSpeechInput].handleStartRecording(): First time initialization');
        setState(prev => ({
          ...prev,
          isInitializing: true,
          error: null
        }));
        
        // 🆕 Set a timeout to ensure initialization doesn't show for too long
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
        }
        
        initTimeoutRef.current = setTimeout(() => {
          // After 2 seconds max, force continue even if initialization is still happening
          setState(prev => {
            if (prev.isInitializing) {
              return {
                ...prev,
                isInitializing: false,
                hasInitialized: true
              };
            }
            return prev;
          });
        }, 2000);
      }
      
      startSpeechState();
      recognitionServiceRef.current?.start(handleTranscript, handleError, handleStopRecording, onRecordingStarted);
      
      // Only set recording to true immediately if already initialized
      if (state.hasInitialized) {
        setState(prev => ({
          ...prev,
          isRecording: true,
          error: null,
          currentText: '',
          isTimedOut: false
        }));
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        isRecording: false,
        error: 'Failed to start recording. Please try again.',
        currentText: '',
        isInitializing: false
      }));
      stopSpeechState();
      console.error('[useSpeechInput].handleStartRecording(): Failed to start recording', err);
      cleanup();
    }
  }, [speechState.isSpeaking, state.isRecording, state.hasInitialized, startSpeechState, cleanup, stopSpeechState, handleTranscript, handleError, onRecordingStarted]);

  const handleTextSubmit = useCallback(() => {
    console.log('[useSpeechInput].handleTextSubmit()');
    if (state.currentText.trim()) {
      onTranscript(state.currentText.trim());
      setState(prev => ({ ...prev, currentText: '', isTimedOut: false }));
    }
  }, [state.currentText, onTranscript]);

  useEffect(() => {
    if (!recognitionServiceRef.current) {
      recognitionServiceRef.current = new SpeechRecognitionService(
        isMobile(), language, errorSoundRef.current
      );
      console.log('[useSpeechInput].useEffect(): recognition service initialization', recognitionServiceRef.current.wsClientId);
      window.addEventListener("beforeunload", () => {
        console.log('[useSpeechInput].useEffect(): add beforeunload', recognitionServiceRef.current?.wsClientId);
        recognitionServiceRef.current?.emitEndEvent()
      });
    }

    return () => {
      if (recognitionServiceRef.current) {
        console.log('[useSpeechInput].useEffect() return: recognition service cleanup (after init useEffect)', recognitionServiceRef.current.wsClientId);
        recognitionServiceRef.current.stop();
        recognitionServiceRef.current.cleanup();
        recognitionServiceRef.current = null;
      }
      window.removeEventListener("beforeunload", () => {
        console.log('[useSpeechInput].useEffect(): remove beforeunload', recognitionServiceRef.current?.wsClientId);
        recognitionServiceRef.current?.emitEndEvent()
      });
    };
  }, [language]);

  useEffect(() => {
    if (isMobile() && state.currentText.trim() && !state.isRecording && !state.isTimedOut) {
      console.log('[useSpeechInput].useEffect(): Mobile: Submitting text', state, new Date());
      handleTextSubmit();
    }
  }, [state.isRecording, state.currentText, state.isTimedOut, handleTextSubmit]);

  return {
    isRecording: state.isRecording,
    error: state.error,
    currentText: state.currentText,
    setCurrentText,
    startRecording: handleStartRecording,
    stopRecording: handleStopRecording,
    handleTextSubmit,
    showShortcutHint: state.showShortcutHint,
    isTimedOut: state.isTimedOut,
    tryAgain: handleStartRecording,
    isInitializing: state.isInitializing, // 🆕 Expose initialization state
    hasInitialized: state.hasInitialized  // 🆕 Expose whether mic has been initialized before
  };
}