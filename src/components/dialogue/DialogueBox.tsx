// DialogueBox component with responsive padding based on device type
// Updated to have different padding values for mobile and desktop devices

import React, { useRef, useEffect, useState } from 'react';
import DialogueMessage from './DialogueMessage';
import { useDialogueContext } from '../../context/dialogue';
import { Message } from '../../types/dialogue';
import { isMobileDevice } from '../../utils/deviceDetection';

interface DialogueBoxProps {
  messages: Message[];
  attempts: number;
}

export default function DialogueBox({ messages, attempts }: DialogueBoxProps) {
  const { state } = useDialogueContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  // Check if device is mobile on component mount and window resize
  useEffect(() => {
    const checkDeviceType = () => {
      const mobile = isMobileDevice();
      setIsMobile(mobile);
    };
    
    // Initial check
    checkDeviceType();
    
    // Add resize listener to recheck device type
    window.addEventListener('resize', checkDeviceType);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);
  
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: behavior
      });
    }
  };
  
  // Scroll on new messages
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom('smooth');
    }, 100);
    return () => clearTimeout(timer);
  }, [messages]);
  
  // Initial scroll and resize handler
  useEffect(() => {
    const handleResize = () => scrollToBottom('auto');
    window.addEventListener('resize', handleResize);
    scrollToBottom('auto');
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Set different padding values based on device type
  const bottomPadding = isMobile ? '28px' : '90px'; // More padding for desktop
  
  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto"
      style={{
        height: 'calc(100vh - 140px)',    // Adjusted for removed main header
        paddingBottom: bottomPadding,     // Dynamic padding based on device type
        paddingTop: '25px',               // Added space for dialogue header
        paddingLeft: '16px',
        paddingRight: '16px'
      }}
    >
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((message) => (
          <DialogueMessage key={message.id} message={message} />
        ))}
        <div 
          ref={messagesEndRef} 
          style={{ height: '32px' }}      // Increased bottom spacer
          className="mb-2"                // Additional margin bottom
        />
      </div>
    </div>
  );
}