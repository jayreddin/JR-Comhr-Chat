
"use client";

import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction, useEffect, useMemo } from 'react';

// Initial list of default model providers and models
// TODO: Ideally, fetch or centralize this list
const defaultModelProviders = [
    {
      provider: "OpenAI",
      models: [
        "gpt-4o-mini", "gpt-4o", "o1", "o1-mini", "o1-pro", "o3", "o3-mini", "o4-mini",
        "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4.5-preview",
      ],
      defaultModel: "gpt-4o-mini",
    },
    {
      provider: "Anthropic",
      models: ["claude-3-7-sonnet", "claude-3-5-sonnet"],
    },
    {
      provider: "DeepSeek",
      models: ["deepseek-chat", "deepseek-reasoner"],
    },
    {
      provider: "Gemini",
      models: [
          "google/gemini-2.0-flash-lite-001",
          "google/gemini-flash-1.5",
          "google/gemma-2-27b-it",
          "google/gemini-2.5-flash-preview",
          "google/gemini-2.5-pro-exp-03-25:free",
          "google/gemini-pro-1.5",
          "google/gemini-pro",
      ],
    },
    {
      provider: "Meta",
      models: [
        "meta-llama/llama-3.1-8b-instruct",
        "meta-llama/llama-3.1-70b-instruct",
        "meta-llama/llama-3.1-405b-instruct",
        "meta-llama/llama-4-maverick",
        "meta-llama/llama-4-scout",
        "meta-llama/llama-3.3-70b-instruct",
        "meta-llama/llama-3-8b-instruct",
        "meta-llama/llama-3-70b-instruct",
        "meta-llama/llama-2-70b-chat",
        "meta-llama/llama-guard-3-8b",
      ],
    },
    {
      provider: "Mistral",
      models: [
          "mistral-large-latest",
          "pixtral-large-latest",
          "codestral-latest"
      ],
    },
    {
      provider: "XAI",
      models: ["x-ai/grok-3-beta"],
    },
  ];

const allDefaultModels = defaultModelProviders.flatMap(p => p.models);

// Define the shape of the context data
interface AppStateContextProps {
  selectedModel: string;
  setSelectedModel: Dispatch<SetStateAction<string>>;
  activeDefaultModels: string[]; // Track active default models
  setActiveDefaultModels: Dispatch<SetStateAction<string[]>>;
  activeOpenRouterModels: string[]; // Track active OpenRouter models
  setActiveOpenRouterModels: Dispatch<SetStateAction<string[]>>;
  openRouterActive: boolean;
  setOpenRouterActive: Dispatch<SetStateAction<boolean>>;
  availableOpenRouterModels: string[]; // List of available OR models
  setAvailableOpenRouterModels: Dispatch<SetStateAction<string[]>>;
  isLoadingOpenRouterModels: boolean;
  setIsLoadingOpenRouterModels: Dispatch<SetStateAction<boolean>>;
  enabledModels: string[]; // Derived list of all enabled models
}

// Create the context with a default value (or null)
const AppStateContext = createContext<AppStateContextProps | undefined>(undefined);

// Define the default model (adjust if needed based on AppHeader logic)
const initialSelectedModel = "gpt-4o-mini"; // Or fetch from a central place if preferred

// Create a provider component
interface AppStateProviderProps {
  children: ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
    const [selectedModel, setSelectedModel] = useState<string>(initialSelectedModel);
    const [activeDefaultModels, setActiveDefaultModels] = useState<string[]>(allDefaultModels); // Start with all default models active
    const [activeOpenRouterModels, setActiveOpenRouterModels] = useState<string[]>([]);
    const [openRouterActive, setOpenRouterActive] = useState<boolean>(false);
    const [availableOpenRouterModels, setAvailableOpenRouterModels] = useState<string[]>([]);
    const [isLoadingOpenRouterModels, setIsLoadingOpenRouterModels] = useState<boolean>(false);

    // Derive the list of all enabled models
    const enabledModels = useMemo(() => {
        return [...activeDefaultModels, ...activeOpenRouterModels].sort((a, b) => a.localeCompare(b)); // Sort alphabetically
    }, [activeDefaultModels, activeOpenRouterModels]);

     // Effect to load settings from localStorage (similar to footer's logic)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedSettings = localStorage.getItem('chatSettings');
            if (savedSettings) {
                try {
                    const parsedSettings = JSON.parse(savedSettings);
                    // Load model selections
                    setActiveDefaultModels(parsedSettings.activeModels || allDefaultModels);
                    setActiveOpenRouterModels(parsedSettings.activeOpenRouterModels || []);
                    setOpenRouterActive(parsedSettings.openRouterActive || false);
                    // Potentially load selectedModel as well if saved
                    // setSelectedModel(parsedSettings.selectedModel || initialSelectedModel);
                } catch (e) {
                    console.error("Failed to parse saved chat settings for AppState", e);
                }
            }
        }
    }, []);

    // Effect to update selectedModel if it's no longer in the enabled list
    useEffect(() => {
        if (!enabledModels.includes(selectedModel)) {
            // If the current model is disabled, select the first available enabled model,
            // or fallback to the initial default if none are enabled.
            setSelectedModel(enabledModels[0] || initialSelectedModel);
        }
    }, [enabledModels, selectedModel]);

    const value = {
        selectedModel,
        setSelectedModel,
        activeDefaultModels,
        setActiveDefaultModels,
        activeOpenRouterModels,
        setActiveOpenRouterModels,
        openRouterActive,
        setOpenRouterActive,
        availableOpenRouterModels,
        setAvailableOpenRouterModels,
        isLoadingOpenRouterModels,
        setIsLoadingOpenRouterModels,
        enabledModels, // Provide the derived list
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

