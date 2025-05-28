export interface HintGeneratorOptions {
  answer: string;
  attempt: number;
  totalWords: number;
  firstWord: string;
}

export interface HintState {
  currentAttempt: number;
  isShowingAnswer: boolean;
  lastHint: string | null;
}