'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

// Define the shape of the context
interface AccessibilityContextType {
  isDyslexicFont: boolean;
  setDyslexicFont: (type: string) => void;
}

// Create the context with an initial value
const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider = ({ children }: { children: ReactNode }) => {
  const [isDyslexicFont, setIsDyslexicFont] = useState(false); // Default is non-dyslexic font

  const setDyslexicFont = (type: string) => {
    debugger;
    const isDyslexia = type === 'dyslexia';
    console.log('Setting font:', { type, isDyslexia }); // Debugging log
    setIsDyslexicFont(isDyslexia);
  };

  return (
    <AccessibilityContext.Provider value={{ isDyslexicFont, setDyslexicFont }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

// Hook for accessing the context
export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);

  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }

  return context;
};
