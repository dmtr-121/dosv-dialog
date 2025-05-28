// src/hooks/useSpeechSynthesis.ts - Simplified version without unnecessary timeouts
import { useState, useEffect, useCallback, useRef } from 'react';

// Platform detection
const isAndroid = typeof window !== 'undefined' && /Android/i.test(window.navigator.userAgent);
const isIOS = typeof window !== 'undefined' && (/iPad|iPhone|iPod/.test(window.navigator.userAgent) || 
  (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1));

interface SpeechOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  rate?: number;
  pitch?: number;
  volume?: number;
}

interface TextSegment {
  text: string;
  type: 'normal' | 'question' | 'exclamation' | 'parenthetical' | 'quote';
  emphasis?: 'light' | 'medium' | 'strong';
  isEndOfSentence?: boolean;
  isEndOfParagraph?: boolean;
}

const PREFERRED_VOICE = {
  primary: {
    android: {
      name: "Microsoft AVA - English (United States)",
      lang: "en-US"
    },
    ios: {
      name: "Google UK English Male",
      lang: "en-GB"
    },
    default: {
      name: "Google UK English Female",  // Used for desktop
      lang: "en-GB"
    }
  },
  fallbacks: [
    "Google UK English Female",
    "Chrome OS UK English Female",
    "Android Speech Recognition and Synthesis from Google en-gb-x-gba-network",
  ],
  settings: {
    default: {
      rate: 1.05,
      pitch: 1.25,
      volume: 1.0
    },
    question: {
      rate: 1.05,
      pitch: 1.20,
      volume: 1.0,
      endPitch: 1.35
    },
    exclamation: {
      rate: 1.06,
      pitch: 1.3,
      volume: 1.0,
      emphasis: true
    },
    parenthetical: {
      rate: 1.05,
      pitch: 1.2,
      volume: 0.95
    },
    quote: {
      rate: 1.04,
      pitch: 1.22,
      volume: 1.0
    },
    pause: {
      short: isAndroid ? 150 : 60,
      medium: isAndroid ? 200 : 60,
      long: isAndroid ? 250 : 60,
      extraLong: isAndroid ? 300 : 60
    },
    emphasis: {
      light: 1.1,
      medium: 1.2,
      strong: 1.3
    }
  }
};

const preprocessText = (text: string): { 
  segments: TextSegment[];
  pauseDurations: number[] 
} => {
  const cleanText = text
    .replace(/\s+/g, ' ')
    .replace(/([.,!?;:])\s*/g, '$1 ')
    .trim();

  const segments: TextSegment[] = [];
  const pauseDurations: number[] = [];
  
  const paragraphs = cleanText.split(/\n\s*\n/);
  
  for (let p = 0; p < paragraphs.length; p++) {
    const sentences = isAndroid
      ? paragraphs[p].split(/(?<=[.!?])\s+/)
      : (paragraphs[p].match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraphs[p]]);
    
    for (let s = 0; s < sentences.length; s++) {
      let sentence = sentences[s].trim();
      if (!sentence) continue;

      let type: TextSegment['type'] = 'normal';
      
      if (sentence.endsWith('?')) {
        type = 'question';
      } else if (sentence.endsWith('!')) {
        type = 'exclamation';
      }

      const parts = isAndroid
        ? [sentence]
        : sentence.split(/([,;:])/).filter(Boolean);
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i].trim();
        if (!part) continue;

        if (isAndroid && [',' ,';', ':'].includes(part)) {
          continue;
        }

        if (!isAndroid && [',' ,';', ':'].includes(part)) {
          pauseDurations.push(PREFERRED_VOICE.settings.pause.short);
          continue;
        }

        if (part.startsWith('(') && part.endsWith(')')) {
          segments.push({
            text: part.slice(1, -1),
            type: 'parenthetical'
          });
        } else if (part.startsWith('"') && part.endsWith('"')) {
          segments.push({
            text: part.slice(1, -1),
            type: 'quote'
          });
        } else {
          segments.push({
            text: isAndroid ? part : part.replace(/[,;:]$/, ''),
            type,
            isEndOfSentence: i === parts.length - 1,
            isEndOfParagraph: s === sentences.length - 1 && p === paragraphs.length - 1
          });
        }

        if (i === parts.length - 1) {
          if (p === paragraphs.length - 1 && s === sentences.length - 1) {
            pauseDurations.push(PREFERRED_VOICE.settings.pause.extraLong);
          } else if (s === sentences.length - 1) {
            pauseDurations.push(PREFERRED_VOICE.settings.pause.long);
          } else {
            pauseDurations.push(PREFERRED_VOICE.settings.pause.medium);
          }
        } else if (!isAndroid) {
          pauseDurations.push(PREFERRED_VOICE.settings.pause.short);
        }
      }
    }
  }

  return { segments, pauseDurations };
};

function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isWarmedUp, setIsWarmedUp] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const resumeIntervalRef = useRef<NodeJS.Timeout>();

  // Initialize and update available voices
  useEffect(() => {
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const filteredVoices = voices.filter(voice => 
        voice.lang.startsWith('en-') && !voice.localService
      );
      setAvailableVoices(filteredVoices);
      
      if (!currentVoice && filteredVoices.length > 0) {
        const bestVoice = findBestVoice(filteredVoices);
        if (bestVoice) {
          setCurrentVoice(bestVoice);
        }
      }
    };

    updateVoices();
    
    if (window.speechSynthesis.addEventListener) {
      window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
      };
    } else {
      window.speechSynthesis.onvoiceschanged = updateVoices;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  // Clean up function
  const cleanup = useCallback(() => {
    if (resumeIntervalRef.current) clearInterval(resumeIntervalRef.current);
    if (window.speechSynthesis && utteranceRef.current) window.speechSynthesis.cancel();
    setSpeaking(false);
    setError(null);
    utteranceRef.current = null;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Find the best voice based on platform
  const findBestVoice = useCallback((voices: SpeechSynthesisVoice[] = availableVoices): SpeechSynthesisVoice | null => {
    if (currentVoice) {
      return currentVoice;
    }

    // iOS platform
    if (isIOS) {
      const iosVoice = voices.find(voice => 
        voice.name === PREFERRED_VOICE.primary.ios.name &&
        voice.lang.startsWith('en-')
      );
      if (iosVoice) return iosVoice;
      
      const fallbackIosVoice = voices.find(voice =>
        voice.name.includes("Google UK English Male") &&
        voice.lang.startsWith('en-')
      );
      if (fallbackIosVoice) return fallbackIosVoice;
    }

    // Android platform
    if (isAndroid) {
      const avaVoice = voices.find(voice => 
        voice.name === PREFERRED_VOICE.primary.android.name &&
        voice.lang === PREFERRED_VOICE.primary.android.lang
      );
      if (avaVoice) return avaVoice;
    }

    // Desktop platform: always use female voice
    if (!isIOS && !isAndroid) {
      // First try Google UK English Female
      const ukFemaleVoice = voices.find(voice => 
        voice.name === "Google UK English Female" &&
        voice.lang === "en-GB"
      );
      if (ukFemaleVoice) return ukFemaleVoice;

      // Fallback: any English female voice
      const anyFemaleVoice = voices.find(voice => 
        voice.lang.startsWith('en-') && 
        !voice.localService &&
        voice.name.toLowerCase().includes('female')
      );
      if (anyFemaleVoice) return anyFemaleVoice;
      
      // If no female voice found, try any UK voice
      const anyUKVoice = voices.find(voice => 
        voice.lang === "en-GB" && 
        !voice.localService
      );
      if (anyUKVoice) return anyUKVoice;
    }

    // Default fallback for all platforms
    return voices.find(voice => 
      voice.lang.startsWith('en-') && 
      !voice.localService
    ) || null;
  }, [availableVoices, currentVoice]);

  // Simple voice warmup
  const warmupVoice = useCallback(async (): Promise<boolean> => {
    if (isWarmedUp || !window.speechSynthesis) return true;
    
    return new Promise((resolve) => {
      const warmup = new SpeechSynthesisUtterance('');
      warmup.volume = 0;
      
      const voice = findBestVoice();
      if (voice) {
        warmup.voice = voice;
        if (isIOS) {
          warmup.lang = 'en-GB';
        } else if (isAndroid) {
          warmup.lang = PREFERRED_VOICE.primary.android.lang;
        }
      }

      warmup.onend = () => {
        setIsWarmedUp(true);
        resolve(true);
      };

      warmup.onerror = () => {
        resolve(false);
      };

      window.speechSynthesis.speak(warmup);

      // Safety timeout - resolve after 2 seconds regardless
      setTimeout(() => resolve(false), 2000);
    });
  }, [isWarmedUp, findBestVoice]);

  // Speak a single segment
  const speakSegment = useCallback((
    segment: TextSegment,
    options: SpeechOptions = {},
    onComplete?: () => void
  ) => {
    const utterance = new SpeechSynthesisUtterance(segment.text);
    utteranceRef.current = utterance;

    const selectedVoice = currentVoice || findBestVoice();
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      if (isIOS) {
        utterance.lang = 'en-GB';
      }
    }

    const settings = PREFERRED_VOICE.settings;
    
    // Set voice properties based on segment type
    switch (segment.type) {
      case 'question':
        utterance.rate = options.rate ?? settings.question.rate;
        utterance.pitch = options.pitch ?? settings.question.pitch;
        if (segment.isEndOfSentence) {
          utterance.pitch = settings.question.endPitch;
        }
        break;
      case 'exclamation':
        utterance.rate = options.rate ?? settings.exclamation.rate;
        utterance.pitch = options.pitch ?? settings.exclamation.pitch;
        break;
      case 'parenthetical':
        utterance.rate = options.rate ?? settings.parenthetical.rate;
        utterance.pitch = options.pitch ?? settings.parenthetical.pitch;
        utterance.volume = settings.parenthetical.volume;
        break;
      case 'quote':
        utterance.rate = options.rate ?? settings.quote.rate;
        utterance.pitch = options.pitch ?? settings.quote.pitch;
        break;
      default:
        utterance.rate = options.rate ?? settings.default.rate;
        utterance.pitch = options.pitch ?? settings.default.pitch;
    }

    // Apply emphasis if needed
    if (segment.emphasis) {
      utterance.pitch *= settings.emphasis[segment.emphasis];
    }

    utterance.volume = options.volume ?? settings.default.volume;
    
    // Set appropriate language based on platform
    if (isIOS) {
      utterance.lang = 'en-GB';
    } else if (isAndroid) {
      utterance.lang = PREFERRED_VOICE.primary.android.lang;
    } else {
      utterance.lang = PREFERRED_VOICE.primary.default.lang;
    }

    utterance.onend = () => {
      onComplete?.();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setError(`Speech synthesis error: ${event.error}`);
      options.onError?.(event.error);
      onComplete?.(); // Call onComplete even on error to ensure dialogue continues
    };

    // Android needs a small delay
    if (isAndroid) {
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 50);
    } else {
      window.speechSynthesis.speak(utterance);
    }
  }, [findBestVoice, currentVoice]);

  // Main speak function
  const speak = useCallback(async (text: string, options: SpeechOptions = {}) => {
    if (!text.trim()) return;
    
    cleanup();
    
    try {
      // Ensure voice is warmed up before speaking
      if (!isWarmedUp) {
        await warmupVoice();
      }

      const { segments, pauseDurations } = preprocessText(text);
      
      // Recursive function to speak each segment with appropriate pauses
      const speakNextSegment = (index: number) => {
        if (index >= segments.length) {
          cleanup();
          options.onEnd?.();
          return;
        }

        speakSegment(segments[index], options, () => {
          const pause = pauseDurations[index];
          if (pause > 0) {
            setTimeout(() => {
              speakNextSegment(index + 1);
            }, pause);
          } else {
            speakNextSegment(index + 1);
          }
        });

        // Initialize speaking state on first segment
        if (index === 0) {
          setSpeaking(true);
          setError(null);
          options.onStart?.();

          // Periodically ensure speech synthesis isn't paused (iOS/Safari fix)
          resumeIntervalRef.current = setInterval(() => {
            if (window.speechSynthesis && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          }, 5000);
        }
      };

      // Start speaking from the first segment
      speakNextSegment(0);

    } catch (err) {
      console.error('Speech synthesis error:', err);
      cleanup();
      setError('Speech synthesis initialization failed');
      options.onError?.('initialization_failed');
      options.onEnd?.(); // Call onEnd even on error to ensure dialogue continues
    }
  }, [cleanup, speakSegment, isWarmedUp, warmupVoice]);

  // Control functions
  const cancel = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const pause = useCallback(() => {
    if (resumeIntervalRef.current) clearInterval(resumeIntervalRef.current);
    if (window.speechSynthesis) window.speechSynthesis.pause();
    setSpeaking(false);
  }, []);

  const resume = useCallback(() => {
    if (window.speechSynthesis) window.speechSynthesis.resume();
    setSpeaking(true);
  }, []);

  return {
    speak,
    cancel,
    pause,
    resume,
    speaking,
    error,
    availableVoices,
    currentVoice,
    setVoice: setCurrentVoice,
    isWarmedUp
  };
}

export { useSpeechSynthesis };