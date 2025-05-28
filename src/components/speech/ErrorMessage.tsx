import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  onDismiss 
}) => {
  const [visible, setVisible] = useState(true);
  
  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [message, onDismiss]);
  
  if (!visible) return null;
  
  return (
    <div className="bg-rose-50 text-rose-700 px-4 py-2 rounded-lg shadow-sm border border-rose-200 flex items-center transition-all duration-300 ease-in-out animate-fadein-fast">
      <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
};

export default ErrorMessage;