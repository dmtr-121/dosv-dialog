// src/components/SessionRestorationOverlay.tsx
// Streamlined overlay component for session restoration with minimal UI
// Changes: Centralized text and improved visual styling

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { RotateCw } from 'lucide-react';
import { useSpeechState } from '../context/SpeechStateContext';

interface SessionRestorationOverlayProps {
  onFinished: () => void;
  dialogueTitle?: string;
  duration?: number; // тривалість показу в мс
}

const SessionRestorationOverlay: React.FC<SessionRestorationOverlayProps> = ({
  onFinished,
  dialogueTitle = 'your dialogue',
  duration = 1000 // 1.5 seconds for a smooth experience
}) => {
  const [visible, setVisible] = useState(true);
  const { blockAudioForRestoration, unblockAudioForRestoration } = useSpeechState();
  
  // Simplified loading messages
  const loadingMessages = [
    "Preparing session...",
    "Loading content...",
    "Almost ready...",
    "Setting up..."
  ];

  // Use state to rotate through messages
  const [messageIndex, setMessageIndex] = useState(0);
  
  // Effect to cycle through messages slowly
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % loadingMessages.length);
    }, 2800);
    
    return () => clearInterval(messageInterval);
  }, []);
  
  // Track timers and prevent duplicate finalization
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasFinishedRef = useRef(false);

  // Function to handle completion of restoration process
  const finishRestoration = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    
    console.log('✅ Session restored - closing overlay');
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    unblockAudioForRestoration();
    setVisible(false);
    
    setTimeout(() => {
      onFinished();
    }, 300);
  }, [unblockAudioForRestoration, onFinished]);

  useEffect(() => {
    console.log('🔄 Session restoration started');
    
    hasFinishedRef.current = false;
    blockAudioForRestoration();

    timeoutRef.current = setTimeout(() => {
      finishRestoration();
    }, duration);

    // Safety fallback
    const safetyTimeout = setTimeout(() => {
      if (!hasFinishedRef.current) {
        console.warn('⚠️ Safety timer triggered');
        finishRestoration();
      }
    }, duration + 1000);

    return () => {
      console.log('🔄 Cleanup restoration overlay');
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      clearTimeout(safetyTimeout);
      unblockAudioForRestoration();
    };
  }, [duration, blockAudioForRestoration, unblockAudioForRestoration, finishRestoration]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white bg-opacity-100 backdrop-blur-sm">
      <div className="w-full max-w-xs mx-auto px-6 py-5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 shadow-lg border border-indigo-100 transform animate-scale-up">
        {/* Main content container */}
        <div className="text-center">
          {/* Title */}
          <h2 className="text-xl font-semibold text-black mb-2">
            Restoring Session
          </h2>
          
          {/* Loading message - Simplified structure */}
          <p className="text-sm text-black font-medium mb-4">
            {loadingMessages[messageIndex]}
          </p>
          
          {/* Progress bar */}
          <div className="w-full h-2 bg-gray-200 rounded-full mb-3 overflow-hidden">
            <div className="loading-bar-animation h-full rounded-full"></div>
          </div>
          
          {/* Please wait text */}
          <div className="flex items-center justify-center gap-2">
            <RotateCw className="w-4 h-4 animate-spin text-indigo-600" />
            <span className="text-sm text-indigo-600">Please wait</span>
          </div>
        </div>
      </div>

      {/* Add styles for loading animations */}
      <style jsx>{`
        .loading-bar-animation {
          background: linear-gradient(
            to right,
            rgba(99, 102, 241, 0.2) 0%,
            rgba(99, 102, 241, 0.6) 25%,
            rgba(167, 139, 250, 0.9) 50%,
            rgba(99, 102, 241, 0.6) 75%,
            rgba(99, 102, 241, 0.2) 100%
          );
          width: 100%;
          background-size: 200% 100%;
          animation: loading-gradient 1.5s ease-in-out infinite;
        }
        
        @keyframes loading-gradient {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(3px); }
          20% { opacity: 0.2; }
          100% { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes scale-up {
          0% { transform: scale(0.95); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .animate-scale-up {
          animation: scale-up 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default SessionRestorationOverlay;