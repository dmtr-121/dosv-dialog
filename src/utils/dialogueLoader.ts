// src/utils/dialogueLoader.ts - FIXED VERSION - Resource loading removed to prevent MIME errors

import { MedicalDialogue } from '../types/medicalDialogue';
import { findCourseByDialogueId, findModuleByDialogueId } from '../data/dialogueCategories';

// Keep using Vite's import.meta.glob since your app depends on it - only for dialogues
const dialogueFiles = import.meta.glob('../data/dialogues/**/*.json', { eager: true });

// In-memory cache for better performance with direct iframe access
const dialogueCache: Record<string, MedicalDialogue> = {};

/**
 * Load a dialogue by ID, supporting the multi-level structure
 * Optimized for iframe direct access
 */
export async function loadDialogue(
  courseId: string, 
  moduleId: string, 
  dialogueId: string
): Promise<MedicalDialogue> {
  try {
    // Create cache key
    const cacheKey = `${courseId}/${moduleId}/${dialogueId}`;
    
    // Return from cache if available - this helps with iframe embedding
    if (dialogueCache[cacheKey]) {
      console.log(`Using cached dialogue: ${dialogueId}`);
      return dialogueCache[cacheKey];
    }
    
    // Try to load from exact path first (3-level structure)
    const exactPath = `../data/dialogues/${courseId}/${moduleId}/${dialogueId}.json`;
    
    if (dialogueFiles[exactPath]) {
      const dialogue = (dialogueFiles[exactPath] as { default: MedicalDialogue }).default;
      dialogueCache[cacheKey] = dialogue; // Cache the result
      return dialogue;
    }
    
    // Try 2-level path next
    const twoLevelPath = `../data/dialogues/${courseId}/${dialogueId}.json`;
    
    if (dialogueFiles[twoLevelPath]) {
      const dialogue = (dialogueFiles[twoLevelPath] as { default: MedicalDialogue }).default;
      dialogueCache[cacheKey] = dialogue; // Cache the result
      return dialogue;
    }
    
    // If not found with exact path, try to find it anywhere
    for (const path in dialogueFiles) {
      const components = extractPathComponents(path);
      if (components.dialogueId === dialogueId) {
        const dialogue = (dialogueFiles[path] as { default: MedicalDialogue }).default;
        dialogueCache[cacheKey] = dialogue; // Cache the result
        return dialogue;
      }
    }
    
    throw new Error(`Dialogue not found: ${dialogueId}`);
  } catch (error) {
    console.error(`Failed to load dialogue: ${courseId}/${moduleId}/${dialogueId}`, error);
    throw error;
  }
}

/**
 * Legacy function for backward compatibility
 */
export async function loadDialogueLegacy(
  categoryId: string, 
  dialogueId: string
): Promise<MedicalDialogue> {
  try {
    // First try the direct path (legacy format)
    const legacyPath = `../data/dialogues/${categoryId}/${dialogueId}.json`;
    
    // Check cache first
    const cacheKey = `${categoryId}/${dialogueId}`;
    if (dialogueCache[cacheKey]) {
      return dialogueCache[cacheKey];
    }
    
    if (dialogueFiles[legacyPath]) {
      const dialogue = (dialogueFiles[legacyPath] as { default: MedicalDialogue }).default;
      dialogueCache[cacheKey] = dialogue; // Cache it
      return dialogue;
    }
    
    // If not found, try to find it in the course/module structure
    const locationInfo = findModuleByDialogueId(dialogueId);
    
    if (locationInfo) {
      return loadDialogue(
        locationInfo.course.id,
        locationInfo.module.id,
        dialogueId
      );
    }
    
    // If still not found, search all paths
    for (const path in dialogueFiles) {
      const components = extractPathComponents(path);
      if (components.dialogueId === dialogueId) {
        const dialogue = (dialogueFiles[path] as { default: MedicalDialogue }).default;
        dialogueCache[cacheKey] = dialogue;
        return dialogue;
      }
    }
    
    throw new Error(`Dialogue not found: ${categoryId}/${dialogueId}`);
  } catch (error) {
    console.error(`Failed to load dialogue: ${categoryId}/${dialogueId}`, error);
    throw error;
  }
}

/**
 * Helper function to get all available dialogues
 * @returns All dialogues organized by path
 */
export async function getAllDialogues(): Promise<Record<string, MedicalDialogue>> {
  const dialogues: Record<string, MedicalDialogue> = {};
  
  for (const path in dialogueFiles) {
    const components = extractPathComponents(path);
    const dialogue = (dialogueFiles[path] as { default: MedicalDialogue }).default;
    dialogues[components.dialogueId] = dialogue;
  }
  
  return dialogues;
}

/**
 * Extracts path components from a file path
 * @param path File path
 * @returns Object with courseId, moduleId, and dialogueId
 */
function extractPathComponents(path: string): { courseId: string; moduleId: string; dialogueId: string } {
  const parts = path.split('/');
  
  // Handle different path formats (3-level, 2-level, or legacy)
  if (parts.length >= 6) { // Full three-level path: ../data/dialogues/course/module/dialogue.json
    return {
      courseId: parts[parts.length - 3],
      moduleId: parts[parts.length - 2],
      dialogueId: parts[parts.length - 1].replace('.json', '')
    };
  } else if (parts.length >= 5) { // Two-level path: ../data/dialogues/category/dialogue.json
    return {
      courseId: parts[parts.length - 2],
      moduleId: parts[parts.length - 2], // Use category as both course and module
      dialogueId: parts[parts.length - 1].replace('.json', '')
    };
  } else { // Legacy path or unexpected format
    const dialogueId = parts[parts.length - 1].replace('.json', '');
    return {
      courseId: '',
      moduleId: '',
      dialogueId
    };
  }
}

/**
 * Verify dialogue audio URLs (basic validation)
 */
export function verifyAudioUrls(dialogue: MedicalDialogue): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  dialogue.conversation.forEach((step, index) => {
    if (step.audioUrl && !step.audioUrl.startsWith('http')) {
      issues.push(`Step ${index}: Invalid audio URL - ${step.audioUrl}`);
    }
    if (step.responseAudioUrl && !step.responseAudioUrl.startsWith('http')) {
      issues.push(`Step ${index}: Invalid response audio URL - ${step.responseAudioUrl}`);
    }
  });
  
  return {
    valid: issues.length === 0,
    issues
  };
}