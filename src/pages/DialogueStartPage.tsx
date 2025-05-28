// src/pages/DialogueStartPage.tsx
// Додано попередження для мобільних пристроїв з центрованим текстом для кращого візуального вигляду

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlayCircle, RotateCcw, AlertTriangle, Monitor } from 'lucide-react';
import { loadDialogue, loadDialogueLegacy } from '../utils/dialogueLoader';
import { MedicalDialogue } from '../types/medicalDialogue';
import { hasDialogueProgress, isDialogueCompleted, resetDialogue } from '../utils/enhancedStorage';
import { useDialogueContext } from '../context/dialogue';
import { isMobileDevice } from '../utils/deviceDetection';

const DialogueStartPage = () => {
  // Get all possible path parameters (legacy and new structure)
  const { courseId, moduleId, dialogueId, categoryId } = useParams();
  const navigate = useNavigate();
  const [dialogueTitle, setDialogueTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [dialogue, setDialogue] = useState<MedicalDialogue | null>(null);
  const [hasProgress, setHasProgress] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Access dialogue context for reset functionality
  const { resetDialogueProgress } = useDialogueContext();
  
  // Determine whether to use legacy or new path structure
  const isLegacyPath = !moduleId && !!categoryId && !!dialogueId;
  
  // Check if user is on mobile device
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);
  
  // Load the dialogue data
  useEffect(() => {
    async function loadDialogueData() {
      try {
        setIsLoading(true);
        let loadedDialogue: MedicalDialogue;
        
        if (isLegacyPath) {
          // Legacy path format
          loadedDialogue = await loadDialogueLegacy(categoryId!, dialogueId!);
        } else {
          // New path format
          loadedDialogue = await loadDialogue(courseId!, moduleId!, dialogueId!);
        }
        
        setDialogue(loadedDialogue);
        setDialogueTitle(loadedDialogue.title || 'Dialogue');
        
        // Check for saved progress
        if (loadedDialogue.id) {
          const progressExists = hasDialogueProgress(loadedDialogue.id);
          const completedExists = isDialogueCompleted(loadedDialogue.id);
          
          setHasProgress(progressExists);
          setIsCompleted(completedExists);
          
          console.log(
            `${progressExists ? '🔄 Found' : '🆕 No'} saved progress for dialogue ${loadedDialogue.id}`
          );
          console.log(
            `${completedExists ? '✅ Dialogue was completed' : '🚫 Dialogue not completed'}`
          );
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load dialogue:', error);
        setIsLoading(false);
        // Navigate back if loading fails
        if (isLegacyPath) {
          navigate(`/dialogues/${categoryId}`);
        } else {
          navigate(`/dialogues/course/${courseId}/module/${moduleId}`);
        }
      }
    }
    
    // Only load if we have the necessary parameters
    if ((isLegacyPath && categoryId && dialogueId) || 
        (!isLegacyPath && courseId && moduleId && dialogueId)) {
      loadDialogueData();
    } else {
      console.error('Missing required parameters for dialogue loading');
      navigate('/dialogues');
    }
  }, [isLegacyPath, categoryId, dialogueId, courseId, moduleId, navigate]);

  // Handle starting the dialogue practice
  const handleStartDialogue = () => {
    if (isCompleted) {
      // For completed dialogues, reset progress first, then start fresh
      handleResetAndStart();
    } else {
      // For new or in-progress dialogues, just navigate to the practice page
      navigateToPractice();
    }
  };
  
  // Navigate to the practice page
  const navigateToPractice = () => {
    if (isLegacyPath) {
      // Legacy URL format with restoration flag if needed
      navigate(`/practice/${categoryId}/${dialogueId}${hasProgress ? '?restore=true' : ''}`);
    } else {
      // New URL format with restoration flag if needed
      navigate(`/practice/${courseId}/${moduleId}/${dialogueId}${hasProgress ? '?restore=true' : ''}`);
    }
  };
  
  // Handle resetting a dialogue and starting it fresh
  const handleResetAndStart = () => {
    if (!dialogue?.id) return;
    
    setIsResetting(true);
    
    // Reset the dialogue progress
    resetDialogueProgress(dialogue.id);
    
    // Short delay for UI feedback
    setTimeout(() => {
      setIsCompleted(false);
      setHasProgress(false);
      setIsResetting(false);
      
      // Navigate to the practice page without the restore flag
      if (isLegacyPath) {
        navigate(`/practice/${categoryId}/${dialogueId}`);
      } else {
        navigate(`/practice/${courseId}/${moduleId}/${dialogueId}`);
      }
    }, 500);
  };

  // Mobile device warning component
  const MobileDeviceWarning = () => (
    <div className="mb-4 bg-amber-50 border border-amber-100 rounded-lg overflow-hidden">
      <div className="flex flex-col items-center py-3 px-4">
        <div className="flex items-center mb-2">
          <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
          <p className="font-medium text-amber-800">Для найкращих результатів 🎯</p>
        </div>
        <p className="text-amber-700 text-sm text-center max-w-xs mx-auto">
          Ми рекомендуємо пройти цей діалог на комп'ютері. Наша система забезпечує безкоштовну розмовну практику з використанням розпізнавання голосу!
        </p>
      </div>
      <div className="bg-amber-100 py-2.5 flex items-center justify-center text-xs font-medium text-amber-700">
        <Monitor className="h-3.5 w-3.5 mr-1.5" />
        Доступно у Google Chrome
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4">
        {isLoading ? (
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-700"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-300 shadow-lg overflow-hidden hover:shadow-md transition-all duration-300">
            <div className="p-6">
              <div className="flex flex-col items-center text-center">
                <h2 className="text-2xl font-bold mb-3 text-indigo-900 text-center">
                  {dialogueTitle} 🎯
                </h2>
                
                {/* Mobile Device Warning */}
                {isMobile && <MobileDeviceWarning />}
                
                {/* Progress Status */}
                {(hasProgress || isCompleted) && (
                  <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg p-3 text-blue-700 text-sm flex items-center">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-2 animate-pulse"></div>
                    <span>
                      {isCompleted 
                        ? "You have already completed this dialogue" 
                        : "You have unfinished progress in this dialogue"}
                    </span>
                  </div>
                )}
                
                {/* Single Action Button */}
                <button
                  onClick={handleStartDialogue}
                  disabled={isResetting}
                  className={`w-full rounded-lg py-3 px-6
                    flex items-center justify-center gap-2
                    transition-all duration-300 shadow-md hover:shadow-lg group font-medium text-base
                    ${isResetting
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : isCompleted
                        ? "bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-50"
                        : "bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white hover:from-indigo-700 hover:via-indigo-800 hover:to-purple-800"
                    }`}
                >
                  {isResetting ? (
                    <>
                      <RotateCcw className="h-5 w-5 animate-spin" />
                      <span>Resetting...</span>
                    </>
                  ) : isCompleted ? (
                    <>
                      <RotateCcw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
                      <span>Start Again</span>
                    </>
                  ) : hasProgress ? (
                    <>
                      <PlayCircle className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      <span>Continue Dialogue</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      <span>Start Dialogue</span>
                    </>
                  )}
                </button>
                
                {/* Info about resetting for completed dialogues */}
                {isCompleted && (
                  <p className="mt-2 text-xs text-gray-500">
                    Starting again will reset your progress and allow you to practice from the beginning
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DialogueStartPage;