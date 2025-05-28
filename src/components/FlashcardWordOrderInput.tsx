// src/components/FlashcardWordOrderInput.tsx
// A simplified word order input component specifically for flashcards with minimal UI
import React, { useState, useEffect, useRef } from 'react';
import { useSpeechState } from '../context/SpeechStateContext';
import { Eye } from 'lucide-react';

interface FlashcardWordOrderInputProps {
  onSubmit: (text: string) => void;
  expectedResponse?: string;
  disabled?: boolean;
  autoSubmit?: boolean;
}

export const FlashcardWordOrderInput: React.FC<FlashcardWordOrderInputProps> = ({ 
  onSubmit, 
  expectedResponse = "", 
  disabled = false,
  autoSubmit = true
}) => {
  const [availableWords, setAvailableWords] = useState<{word: string, original: string}[]>([]);
  const [selectedWords, setSelectedWords] = useState<{word: string, original: string}[]>([]);
  const [originalPunctuation, setOriginalPunctuation] = useState<{[key: string]: string}>({});
  const [animating, setAnimating] = useState<number | null>(null);
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const { state: speechState } = useSpeechState();
  
  // Audio refs
  const selectSoundRef = useRef<HTMLAudioElement | null>(null);
  const submitSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Store correct order
  const correctOrderRef = useRef<string[]>([]);
  
  // Preload audio files
  useEffect(() => {
    selectSoundRef.current = new Audio('/navigation_forward-selection-minimal.wav');
    submitSoundRef.current = new Audio('/alert_error.wav');
    
    selectSoundRef.current.load();
    submitSoundRef.current.load();
    
    return () => {
      selectSoundRef.current = null;
      submitSoundRef.current = null;
    };
  }, []);
  
  // Generate available words from expected response
  useEffect(() => {
    if (!expectedResponse) return;
    
    // Track original punctuation
    const punctuationMap: {[key: string]: string} = {};
    
    // Split the expected response into words and preserve original formatting
    const originalWords = expectedResponse.split(/\s+/);
    const wordsWithoutPunctuation = originalWords.map(word => {
      // Store the original word with its punctuation
      const cleanWord = word.toLowerCase().replace(/[.,!?;:'"()]/g, '');
      if (cleanWord !== word.toLowerCase()) {
        punctuationMap[cleanWord] = word;
      }
      return { 
        word: cleanWord, 
        original: word
      };
    }).filter(w => w.word.length > 0);
    
    // Store correct order
    correctOrderRef.current = wordsWithoutPunctuation.map(w => w.word.toLowerCase());
    
    // Shuffle the words
    const shuffledWords = [...wordsWithoutPunctuation].sort(() => Math.random() - 0.5);
    
    setAvailableWords(shuffledWords);
    setSelectedWords([]);
    setOriginalPunctuation(punctuationMap);
    setShowOptions(false);
  }, [expectedResponse]);
  
  // Check if the selected words match the correct order
  const checkCorrectOrder = (wordList: {word: string, original: string}[]) => {
    if (wordList.length !== correctOrderRef.current.length) return false;
    
    return wordList.every((word, index) => {
      return word.word.toLowerCase() === correctOrderRef.current[index];
    });
  };
  
  const handleWordSelect = (word: {word: string, original: string}, index: number) => {
    if (disabled) return;
    
    // Play selection sound
    selectSoundRef.current?.play().catch(e => console.error('Error playing select sound', e));
    
    // Set animating state
    setAnimating(index);
    
    // Remove word from available and add to selected
    setTimeout(() => {
      setAnimating(null);
      const newAvailable = [...availableWords];
      newAvailable.splice(index, 1);
      setAvailableWords(newAvailable);
      
      const newSelected = [...selectedWords, word];
      setSelectedWords(newSelected);
      
      // Check if the order is correct and auto-submit if enabled
      if (autoSubmit && checkCorrectOrder(newSelected)) {
        handleSubmit(newSelected);
      }
    }, 100);
  };
  
  const handleWordDeselect = (word: {word: string, original: string}, index: number) => {
    if (disabled) return;
    
    // Play deselection sound
    selectSoundRef.current?.play().catch(e => console.error('Error playing sound', e));
    
    // Remove word from selected and add back to available
    const newSelected = [...selectedWords];
    newSelected.splice(index, 1);
    setSelectedWords(newSelected);
    setAvailableWords(prev => [...prev, word]);
  };
  
  const handleSubmit = (wordList = selectedWords) => {
    if (disabled || wordList.length === 0) return;
    
    // Play submit sound
    submitSoundRef.current?.play().catch(e => console.error('Error playing sound', e));
    
    // Create the final sentence with proper punctuation and capitalization
    const sentence = wordList.map((word, index) => {
      // Use original word with its punctuation if available
      const originalWithPunctuation = originalPunctuation[word.word] || word.original;
      
      // Capitalize first word
      if (index === 0) {
        return originalWithPunctuation.charAt(0).toUpperCase() + originalWithPunctuation.slice(1);
      }
      
      return originalWithPunctuation;
    }).join(' ');
    
    // Submit after a slight delay for the sound to play
    setTimeout(() => {
      onSubmit(sentence);
    }, 100);
  };
  
  const handleShowOptions = () => {
    setShowOptions(true);
  };
  
  const isDisabled = disabled || speechState.isSpeaking;
  
  // Determine the number of columns based on word count
  const getGridColumns = () => {
    if (availableWords.length <= 3) return 'grid-cols-3';
    if (availableWords.length <= 6) return 'grid-cols-3';
    return 'grid-cols-4';
  };
  
  return (
    <div className="flashcard-word-order flex flex-col items-center">
      {/* Selected words display */}
      {selectedWords.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
          {selectedWords.map((word, index) => (
            <div
              key={`selected-${index}`}
              onClick={() => handleWordDeselect(word, index)}
              className="bg-indigo-100 text-indigo-800 px-3 py-1.5 text-sm
                      rounded-md shadow-sm border border-indigo-200 
                      active:scale-95 transition-all duration-150"
            >
              {word.word}
            </div>
          ))}
        </div>
      )}
      
      {/* Main content area */}
      <div className="w-full mb-4">
        {!showOptions ? (
          // Show Options button
          <div className="flex justify-center my-2">
            <button
              onClick={handleShowOptions}
              className="px-4 py-2 bg-indigo-600 text-white 
                       rounded-md shadow-sm hover:bg-indigo-700 transition-all duration-200
                       text-sm flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              <span>Show Options</span>
            </button>
          </div>
        ) : (
          // Word options grid
          <div className={`grid ${getGridColumns()} gap-3 mt-4`}>
            {availableWords.map((word, index) => (
              <button
                key={`available-${index}`}
                onClick={() => handleWordSelect(word, index)}
                disabled={isDisabled}
                className={`
                  bg-indigo-600 text-white 
                  px-3 py-2.5 text-sm 
                  rounded-md font-medium shadow-sm
                  hover:shadow-md active:scale-90
                  transition-all duration-200 hover:bg-indigo-700
                  ${animating === index ? 'scale-90 opacity-50' : ''}
                  ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {word.word}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};