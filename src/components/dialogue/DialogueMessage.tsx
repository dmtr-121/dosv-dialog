// Updated DialogueMessage.tsx
// Changes:
// - Added functionality to separate English instructions from Ukrainian translations
// - Applied different styling to instructions (smaller, gray) positioned above Ukrainian text
// - Made Ukrainian text more prominent as the main focus
// - Maintained all existing functionality, imports, and styling
// - Improved visual hierarchy for better student focus on language learning

import React, { useState, useEffect } from 'react';
import { CircleUser } from 'lucide-react';
import AudioMessage from './AudioMessage';
import MessageText from './MessageText';
import { Message } from '../../types/dialogue';

interface DialogueMessageProps {
  message: Message;
}

export default function DialogueMessage({ message }: DialogueMessageProps) {
  // Simplified state
  const [similarity, setSimilarity] = useState(0);

  // Keep the function to calculate similarity for other purposes (like hints)
  useEffect(() => {
    if (message.originalText && message.expectedResponse) {
      const calculatedSimilarity = calculateWordSimilarity(
        message.originalText,
        message.expectedResponse
      );
      setSimilarity(calculatedSimilarity);
    }
  }, [message.id, message.originalText, message.expectedResponse]);

  // All helper functions remain unchanged
  const wordEquivalents: { [key: string]: string[] } = {
    'doctor': ['dr', 'doctor', 'dr.'],
  };

  const normalizeWord = (word: string): string => {
    word = word.toLowerCase().trim();
    for (const [main, equivalents] of Object.entries(wordEquivalents)) {
      if (equivalents.includes(word)) {
        return main;
      }
    }
    return word;
  };

  const calculateWordSimilarity = (original: string, expected: string): number => {
    if (!original || !expected) return 0;
    const normalizeString = (str: string) => {
      return str
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"]/g, " ")
        .trim()
        .replace(/\s+/g, ' ');
    };
    const getProcessedWords = (str: string) => {
      return normalizeString(str)
        .split(' ')
        .map(word => normalizeWord(word))
        .filter(word => word.length > 0);
    };
    const originalWords = getProcessedWords(original);
    const expectedWords = getProcessedWords(expected);
    if (originalWords.join(' ') === expectedWords.join(' ')) {
      return 1;
    }
    let totalScore = 0;
    let maxScore = Math.max(originalWords.length, expectedWords.length);
    
    let remainingExpectedWords = [...expectedWords];
    let usedOriginalWords = new Set<number>();

    originalWords.forEach((word, index) => {
      if (index < expectedWords.length && word === expectedWords[index]) {
        totalScore += 1;
        remainingExpectedWords[index] = '';
        usedOriginalWords.add(index);
      }
    });

    originalWords.forEach((word, origIndex) => {
      if (!usedOriginalWords.has(origIndex)) {
        const matchIndex = remainingExpectedWords.findIndex(w => w === word);
        if (matchIndex !== -1) {
          totalScore += 0.9;
          remainingExpectedWords[matchIndex] = '';
          usedOriginalWords.add(origIndex);
        }
      }
    });

    const lengthRatio = Math.min(originalWords.length, expectedWords.length) / 
                      Math.max(originalWords.length, expectedWords.length);
    totalScore *= lengthRatio;
    return Math.min(1, totalScore / maxScore);
  };

  const calculateStringSimilarity = (str1: string, str2: string): number => {
    if (str1 === str2) return 1;
    if (!str1 || !str2) return 0;
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    let matches = 0;
    let position = 0;
    
    for (let i = 0; i < shorter.length; i++) {
      const searchStr = shorter[i];
      position = longer.indexOf(searchStr, position);
      if (position !== -1) {
        matches++;
        position++;
      }
    }
    return matches / longer.length;
  };

  const shouldShowHint = () => {
    return message.isHint && similarity < 0.8;
  };

  // Updated message styles with consistent gradient palette
  const getMessageStyles = () => {
    if (message.isUser) {
      return 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white shadow-sm hover:shadow-md transition-all duration-300';
    }
    if (message.isCorrect) {
      return 'bg-green-50 text-green-800 border border-green-200 shadow-sm hover:shadow-md transition-all duration-300';
    }
    if (shouldShowHint()) {
      return 'bg-amber-50 text-gray-800 border border-amber-200 shadow-sm hover:shadow-md transition-all duration-300';
    }
    return 'bg-white text-gray-800 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300';
  };

  // Render tutor avatar as just the icon
  const renderTutorIcon = () => {
    return (
      <div className="relative flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden border border-indigo-100 shadow-sm">
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-indigo-50 to-purple-50">
          <CircleUser className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-700" />
        </div>
      </div>
    );
  };

  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-0.5 sm:mb-1`}>
      <div className={`flex items-start gap-0.5 sm:gap-1 max-w-[95%] ${
        message.isUser ? 'flex-row-reverse' : 'flex-row'
      }`}>
        {!message.isUser && renderTutorIcon()}
        
        <div 
          className={`rounded-lg px-1.5 py-1 sm:px-2 sm:py-1.5 ${getMessageStyles()}
          ${message.isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
        >
          <div className="space-y-0.5 sm:space-y-1">
            {/* Use the MessageText component to handle instruction/translation separation */}
            <MessageText message={message} isUserMessage={message.isUser} />
            
            <div className="flex items-center gap-1 sm:gap-1.5">
              {((message.isUser && message.isCorrect && message.expectedResponse) ||
                (!message.isUser && !message.isCorrect)) && (
                <AudioMessage 
                  message={message}
                  onlyShowButton={message.isUser}
                />
              )}
            </div>
            {message.grammarNote && !message.isUser && (
              <div className="text-xs text-indigo-700 mt-0.5 pt-0.5 border-t border-indigo-100">
                <span className="font-medium">Note:</span> {message.grammarNote}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}