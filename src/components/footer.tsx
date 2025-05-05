
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Mic, Send, Paperclip, Square, PlusCircle, History, Upload, Settings, X, Minimize2 } from 'lucide-react'; // Added new icons
import { toast } from "@/hooks/use-toast"; // Import toast for notifications
import { cn } from '@/lib/utils'; // Import cn for conditional classes
import { useAppState } from '@/context/app-state-context'; // Import context hook for model list potentially

// Define SpeechRecognition types locally if not globally available
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const providerLinks = [
    { name: "Jamie Reddin", href: "https://jayreddin.github.io" },
    { name: "Jamie Discord", href: "https://discord.gg/3YdvQfpPPr" },
    { name: "Puter.com", href: "https://puter.com" },
    { name: "Puter.com Discord", href: "https://discord.gg/gtVFcCQa" },
    { name: "Google Gemini", href: "https://gemini.google.com" },
    { name: "OpenRouter", href: "https://openrouter.ai/" },
];

// AI Model Definitions (Simplified for example - use the one from AppHeader if needed)
const modelProviders = [
  {
    provider: "OpenAI",
    models: ["gpt-4o-mini", "gpt-4o", "o1-mini", "gpt-4.1"],
  },
  {
    provider: "Anthropic",
    models: ["claude-3-7-sonnet", "claude-3-5-sonnet"],
  },
  // ... add other providers as needed
];
const openRouterModels = [
    { provider: "OpenRouter", models: ["or-model-1", "or-model-2"] } // Placeholder OpenRouter models
];

interface FooterProps {
  onSendMessage?: (message: string) => void; // Make prop optional
}

export function Footer({ onSendMessage }: FooterProps) {
    const currentYear = new Date().getFullYear();
    const [inputValue, setInputValue] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
    const recognitionRef = useRef<any>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for Chat Settings
    const [theme, setTheme] = useState<'light' | 'dark'>('light'); // Default theme
    const [textSize, setTextSize] = useState<number>(14); // Default text size in px
    const [chatMode, setChatMode] = useState<'normal' | 'compact'>('normal');
    const [activeModels, setActiveModels] = useState<string[]>(modelProviders.flatMap(p => p.models)); // Initially all default models active
    const [openRouterActive, setOpenRouterActive] = useState(false);
    const [activeOpenRouterModels, setActiveOpenRouterModels] = useState<string[]>([]);
    const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState<{ id: string, name: string, timestamp: number }[]>([]); // Placeholder history

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
        if (hasMicPermission !== null) return; // Already checked or denied

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
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
            } finally {
                // Ensure state is updated even if stop throws error
                 setIsRecording(false);
            }
        }
    };

     const handleMicClick = async () => {
        if (isRecording) {
            stopRecording();
        } else {
             const permissionGranted = await requestMicPermission();
             if (permissionGranted) {
                 startRecordingLogic();
             } else if (hasMicPermission === null) {
                 // If permission is still null after request, it means it's likely the first time and pending
                 // Or the browser doesn't support it. Error toast should have shown.
                 console.log("Mic permission status pending or not supported.");
             }
             // If permission denied (false), the requestMicPermission shows the toast
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
                // You might want to prepend info about the file, or handle it separately
                messageToSend = `[File: ${uploadedFile.name}]\n${messageToSend}`;
             }
            onSendMessage(messageToSend);
            setInputValue('');
            setUploadedFile(null); // Clear file after sending
            setFilePreview(null);
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
        console.log("Starting new chat session...");
        // 1. Save current messages to local storage (implement saving logic)
        // 2. Clear current messages state (if using state managed by parent, call a prop)
        // setMessages([]); // Example if state is local
        // 3. Generate new session ID, update history state
        toast({ title: "New Chat", description: "Functionality not fully implemented." });
    };

    const handleRestoreChat = (sessionId: string) => {
        console.log(`Restoring chat session: ${sessionId}`);
        // 1. Fetch messages for sessionId from local storage
        // 2. Update messages state
        setIsHistoryOpen(false); // Close popover
        toast({ title: "Restore Chat", description: "Functionality not fully implemented." });
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
            // For now, just close the dialog. The file state is already set.
            setIsFileUploadOpen(false);
            toast({ title: "File Ready", description: `${uploadedFile.name} is ready to be sent with your message.` });
        }
    };

    const handleSaveSettings = () => {
        console.log("Saving chat settings:", { theme, textSize, chatMode, activeModels, openRouterActive, activeOpenRouterModels });
        // 1. Apply theme (e.g., add/remove 'dark' class to body or html)
         document.documentElement.classList.toggle('dark', theme === 'dark');
         // Apply text size (e.g., set CSS variable or style on root element)
        document.documentElement.style.setProperty('--chat-text-size', `${textSize}px`);
        // Apply chat mode (e.g., add class for styling)
        // 2. Save settings to local storage
        localStorage.setItem('chatSettings', JSON.stringify({ theme, textSize, chatMode, activeModels, openRouterActive, activeOpenRouterModels }));
        setIsChatSettingsOpen(false); // Close dialog
        toast({ title: "Settings Saved", description: "Chat settings have been updated." });
    };

     // Load settings on mount
    useEffect(() => {
        const savedSettings = localStorage.getItem('chatSettings');
        if (savedSettings) {
            try {
                const parsedSettings = JSON.parse(savedSettings);
                setTheme(parsedSettings.theme || 'light');
                setTextSize(parsedSettings.textSize || 14);
                setChatMode(parsedSettings.chatMode || 'normal');
                setActiveModels(parsedSettings.activeModels || modelProviders.flatMap(p => p.models));
                setOpenRouterActive(parsedSettings.openRouterActive || false);
                setActiveOpenRouterModels(parsedSettings.activeOpenRouterModels || []);

                 // Apply loaded settings immediately
                document.documentElement.classList.toggle('dark', parsedSettings.theme === 'dark');
                document.documentElement.style.setProperty('--chat-text-size', `${parsedSettings.textSize || 14}px`);

            } catch (e) {
                console.error("Failed to parse saved chat settings", e);
            }
        }
        // Load chat history placeholder
        setChatHistory([
            { id: '1', name: 'Chat about Next.js', timestamp: Date.now() - 3600000 },
            { id: '2', name: 'Puter.js Integration', timestamp: Date.now() - 7200000 },
        ]);
    }, []);

     // Model Selection Handlers
    const handleModelToggle = (modelName: string, providerType: 'default' | 'openrouter') => {
        const isActive = providerType === 'default' ? activeModels.includes(modelName) : activeOpenRouterModels.includes(modelName);
        const setActiveFunc = providerType === 'default' ? setActiveModels : setActiveOpenRouterModels;

        setActiveFunc(prev =>
            isActive ? prev.filter(m => m !== modelName) : [...prev, modelName]
        );
    };

    const handleSelectAllModels = (providerType: 'default' | 'openrouter') => {
        const allModels = (providerType === 'default' ? modelProviders : openRouterModels).flatMap(p => p.models);
        const setActiveFunc = providerType === 'default' ? setActiveModels : setActiveOpenRouterModels;
        setActiveFunc(allModels);
    };

    const handleDeselectAllModels = (providerType: 'default' | 'openrouter') => {
        const setActiveFunc = providerType === 'default' ? setActiveModels : setActiveOpenRouterModels;
        setActiveFunc([]);
    };
    // --- End Control Bar Actions ---


    return (
        <footer className="sticky bottom-0 z-40 w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container max-w-screen-2xl px-4 md:px-6 py-2 space-y-2">

                {/* Control Icons Bar - Only show if onSendMessage is available (likely chat page) */}
                 {onSendMessage && (
                    <div className="flex items-center justify-start space-x-1 h-8">
                         {/* New Chat Button */}
                        <Button variant="ghost" size="icon" onClick={handleNewChat} aria-label="New Chat">
                            <PlusCircle className="h-5 w-5 text-muted-foreground" />
                        </Button>

                         {/* Chat History Popover */}
                        <Popover open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                             <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Chat History">
                                    <History className="h-5 w-5 text-muted-foreground" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Chat History</h4>
                                    <p className="text-sm text-muted-foreground">Select a previous chat session.</p>
                                    {chatHistory.length > 0 ? (
                                        <ScrollArea className="h-40">
                                            {chatHistory.map(session => (
                                                <Button key={session.id} variant="link" onClick={() => handleRestoreChat(session.id)} className="block w-full text-left p-1 h-auto">
                                                    {session.name} ({new Date(session.timestamp).toLocaleTimeString()})
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
                        <Dialog open={isFileUploadOpen} onOpenChange={setIsFileUploadOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Upload File">
                                    <Upload className="h-5 w-5 text-muted-foreground" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Upload File</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                     {filePreview && (
                                        <div className="mt-4 border rounded p-2 max-h-60 overflow-auto relative group">
                                             <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="absolute top-1 right-1 h-5 w-5 opacity-50 group-hover:opacity-100" aria-label="Remove file">
                                                <X className="h-3 w-3"/>
                                             </Button>
                                            {uploadedFile?.type.startsWith('image/') ? (
                                                <img src={filePreview} alt="File preview" className="max-w-full max-h-56 object-contain mx-auto" />
                                            ) : (
                                                <p className="text-sm text-muted-foreground p-4">{filePreview}</p>
                                            )}
                                        </div>
                                    )}
                                    <Input type="file" ref={fileInputRef} onChange={handleFileChange} className="mt-2" />
                                    <Button onClick={handleAddFileToChat} disabled={!uploadedFile}>Add File to Chat</Button>
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
                             <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                                <DialogHeader>
                                    <DialogTitle>Chat Settings</DialogTitle>
                                </DialogHeader>
                                <ScrollArea className="flex-grow pr-4 -mr-4"> {/* Allow content to scroll */}
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
                                                 <CardHeader>
                                                    <CardTitle>Model Selection</CardTitle>
                                                    <CardDescription>Choose the models available in the dropdown.</CardDescription>
                                                 </CardHeader>
                                                 <CardContent className="space-y-4">
                                                    {/* Default Models Box */}
                                                    <ModelSelectionBox
                                                        title="Default Models"
                                                        providers={modelProviders}
                                                        activeModels={activeModels}
                                                        onToggle={(model) => handleModelToggle(model, 'default')}
                                                        onSelectAll={() => handleSelectAllModels('default')}
                                                        onDeselectAll={() => handleDeselectAllModels('default')}
                                                    />

                                                    {/* OpenRouter Activation */}
                                                    <div className="flex items-center space-x-2 pt-4 border-t">
                                                        <Switch id="openrouter-switch" checked={openRouterActive} onCheckedChange={setOpenRouterActive} />
                                                        <Label htmlFor="openrouter-switch">Activate OpenRouter Models</Label>
                                                    </div>

                                                    {/* OpenRouter Models Box (Conditional) */}
                                                    {openRouterActive && (
                                                        <ModelSelectionBox
                                                            title="OpenRouter Models"
                                                            providers={openRouterModels}
                                                            activeModels={activeOpenRouterModels}
                                                            onToggle={(model) => handleModelToggle(model, 'openrouter')}
                                                            onSelectAll={() => handleSelectAllModels('openrouter')}
                                                            onDeselectAll={() => handleDeselectAllModels('openrouter')}
                                                        />
                                                    )}
                                                 </CardContent>
                                            </Card>
                                        </TabsContent>
                                     </Tabs>
                                </ScrollArea>
                                <DialogFooter className="mt-4 pt-4 border-t">
                                    <DialogClose asChild>
                                        <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button onClick={handleSaveSettings}>Save Settings</Button>
                                </DialogFooter>
                             </DialogContent>
                        </Dialog>

                        {/* Add more control icons here as needed */}
                        {/* <Button variant="ghost" size="icon" aria-label="Attach file (old)">
                            <Paperclip className="h-5 w-5 text-muted-foreground" />
                        </Button> */}
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
                            {/* File Thumbnail */}
                             {uploadedFile && filePreview && (
                                <div className="absolute bottom-full left-0 mb-1 p-1 bg-secondary border rounded-md shadow max-w-[150px] group">
                                     <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="absolute top-0 right-0 h-4 w-4 opacity-50 group-hover:opacity-100 z-10" aria-label="Remove file">
                                        <X className="h-3 w-3"/>
                                     </Button>
                                    {uploadedFile.type.startsWith('image/') ? (
                                        <img src={filePreview} alt="Preview" className="max-h-16 max-w-full object-contain rounded" />
                                    ) : (
                                        <span className="text-xs px-1 line-clamp-2">📄 {uploadedFile.name}</span>
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
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button variant="link" size="sm" className="p-0 h-auto text-xs text-muted-foreground underline hover:text-foreground">
                                providers
                            </Button>
                            </PopoverTrigger>
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
    activeModels: string[];
    onToggle: (modelName: string) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
}

function ModelSelectionBox({ title, providers, activeModels, onToggle, onSelectAll, onDeselectAll }: ModelSelectionBoxProps) {
    const [isMinimized, setIsMinimized] = useState(false);

    return (
        <Card className={cn(isMinimized && "h-auto")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{title}</CardTitle>
                <div className="flex items-center space-x-1">
                     <Button variant="ghost" size="sm" onClick={onSelectAll}>Select All</Button>
                     <Button variant="ghost" size="sm" onClick={onDeselectAll}>Deselect All</Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsMinimized(!isMinimized)}>
                        <Minimize2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            {!isMinimized && (
                <CardContent>
                    <ScrollArea className="h-48 border rounded-md p-2">
                        <div className="space-y-3">
                            {providers.map(provider => (
                                <div key={provider.provider}>
                                    <h4 className="text-sm font-medium mb-1">{provider.provider}</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        {provider.models.map(model => (
                                            <div key={model} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`${title}-${model}`}
                                                    checked={activeModels.includes(model)}
                                                    onCheckedChange={() => onToggle(model)}
                                                />
                                                <Label htmlFor={`${title}-${model}`} className="text-xs font-normal">
                                                    {model.split('/').pop()} {/* Show short name */}
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
