// src/pages/DialoguePlayer.tsx
// Updated to use simplified CompletionMessage
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { loadDialogue, loadDialogueLegacy } from '../utils/dialogueLoader';
import DialogueBox from '../components/dialogue/DialogueBox';
import SpeechInput from '../components/SpeechInput';
import { useDialogueContext } from '../context/dialogue';
import { verifyAudioUrls } from '../utils/dialogueLoader';
import { MedicalDialogue } from '../types/medicalDialogue';
import CompletionMessage from '../components/CompletionMessage';
import SessionRestorationOverlay from '../components/SessionRestorationOverlay';
import { hasDialogueProgress } from '../utils/enhancedStorage';
import { useSpeechState } from '../context/SpeechStateContext';

export default function DialoguePlayer() {
  // Get all possible path parameters (both legacy and new structure)
  const { courseId, moduleId, dialogueId, categoryId } = useParams();
  const navigate = useNavigate();
  const location = window.location; // Access to current URL
  const { 
    state, 
    dispatch, 
    handleTranscript,
    setDialogueWithProgress
  } = useDialogueContext();
  
  const [currentDialogue, setCurrentDialogue] = useState<MedicalDialogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLastInCategory, setIsLastInCategory] = useState(false);
  const [audioValidationIssues, setAudioValidationIssues] = useState<string[]>([]);
  
  // Check for restore parameter in URL
  const urlParams = new URLSearchParams(location.search);
  const shouldRestore = urlParams.get('restore') === 'true';
  
  // Set overlay IMMEDIATELY if restoration is needed
  const [showRestorationOverlay, setShowRestorationOverlay] = useState(shouldRestore);
  
  // Add restoration attempts tracking
  const [restorationAttempts, setRestorationAttempts] = useState(0);
  
  // Add ref to track if we've completed the restoration process
  const restorationCompletedRef = useRef(false);

  // Determine if we're using legacy paths or new structure
  const isLegacyPath = !moduleId && !!categoryId;
  
  // Get effective path parameters
  const effectiveCourseId = courseId || categoryId || '';
  const effectiveModuleId = moduleId || categoryId || '';
  const effectiveDialogueId = dialogueId || '';

  // Add emergency escape timer for restoration overlay
  useEffect(() => {
    let emergencyTimer: NodeJS.Timeout | null = null;
    
    if (showRestorationOverlay) {
      console.log('🚨 Setting up emergency restoration escape timer - 10 seconds max');
      emergencyTimer = setTimeout(() => {
        console.log('🚨 Emergency restoration escape triggered - forcing overlay to close');
        setShowRestorationOverlay(false);
        restorationCompletedRef.current = true;
        window.sessionStorage.removeItem('__restored_dialogue');
      }, 10000);
    }
    
    return () => {
      if (emergencyTimer) {
        clearTimeout(emergencyTimer);
      }
    };
  }, [showRestorationOverlay]);

  // Load the current dialogue
  useEffect(() => {
    async function loadCurrentDialogue() {
      if (!effectiveDialogueId || (!effectiveCourseId && !effectiveModuleId)) {
        navigate('/dialogues');
        return;
      }
      
      try {
        setLoading(true);
        let dialogue: MedicalDialogue;
        
        if (isLegacyPath) {
          // Use legacy loading method
          dialogue = await loadDialogueLegacy(categoryId!, dialogueId!);
        } else {
          // Use new structure loading method
          dialogue = await loadDialogue(effectiveCourseId, effectiveModuleId, effectiveDialogueId);
        }
        
        setCurrentDialogue(dialogue);

        // Validate audio URLs
        const validation = verifyAudioUrls(dialogue);
        if (!validation.valid) {
          console.warn('Audio URL validation issues:', validation.issues);
          setAudioValidationIssues(validation.issues);
        }

        // Try to load saved progress
        const hadSavedProgress = setDialogueWithProgress(dialogue);
        
        // If no saved progress, show first message
        if (!hadSavedProgress && dialogue.conversation[0]) {
          dispatch({
            type: 'ADD_MESSAGE',
            payload: {
              id: Date.now(),
              text: dialogue.conversation[0].ukrainian || dialogue.conversation[0].teacherApp,
              isUser: false,
              type: dialogue.conversation[0].type,
              audioUrl: dialogue.conversation[0].audioUrl
            }
          });
        }
      } catch (error) {
        console.error('Failed to load dialogue:', error);
        navigate('/dialogues');
      } finally {
        setLoading(false);
      }
    }
    
    loadCurrentDialogue();
  }, [
    effectiveCourseId, 
    effectiveModuleId, 
    effectiveDialogueId, 
    isLegacyPath, 
    categoryId, 
    dialogueId, 
    navigate, 
    dispatch,
    setDialogueWithProgress,
    restorationAttempts // Added to trigger reload after restoration
  ]);

  // Check if this is the last dialogue in the category/module
  useEffect(() => {
    // This needs to be updated to check if it's the last in the course/module
    setIsLastInCategory(false); // Default value, will be updated with proper logic
  }, [effectiveCourseId, effectiveModuleId, effectiveDialogueId]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!currentDialogue) {
    return null;
  }

  const totalSteps = currentDialogue.conversation.length;
  const currentProgress = state.currentSentenceIndex;
  const progressPercentage = totalSteps > 0 
    ? Math.round((currentProgress / totalSteps) * 100)
    : 0;

  // Enhanced handler for when the restoration overlay finishes
  const handleRestorationFinished = () => {
    console.log('🎯 Restoration overlay finished - removing overlay');
    
    // Prevent multiple executions
    if (restorationCompletedRef.current) return;
    restorationCompletedRef.current = true;
    
    // Update UI state
    setShowRestorationOverlay(false);
    
    // Force a refresh of components to ensure state is correctly applied
    setRestorationAttempts(prev => prev + 1);
    
    // Clean up session storage flag
    window.sessionStorage.removeItem('__restored_dialogue');
  };

  return (
    <div className="fixed inset-0 bg-gray-50">
      {/* Restoration Overlay - shown when restoring progress */}
      {showRestorationOverlay && (
        <SessionRestorationOverlay 
          onFinished={handleRestorationFinished}
          dialogueTitle={currentDialogue?.title || 'dialogue'}
          duration={2500} // 2.5 seconds
        />
      )}
      
      {/* Progress bar only - no full header */}
      <div className="fixed top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 z-20 transition-all duration-300"
           style={{ width: `${progressPercentage}%` }} />
      
      {/* Audio URL validation issues warning */}
      {audioValidationIssues.length > 0 && (
        <div className="fixed top-2 left-0 right-0 bg-amber-50 border-b border-amber-200 py-2 px-4 z-40">
          <div className="max-w-3xl mx-auto">
            <p className="text-amber-700 text-sm">
              <strong>Warning:</strong> Some audio URLs may not be valid. Check the console for details.
            </p>
          </div>
        </div>
      )}
      
      {/* Dialogue Content */}
      <div className="h-[calc(100vh-8rem)]">
        <div className="h-full max-w-3xl mx-auto">
          <DialogueBox 
            messages={state.messages} 
            attempts={state.attempts}
          />
        </div>
      </div>
      <SpeechInput onTranscript={handleTranscript} />
      {state.isComplete && (
        <CompletionMessage
          dialogueTitle={currentDialogue.title}
          startTime={state.startTime || Date.now()}
          endTime={state.endTime || Date.now()}
          wordsSpoken={state.wordsSpoken}
          categoryId={isLegacyPath ? categoryId || '' : `${effectiveCourseId}/${effectiveModuleId}`}
          dialogueId={effectiveDialogueId}
          isLastInCategory={isLastInCategory}
        />
      )}
    </div>
  );
}