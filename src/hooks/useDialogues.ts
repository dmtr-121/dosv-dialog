import { useState, useEffect } from 'react';
import { MedicalDialogue } from '../types/medicalDialogue';
import { loadDialogue, loadDialogueLegacy } from '../utils/dialogueLoader';

/**
 * Custom hook to load dialogues based on course, module and dialogue IDs
 * @param courseId - ID of the course
 * @param moduleId - ID of the module
 * @param dialogueIds - Array of dialogue IDs to load
 * @returns Object containing dialogues, loading state and any error
 */
export function useDialogues(courseId: string, moduleId: string, dialogueIds: string[]) {
  const [dialogues, setDialogues] = useState<Record<string, MedicalDialogue>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDialogues() {
      setLoading(true);
      setError(null);
      
      try {
        // Determine if we're using legacy paths
        const isLegacyPath = !moduleId || moduleId === courseId;
        
        console.log(`Loading dialogues with ${isLegacyPath ? 'legacy' : 'new'} path structure:`, {
          courseId,
          moduleId,
          dialogueIds,
          isLegacyPath
        });
        
        const loadedDialogues = await Promise.all(
          dialogueIds.map(async id => {
            try {
              let dialogue: MedicalDialogue;
              
              if (isLegacyPath) {
                // Legacy loading (category/dialogue)
                dialogue = await loadDialogueLegacy(courseId, id);
              } else {
                // New structure loading (course/module/dialogue)
                dialogue = await loadDialogue(courseId, moduleId, id);
              }
              
              return [id, dialogue] as [string, MedicalDialogue];
            } catch (error) {
              console.error(`Failed to load dialogue: ${id}`, error);
              return null;
            }
          })
        );

        const dialogueMap = Object.fromEntries(
          loadedDialogues.filter((r): r is [string, MedicalDialogue] => r !== null)
        );
        
        setDialogues(dialogueMap);
      } catch (error) {
        setError('Failed to load dialogues');
        console.error('Error loading dialogues:', error);
      } finally {
        setLoading(false);
      }
    }

    if (dialogueIds.length > 0) {
      loadDialogues();
    } else {
      setLoading(false);
    }
  }, [courseId, moduleId, dialogueIds]);

  return { dialogues, loading, error };
}

/**
 * Legacy version for backward compatibility
 * @param categoryId - Legacy category ID
 * @param dialogueIds - Array of dialogue IDs to load
 * @returns Object containing dialogues, loading state and any error
 */
export function useDialoguesLegacy(categoryId: string, dialogueIds: string[]) {
  return useDialogues(categoryId, categoryId, dialogueIds);
}