export interface Message {
  id: number;
  text: string;
  timestamp?: number;
  completed?: boolean;
  originalText?: string;
  isUser: boolean;
  wordCount?: number;
  isCorrect?: boolean;
  isHint?: boolean;
  type?: 'instruction' | 'student-response' | 'vocabulary' | 'conversation';
  expectedResponse?: string;
  correctedText?: string;
  grammarNote?: string;
  ukrainian?: string;
  corrections?: Array<{
    original: string;
    correct: string;
    isCorrect: boolean;
  }>;
  // Audio URL for pre-recorded audio
  audioUrl?: string;
  responseAudioUrl?: string;
  // Speech synthesis properties
  shouldAutoPlay?: boolean;      // Whether to automatically play TTS
  speechRate?: number;           // Speech rate (0.1 to 10)
  speechPitch?: number;          // Speech pitch (0 to 2)
  speechVolume?: number;         // Speech volume (0 to 1)
  speechLanguage?: string;       // Speech language (e.g., 'en-US', 'en-GB')
}
// ... rest of the file remains the same

export interface ConversationState {
  messages: Message[];
  attempts: number;
  startTime: number | null;
  endTime: number | null;
  learnedWords: Set<string>;
  completedDialogues: Set<string>;
  isTyping: boolean;
  wordsSpoken: number;
  showingAnswer: boolean;
  isComplete: boolean;
  lastMessageId: number | null;
}