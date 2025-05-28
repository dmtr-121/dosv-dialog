import React from 'react';

interface DialogueHeaderProps {
  progress: number;
}

export default function DialogueHeader({ progress }: DialogueHeaderProps) {
  return (
    <div 
      className="fixed top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 transition-all duration-300 z-20"
      style={{ width: `${progress}%` }}
    />
  );
}