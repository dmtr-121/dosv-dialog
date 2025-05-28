// MessageText.tsx
// A specialized component for handling the text display in dialogue messages
// - Separates English instructions from Ukrainian translations
// - Applies appropriate styling to each part
// - Makes Ukrainian translations more prominent

import React, { useEffect, useState } from 'react';
import { Message } from '../../types/dialogue';

interface MessageTextProps {
  message: Message;
  isUserMessage: boolean;
}

export default function MessageText({ message, isUserMessage }: MessageTextProps) {
  const [instructionText, setInstructionText] = useState<string | null>(null);
  const [translationText, setTranslationText] = useState<string | null>(null);

  // Parse message text to separate instruction from translation
  useEffect(() => {
    if (message.text) {
      // Pattern detection for "English instruction: Ukrainian translation"
      const colonIndex = message.text.indexOf(':');
      
      if (colonIndex > 0) {
        // Check if there's text before the colon that's likely English
        const beforeColon = message.text.substring(0, colonIndex).trim();
        const afterColon = message.text.substring(colonIndex + 1).trim();
        
        // Simple heuristic: English instructions shouldn't have Cyrillic characters
        const hasCyrillic = /[а-яА-ЯіІїЇєЄґҐ]/.test(beforeColon);
        
        if (!hasCyrillic) {
          setInstructionText(beforeColon);
          setTranslationText(afterColon);
        } else {
          // If there are Cyrillic characters before the colon, treat the whole text as a translation
          setInstructionText(null);
          setTranslationText(message.text);
        }
      } else {
        // No colon found, treat the whole message as translation
        setInstructionText(null);
        setTranslationText(message.text);
      }
    }
  }, [message.text]);

  // Render appropriate styling based on message type
  const getInstructionClasses = () => {
    return "text-xs text-gray-500 mb-1 font-normal";
  };

  const getTranslationClasses = () => {
    return `${isUserMessage ? 'text-white' : 'text-gray-800'} text-sm sm:text-base font-medium`;
  };

  // If this is a user message, we don't show instruction separation
  if (isUserMessage) {
    return (
      <div className={getTranslationClasses()}>
        {message.text}
      </div>
    );
  }

  return (
    <>
      {/* Show instruction text if available */}
      {instructionText && (
        <div className={getInstructionClasses()}>
          {instructionText}
        </div>
      )}
      
      {/* Show translation text with more emphasis */}
      <div className={getTranslationClasses()}>
        {translationText || message.text}
      </div>
    </>
  );
}