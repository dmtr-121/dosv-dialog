// src/hooks/useAudioPlayback.ts - Simplified to remove speech synthesis fallback
import { useCallback, useRef, useEffect, useState } from 'react';
import { useSpeechState } from '../context/SpeechStateContext';

interface AudioPlaybackOptions {
  autoPlay?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  timeout?: number; // Timeout for audio playback
}

// Configuration constants
const DEFAULT_TIMEOUT = 10000; // 10 seconds timeout for audio
const MAX_AUDIO_RETRIES = 2;    // Maximum number of retries for audio playback

export function useAudioPlayback() {
  const { startSpeaking, stopSpeaking } = useSpeechState();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudioUrl, setIsPlayingAudioUrl] = useState(false);
  const audioRetryCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor the internal playing audio URL state
  useEffect(() => {
    if (isPlayingAudioUrl) {
      setIsSpeaking(true);
      startSpeaking();
    } else {
      const timeoutId = setTimeout(() => {
        setIsSpeaking(false);
        stopSpeaking();
      }, 100); // Small delay for proper state synchronization
      
      return () => clearTimeout(timeoutId);
    }
  }, [isPlayingAudioUrl, startSpeaking, stopSpeaking]);

  // Clean up timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  // Setup timeout protection for audio playback
  const setupTimeoutProtection = useCallback((options: AudioPlaybackOptions = {}) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Set up a new timeout
    const timeoutDuration = options.timeout || DEFAULT_TIMEOUT;
    timeoutRef.current = setTimeout(() => {
      console.warn(`⏱️ Audio playback timeout after ${timeoutDuration}ms`);
      
      // Stop any current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      setIsSpeaking(false);
      setIsPlayingAudioUrl(false);
      stopSpeaking();
      options.onError?.('Audio playback timeout');
      options.onEnd?.(); // Call the onEnd callback to allow the dialogue to continue
    }, timeoutDuration);
  }, [stopSpeaking]);

  // Play audio from a URL with retry mechanism and timeout protection
  const playAudioFromUrl = useCallback(async (url: string, options: AudioPlaybackOptions = {}) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current = null;
    }

    console.log(`🎵 Attempting to play audio from URL: ${url}`);
    audioRetryCountRef.current = 0;

    return new Promise<void>((resolve, reject) => {
      try {
        const audio = new Audio(url);
        audioRef.current = audio;
        
        // Setup timeout protection
        setupTimeoutProtection(options);
        
        audio.onloadstart = () => {
          console.log('🎵 Audio started loading');
          setIsPlayingAudioUrl(true);
          startSpeaking();
          options.onStart?.();
        };
        
        audio.onended = () => {
          console.log('✅ Audio playback completed successfully');
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          
          setIsPlayingAudioUrl(false);
          stopSpeaking();
          audioRef.current = null;
          audioRetryCountRef.current = 0;
          options.onEnd?.();
          resolve();
        };

        audio.onerror = (e) => {
          console.error('❌ Audio playback error:', e);
          
          if (audioRetryCountRef.current < MAX_AUDIO_RETRIES) {
            audioRetryCountRef.current++;
            console.log(`🔄 Retrying audio playback (${audioRetryCountRef.current}/${MAX_AUDIO_RETRIES})...`);
            
            // Small delay before retry
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.load();
                audioRef.current.play().catch(err => {
                  console.error('❌ Audio retry error:', err);
                  // After max retries, continue dialogue without audio
                  if (audioRetryCountRef.current >= MAX_AUDIO_RETRIES) {
                    console.log('⚠️ Max retries reached, continuing without audio');
                    if (timeoutRef.current) {
                      clearTimeout(timeoutRef.current);
                      timeoutRef.current = null;
                    }
                    setIsPlayingAudioUrl(false);
                    stopSpeaking();
                    options.onError?.('Audio playback failed after max retries');
                    options.onEnd?.(); // Continue dialogue
                    resolve();
                  }
                });
              }
            }, 500);
          } else {
            // After max retries, continue dialogue without audio
            console.log('⚠️ Max retries reached, continuing without audio');
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setIsPlayingAudioUrl(false);
            stopSpeaking();
            options.onError?.('Audio playback failed after max retries');
            options.onEnd?.(); // Continue dialogue
            resolve();
          }
        };

        audio.play().catch(error => {
          console.error('❌ Error playing audio:', error);
          if (audioRetryCountRef.current < MAX_AUDIO_RETRIES) {
            audioRetryCountRef.current++;
            console.log(`🔄 Retrying audio playback (${audioRetryCountRef.current}/${MAX_AUDIO_RETRIES})...`);
            
            // Small delay before retry
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.play().catch(err => {
                  console.error('❌ Audio retry error:', err);
                  // After max retries, continue dialogue without audio
                  if (audioRetryCountRef.current >= MAX_AUDIO_RETRIES) {
                    console.log('⚠️ Max retries reached, continuing without audio');
                    if (timeoutRef.current) {
                      clearTimeout(timeoutRef.current);
                      timeoutRef.current = null;
                    }
                    setIsPlayingAudioUrl(false);
                    stopSpeaking();
                    options.onError?.('Audio playback failed after max retries');
                    options.onEnd?.(); // Continue dialogue
                    resolve();
                  }
                });
              }
            }, 500);
          } else {
            // After max retries, continue dialogue without audio
            console.log('⚠️ Max retries reached, continuing without audio');
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
            setIsPlayingAudioUrl(false);
            stopSpeaking();
            options.onError?.('Audio playback failed after max retries');
            options.onEnd?.(); // Continue dialogue
            resolve();
          }
        });
      } catch (error) {
        console.error('❌ Error setting up audio:', error);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setIsPlayingAudioUrl(false);
        stopSpeaking();
        options.onError?.(`Error setting up audio: ${error}`);
        options.onEnd?.(); // Continue dialogue
        resolve();
      }
    });
  }, [startSpeaking, stopSpeaking, setupTimeoutProtection]);

  const stopAudio = useCallback(() => {
    console.log('🛑 Stopping all audio playback');
    
    // Clear any timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Stop audio element if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    
    setIsSpeaking(false);
    setIsPlayingAudioUrl(false);
    stopSpeaking();
  }, [stopSpeaking]);

  return {
    playAudioFromUrl,
    stopAudio,
    speaking: isSpeaking
  };
}