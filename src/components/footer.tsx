
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mic, Send, Paperclip, Square, PlusCircle, History, Upload, Settings, X, Minimize2, Loader2 } from 'lucide-react'; // Added Loader2
import { toast } from "@/hooks/use-toast"; // Import toast for notifications
import { cn } from '@/lib/utils'; // Import cn for conditional classes
import { useAppState } from '@/context/app-state-context'; // Import context hook

// Define SpeechRecognition types locally if not globally available
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Define structure for the list of sessions in localStorage
interface ChatSessionInfo {
    id: string;
    name: string;
    timestamp: number;
}


const providerLinks = [
    { name: "Jamie Reddin", href: "https://jayreddin.github.io" },
    { name: "Jamie Discord", href: "https://discord.gg/3YdvQfpPPr" },
    { name: "Puter.com", href: "https://puter.com" },
    { name: "Puter.com Discord", href: "https://discord.gg/gtVFcCQa" },
    { name: "Google Gemini", href: "https://gemini.google.com" },
    { name: "OpenRouter", href: "https://openrouter.ai/" },
];

// AI Model Definitions (Used as initial state for active models)
// TODO: Consolidate this maybe? It's also in app-state-context
const modelProviders = [
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

// Structure for OpenRouter models (will be populated dynamically)
const openRouterProvidersStructure = [{ provider: "OpenRouter", models: [] as string[] }];

interface FooterProps {
  onSendMessage?: (message: string) => void; // Make prop optional
  onNewChat?: () => void; // Add optional onNewChat prop
  onRestoreChat?: (sessionId: string) => void; // Add optional onRestoreChat prop
}

export function Footer({ onSendMessage, onNewChat, onRestoreChat }: FooterProps) {
    const currentYear = new Date().getFullYear();
    const [inputValue, setInputValue] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
    const recognitionRef = useRef<any>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Get context values and setters
    const {
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
        enabledModels // Use the derived list from context
    } = useAppState();

    // State for Chat Settings (UI only, context holds the actual state)
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [textSize, setTextSize] = useState<number>(14);
    const [chatMode, setChatMode] = useState<'normal' | 'compact'>('normal');
    const [showEnabledOnly, setShowEnabledOnly] = useState(false);
    const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatSessionInfo[]>([]); // Use ChatSessionInfo


    // --- Speech Recognition Logic ---
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false; // Listen for a single utterance
                recognitionRef.current.interimResults = true;

                recognitionRef.current.onresult = (event: any) => {
                    let interimTranscript = '';
                    let finalTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript;
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }
                    setInputValue(prev => prev + finalTranscript + interimTranscript); // Append results
                };

                recognitionRef.current.onerror = (event: any) => {
                     console.error('Speech recognition error:', event.error);
                     let description = "An unknown error occurred.";
                    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                        description = "Microphone access denied. Please check browser permissions.";
                        setHasMicPermission(false);
                    } else if (event.error === 'no-speech') {
                        description = "No speech detected.";
                    } else {
                        description = `Error: ${event.error}`;
                    }
                    toast({ variant: "destructive", title: "Speech Error", description });
                    stopRecording();
                };

                recognitionRef.current.onend = () => {
                    console.log("Speech recognition ended.");
                    // Don't automatically restart if continuous is false
                    setIsRecording(false);
                };

            } else {
                console.warn('Speech Recognition API not supported.');
                setHasMicPermission(false);
            }
        }
    }, []); // Run only once on mount

    const requestMicPermission = useCallback(async () => {
        if (hasMicPermission !== null) return hasMicPermission; // Return existing status if already checked/set

        if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                setHasMicPermission(true);
                return true;
            } catch (error) {
                console.error("Microphone permission denied:", error);
                setHasMicPermission(false);
                toast({ variant: "destructive", title: "Permission Denied", description: "Microphone access is required for speech input." });
                return false;
            }
        } else {
            setHasMicPermission(false);
             toast({ variant: "destructive", title: "Not Supported", description: "Audio input is not supported by your browser." });
            return false;
        }
    }, [hasMicPermission]);


    const startRecordingLogic = () => {
        if (recognitionRef.current && !isRecording) {
            try {
                recognitionRef.current.start();
                setIsRecording(true);
                console.log("Speech recognition started.");
            } catch (error) {
                console.error("Error starting speech recognition:", error);
                 // Check if error is due to already started state (less common with checks but possible)
                 if ((error as DOMException).name === 'InvalidStateError') {
                    console.warn("Recognition already started?");
                 } else {
                    toast({ variant: "destructive", title: "Mic Error", description: "Could not start microphone." });
                 }
                setIsRecording(false);
            }
        }
    };


    const stopRecording = () => {
        if (recognitionRef.current && isRecording) {
            try {
                recognitionRef.current.stop();
                 console.log("Speech recognition stopped.");
            } catch (error) {
                 console.error("Error stopping speech recognition:", error);
                 // Check if error is due to not running state
                 if ((error as DOMException).name === 'InvalidStateError') {
                     console.warn("Recognition wasn't running?");
                 }
            } finally {
                // Ensure state is updated even if stop throws error or wasn't running
                 setIsRecording(false);
            }
        }
    };

     const handleMicClick = async () => {
        if (isRecording) {
            stopRecording();
        } else {
             // Request permission first. If granted (or already granted), start recording.
             // If denied (or already denied), show toast.
             // If pending (null), wait for user action.
             const permissionGranted = await requestMicPermission();

             if (permissionGranted === true) {
                 startRecordingLogic();
             } else if (permissionGranted === false) {
                  // Toast is already shown in requestMicPermission
                 console.log("Mic permission denied.");
             } else {
                 // Permission status is still null (likely browser doesn't support or user hasn't responded yet)
                 // A toast should have been shown by requestMicPermission if not supported.
                 console.log("Mic permission status pending or not supported.");
             }
        }
    };
    // --- End Speech Recognition Logic ---


    // --- Input and Send Logic ---
    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value);
    };

    const handleSend = () => {
        if (onSendMessage && (inputValue.trim() || uploadedFile)) {
             // Combine text and file info if needed
            let messageToSend = inputValue.trim();
             if (uploadedFile) {
                // TODO: Decide how to represent the file for the onSendMessage handler.
                // Maybe pass an object { text: messageToSend, file: uploadedFile }
                // For now, just prepend filename. The actual file data needs separate handling.
                messageToSend = `[File attached: ${uploadedFile.name}]\n${messageToSend}`;
                console.log("Sending message with attached file:", uploadedFile.name);
             }
            onSendMessage(messageToSend);
            setInputValue('');
            setUploadedFile(null); // Clear file after sending
            setFilePreview(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = ""; // Reset file input visually
            }
            if (isRecording) {
                stopRecording();
            }
        } else if (!onSendMessage) {
             console.warn("Send button clicked, but no onSendMessage handler provided.");
             toast({ variant: "default", title: "Action Not Available", description: "Sending messages is not enabled here." });
        }
    };


    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };
    // --- End Input and Send Logic ---


    // --- Control Bar Actions ---
     const handleNewChat = () => {
        if (onNewChat) {
            console.log("Starting new chat session...");
            onNewChat(); // Call the parent's new chat handler
            // Toast moved to parent handleNewChat for better timing
        } else {
             toast({ variant: "destructive", title: "Action Unavailable", description: "Cannot start a new chat here." });
        }
    };

    // Function to load chat history list from localStorage
    const loadChatHistoryList = () => {
        if (typeof window !== 'undefined') {
            const sessionListJSON = localStorage.getItem('chatSessionList');
            if (sessionListJSON) {
                try {
                    const list = JSON.parse(sessionListJSON);
                    // Sort by timestamp descending (newest first)
                    list.sort((a: ChatSessionInfo, b: ChatSessionInfo) => b.timestamp - a.timestamp);
                    setChatHistory(list);
                } catch (error) {
                    console.error("Error loading chat history list:", error);
                    localStorage.removeItem('chatSessionList'); // Clear corrupted list
                    setChatHistory([]);
                }
            } else {
                setChatHistory([]);
            }
        }
    };

    // Call loadChatHistoryList when the history popover is about to open
    const handleHistoryPopoverOpenChange = (open: boolean) => {
         if (open) {
            loadChatHistoryList();
         }
         setIsHistoryOpen(open);
    };


    const handleRestoreChat = (sessionId: string) => {
        if (onRestoreChat) {
            onRestoreChat(sessionId); // Call parent's restore function
            setIsHistoryOpen(false); // Close popover
            // Toast moved to parent handleRestoreChatSession
        } else {
             toast({ variant: "destructive", title: "Restore Error", description: "Cannot restore chat session here." });
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setUploadedFile(file);
            // Generate preview (simple text or image preview)
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setFilePreview(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                // For non-images, maybe just show filename or generic icon
                setFilePreview(`📄 ${file.name} (${Math.round(file.size / 1024)} KB)`);
            }
        }
    };

     const handleRemoveFile = () => {
        setUploadedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Reset file input
        }
     };

    const handleAddFileToChat = () => {
        if (uploadedFile) {
            // Logic to represent the file in the input or context
            // The file state is already set, file preview shows above input.
            // Just close the dialog.
            setIsFileUploadOpen(false);
            toast({ title: "File Ready", description: `${uploadedFile.name} is ready to be sent with your message.` });
        }
    };


    const handleSaveSettings = () => {
        console.log("Saving chat settings:", { theme, textSize, chatMode, activeDefaultModels, openRouterActive, activeOpenRouterModels });
        // Settings are now saved directly via context setters in the UI controls.
        // This function just saves to localStorage.
        try {
            localStorage.setItem('chatSettings', JSON.stringify({
                theme,
                textSize,
                chatMode,
                activeModels: activeDefaultModels, // Use context state
                openRouterActive,               // Use context state
                activeOpenRouterModels,         // Use context state
            }));
            setIsChatSettingsOpen(false); // Close dialog
            toast({ title: "Settings Saved", description: "Chat settings have been saved." });
        } catch (e) {
            console.error("Failed to save chat settings to localStorage", e);
            toast({ variant: "destructive", title: "Save Error", description: "Could not save settings." });
        }
    };

     // Apply theme instantly
     useEffect(() => {
         if (typeof window !== 'undefined') {
            document.documentElement.classList.toggle('dark', theme === 'dark');
         }
     }, [theme]);

     // Apply text size instantly
     useEffect(() => {
         if (typeof window !== 'undefined') {
            document.documentElement.style.setProperty('--chat-text-size', `${textSize}px`);
         }
     }, [textSize]);

     // Apply chat mode instantly using data attribute on body
     useEffect(() => {
        if (typeof window !== 'undefined') {
            document.body.dataset.chatMode = chatMode;
            console.log("Chat mode changed to:", chatMode); // Log change
        }
     }, [chatMode]);


     // Load UI settings on mount (Model settings loaded by context provider)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedSettings = localStorage.getItem('chatSettings');
            if (savedSettings) {
                try {
                    const parsedSettings = JSON.parse(savedSettings);
                    // Set local state for UI controls
                    setTheme(parsedSettings.theme || 'light');
                    setTextSize(parsedSettings.textSize || 14);
                    setChatMode(parsedSettings.chatMode || 'normal');

                     // Apply loaded UI settings immediately
                    document.documentElement.classList.toggle('dark', parsedSettings.theme === 'dark');
                    document.documentElement.style.setProperty('--chat-text-size', `${parsedSettings.textSize || 14}px`);
                    document.body.dataset.chatMode = parsedSettings.chatMode || 'normal'; // Apply chat mode

                } catch (e) {
                    console.error("Failed to parse saved chat settings for UI", e);
                }
            }
        }
    }, []); // Empty dependency array


     // Fetch OpenRouter models when the switch is activated
    useEffect(() => {
        // Check if context state indicates fetching is needed
        if (openRouterActive && availableOpenRouterModels.length === 0 && !isLoadingOpenRouterModels) {
            const fetchOpenRouterModels = async () => {
                setIsLoadingOpenRouterModels(true); // Use context setter
                try {
                    // Use the proxy endpoint
                     const response = await fetch('/api/openrouter-models');
                    if (!response.ok) {
                         const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
                         throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    // Extract model IDs and prepend 'openrouter:' prefix
                    const modelIdsWithPrefix = data?.data?.map((model: any) => `openrouter:${model.id}`) || [];
                    setAvailableOpenRouterModels(modelIdsWithPrefix); // Use context setter with prefixed models
                    console.log("Fetched OpenRouter Models:", modelIdsWithPrefix);
                } catch (error) {
                    console.error("Failed to fetch OpenRouter models:", error);
                    toast({ variant: "destructive", title: "Fetch Error", description: `Could not load OpenRouter models. ${error instanceof Error ? error.message : ''}` });
                    setOpenRouterActive(false); // Turn switch off on error using context setter
                } finally {
                    setIsLoadingOpenRouterModels(false); // Use context setter
                }
            };
            fetchOpenRouterModels();
        } else if (!openRouterActive) {
             // Optional: Clear available models when switch is off? Or keep them cached?
            // setAvailableOpenRouterModels([]); // Uncomment to clear if desired
        }
    // Depend on context state and setters
    }, [openRouterActive, availableOpenRouterModels.length, isLoadingOpenRouterModels, setAvailableOpenRouterModels, setIsLoadingOpenRouterModels, setOpenRouterActive]);

     // Model Selection Handlers (now using context setters)
    const handleModelToggle = (modelName: string, providerType: 'default' | 'openrouter') => {
        // Always use the modelName directly as it should be correct (with prefix if OR)
        const isActive = providerType === 'default'
            ? activeDefaultModels.includes(modelName)
            : activeOpenRouterModels.includes(modelName);
        const setActiveFunc = providerType === 'default' ? setActiveDefaultModels : setActiveOpenRouterModels;

        setActiveFunc(prev =>
            isActive ? prev.filter(m => m !== modelName) : [...prev, modelName]
        );
    };

    const handleSelectAllModels = (providerType: 'default' | 'openrouter') => {
        const allModels = providerType === 'default'
            ? modelProviders.flatMap(p => p.models)
            : availableOpenRouterModels; // Use fetched OR models from context (already prefixed)
        const setActiveFunc = providerType === 'default' ? setActiveDefaultModels : setActiveOpenRouterModels;
        setActiveFunc(allModels);
    };

    const handleDeselectAllModels = (providerType: 'default' | 'openrouter') => {
        const setActiveFunc = providerType === 'default' ? setActiveDefaultModels : setActiveOpenRouterModels;
        setActiveFunc([]);
    };

    // --- End Control Bar Actions ---


    return (
        <footer className="sticky bottom-0 z-40 w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container max-w-screen-2xl px-4 md:px-6 py-2 space-y-2">

                {/* Control Icons Bar - Only show if onSendMessage is available (likely chat page) */}
                 {onSendMessage && (
                    // Center the control icons horizontally
                    <div className="flex items-center justify-center space-x-1 h-8">
                         {/* New Chat Button */}
                        <Button variant="ghost" size="icon" onClick={handleNewChat} aria-label="New Chat">
                            <PlusCircle className="h-5 w-5 text-muted-foreground" />
                        </Button>

                         {/* Chat History Popover */}
                         {/* Use align="center" and manage open state */}
                        <Popover open={isHistoryOpen} onOpenChange={handleHistoryPopoverOpenChange}>
                             <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Chat History">
                                    <History className="h-5 w-5 text-muted-foreground" />
                                </Button>
                            </PopoverTrigger>
                             {/* Add align="center" to PopoverContent */}
                            <PopoverContent className="w-80" align="center">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Chat History</h4>
                                    <p className="text-sm text-muted-foreground">Select a previous chat session.</p>
                                    {chatHistory.length > 0 ? (
                                        <ScrollArea className="h-40">
                                            {chatHistory.map(session => (
                                                <Button key={session.id} variant="link" onClick={() => handleRestoreChat(session.id)} className="block w-full text-left p-1 h-auto text-xs"> {/* Smaller text */}
                                                     {/* Truncate long names */}
                                                     <span className="truncate" title={session.name}>{session.name}</span>
                                                     <span className="text-muted-foreground/70 ml-2">({new Date(session.timestamp).toLocaleTimeString()})</span>
                                                </Button>
                                            ))}
                                        </ScrollArea>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">No history found.</p>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* File Upload Dialog */}
                        {/* DialogContent already centers by default */}
                        <Dialog open={isFileUploadOpen} onOpenChange={setIsFileUploadOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Upload File">
                                    <Upload className="h-5 w-5 text-muted-foreground" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]"> {/* Removed align="center" as it's default */}
                                <DialogHeader>
                                    <DialogTitle>Upload File</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                     {filePreview && (
                                        <div className="relative group rounded border p-2 max-h-60 overflow-auto">
                                             <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="absolute top-1 right-1 h-5 w-5 opacity-50 group-hover:opacity-100 z-10" aria-label="Remove file">
                                                <X className="h-3 w-3"/>
                                             </Button>
                                            {uploadedFile?.type.startsWith('image/') ? (
                                                <img src={filePreview} alt="File preview" className="max-w-full max-h-56 object-contain mx-auto rounded" />
                                            ) : (
                                                <p className="text-sm text-muted-foreground p-4 break-words">{filePreview}</p> // Added break-words
                                            )}
                                        </div>
                                    )}
                                    <Input type="file" ref={fileInputRef} onChange={handleFileChange} className="mt-2" />
                                    <DialogFooter> {/* Move button to footer for better placement */}
                                         <Button onClick={handleAddFileToChat} disabled={!uploadedFile}>Add File to Chat</Button>
                                    </DialogFooter>
                                </div>
                            </DialogContent>
                        </Dialog>

                         {/* Chat Settings Dialog */}
                        <Dialog open={isChatSettingsOpen} onOpenChange={setIsChatSettingsOpen}>
                             <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Chat Settings">
                                    <Settings className="h-5 w-5 text-muted-foreground" />
                                </Button>
                             </DialogTrigger>
                             <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col"> {/* Removed align="center" */}
                                <DialogHeader>
                                    <DialogTitle>Chat Settings</DialogTitle>
                                </DialogHeader>
                                {/* Scrollable content area */}
                                <div className="flex-grow overflow-y-auto pr-4 -mr-4 scrollbar-hide"> {/* Added scrollbar-hide */}
                                     <Tabs defaultValue="user" className="w-full mt-4">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="user">User Interface</TabsTrigger>
                                            <TabsTrigger value="models">Models</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="user">
                                            <Card>
                                                <CardHeader><CardTitle>User Interface</CardTitle></CardHeader>
                                                <CardContent className="space-y-6">
                                                    {/* Theme Selection */}
                                                    <div className="flex items-center justify-between">
                                                        <Label htmlFor="theme-switch">Theme</Label>
                                                        <div className="flex items-center space-x-2">
                                                            <span>Light</span>
                                                            <Switch
                                                                id="theme-switch"
                                                                checked={theme === 'dark'}
                                                                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                                                            />
                                                            <span>Dark</span>
                                                        </div>
                                                    </div>
                                                    {/* Text Size Slider */}
                                                    <div className="space-y-2">
                                                         <Label htmlFor="text-size-slider">Text Size ({textSize}px)</Label>
                                                         <Slider
                                                            id="text-size-slider"
                                                            min={10}
                                                            max={24}
                                                            step={1}
                                                            value={[textSize]}
                                                            onValueChange={(value) => setTextSize(value[0])}
                                                         />
                                                         <p className="text-muted-foreground text-xs" style={{ fontSize: `${textSize}px` }}>This is sample text.</p>
                                                    </div>
                                                     {/* Chat Mode Selection */}
                                                    <div className="flex items-center justify-between">
                                                        <Label>Chat Mode</Label>
                                                         <div className="flex items-center space-x-2">
                                                            <Button variant={chatMode === 'normal' ? 'secondary' : 'ghost'} onClick={() => setChatMode('normal')}>Normal</Button>
                                                            <Button variant={chatMode === 'compact' ? 'secondary' : 'ghost'} onClick={() => setChatMode('compact')}>Compact</Button>
                                                         </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </TabsContent>
                                        <TabsContent value="models">
                                            <Card>
                                                 <CardContent className="space-y-4 pt-6 scrollbar-hide"> {/* Added scrollbar-hide */}

                                                    {/* Show Enabled Models Only Switch */}
                                                    <div className="flex items-center space-x-2 pb-4 border-b">
                                                        <Switch
                                                            id="show-enabled-switch"
                                                            checked={showEnabledOnly}
                                                            onCheckedChange={setShowEnabledOnly}
                                                        />
                                                        <Label htmlFor="show-enabled-switch">
                                                            Show Enabled Models Only
                                                        </Label>
                                                    </div>

                                                     {/* Conditional Rendering based on the switch */}
                                                     {showEnabledOnly ? (
                                                        <EnabledModelsBox
                                                            allEnabledModels={enabledModels} // Use derived list from context
                                                            onToggle={(model) => {
                                                                 // Determine which list the model belongs to and toggle it using context setters
                                                                 if (modelProviders.some(p => p.models.includes(model))) {
                                                                     handleModelToggle(model, 'default');
                                                                 } else if (availableOpenRouterModels.includes(model)) { // Should have prefix
                                                                     handleModelToggle(model, 'openrouter');
                                                                 }
                                                             }}
                                                        />
                                                     ) : (
                                                        <>
                                                            {/* Default Models Box */}
                                                            <ModelSelectionBox
                                                                title="Default Models"
                                                                providers={modelProviders}
                                                                activeModels={activeDefaultModels} // Use context state
                                                                onToggle={(model) => handleModelToggle(model, 'default')}
                                                                onSelectAll={() => handleSelectAllModels('default')}
                                                                onDeselectAll={() => handleDeselectAllModels('default')}
                                                            />

                                                            {/* OpenRouter Activation */}
                                                            <div className="flex items-center space-x-2 pt-4 border-t">
                                                                <Switch
                                                                id="openrouter-switch"
                                                                checked={openRouterActive} // Use context state
                                                                onCheckedChange={setOpenRouterActive} // Use context setter
                                                                disabled={isLoadingOpenRouterModels} // Use context state
                                                                />
                                                                <Label htmlFor="openrouter-switch" className={cn(isLoadingOpenRouterModels && "opacity-50")}>
                                                                    Activate OpenRouter Models {isLoadingOpenRouterModels && <Loader2 className="h-4 w-4 animate-spin inline ml-1" />}
                                                                </Label>
                                                            </div>

                                                            {/* OpenRouter Models Box (Conditional) */}
                                                            {openRouterActive && (
                                                                <>
                                                                    {isLoadingOpenRouterModels ? (
                                                                        <div className="flex justify-center items-center h-48 border rounded-md">
                                                                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                                                        </div>
                                                                    ) : availableOpenRouterModels.length > 0 ? (
                                                                        <ModelSelectionBox
                                                                            title="OpenRouter Models"
                                                                            // Use the fetched models from context (already prefixed)
                                                                            providers={[{ provider: "OpenRouter", models: availableOpenRouterModels }]}
                                                                            activeModels={activeOpenRouterModels} // Use context state
                                                                            onToggle={(model) => handleModelToggle(model, 'openrouter')}
                                                                            onSelectAll={() => handleSelectAllModels('openrouter')}
                                                                            onDeselectAll={() => handleDeselectAllModels('openrouter')}
                                                                        />
                                                                    ) : (
                                                                        <p className="text-sm text-muted-foreground text-center py-4">No OpenRouter models loaded or available.</p>
                                                                    )}
                                                                </>
                                                            )}
                                                        </>
                                                     )}
                                                 </CardContent>
                                            </Card>
                                        </TabsContent>
                                     </Tabs>
                                </div> {/* End scrollable area */}
                                {/* Dialog Footer - Placed AFTER the scrollable content */}
                                <DialogFooter className="mt-auto pt-4 border-t bg-background justify-center sm:justify-center"> {/* Ensure it's at the bottom */}
                                    <DialogClose asChild>
                                        <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button onClick={handleSaveSettings}>Save Settings</Button>
                                </DialogFooter>
                             </DialogContent>
                        </Dialog>
                    </div>
                 )}


                {/* Input Row - Only show if onSendMessage is provided */}
                 {onSendMessage && (
                    <div className="flex items-end space-x-2"> {/* Use items-end */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleMicClick}
                            aria-label={isRecording ? "Stop recording" : "Start recording"}
                            className={cn(
                                "flex-shrink-0", // Prevent shrinking
                                isRecording && "text-red-500 animate-pulse",
                                hasMicPermission === false && "opacity-50 cursor-not-allowed"
                            )}
                            disabled={hasMicPermission === false}
                        >
                            {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </Button>
                         <div className="flex-grow relative">
                            {/* File Thumbnail - Positioned above the input */}
                             {uploadedFile && filePreview && (
                                <div className="absolute bottom-full left-0 mb-1 p-1 bg-secondary border rounded-md shadow max-w-[150px] group z-10"> {/* Added z-index */}
                                     <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="absolute top-0 right-0 h-4 w-4 opacity-50 group-hover:opacity-100 z-20" aria-label="Remove file">
                                        <X className="h-3 w-3"/>
                                     </Button>
                                    {uploadedFile.type.startsWith('image/') ? (
                                        <img src={filePreview} alt="Preview" className="max-h-16 max-w-full object-contain rounded" />
                                    ) : (
                                        <span className="text-xs px-1 line-clamp-2 break-all">📄 {uploadedFile.name}</span> /* Added break-all */
                                    )}
                                </div>
                             )}
                            <Input
                                type="text"
                                placeholder="Type your message..."
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                className="flex-grow pr-10" // Add padding for send button
                                aria-label="Message input"
                            />
                         </div>
                        <Button
                            size="icon"
                            onClick={handleSend}
                            disabled={(!inputValue.trim() && !uploadedFile) || !onSendMessage}
                            aria-label="Send message"
                            className="flex-shrink-0" // Prevent shrinking
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    </div>
                 )}

                {/* Credits and Links */}
                <div className="text-center text-xs text-muted-foreground pt-2">
                     <p>
                        Created by{' '}
                        <a href="https://jayreddin.github.io" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Jamie Reddin</a>
                        {' '}using{' '}
                        <a href="https://puter.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Puter.com</a>
                        {' '}and other{' '}
                         {/* Added align="center" to PopoverContent */}
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button variant="link" size="sm" className="p-0 h-auto text-xs text-muted-foreground underline hover:text-foreground">
                                providers
                            </Button>
                            </PopoverTrigger>
                            {/* Add align="center" to PopoverContent */}
                            <PopoverContent className="w-auto p-2" align="center">
                            <ul className="space-y-1">
                                {providerLinks.map((link) => (
                                <li key={link.name}>
                                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="block px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm">
                                    {link.name}
                                    </a>
                                </li>
                                ))}
                            </ul>
                            </PopoverContent>
                        </Popover>
                        . | JR Comhrá AI &copy; {currentYear} | V. 0.0.1
                    </p>
                </div>
            </div>
         </footer>
    );
}


// Helper component for Model Selection Box in Settings
interface ModelSelectionBoxProps {
    title: string;
    providers: { provider: string; models: string[] }[];
    activeModels: string[]; // Now comes from context
    onToggle: (modelName: string) => void; // Triggers context update
    onSelectAll: () => void; // Triggers context update
    onDeselectAll: () => void; // Triggers context update
}

function ModelSelectionBox({ title, providers, activeModels, onToggle, onSelectAll, onDeselectAll }: ModelSelectionBoxProps) {
    const [isMinimized, setIsMinimized] = useState(false);

    // Get the total number of models across all providers in this box
    const totalModelsInBox = providers.reduce((acc, provider) => acc + provider.models.length, 0);
    const allModelsSelected = totalModelsInBox > 0 && providers.every(p => p.models.every(m => activeModels.includes(m)));
    // Check if no models *from these specific providers* are selected
    const noModelsSelected = providers.every(p => p.models.every(m => !activeModels.includes(m)));

    // Function to get display name (short version without provider/OpenRouter prefix)
    const getModelDisplayName = (modelName: string): string => {
         const nameWithoutPrefix = modelName.startsWith('openrouter:')
            ? modelName.substring('openrouter:'.length)
            : modelName;
         return nameWithoutPrefix.split('/').pop() || nameWithoutPrefix;
    }


    return (
        <Card className={cn(isMinimized && "overflow-hidden")}> {/* Use overflow-hidden when minimized */}
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{title}</CardTitle>
                <div className="flex items-center space-x-1">
                     <Button variant="ghost" size="sm" onClick={onSelectAll} disabled={allModelsSelected}>Select All</Button>
                     <Button variant="ghost" size="sm" onClick={onDeselectAll} disabled={noModelsSelected}>Deselect All</Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMinimized(!isMinimized)}>
                        <Minimize2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            {/* Conditionally render content based on isMinimized */}
            {!isMinimized && (
                <CardContent>
                    {/* Use ScrollArea without explicit scrollbar */}
                    <ScrollArea className="h-48 border rounded-md p-2 scrollbar-hide"> {/* Added scrollbar-hide */}
                        <div className="space-y-3">
                            {providers.map(provider => (
                                <div key={provider.provider}>
                                    <h4 className="text-sm font-medium mb-1">{provider.provider}</h4>
                                    {/* Change grid to flex column */}
                                    <div className="flex flex-col space-y-1">
                                        {provider.models.map(model => (
                                            <div key={model} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`${title}-${model}`} // Ensure unique ID based on title and model
                                                    checked={activeModels.includes(model)}
                                                    onCheckedChange={() => onToggle(model)} // Directly uses the passed handler
                                                />
                                                <Label htmlFor={`${title}-${model}`} className="text-xs font-normal cursor-pointer"> {/* Added cursor-pointer */}
                                                    {getModelDisplayName(model)} {/* Show short name */}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            )}
        </Card>
    );
}

// Helper component for Enabled Models Box in Settings
interface EnabledModelsBoxProps {
    allEnabledModels: string[]; // Derived from context
    onToggle: (modelName: string) => void; // Triggers context update
}

function EnabledModelsBox({ allEnabledModels, onToggle }: EnabledModelsBoxProps) {
    const [isMinimized, setIsMinimized] = useState(false);
     // Use context to get the detailed lists needed for grouping
     const { activeDefaultModels, activeOpenRouterModels, availableOpenRouterModels } = useAppState();

    // Function to get display name (short version without provider/OpenRouter prefix)
    const getModelDisplayName = (modelName: string): string => {
         const nameWithoutPrefix = modelName.startsWith('openrouter:')
            ? modelName.substring('openrouter:'.length)
            : modelName;
         return nameWithoutPrefix.split('/').pop() || nameWithoutPrefix;
    }

    // Group models by provider for display
    const groupedEnabledModels = useMemo(() => {
        const groups: { [provider: string]: string[] } = {};

        allEnabledModels.forEach(model => {
            let providerName = "Unknown";

            // Check OpenRouter first due to prefix
            if (model.startsWith('openrouter:')) {
                providerName = "OpenRouter";
            }
            // Find provider from default list
            else {
                 const defaultProvider = modelProviders.find(p => p.models.includes(model));
                 if (defaultProvider) {
                    providerName = defaultProvider.provider;
                 }
            }

            if (!groups[providerName]) {
                groups[providerName] = [];
            }
            groups[providerName].push(model);
        });
        // Sort providers alphabetically, except maybe put 'OpenRouter' last?
         return Object.entries(groups)
            .sort(([providerA], [providerB]) => providerA.localeCompare(providerB))
            .map(([provider, models]) => ({
                provider,
                models: models.sort((a, b) => getModelDisplayName(a).localeCompare(getModelDisplayName(b))) // Sort models by display name
            }));

    // Include all dependencies that affect grouping
    }, [allEnabledModels, activeDefaultModels, activeOpenRouterModels, availableOpenRouterModels]); // Added activeDefaultModels

    return (
        <Card className={cn(isMinimized && "overflow-hidden")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Enabled Models ({allEnabledModels.length})</CardTitle>
                 <div className="flex items-center space-x-1">
                    {/* No Select/Deselect All here as it operates on the filtered view */}
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMinimized(!isMinimized)}>
                        <Minimize2 className="h-4 w-4" />
                    </Button>
                 </div>
            </CardHeader>
            {!isMinimized && (
                <CardContent>
                    <ScrollArea className="h-48 border rounded-md p-2 scrollbar-hide">
                        {allEnabledModels.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No models enabled.</p>
                        ) : (
                            <div className="space-y-3">
                                {groupedEnabledModels.map(({ provider, models }) => (
                                    <div key={provider}>
                                        <h4 className="text-sm font-medium mb-1">{provider}</h4>
                                        <div className="flex flex-col space-y-1">
                                            {models.map(model => (
                                                <div key={model} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`enabled-${model}`}
                                                        // Always checked in this view, unchecking triggers toggle
                                                        checked={true}
                                                        onCheckedChange={() => onToggle(model)} // Unchecking disables it
                                                    />
                                                    <Label htmlFor={`enabled-${model}`} className="text-xs font-normal cursor-pointer">
                                                        {getModelDisplayName(model)}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            )}
        </Card>
    );
}
