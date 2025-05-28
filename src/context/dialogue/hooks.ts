import { useContext } from 'react';
import { DialogueContext } from './DialogueContext';

export function useDialogueContext() {
  const context = useContext(DialogueContext);
  if (!context) {
    throw new Error('useDialogueContext must be used within a DialogueProvider');
  }
  return context;
}