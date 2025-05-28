// src/context/dialogue/types.ts
// Simplified to remove learnedWords and hints tracking
import { MedicalDialogue } from '../../types/medicalDialogue';
import { Message } from '../../types/dialogue';

export interface DialogueState {
  currentDialogue: MedicalDialogue | null;
  currentSentenceIndex: number;
  messages: Message[];
  attempts: number;
  showingAnswer: boolean;
  isComplete: boolean;
  lastMessageId: number | null;
  completedDialogues: Set<string>;
  skippedPhrases: Set<number>;
  wordsSpoken: number;
  startTime: number | null;
  endTime: number | null;
  isRestoredState?: boolean; // Flag indicating if this state was loaded from storage
}

export type DialogueAction =
  | { type: 'SET_DIALOGUE'; payload: MedicalDialogue }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_LAST_MESSAGE'; payload: Partial<Message> }
  | { type: 'UPDATE_MESSAGE'; payload: { id: number; updates: Partial<Message> } }
  | { type: 'INCREMENT_ATTEMPTS' }
  | { type: 'NEXT_SENTENCE' }
  | { type: 'SET_COMPLETE' }
  | { type: 'MARK_COMPLETED'; payload: string }
  | { type: 'SKIP_STEP'; payload: { skippedIndex: number, timestamp: number } }
  | { type: 'RESET' }
  | { type: 'LOAD_PROGRESS'; payload: Partial<DialogueState> };

export interface DialogueContextType {
  state: DialogueState;
  dispatch: React.Dispatch<DialogueAction>;
  handleTranscript: (text: string) => void;
  handleSkip: () => void;
  skipConfirmationTimeout: NodeJS.Timeout | null;
  setSkipConfirmationTimeout: React.Dispatch<React.SetStateAction<NodeJS.Timeout | null>>;
  setDialogueWithProgress: (dialogue: MedicalDialogue) => boolean;
  resetDialogueProgress: (dialogueId: string) => void;
  isCurrentDialogueCompleted: () => boolean;
}