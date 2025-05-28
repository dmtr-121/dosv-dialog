import React from 'react';
import { ChevronRight } from 'lucide-react';

interface DialogueListItemProps {
  id: string;
  title: string;
  onClick: () => void;
  categoryId: string;
}

export default function DialogueListItem({ 
  id, 
  title, 
  onClick, 
  categoryId 
}: DialogueListItemProps) {
  return (
    <div 
      onClick={onClick}
      className="group w-full bg-white rounded-xl border border-gray-300 
        hover:border-indigo-700 
        hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50
        transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md"
    >
      <div className="flex items-center p-4">
        <div className="flex-grow">
          <div className="flex items-center gap-3">
            <span className="text-base font-medium text-indigo-900 
              group-hover:text-indigo-700 transition-colors duration-300">
              {title}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <ChevronRight className="w-5 h-5 text-gray-500 
            group-hover:text-indigo-700 group-hover:translate-x-1 
            transition-all duration-300" />
        </div>
      </div>
    </div>
  );
}