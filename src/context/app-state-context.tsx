
"use client";

import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction } from 'react';

// Define the shape of the context data
interface AppStateContextProps {
  selectedModel: string;
  setSelectedModel: Dispatch<SetStateAction<string>>;
  // Add other global states here if needed
}

// Create the context with a default value (or null)
const AppStateContext = createContext<AppStateContextProps | undefined>(undefined);

// Define the default model (adjust if needed based on AppHeader logic)
const defaultModel = "gpt-4o-mini"; // Or fetch from a central place if preferred

// Create a provider component
interface AppStateProviderProps {
  children: ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);

  const value = {
    selectedModel,
    setSelectedModel,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

// Create a custom hook to use the context
export const useAppState = (): AppStateContextProps => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
