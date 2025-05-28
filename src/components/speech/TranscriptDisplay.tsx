// src/components/speech/TranscriptDisplay.tsx
import React, { useEffect, useRef } from 'react';
import { useDialogueContext } from '../../context/dialogue';
import SkipButton from '../SkipButton';

interface TranscriptDisplayProps {
  text: string;
  onSubmit: () => void;
  isRecording: boolean;
  readonly?: boolean;
  isCorrect?: boolean; // New prop to indicate correct answer
}

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  text,
  onSubmit,
  isRecording,
  readonly = false,
  isCorrect = false // Default to false
}) => {
  const displayRef = useRef<HTMLDivElement>(null);
  const { state, handleSkip } = useDialogueContext();
  
  // Auto-scroll to bottom when text updates
  useEffect(() => {
    if (displayRef.current) {
      displayRef.current.scrollTop = displayRef.current.scrollHeight;
    }
  }, [text]);

  return (
    <div className="relative">
      {/* Main container - keeping the original styling, no extra backgrounds */}
      <div
        ref={displayRef}
        className={`
          min-h-12 max-h-24 md:min-h-16 md:max-h-32
          overflow-y-auto thin-scrollbar
          pr-10 sm:pr-12 md:pr-14
          transition duration-200
          ${isRecording && !isCorrect ? 'bg-blue-50/10' : ''}
        `}
      >
        {!text && !isRecording ? (
          // Empty state hint
          <div className="w-full h-full flex items-center justify-center p-1 md:p-2">
            <span className="text-gray-400 hidden md:block text-center">
              Натисніть Space для запису та надсилання тексту
            </span>
            <span className="text-gray-400 block md:hidden text-center">
              Натисніть на мікрофон...
            </span>
          </div>
        ) : (
          // Transcript text display
          <div className={`
            w-full p-1 md:p-2
            text-lg md:text-xl leading-relaxed
            transition-colors duration-200
            ${isRecording && !isCorrect ? 'text-gray-500' : ''}
          `}>
            {/* Only the text is highlighted, not the surrounding area */}
            <span className={`
              whitespace-pre-wrap break-words block
              ${isCorrect ? 'text-green-600' : 'text-gray-900'}
            `}>
              {text}
            </span>
          </div>
        )}
      </div>
      
      {/* Skip button */}
      <div className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 z-10 scale-90 md:scale-100">
        <SkipButton
          onSkip={handleSkip}
          hasAttempted={state.attempts > 0}
          disabled={isRecording || state.isSpeaking || isCorrect}
        />
      </div>

      {/* Minimal styles */}
      <style>{`
        .thin-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(59, 130, 246, 0.5) transparent;
        }
        .thin-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .thin-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .thin-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(59, 130, 246, 0.5);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};

export default TranscriptDisplay;