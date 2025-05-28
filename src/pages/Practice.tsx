import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function Practice() {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
          <div className="p-6">
            <div className="flex flex-col items-center text-center">
              <h1 className="text-2xl font-bold mb-3 text-indigo-900">Speak Medical English 🇬🇧</h1>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => navigate('/dialogues')}
                  className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-lg py-3 px-6
                    flex items-center justify-center gap-2 hover:from-indigo-700 hover:via-indigo-800 hover:to-purple-800 
                    transition-all duration-300 shadow-md hover:shadow-lg group font-medium text-base"
                >
                  Почати навчання
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
                
               
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}