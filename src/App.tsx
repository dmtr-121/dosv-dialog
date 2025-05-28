import React from 'react';
import { DialogueProvider } from './context/dialogue';
import { SpeechStateProvider } from './context/SpeechStateContext';
import LanguageSettingsModal from './components/modals/LanguageSettingsModal';
import AppRouter from './router';

export default function App() {
  return (
    <SpeechStateProvider>
      {/* Видалено HistoryProvider */}
      <DialogueProvider>
        {/* Видалено HeaderProvider */}
        <LanguageSettingsModal />
        <AppRouter />
      </DialogueProvider>
    </SpeechStateProvider>
  );
}