// src/utils/enhancedStorage.ts
// Simplified storage utility that focuses on dialogue progress and completion tracking
// Removed learned words tracking and simplified overall implementation

import { DialogueState } from '../context/dialogue/types';

// Constants
const PROGRESS_KEY_PREFIX = 'dialogue_progress_';
const COMPLETED_KEY_PREFIX = 'completed_dialogue_';
const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB max storage target
const PROGRESS_EXPIRATION_DAYS = 30; // Progress expires after 30 days
const COMPLETED_EXPIRATION_DAYS = 90; // Completed dialogues info expires after 90 days

/**
 * Storage item with expiration date
 */
interface StorageItem<T> {
  data: T;
  expiration: number; // Timestamp when this data expires
  version: number;    // For future migrations if needed
  createdAt: number;  // When this data was first created
  updatedAt: number;  // When this data was last updated
}

/**
 * Saves dialogue progress to local storage with expiration date
 * @param dialogueId - ID of the dialogue
 * @param state - Current dialogue state to save
 * @param expirationDays - Optional custom expiration in days
 */
export function saveDialogueProgress(
  dialogueId: string, 
  state: Partial<DialogueState>, 
  expirationDays: number = PROGRESS_EXPIRATION_DAYS
): void {
  if (!dialogueId) return;
  
  try {
    const key = `${PROGRESS_KEY_PREFIX}${dialogueId}`;
    const stateToSave = prepareStateForStorage(state);
    
    // Create storage item with expiration
    const now = Date.now();
    const storageItem: StorageItem<any> = {
      data: stateToSave,
      expiration: now + (expirationDays * 24 * 60 * 60 * 1000),
      version: 1,
      createdAt: now,
      updatedAt: now
    };
    
    // Check if we already have a saved item and preserve creation date
    const existing = localStorage.getItem(key);
    if (existing) {
      try {
        const parsed = JSON.parse(existing) as StorageItem<any>;
        storageItem.createdAt = parsed.createdAt;
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    localStorage.setItem(key, JSON.stringify(storageItem));
    console.log(`💾 Progress saved for dialogue: ${dialogueId}`);
    
    // Run cleanup to prevent storage pollution
    cleanupStorage();
  } catch (error) {
    console.error('❌ Error saving dialogue progress:', error);
  }
}

/**
 * Loads dialogue progress from local storage
 * @param dialogueId - ID of the dialogue
 * @returns Saved dialogue state or null if not found
 */
export function loadDialogueProgress(dialogueId: string): Partial<DialogueState> | null {
  if (!dialogueId) return null;
  
  try {
    const key = `${PROGRESS_KEY_PREFIX}${dialogueId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const storageItem = JSON.parse(stored) as StorageItem<any>;
    
    // Check if data has expired
    if (storageItem.expiration < Date.now()) {
      console.log(`⏰ Progress for dialogue ${dialogueId} has expired, removing it`);
      localStorage.removeItem(key);
      return null;
    }
    
    // Convert arrays back to Sets for proper state restoration
    return {
      ...storageItem.data,
      skippedPhrases: new Set(storageItem.data.skippedPhrases || []),
      completedDialogues: new Set(storageItem.data.completedDialogues || [])
    };
  } catch (error) {
    console.error('❌ Error loading dialogue progress:', error);
    return null;
  }
}

/**
 * Checks if dialogue progress exists in local storage
 * @param dialogueId - ID of the dialogue
 * @returns True if progress exists and hasn't expired
 */
export function hasDialogueProgress(dialogueId: string): boolean {
  if (!dialogueId) return false;
  
  try {
    const key = `${PROGRESS_KEY_PREFIX}${dialogueId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return false;
    
    const storageItem = JSON.parse(stored) as StorageItem<any>;
    // Check if data has expired
    if (storageItem.expiration < Date.now()) {
      console.log(`⏰ Progress for dialogue ${dialogueId} has expired, removing it`);
      localStorage.removeItem(key);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking dialogue progress:', error);
    return false;
  }
}

/**
 * Clears dialogue progress from local storage
 * @param dialogueId - ID of the dialogue
 */
export function clearDialogueProgress(dialogueId: string): void {
  if (!dialogueId) return;
  
  try {
    const key = `${PROGRESS_KEY_PREFIX}${dialogueId}`;
    localStorage.removeItem(key);
    console.log(`🧹 Progress cleared for dialogue: ${dialogueId}`);
  } catch (error) {
    console.error('❌ Error clearing dialogue progress:', error);
  }
}

/**
 * Save completed dialogue information
 * @param dialogueId - ID of the completed dialogue
 * @param completedAt - When the dialogue was completed
 * @param expirationDays - Optional custom expiration in days
 */
export function saveCompletedDialogue(
  dialogueId: string, 
  completedAt: Date,
  expirationDays: number = COMPLETED_EXPIRATION_DAYS
): void {
  if (!dialogueId) return;
  
  try {
    const key = `${COMPLETED_KEY_PREFIX}${dialogueId}`;
    const data = { 
      completedAt,
      timestamp: Date.now()
    };
    
    // Create storage item with expiration
    const storageItem: StorageItem<any> = {
      data,
      expiration: Date.now() + (expirationDays * 24 * 60 * 60 * 1000),
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    localStorage.setItem(key, JSON.stringify(storageItem));
    
    // Dispatch custom event for completion
    window.dispatchEvent(new CustomEvent('dialogueCompleted', {
      detail: { dialogueId, completedAt }
    }));
    
    // Clear progress since dialogue is completed
    clearDialogueProgress(dialogueId);
  } catch (error) {
    console.error('❌ Error saving completed dialogue:', error);
  }
}

/**
 * Check if a dialogue is completed
 * @param dialogueId - ID of the dialogue
 * @returns True if dialogue is marked as completed
 */
export function isDialogueCompleted(dialogueId: string): boolean {
  if (!dialogueId) return false;
  
  try {
    const key = `${COMPLETED_KEY_PREFIX}${dialogueId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return false;
    
    const storageItem = JSON.parse(stored) as StorageItem<any>;
    
    // Check if data has expired
    if (storageItem.expiration < Date.now()) {
      console.log(`⏰ Completed dialogue ${dialogueId} data has expired, removing it`);
      localStorage.removeItem(key);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking if dialogue is completed:', error);
    return false;
  }
}

/**
 * Load information about all completed dialogues
 * @returns Record of dialogue IDs to completion information
 */
export function loadCompletedDialogues(): Record<string, { 
  completedAt: Date;
  timestamp: number;
}> {
  try {
    const result: Record<string, { 
      completedAt: Date;
      timestamp: number;
    }> = {};
    
    // Find all completed dialogue keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(COMPLETED_KEY_PREFIX)) {
        const dialogueId = key.substring(COMPLETED_KEY_PREFIX.length);
        const stored = localStorage.getItem(key);
        
        if (stored) {
          try {
            const storageItem = JSON.parse(stored) as StorageItem<any>;
            
            // Check if data has expired
            if (storageItem.expiration < Date.now()) {
              console.log(`⏰ Completed dialogue ${dialogueId} data has expired, removing it`);
              localStorage.removeItem(key);
              continue;
            }
            
            result[dialogueId] = storageItem.data;
          } catch (e) {
            // Skip invalid entries
            console.warn(`⚠️ Invalid storage format for ${key}`);
          }
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error loading completed dialogues:', error);
    return {};
  }
}

/**
 * Reset a dialogue to start from beginning even if it was completed
 * @param dialogueId - ID of the dialogue to reset
 */
export function resetDialogue(dialogueId: string): void {
  if (!dialogueId) return;
  
  // Clear both progress and completion data
  clearDialogueProgress(dialogueId);
  
  const key = `${COMPLETED_KEY_PREFIX}${dialogueId}`;
  localStorage.removeItem(key);
  
  console.log(`🔄 Dialogue ${dialogueId} has been reset`);
}

/**
 * Clean up old and expired items to manage storage size
 */
export function cleanupStorage(): void {
  try {
    const now = Date.now();
    let itemsRemoved = 0;
    
    // 1. Remove expired items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      // Skip keys that aren't related to our app
      if (!key.startsWith(PROGRESS_KEY_PREFIX) && !key.startsWith(COMPLETED_KEY_PREFIX)) {
        continue;
      }
      
      const item = localStorage.getItem(key);
      if (!item) continue;
      
      try {
        const parsedItem = JSON.parse(item) as StorageItem<any>;
        if (parsedItem.expiration < now) {
          localStorage.removeItem(key);
          itemsRemoved++;
          i--; // Adjust for removed item
        }
      } catch (e) {
        // If unparseable, clean it up
        localStorage.removeItem(key);
        itemsRemoved++;
        i--; // Adjust for removed item
      }
    }
    
    // 2. Check storage usage
    const storageUsed = calculateStorageUsage();
    
    // 3. If we're close to limits, remove oldest items first
    if (storageUsed > MAX_STORAGE_SIZE * 0.9) {
      console.warn(`⚠️ Storage usage high (${(storageUsed/1024/1024).toFixed(2)}MB), removing oldest items`);
      
      // Get all app-related keys with age info
      const keys: Array<{key: string, updatedAt: number}> = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        if (key.startsWith(PROGRESS_KEY_PREFIX) || key.startsWith(COMPLETED_KEY_PREFIX)) {
          const item = localStorage.getItem(key);
          if (!item) continue;
          
          try {
            const parsedItem = JSON.parse(item) as StorageItem<any>;
            keys.push({
              key,
              updatedAt: parsedItem.updatedAt || 0
            });
          } catch (e) {
            // If unparseable, add with age 0 (oldest)
            keys.push({key, updatedAt: 0});
          }
        }
      }
      
      // Sort by age (oldest first)
      keys.sort((a, b) => a.updatedAt - b.updatedAt);
      
      // Remove oldest until we're under 80% of max size
      let currentUsage = storageUsed;
      for (const {key} of keys) {
        if (currentUsage < MAX_STORAGE_SIZE * 0.8) break;
        
        const item = localStorage.getItem(key);
        const itemSize = item ? item.length * 2 : 0; // Approximate size in bytes
        
        localStorage.removeItem(key);
        currentUsage -= itemSize;
        itemsRemoved++;
        
        console.log(`🧹 Removed old item: ${key}`);
      }
    }
    
    if (itemsRemoved > 0) {
      console.log(`🧹 Cleanup removed ${itemsRemoved} items from storage`);
    }
  } catch (error) {
    console.error('❌ Error during storage cleanup:', error);
  }
}

/**
 * Calculate approximate storage usage in bytes
 * @returns Estimated storage usage in bytes
 */
function calculateStorageUsage(): number {
  let total = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    
    const value = localStorage.getItem(key) || '';
    // Each character is 2 bytes in UTF-16
    total += (key.length + value.length) * 2;
  }
  
  return total;
}

/**
 * Prepares dialogue state for storage by converting Sets to arrays
 * @param state State to prepare for serialization
 * @returns Storage-safe state object
 */
function prepareStateForStorage(state: Partial<DialogueState>): any {
  return {
    ...state,
    currentDialogue: null, // Don't store full dialogue object
    skippedPhrases: Array.from(state.skippedPhrases || []),
    completedDialogues: Array.from(state.completedDialogues || [])
  };
}