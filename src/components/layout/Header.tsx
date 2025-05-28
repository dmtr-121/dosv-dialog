import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Mic, Menu, Speech } from 'lucide-react';

export default function Header() {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Skip rendering header on dialogue detail pages
  if (location.pathname.split('/').length > 2 && location.pathname.includes('/dialogues')) {
    return null;
  }

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${isScrolled 
          ? 'bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 shadow-lg' 
          : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700'
        }`}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title Area */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="bg-white/10 rounded-full p-1.5">
                <Speech className="h-6 w-6 text-white" aria-hidden="true" />
                <div className="absolute -bottom-1 -right-1 bg-indigo-400 rounded-full p-1">
                  <Mic className="h-3 w-3 text-white" aria-hidden="true" />
                </div>
              </div>
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center">
                  Speak
                  <span className="inline-flex ml-1">
                    <span className="bg-yellow-400 text-indigo-900 text-xs px-1.5 py-0.5 rounded-full font-semibold transform -rotate-12 shadow-sm">
                      BETA
                    </span>
                  </span>
                </h1>
              </div>
              <div className="flex items-center -mt-0.5">
                <span className="text-sm font-bold bg-gradient-to-r from-indigo-100 to-purple-200 text-transparent bg-clip-text">
                  CODE<span className="font-black">BLACK</span>
                </span>
                <div className="h-3 w-px bg-indigo-400/30 mx-2"></div>
                <span className="text-xs text-indigo-100/70">Medical English</span>
              </div>
            </div>
          </div>
          
          {/* Menu Button (placeholder for future use) */}
          <button
            type="button"
            className="inline-flex items-center justify-center p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
            aria-label="Menu button (placeholder)"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}