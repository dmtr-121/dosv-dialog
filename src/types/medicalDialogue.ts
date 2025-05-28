import { FlameIcon as IconName } from 'lucide-react';

// Difficulty level types remain the same
export type DifficultyLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

// Enhanced MedicalIcon type with commonly used medical icons
export type MedicalIconName = Extract<
  IconName,
  | 'stethoscope'
  | 'clipboard'
  | 'book-open'
  | 'brain'
  | 'heart'
  | 'microscope'
  | 'pill'
  | 'activity'
  | 'users'
  | 'clipboard-check'
  | 'heart-pulse'
  | 'thermometer'
  | 'syringe'
  | 'building-2'
  | 'scroll-text'
  | 'waves'
  | 'baby'
>;

// Enhanced MedicalDialogue interface with completion tracking
export interface MedicalDialogue {
  id: string;
  title: string;
  difficulty: DifficultyLevel;
  description: string;
  icon?: MedicalIconName;
  isHidden?: boolean;
  isLocked?: boolean;
  isCompleted?: boolean;
  completedAt?: string;
  conversation: DialogueStep[];
  progress?: {
    stepsCompleted: number;
    totalSteps: number;
    lastCompletedStep?: string;
  };
}

// DialogueStep interface with added audioUrl property
export interface DialogueStep {
  id?: string;
  type: 'instruction' | 'conversation' | 'vocabulary' | 'summary';
  teacherApp: string;
  expectedResponse?: string;
  ukrainian?: string;
  grammarNote?: string;
  isCompleted?: boolean;
  audioUrl?: string; // URL to pre-recorded audio file
  responseAudioUrl?: string; // URL to pre-recorded expected response audio
}

// Enhanced DialogueCategory interface with completion tracking
export interface DialogueCategory {
  id: string;
  name: string;
  description: string;
  icon: MedicalIconName;
  dialogues: string[]; // Array of dialogue IDs
  isHidden?: boolean;
  isLocked?: boolean;
  requirement?: {
    completedCategories: string[];
  };
  surveyLink?: string;
  surveyText?: string;
  progress?: {
    completedDialogues: string[];
    totalDialogues: number;
    completionPercentage: number;
  };
}

// Interface for tracking completion statistics
export interface CompletionStats {
  totalDialogues: number;
  completedDialogues: number;
  completionPercentage: number;
  lastCompletedAt?: string;
  streakDays?: number;
  totalPracticeTime?: number;
}

// Icon color mapping remains the same
export const iconColorMap: Record<MedicalIconName, string> = {
  'stethoscope': '#4CAF50',     // Green
  'clipboard': '#2196F3',       // Blue
  'book-open': '#9C27B0',       // Purple
  'brain': '#673AB7',           // Deep Purple
  'heart': '#F44336',           // Red
  'microscope': '#795548',      // Brown
  'pill': '#FF9800',            // Orange
  'activity': '#009688',        // Teal
  'users': '#2196F3',           // Blue
  'clipboard-check': '#4CAF50', // Green
  'heart-pulse': '#F44336',     // Red
  'thermometer': '#FF5722',     // Deep Orange
  'syringe': '#FF9800',         // Orange
  'building-2': '#607D8B',      // Blue Grey
  'scroll-text': '#673AB7',     // Deep Purple
  'waves': '#00BCD4',           // Cyan
  'baby': '#E91E63',           // Pink
};

// Helper function to get icon color remains the same
export const getIconColor = (icon: MedicalIconName): string => {
  return iconColorMap[icon] || '#4CAF50'; // Default to green if icon not found
};

// Helper function to check if an icon name is a valid medical icon remains the same
export const isMedicalIcon = (icon: IconName): icon is MedicalIconName => {
  return Object.keys(iconColorMap).includes(icon);
};

// New helper functions for completion tracking
export const calculateCategoryProgress = (
  category: DialogueCategory, 
  completedDialogues: string[]
): DialogueCategory['progress'] => {
  const completed = category.dialogues.filter(id => completedDialogues.includes(id));
  return {
    completedDialogues: completed,
    totalDialogues: category.dialogues.length,
    completionPercentage: (completed.length / category.dialogues.length) * 100
  };
};

export const getCompletionEmoji = (percentage: number): string => {
  if (percentage === 100) return '🌟';
  if (percentage >= 75) return '🎯';
  if (percentage >= 50) return '🔥';
  if (percentage >= 25) return '💪';
  return '🎯';
};

// Example usage of the type remains the same
export const defaultMedicalIcons: MedicalIconName[] = [
  'stethoscope',
  'clipboard',
  'book-open',
  'brain',
  'heart',
  'microscope',
  'pill',
  'activity',
  'users'
];