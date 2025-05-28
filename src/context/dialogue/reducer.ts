// src/context/dialogue/reducer.ts
// Simplified to remove unnecessary learnedWords state tracking
import { DialogueState, DialogueAction } from './types';
import { MedicalDialogue } from '../../types/medicalDialogue';
import { Message } from '../../types/dialogue';

export const initialState: DialogueState = {
  currentDialogue: null,
  currentSentenceIndex: 0,
  startTime: null,
  endTime: null,
  skippedPhrases: new Set(),
  completedDialogues: new Set(),
  wordsSpoken: 0,
  messages: [],
  attempts: 0,
  showingAnswer: false,
  isComplete: false,
  lastMessageId: null
};

export function dialogueReducer(state: DialogueState, action: DialogueAction): DialogueState {
  switch (action.type) {
    case 'SET_DIALOGUE':
      return {
        ...initialState,
        startTime: Date.now(),
        currentDialogue: action.payload
      };

    case 'ADD_MESSAGE': {
      if (action.payload.isUser && action.payload.text) {
        const wordCount = action.payload.text.trim().split(/\s+/).length;
        
        return {
          ...state,
          messages: [...state.messages, { ...action.payload, wordCount }],
          wordsSpoken: state.wordsSpoken + wordCount,
          lastMessageId: action.payload.id || Date.now(),
        };
      }

      const newMessage = {
        ...action.payload,
        id: action.payload.id || Date.now()
      };

      return {
        ...state,
        messages: [...state.messages, newMessage],
        lastMessageId: newMessage.id
      };
    }

    case 'UPDATE_LAST_MESSAGE': {
      if (!state.lastMessageId) return state;
      return {
        ...state,
        messages: state.messages.map(message => 
          message.id === state.lastMessageId
            ? { ...message, ...action.payload }
            : message
        )
      };
    }

    case 'UPDATE_MESSAGE': {
      return {
        ...state,
        messages: state.messages.map(message =>
          message.id === action.payload.id
            ? { ...message, ...action.payload.updates }
            : message
        )
      };
    }

    case 'INCREMENT_ATTEMPTS': {
      const nextAttempt = state.attempts + 1;
      return {
        ...state,
        attempts: nextAttempt,
        showingAnswer: nextAttempt >= 3
      };
    }

    case 'NEXT_SENTENCE':
      return {
        ...state,
        currentSentenceIndex: state.currentSentenceIndex + 1,
        attempts: 0,
        showingAnswer: false,
        lastMessageId: null
      };

    case 'SKIP_STEP': {
      const { skippedIndex } = action.payload;
      return {
        ...state,
        skippedPhrases: new Set([...state.skippedPhrases, skippedIndex]),
        attempts: 0,
        showingAnswer: false,
        lastMessageId: null
        // Do not increment currentSentenceIndex here as it will be handled by NEXT_SENTENCE
      };
    }

    case 'SET_COMPLETE':
      return {
        ...state,
        endTime: Date.now(),
        completedDialogues: state.currentDialogue 
          ? new Set([...state.completedDialogues, state.currentDialogue.id])
          : state.completedDialogues,
        isComplete: true
      };

    case 'MARK_COMPLETED':
      return {
        ...state,
        completedDialogues: new Set([...state.completedDialogues, action.payload])
      };

    case 'RESET':
      return initialState;
      
    // Handler for LOAD_PROGRESS action
    case 'LOAD_PROGRESS':
      return {
        ...state,
        currentSentenceIndex: action.payload.currentSentenceIndex ?? state.currentSentenceIndex,
        messages: action.payload.messages ?? state.messages,
        attempts: action.payload.attempts ?? state.attempts,
        showingAnswer: action.payload.showingAnswer ?? state.showingAnswer,
        wordsSpoken: action.payload.wordsSpoken ?? state.wordsSpoken,
        skippedPhrases: action.payload.skippedPhrases ?? state.skippedPhrases,
        startTime: action.payload.startTime ?? state.startTime,
        // Don't overwrite these fields
        completedDialogues: state.completedDialogues,
        isComplete: state.isComplete,
        endTime: state.endTime
      };

    default:
      return state;
  }
}