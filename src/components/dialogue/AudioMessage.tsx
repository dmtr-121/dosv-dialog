// src/components/dialogue/AudioMessage.tsx - Modified to remove speech synthesis fallback
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useAudioPlayback } from '../../hooks/useAudioPlayback';
import { useSpeechState } from '../../context/SpeechStateContext';
import { Message } from '../../types/dialogue';
import { getAudioUrlForMessage } from '../../utils/audio/audioAssets';
import { useDialogueContext } from '../../context/dialogue';

interface AudioMessageProps {
  message: Message;
  autoPlay?: boolean;
  onlyShowButton?: boolean;
}

export default function AudioMessage({ 
  message, 
  autoPlay = true,
  onlyShowButton = false 
}: AudioMessageProps) {
  const { playAudioFromUrl, stopAudio, speaking } = useAudioPlayback();
  const { 
    state: speechState,
    startPlayingStudentResponse,
    stopPlayingStudentResponse
  } = useSpeechState();
  
  // Get dialogue state to check if this is a restored state
  const { state: dialogueState } = useDialogueContext();
  
  const hasPlayedRef = useRef<Set<number>>(new Set());
  const timeoutRef = useRef<NodeJS.Timeout>();
  const messageRef = useRef(message);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get the effective audio URL for this message
  const getEffectiveAudioUrl = useCallback((msg: Message): string | undefined => {
    if (msg.audioUrl) return msg.audioUrl;
    
    const messageType = msg.isHint 
      ? 'hint' 
      : msg.isCorrect 
        ? 'success' 
        : msg.type || 'conversation';
    
    return getAudioUrlForMessage(
      messageType as any, 
      undefined, 
      messageType === 'hint' ? 3 : 0
    );
  }, []);

  // Emergency fallback: ensure dialogue can continue
  const setupEmergencyFallback = useCallback((timeoutMs: number = 10000) => {
    // Clear any existing fallback timeout
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }

    // Set a new fallback timeout
    fallbackTimeoutRef.current = setTimeout(() => {
      console.warn(`⏱️ Emergency fallback triggered after ${timeoutMs}ms`);
      stopAudio();
      stopPlayingStudentResponse();
      setIsLoading(false);
      setPlaybackFailed(true);
    }, timeoutMs);

    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    };
  }, [stopAudio, stopPlayingStudentResponse]);

  // Audio playback with audio URL only
  const playWithSpeechState = useCallback(async (message: Message) => {
    console.log('🎧 AudioMessage.playWithSpeechState', message.id);
    startPlayingStudentResponse();
    setIsLoading(true);
    setPlaybackFailed(false);
    
    // Setup emergency fallback to ensure dialogue can continue even if all else fails
    const cleanupFallback = setupEmergencyFallback(10000); // 10 seconds maximum
    
    try {
      // Get the effective audio URL for this message
      const audioUrl = getEffectiveAudioUrl(message);
      
      // If audioUrl is provided, try to play it
      if (audioUrl) {
        try {
          await playAudioFromUrl(audioUrl, {
            onStart: () => {
              console.log('🎵 Started playing audio URL');
            },
            onEnd: () => {
              console.log('✅ Audio URL playback completed');
              cleanupFallback();
              stopPlayingStudentResponse();
              setIsLoading(false);
            },
            onError: (error) => {
              console.warn(`⚠️ Audio URL failed to load: ${error}, continuing without audio`);
              cleanupFallback();
              stopPlayingStudentResponse();
              setIsLoading(false);
              setPlaybackFailed(true);
            },
            timeout: 10000 // 10 second timeout for audio URL playback
          });
        } catch (audioError) {
          console.warn(`⚠️ Error playing audio from URL: ${audioError}, continuing without audio`);
          cleanupFallback();
          stopPlayingStudentResponse();
          setIsLoading(false);
          setPlaybackFailed(true);
        }
      } else {
        // No audio URL available
        console.warn(`⚠️ No audio URL available for message: ${message.id}`);
        cleanupFallback();
        stopPlayingStudentResponse();
        setIsLoading(false);
        setPlaybackFailed(true);
      }
    } catch (error) {
      console.error(`❌ Unexpected error in audio playback: ${error}`);
      cleanupFallback();
      stopPlayingStudentResponse();
      setIsLoading(false);
      setPlaybackFailed(true);
    }
  }, [
    playAudioFromUrl,
    getEffectiveAudioUrl,
    startPlayingStudentResponse,
    stopPlayingStudentResponse,
    setupEmergencyFallback,
    stopAudio
  ]);

  // Enhanced queue management
  const queueAudio = useCallback((message: Message, delay: number = 100) => {
    return new Promise<void>((resolve) => {
      timeoutRef.current = setTimeout(async () => {
        await playWithSpeechState(message);
        resolve();
      }, delay);
    });
  }, [playWithSpeechState]);

  // Handle cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
      stopAudio();
      stopPlayingStudentResponse();
    };
  }, [stopAudio, stopPlayingStudentResponse]);

  // Message playback logic
  useEffect(() => {
    messageRef.current = message;

    const playMessage = async () => {
      if (messageRef.current.id !== message.id) return;
      if (hasPlayedRef.current.has(message.id)) return;
      if (speaking) return;

      const hasAudioUrl = !!getEffectiveAudioUrl(message);
      
      // Only play if audio URL is available
      if (!hasAudioUrl) return;

      // Skip auto play for restored state messages
      if (dialogueState.isRestoredState) {
        console.log("🔇 Skipping auto play for restored state");
        return;
      }

      hasPlayedRef.current.add(message.id);
      
      const delay = message.isCorrect ? 200 : 300;
      
      try {
        await queueAudio(message, delay);
      } catch (error) {
        console.error(`❌ Error playing audio: ${error}`);
        stopPlayingStudentResponse(); // Ensure we stop blocking if there's an error
      }
    };

    if (!onlyShowButton && autoPlay && message.id) {
      playMessage();
    }
  }, [
    message.id, 
    message.audioUrl,
    autoPlay, 
    onlyShowButton, 
    speaking, 
    getEffectiveAudioUrl,
    queueAudio, 
    stopPlayingStudentResponse,
    dialogueState.isRestoredState
  ]);

  // Determine if we should show the audio button based on audio URL availability
  const audioUrl = getEffectiveAudioUrl(message);
  const hasAudio = !!audioUrl;
  
  if (!hasAudio) return null;

  // Check if we should show the button
  const shouldShowButton = 
    (message.teacherApp && message.expectedResponse) || 
    message.isCorrect || 
    !!message.audioUrl || 
    message.type === 'instruction' ||
    message.isHint;
    
  if (!shouldShowButton && !onlyShowButton) return null;

  // Enhanced click handler with speech state management
  const handleClick = async () => {
    if (speaking || isLoading) {
      stopAudio();
      stopPlayingStudentResponse();
      setIsLoading(false);
    } else {
      await playWithSpeechState(message);
    }
  };

  const isDisabled = (speechState.isBlocked || speechState.isPlayingStudentResponse) && !speaking && !isLoading;
  
  // Adjust colors based on if it's a student message (purple bubble)
  const getWaveColors = () => {
    const active = speaking || isLoading;
    
    // Check if it's a student message
    const isStudentMessage = message.isUser;
    
    if (isStudentMessage) {
      // For student messages (purple background)
      return active ? 'bg-white' : 'bg-purple-200';
    } else {
      // For normal messages
      return active ? 'bg-blue-500' : playbackFailed ? 'bg-orange-400' : 'bg-gray-400';
    }
  };

  // Audio wave bars with enhanced animation
  const renderAudioWave = () => {
    const active = speaking || isLoading;
    const barCount = 4; // Added one more bar for wider appearance
    const bars = [];
    const colorClass = getWaveColors();
    
    // Heights pattern for visual variation
    const heights = [3, 5, 4, 6, 3];
    
    for (let i = 0; i < barCount; i++) {
      // Different heights for visual appeal
      const baseHeight = heights[i % heights.length];
      const height = active 
        ? baseHeight + Math.sin(i * 1.5) * 1.5 + 1  // More dynamic height when active
        : baseHeight;
      
      // Animation classes
      const animationClass = active 
        ? i % 2 === 0 ? 'animate-pulse' : 'animate-bounce' 
        : '';
      
      // Animation duration and delay
      const animDuration = 0.8 + (i * 0.1); // Different durations for more organic feel
      
      bars.push(
        <div
          key={i}
          className={`
            rounded-full transition-all ease-in-out
            ${colorClass} ${animationClass}
          `}
          style={{ 
            height: `${height}px`,
            width: '2px',
            marginLeft: '2px',
            marginRight: '2px',
            animationDelay: `${i * 0.1}s`,
            animationDuration: `${animDuration}s`
          }}
        />
      );
    }
    
    return bars;
  };

  // Special positioning for student messages to prevent height issues
  const getPositioningClasses = () => {
    if (message.isUser) {
      // For student messages (purple bubbles), position carefully
      return 'absolute -top-3 right-2';
    } else {
      // For regular messages
      return 'inline-flex ml-2 relative -top-1';
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        ${getPositioningClasses()}
        items-end justify-center h-4
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${playbackFailed ? 'animate-pulse' : ''}
      `}
      aria-label={
        isDisabled
          ? 'Please wait until current message finishes'
          : (speaking || isLoading)
          ? 'Stop playing' 
          : 'Play audio'
      }
    >
      <div className="flex items-end space-x-px">
        {renderAudioWave()}
      </div>
    </button>
  );
}