// src/utils/resourceLoader.ts - UPDATED VERSION - Resource loading disabled to prevent MIME errors
// Removed all resource loading functions since resources directory is empty

import { DialogueResources } from '../types/vocabulary';
import { findCourseByDialogueId, findModuleByDialogueId } from '../data/dialogueCategories';

// NOTE: Resource loading has been disabled because the resources directory is empty
// This prevents MIME type errors during module loading

/**
 * Load dialogue resources - currently returns empty resources to prevent errors
 */
export async function loadDialogueResources(
  courseId: string,
  moduleId: string,
  dialogueId: string
): Promise<DialogueResources> {
  console.warn(`Resource loading disabled - returning empty resources for ${dialogueId}`);
  return {
    vocabulary: [],
    grammar: []
  };
}

/**
 * Legacy function for backward compatibility - returns empty resources
 */
export async function loadDialogueResourcesLegacy(
  categoryId: string,
  dialogueId: string
): Promise<DialogueResources> {
  console.warn(`Resource loading disabled - returning empty resources for ${dialogueId}`);
  return {
    vocabulary: [],
    grammar: []
  };
}