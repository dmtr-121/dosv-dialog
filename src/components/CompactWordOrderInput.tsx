// CompactWordOrderInput.tsx - Updated with hint feature for mobile devices
// The component now includes a hint button for sentences longer than 5 words,
// which helps students start sentences by automatically selecting the first 2-3 words.

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useSpeechState } from '../context/SpeechStateContext';
import { Send, RotateCcw, Undo, Eye, Check, HelpCircle, Lightbulb } from 'lucide-react';

interface WordOrderInputProps {
  onSubmit: (text: string) => void;
  expectedResponse?: string;
  disabled?: boolean;
  isMinimal?: boolean;
  undoLastWordOnly?: boolean;
}

export const CompactWordOrderInput: React.FC<WordOrderInputProps> = ({ 
  onSubmit, 
  expectedResponse = "", 
  disabled = false,
  isMinimal = false,
  undoLastWordOnly = false
}) => {
  const [availableWords, setAvailableWords] = useState<{word: string, original: string}[]>([]);
  const [selectedWords, setSelectedWords] = useState<{word: string, original: string}[]>([]);
  const [originalPunctuation, setOriginalPunctuation] = useState<{[key: string]: string}>({});
  const [animating, setAnimating] = useState<number | null>(null);
  const [wordsBlurred, setWordsBlurred] = useState<boolean>(true);
  const [hasSpokenOutLoud, setHasSpokenOutLoud] = useState<boolean>(false);
  const [correctWordOrder, setCorrectWordOrder] = useState<string[]>([]);
  const [autoSubmitInProgress, setAutoSubmitInProgress] = useState<boolean>(false);
  const [smallContainer, setSmallContainer] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [hintWords, setHintWords] = useState<string[]>([]);
  const [hintUsed, setHintUsed] = useState<boolean>(false);
  const [sentenceIsLong, setSentenceIsLong] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state: speechState } = useSpeechState();
  
  // Audio refs to preload and reuse audio files
  const selectSoundRef = useRef<HTMLAudioElement | null>(null);
  const removeSoundRef = useRef<HTMLAudioElement | null>(null);
  const submitSoundRef = useRef<HTMLAudioElement | null>(null);
  const hintSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Check container size for adaptive layout
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    
    const checkSize = () => {
      const container = containerRef.current;
      if (container) {
        setSmallContainer(container.offsetWidth < 150 || container.offsetHeight < 60);
        // Check if device is mobile
        setIsMobile(window.innerWidth < 768);
      }
    };
    
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, [availableWords]);
  
  // Preload audio files
  useEffect(() => {
    selectSoundRef.current = new Audio('/navigation_forward-selection-minimal.wav');
    removeSoundRef.current = new Audio('/alert_error.wav');
    submitSoundRef.current = new Audio('/navigation_backward-selection-minimal.wav');
    hintSoundRef.current = new Audio('/navigation_forward-selection-minimal.wav');
    
    // Preload audio files
    selectSoundRef.current.load();
    removeSoundRef.current.load();
    submitSoundRef.current.load();
    hintSoundRef.current.load();
    
    return () => {
      // Clean up audio elements
      selectSoundRef.current = null;
      removeSoundRef.current = null;
      submitSoundRef.current = null;
      hintSoundRef.current = null;
    };
  }, []);
  
  // Generate available words from expected response + distractors
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
    
    // Store the correct word order for checking auto-submit
    setCorrectWordOrder(wordsWithoutPunctuation.map(w => w.word.toLowerCase()));
    
    // Check if sentence is long enough to show hint
    const isLongSentence = wordsWithoutPunctuation.length > 5;
    setSentenceIsLong(isLongSentence);
    
    // Prepare hint words - first 2-3 words for long sentences
    if (isLongSentence) {
      const hintWordCount = wordsWithoutPunctuation.length > 8 ? 3 : 2;
      setHintWords(wordsWithoutPunctuation.slice(0, hintWordCount).map(w => w.word.toLowerCase()));
    } else {
      setHintWords([]);
    }
    
    // Generate distractors only if there are 5 or fewer actual words
    let allWords = [...wordsWithoutPunctuation];
    
    // Only add distractors if there are 5 or fewer words
    if (wordsWithoutPunctuation.length <= 5) {
      // Generate 1-2 distractors
      const commonDistractors = ['the', 'a', 'an', 'in', 'on', 'with', 'by', 'for', 'to', 'from'];
      const existingWords = wordsWithoutPunctuation.map(w => w.word);
      const potentialDistractors = commonDistractors.filter(d => !existingWords.includes(d));
      const numDistractors = Math.min(Math.floor(Math.random() * 2) + 1, potentialDistractors.length);
      const selectedDistractors = potentialDistractors
        .sort(() => Math.random() - 0.5)
        .slice(0, numDistractors)
        .map(word => ({ word, original: word }));
      
      // Add distractors to the words list
      allWords = [...wordsWithoutPunctuation, ...selectedDistractors];
    }
    
    // Shuffle the words
    allWords.sort(() => Math.random() - 0.5);
    
    setAvailableWords(allWords);
    setSelectedWords([]);
    setOriginalPunctuation(punctuationMap);
    setWordsBlurred(true); // Reset blur state when new words are loaded
    setHasSpokenOutLoud(false); // Reset spoken state when new words are loaded
    setAutoSubmitInProgress(false); // Reset auto-submit state
    setHintUsed(false); // Reset hint used state
  }, [expectedResponse]);
  
  // Check if the current selection is correct enough to auto-submit (80% threshold)
  useEffect(() => {
    // Skip if already processing auto-submit or if we don't have enough data
    if (autoSubmitInProgress || selectedWords.length === 0 || correctWordOrder.length === 0) return;
    
    // Calculate how many words are in correct position
    let correctCount = 0;
    selectedWords.forEach((word, index) => {
      if (index < correctWordOrder.length && word.word.toLowerCase() === correctWordOrder[index]) {
        correctCount++;
      }
    });
    
    // Calculate correctness percentage
    const correctnessPercentage = (correctCount / correctWordOrder.length) * 100;
    
    // Auto-submit if 80% correct and we have all words selected
    if (correctnessPercentage >= 80 && selectedWords.length >= correctWordOrder.length) {
      // Prevent further interactions
      setAutoSubmitInProgress(true);
      
      // Wait a moment for visual feedback before submitting
      setTimeout(() => handleSubmit(), 0);
    }
  }, [selectedWords, correctWordOrder]);
  
  const handleWordSelect = (word: {word: string, original: string}, index: number) => {
    if (disabled || autoSubmitInProgress) return;
    
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
      setSelectedWords([...selectedWords, word]);
    }, 100);
  };
  
  const handleWordDeselect = (word: {word: string, original: string}, index: number) => {
    if (disabled || autoSubmitInProgress) return;
    
    // Play deselection sound
    removeSoundRef.current?.play().catch(e => console.error('Error playing remove sound', e));
    
    // Remove word from selected and add back to available
    const newSelected = [...selectedWords];
    newSelected.splice(index, 1);
    setSelectedWords(newSelected);
    setAvailableWords([...availableWords, word]);
  };
  
  const handleSubmit = () => {
    if (disabled || selectedWords.length === 0) return;
    
    // Play submit sound
    submitSoundRef.current?.play().catch(e => console.error('Error playing submit sound', e));
    
    // Create the final sentence with proper punctuation and capitalization
    const sentence = selectedWords.map((word, index) => {
      // Use original word with its punctuation if available
      const originalWithPunctuation = originalPunctuation[word.word] || word.original;
      
      // Capitalize first word
      if (index === 0) {
        return originalWithPunctuation.charAt(0).toUpperCase() + originalWithPunctuation.slice(1);
      }
      
      return originalWithPunctuation;
    }).join(' ');
    
    // Add a slight delay for the sound to play
    setTimeout(() => {
      onSubmit(sentence);
    }, 100);
  };
  
  const handleReset = () => {
    // Don't allow reset if auto-submit is in progress
    if (autoSubmitInProgress) return;
    
    // Play reset sound
    removeSoundRef.current?.play().catch(e => console.error('Error playing reset sound', e));
    
    if (undoLastWordOnly && selectedWords.length > 0) {
      // If undoLastWordOnly is true, only remove the last selected word
      const lastWord = selectedWords[selectedWords.length - 1];
      const newSelected = [...selectedWords];
      newSelected.pop(); // Remove the last word
      setSelectedWords(newSelected);
      setAvailableWords([...availableWords, lastWord]);
    } else {
      // Generate original words again from expected response
      const wordsWithoutPunctuation = expectedResponse.split(/\s+/).map(word => {
        const cleanWord = word.toLowerCase().replace(/[.,!?;:'"()]/g, '');
        return { 
          word: cleanWord, 
          original: word
        };
      }).filter(w => w.word.length > 0);
      
      // Determine if we should include distractors (only for 5 or fewer words)
      let allWords = [...wordsWithoutPunctuation];
      
      if (wordsWithoutPunctuation.length <= 5) {
        // Add distractors back
        const distractors = availableWords.filter(w => 
          !wordsWithoutPunctuation.some(original => original.word === w.word)
        );
        
        // Combine with distractors
        allWords = [...wordsWithoutPunctuation, ...distractors];
      }
      
      // Shuffle the words
      allWords.sort(() => Math.random() - 0.5);
      
      // Reset state
      setAvailableWords(allWords);
      setSelectedWords([]);
      setWordsBlurred(true); // Reset blur state when resetting words
      setHasSpokenOutLoud(false); // Reset spoken state when resetting words
      setAutoSubmitInProgress(false); // Reset auto-submit state
      setHintUsed(false); // Reset hint used state
    }
  };
  
  // Combined function that immediately shows options with a single tap
  const revealOptions = () => {
    setWordsBlurred(false);
  };
  
  // New function to show hint by selecting the first few words
  const showHint = () => {
    if (disabled || autoSubmitInProgress || wordsBlurred || hintUsed || !sentenceIsLong) return;
    
    // Play hint sound
    hintSoundRef.current?.play().catch(e => console.error('Error playing hint sound', e));
    
    // Mark hint as used
    setHintUsed(true);
    
    // Find and select the first few words in order
    const hintSelections: {word: {word: string, original: string}, index: number}[] = [];
    
    // For each hint word, find it in available words
    for (const hintWord of hintWords) {
      const availableWordIndex = availableWords.findIndex(w => 
        w.word.toLowerCase() === hintWord.toLowerCase()
      );
      
      if (availableWordIndex !== -1) {
        hintSelections.push({
          word: availableWords[availableWordIndex],
          index: availableWordIndex
        });
      }
    }
    
    // Now select the words one by one with a slight delay for visual feedback
    let delay = 0;
    let newAvailable = [...availableWords];
    let newSelected = [...selectedWords];
    
    hintSelections.forEach((selection) => {
      // Adjust index based on words that have been removed
      const adjustedWordIndices = hintSelections
        .filter((_, i) => i < hintSelections.indexOf(selection))
        .map(item => item.index);
      
      const adjustedIndex = selection.index - adjustedWordIndices.filter(i => i < selection.index).length;
      
      setTimeout(() => {
        // Play selection sound
        selectSoundRef.current?.play().catch(e => console.error('Error playing select sound', e));
        
        // Set animating state
        setAnimating(adjustedIndex);
        
        setTimeout(() => {
          setAnimating(null);
          
          // Update available and selected words
          newAvailable = newAvailable.filter((_, i) => i !== adjustedIndex);
          newSelected = [...newSelected, selection.word];
          
          setAvailableWords([...newAvailable]);
          setSelectedWords([...newSelected]);
        }, 100);
      }, delay);
      
      delay += 300; // Space out the selection animations
    });
  };
  
  const isDisabled = disabled || speechState.isSpeaking || autoSubmitInProgress;

  // Check if currently selected words match the correct order
  const isCorrectOrder = () => {
    if (selectedWords.length === 0 || correctWordOrder.length === 0) return false;
    
    // Calculate how many words are in correct position
    let correctCount = 0;
    selectedWords.forEach((word, index) => {
      if (index < correctWordOrder.length && word.word.toLowerCase() === correctWordOrder[index]) {
        correctCount++;
      }
    });
    
    // Calculate correctness percentage
    const correctnessPercentage = (correctCount / correctWordOrder.length) * 100;
    
    return correctnessPercentage >= 80 && selectedWords.length >= correctWordOrder.length;
  };

  // Determine the number of columns based on word count
  const getGridColumns = () => {
    // For minimal mode
    if (isMinimal) {
      if (availableWords.length <= 3) return 'grid-cols-3';
      if (availableWords.length <= 6) return 'grid-cols-3';
      if (availableWords.length <= 9) return 'grid-cols-3';
      return 'grid-cols-4';
    }
    // For regular mode
    else {
      if (availableWords.length <= 2) return 'grid-cols-2';
      if (availableWords.length <= 4) return 'grid-cols-2';
      if (availableWords.length <= 6) return 'grid-cols-3';
      return 'grid-cols-4';
    }
  };
  
  // Determine if the answer is correct for visual feedback
  const showCorrectFeedback = isCorrectOrder() || autoSubmitInProgress;
  
  // No longer needed since we've moved the hint button to the bottom action bar
  // const shouldShowHintButton = isMobile && sentenceIsLong && !wordsBlurred && !hintUsed;
  
  return (
    <div className="word-order-container flex flex-col h-full">
      {/* Selected words area - with auto height when needed */}
      <div className={`bg-white rounded-lg shadow-sm border 
                     p-2 ${isMinimal ? 'min-h-[40px]' : 'min-h-[46px]'} mb-2 
                     transition-all duration-300 flex-grow
                     ${showCorrectFeedback ? 'border-green-300 bg-green-50' : 'border-indigo-100'}`}>
        {selectedWords.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {selectedWords.map((word, index) => (
              <div
                key={`selected-${index}`}
                onClick={() => handleWordDeselect(word, index)}
                className={`${showCorrectFeedback 
                  ? 'bg-green-100 text-green-800 border-green-200' 
                  : 'bg-indigo-100 text-indigo-800 border-indigo-200 active:scale-95'}
                  ${isMinimal ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'}
                  rounded-md shadow-sm border
                  transition-all duration-150
                  ${autoSubmitInProgress ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {word.word}
              </div>
            ))}
          </div>
        ) : (
          <div className={`flex justify-center items-center h-full 
                         text-indigo-300 ${isMinimal ? 'text-xs' : 'text-sm'}`}>
            Складіть відповідь
          </div>
        )}
      </div>
      
      {/* Dynamic grid layout for available words - with blur overlay */}
      <div className="relative mb-2" ref={containerRef}>
        {/* Adaptive blur overlay based on container size */}
       {wordsBlurred && (
  <div 
    className="absolute inset-0 z-10 flex items-center justify-center 
              bg-indigo-100 border border-indigo-200 rounded-md
              bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1IiBoZWlnaHQ9IjUiPgo8cmVjdCB3aWR0aD0iNSIgaGVpZ2h0PSI1IiBmaWxsPSIjZjhmYWZjIj48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDVMNSAwWk02IDRMNCA2Wk0tMSAxTDEgLTFaIiBzdHJva2U9IiNlMGU3ZmYiIHN0cm9rZS13aWR0aD0iMSI+PC9wYXRoPgo8L3N2Zz4=')]"
  >
    {smallContainer ? (
      // Compact version for small containers - just the button
      <button
        onClick={revealOptions}
        className="flex items-center justify-center p-1 bg-indigo-600 text-white 
                rounded-md shadow-sm hover:bg-indigo-700 transition-all duration-200 m-1"
      >
        <Eye className={`${isMinimal ? 'w-3 h-3' : 'w-4 h-4'}`} />
      </button>
    ) : (
      // Regular version for normal containers
      <div className="flex items-center justify-center p-1 gap-2 flex-wrap">
        <p className={`text-indigo-800 font-medium text-center m-0 px-1
                    ${isMinimal ? 'text-xs' : 'text-xs'}`}>
          Спробуйте перекласти вголос
        </p>
        
        <button
          onClick={revealOptions}
          className={`flex items-center gap-1 px-1 py-0.5 bg-indigo-600 text-white 
                    rounded-md shadow-sm hover:bg-indigo-700 transition-all duration-200
                    ${isMinimal ? 'text-xs' : 'text-xs'}`}
        >
          <Eye className={`${isMinimal ? 'w-2 h-2' : 'w-3 h-3'}`} />
          <span>Показати</span>
        </button>
      </div>
    )}
  </div>
)}
        
        {/* Word grid */}
        <div className={`grid ${getGridColumns()} gap-1`}>
          {availableWords.map((word, index) => (
            <button
              key={`available-${index}`}
              onClick={() => handleWordSelect(word, index)}
              disabled={isDisabled || wordsBlurred}
              className={`
                bg-indigo-600 text-white 
                ${isMinimal ? 'px-1.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} 
                rounded-md font-medium shadow-sm
                hover:shadow-md active:scale-90
                transition-all duration-200 hover:bg-indigo-700
                ${animating === index ? 'scale-90 opacity-50' : ''}
                ${isDisabled || wordsBlurred ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {word.word}
            </button>
          ))}
        </div>
        
        {/* Removed the overlay hint button */}
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-between gap-1">
        {/* Left side - Reset button */}
        <button
          onClick={handleReset}
          disabled={isDisabled || (selectedWords.length === 0 && availableWords.length === 0)}
          className={`p-1.5 rounded-full bg-gray-100 text-gray-600
                   hover:bg-gray-200 transition-all duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed`}
          aria-label={undoLastWordOnly ? "Undo Last Word" : "Reset"}
        >
          {undoLastWordOnly ? (
            <Undo className={`${isMinimal ? 'w-4 h-4' : 'w-5 h-5'}`} />
          ) : (
            <RotateCcw className={`${isMinimal ? 'w-4 h-4' : 'w-5 h-5'}`} />
          )}
        </button>
        
        {/* Middle - Hint button (only shown on mobile for long sentences) */}
        <div className="flex-grow flex justify-center">
          {isMobile && sentenceIsLong && !hintUsed && (
            <button
              onClick={showHint}
              disabled={isDisabled || wordsBlurred || hintUsed}
              className={`p-1.5 rounded-full bg-yellow-500 text-white
                       hover:bg-yellow-600 transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-label="Show Hint"
              title="Показати перші слова речення"
            >
              <Lightbulb className={`${isMinimal ? 'w-4 h-4' : 'w-5 h-5'}`} />
            </button>
          )}
        </div>
        
        {/* Right side - Submit button */}
        <button
          onClick={handleSubmit}
          disabled={isDisabled || selectedWords.length === 0}
          className={`flex items-center justify-center gap-1
                   px-2 py-1 rounded-lg 
                   ${showCorrectFeedback ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}
                   text-white shadow-sm hover:shadow-md 
                   transition-all duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed
                   ${isMinimal ? 'text-xs' : 'text-sm'}`}
          aria-label="Submit"
        >
          <span>Відправити</span>
          <Send className={`${isMinimal ? 'w-3 h-3' : 'w-4 h-4'}`} />
        </button>
      </div>
    </div>
  );
};