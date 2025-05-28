export interface VocabularyItem {
  word: string;
  translation: string;
}

export interface GrammarPattern {
  tense: string;
  notes?: string;
}

export interface DialogueResources {
  vocabulary: VocabularyItem[];
  grammar: GrammarPattern[];
}