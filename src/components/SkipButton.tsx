// src/components/SkipButton.tsx
import React, { useState, useRef, useEffect } from 'react';
import { SkipForward, Check } from 'lucide-react';

interface SkipButtonProps {
  onSkip: () => void;
  hasAttempted: boolean;
  className?: string;
  disabled?: boolean;
}

export default function SkipButton({ 
  onSkip, 
  hasAttempted,
  className = '',
  disabled = false 
}: SkipButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const confirmTimeoutRef = useRef<NodeJS.Timeout>();

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    if (disabled) return;
    
    if (!showConfirm) {
      // First click - show confirmation
      setShowConfirm(true);
      confirmTimeoutRef.current = setTimeout(() => {
        setShowConfirm(false);
      }, 3000);
    } else {
      // Second click - confirm skip
      setIsCompleting(true);
      
      // Simple timeout for skip action
      setTimeout(() => {
        onSkip();
        setShowConfirm(false);
        setIsCompleting(false);
      }, 300);

      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Confirmation tooltip */}
      {showConfirm && !isCompleting && (
        <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap">
          <div className="bg-indigo-100 text-indigo-700 text-sm font-medium py-1 px-2 rounded">
            Click again
          </div>
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={disabled}
        className={`
          w-9 h-9 md:w-10 md:h-10
          rounded-full
          transition-colors duration-200
          flex items-center justify-center
          ${disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : isCompleting
              ? 'bg-green-50 text-green-500'
              : showConfirm
                ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-300'
                : 'bg-gray-50 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
          }
          focus:outline-none focus:ring-2 focus:ring-indigo-300
        `}
        aria-label="Skip"
      >
        {isCompleting ? (
          <Check className="w-5 h-5" />
        ) : (
          <SkipForward className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}