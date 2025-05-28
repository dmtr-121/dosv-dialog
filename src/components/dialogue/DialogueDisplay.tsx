// src/components/dialogue/DialogueDisplay.tsx
import React from 'react';
import { useDialogueContext } from '../../context/dialogue';

interface DialogueDisplayProps {
  currentInstruction?: string;
  ukrainianText?: string;
  englishText?: string;
  isCompact?: boolean;
  isMobile?: boolean;
}

/**
 * A component that displays the current dialogue context in a chat-bubble style interface
 * Similar to messaging apps with alternating bubble colors
 */
const DialogueDisplay: React.FC<DialogueDisplayProps> = ({
  currentInstruction,
  ukrainianText,
  englishText,
  isCompact = false,
  isMobile = false
}) => {
  const { state } = useDialogueContext();
  
  // Get the last two messages from the dialogue context if not explicitly provided
  const lastMessages = state.messages.slice(-2);
  const hasMessages = state.messages.length > 0;
  
  // Use provided texts or extract from context
  const instruction = currentInstruction || '';
  const ukrainian = ukrainianText || '';
  const english = englishText || '';
  
  // If it's mobile, use the simplified display
  if (isMobile) {
    const displayMessage = english || 
      (hasMessages && lastMessages[0]?.isUser === false ? lastMessages[0].text : '');
    
    if (!displayMessage) return null;
    
    return (
      <div className="w-full py-1">
        <div className="bg-white rounded-md px-3 py-2 text-indigo-600 text-center w-full shadow-sm">
          <p className="text-sm">{displayMessage}</p>
        </div>
      </div>
    );
  }
  
  // Original desktop display
  return (
    <div className={`dialogue-display w-full mb-2 ${isCompact ? 'mt-1' : 'mt-2'}`}>
      {/* Current instruction if provided */}
      {instruction && (
        <div className="p-2 bg-white rounded-lg mb-2 text-sm text-indigo-900">
          <p>{instruction}</p>
        </div>
      )}
      
      {/* Ukrainian text in left bubble (gray) */}
      {ukrainian && (
        <div className="flex mb-2">
          <div className="bg-gray-100 rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%] text-sm shadow-sm">
            <p className="text-gray-800">{ukrainian}</p>
          </div>
        </div>
      )}
      
      {/* English text in right bubble (white with purple text) - if provided or from lastMessages */}
      {english ? (
        <div className="flex justify-end mb-2">
          <div className="bg-white rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%] text-sm text-indigo-600 shadow-sm">
            <p>{english}</p>
          </div>
        </div>
      ) : hasMessages && lastMessages[0]?.isUser === false ? (
        <div className="flex justify-end mb-2">
          <div className="bg-white rounded-xl rounded-tr-sm px-3 py-2 max-w-[85%] text-sm text-indigo-600 shadow-sm">
            <p>{lastMessages[0].text}</p>
          </div>
        </div>
      ) : null}
      
      {/* Last user response if exists */}
      {hasMessages && lastMessages.length > 1 && lastMessages[1]?.isUser && (
        <div className="flex mb-2">
          <div className="bg-gray-100 rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%] text-sm shadow-sm">
            <p className="text-gray-800">{lastMessages[1].text}</p>
          </div>
        </div>
      )}
      
      {/* Expected response instruction if in the middle of a dialogue turn */}
      {state.currentDialogue && !isCompact && state.currentSentenceIndex < state.currentDialogue.conversation.length && (
        <div className="mt-1 mb-2 p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
          <span className="font-medium text-gray-900">Translate:</span> {state.currentDialogue.conversation[state.currentSentenceIndex].ukrainian}
        </div>
      )}
    </div>
  );
};

export default DialogueDisplay;