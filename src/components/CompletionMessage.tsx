import React, { useEffect } from 'react';
import { Trophy, BarChart2, Camera, Clock, CheckCircle2, ArrowDown } from 'lucide-react';
import { saveCompletedDialogue } from '../utils/enhancedStorage';
import { formatDuration } from '../utils/timeUtils';

interface CompletionMessageProps {
  dialogueTitle: string;
  wordsSpoken: number;
  categoryId: string;
  dialogueId: string;
  isLastInCategory: boolean;
  startTime: number;
  endTime: number;
  isEmbedded?: boolean;
}

export default function CompletionMessage({
  dialogueTitle,
  wordsSpoken,
  categoryId,
  dialogueId,
  isLastInCategory,
  startTime,
  endTime,
  isEmbedded = false
}: CompletionMessageProps) {
  const dailyGoal = 400;
  const duration = endTime - startTime;
  const formattedDuration = formatDuration(duration);

  // Save completion information only - not tracking words or stats
  React.useEffect(() => {
    const completedAt = new Date();
    saveCompletedDialogue(dialogueId, completedAt);
    
    // Dispatch event for any listeners that might need to know about completion
    window.dispatchEvent(new CustomEvent('dialogueCompleted', {
      detail: { dialogueId, completedAt }
    }));
  }, [dialogueId]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 px-4">
      <div className="bg-white rounded-xl shadow-xl p-4 w-full max-w-xs animate-scale-up relative overflow-hidden">
        {/* Success banner */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-2 px-4">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Completed! 🎉</span>
          </div>
        </div>
        
        <div className="mt-6 mb-2">
          <div className="flex justify-center mb-1">
            <Trophy className="w-8 h-8 text-indigo-700" />
          </div>

          <h2 className="text-xl font-bold text-center mb-1 text-indigo-900">
            Great job! 🎉
          </h2>
          
          <p className="text-gray-600 text-center mb-3 text-xs">
            "{dialogueTitle}"
          </p>

          <div className="bg-indigo-50 rounded-lg p-3 mb-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col items-center bg-white rounded-lg shadow-sm p-1.5 py-2">
                <Clock className="w-4 h-4 text-indigo-700 mb-0.5" />
                <span className="text-xs text-gray-600">Time</span>
                <span className="font-bold text-indigo-900 text-sm">{formattedDuration}</span>
              </div>
              
              <div className="flex flex-col items-center bg-white rounded-lg shadow-sm p-1.5 py-2">
                <BarChart2 className="w-4 h-4 text-indigo-700 mb-0.5" />
                <span className="text-xs text-gray-600">Words</span>
                <span className="font-bold text-indigo-900 text-sm">{wordsSpoken}</span>
              </div>
            </div>
          </div>

          {/* Fancy animated downward arrow */}
          <div className="flex justify-center mb-2">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-75 blur-sm animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-indigo-600 to-purple-700 p-1.5 rounded-full animate-bounce shadow-lg">
                <ArrowDown className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {isLastInCategory && (
            <div className="mt-3 text-xs text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 
                bg-gradient-to-r from-purple-50 to-indigo-50 
                text-purple-700 rounded-full border border-indigo-100
                shadow-sm">
                <Trophy className="w-4 h-4 text-purple-700" />
                <span className="font-medium">Category completed! 🎉</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}