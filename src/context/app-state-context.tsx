
"use client";

import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction, useEffect, useMemo } from 'react';

// Initial list of default model providers and models
// TODO: Centralize this list or fetch it
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
      models: ["x-ai/grok-3-beta"], // Renamed from grok-beta
    },
  ];

const allDefaultModels = defaultModelProviders.flatMap(p => p.models);

// Define the shape of the context data
interface AppStateContextProps {
  selectedModel: string;
  setSelectedModel: Dispatch<SetStateAction<string>>;
  activeDefaultModels: string[]; // Track active default models
  setActiveDefaultModels: Dispatch<SetStateAction<string[]>>;
  activeOpenRouterModels: string[]; // Track active OpenRouter models (WITH prefix)
  setActiveOpenRouterModels: Dispatch<SetStateAction<string[]>>;
  openRouterActive: boolean;
  setOpenRouterActive: Dispatch<SetStateAction<boolean>>;
  availableOpenRouterModels: string[]; // List of available OR models (WITH prefix)
  setAvailableOpenRouterModels: Dispatch<SetStateAction<string[]>>;
  isLoadingOpenRouterModels: boolean;
  setIsLoadingOpenRouterModels: Dispatch<SetStateAction<boolean>>;
  enabledModels: string[]; // Derived list of all enabled models (WITH prefix for OR)
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

    // Derive the list of all enabled models using useMemo
    const enabledModels = useMemo(() => {
        // Ensure OpenRouter models in the list have the prefix
        const prefixedActiveOpenRouter = activeOpenRouterModels.map(m =>
            m.startsWith('openrouter:') ? m : `openrouter:${m}`
        );
        return [...activeDefaultModels, ...prefixedActiveOpenRouter].sort((a, b) => a.localeCompare(b)); // Sort alphabetically
    }, [activeDefaultModels, activeOpenRouterModels]);

     // Effect to load settings from localStorage on initial mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedSettings = localStorage.getItem('chatSettings');
            if (savedSettings) {
                try {
                    const parsedSettings = JSON.parse(savedSettings);
                    // Load model selections into context state
                    setActiveDefaultModels(parsedSettings.activeModels || allDefaultModels);
                    // Ensure loaded OpenRouter models have the prefix
                    setActiveOpenRouterModels(
                        (parsedSettings.activeOpenRouterModels || []).map((m: string) =>
                            m.startsWith('openrouter:') ? m : `openrouter:${m}`
                        )
                    );
                    setOpenRouterActive(parsedSettings.openRouterActive || false);

                    // Check if saved selectedModel is valid before setting
                    const savedSelected = parsedSettings.selectedModel;
                    // Derive currently enabled models based on loaded settings (ensure OR models have prefix)
                    const loadedActiveORModelsPrefixed = (parsedSettings.activeOpenRouterModels || []).map((m: string) =>
                        m.startsWith('openrouter:') ? m : `openrouter:${m}`
                    );
                    const currentlyEnabled = [...(parsedSettings.activeModels || allDefaultModels), ...loadedActiveORModelsPrefixed];

                    if (savedSelected && currentlyEnabled.includes(savedSelected)) {
                        setSelectedModel(savedSelected);
                    } else if (currentlyEnabled.length > 0) {
                        // If saved model is invalid or not present, set to first available enabled model
                        setSelectedModel(currentlyEnabled[0]);
                    } else {
                         // Fallback to initial default if no models are enabled
                        setSelectedModel(initialSelectedModel);
                    }

                    // Apply UI settings directly (theme, text size, chat mode are handled in Footer now)
                    // They could potentially be moved here if desired for centralization.

                } catch (e) {
                    console.error("Failed to parse saved chat settings for AppState", e);
                     // Fallback if parsing fails
                    setActiveDefaultModels(allDefaultModels);
                    setActiveOpenRouterModels([]);
                    setOpenRouterActive(false);
                    setSelectedModel(initialSelectedModel);
                }
            } else {
                 // No saved settings, use defaults
                 setActiveDefaultModels(allDefaultModels);
                 setActiveOpenRouterModels([]);
                 setOpenRouterActive(false);
                 setSelectedModel(initialSelectedModel);
            }
        }
    }, []); // Empty dependency array ensures this runs only once on mount

    // Effect to update selectedModel if it's no longer in the derived enabled list
    useEffect(() => {
        // Ensure enabledModels has been calculated and the selected model isn't present
        if (enabledModels.length > 0 && !enabledModels.includes(selectedModel)) {
            // If the current model is disabled, select the first available enabled model.
            setSelectedModel(enabledModels[0]);
        } else if (enabledModels.length === 0 && selectedModel !== initialSelectedModel) {
             // If no models are enabled, fallback to the initial default
             // Ensure the fallback exists in the default list, otherwise use a hardcoded known good default
             const fallbackExists = allDefaultModels.includes(initialSelectedModel);
             setSelectedModel(fallbackExists ? initialSelectedModel : (allDefaultModels[0] || "gpt-4o-mini"));
        }
    }, [enabledModels, selectedModel]); // Depend on the derived list and the current selection

    // Effect to save selectedModel to localStorage when it changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedSettings = localStorage.getItem('chatSettings');
            let settings = {};
            if (savedSettings) {
                try {
                    settings = JSON.parse(savedSettings);
                } catch (e) {
                    console.error("Failed to parse existing settings before saving selectedModel", e);
                }
            }
             try {
                localStorage.setItem('chatSettings', JSON.stringify({
                    ...settings,
                    selectedModel: selectedModel, // Save the currently selected model
                }));
            } catch (e) {
                console.error("Failed to save selectedModel to localStorage", e);
            }
        }
    }, [selectedModel]); // Run whenever selectedModel changes


    const value = {
        selectedModel,
        setSelectedModel,
        activeDefaultModels,
        setActiveDefaultModels,
        activeOpenRouterModels, // Already prefixed
        setActiveOpenRouterModels,
        openRouterActive,
        setOpenRouterActive,
        availableOpenRouterModels, // Already prefixed
        setAvailableOpenRouterModels,
        isLoadingOpenRouterModels,
        setIsLoadingOpenRouterModels,
        enabledModels, // Provide the derived list (OR models prefixed)
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
