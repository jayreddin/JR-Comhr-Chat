
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PageLayout } from '@/components/page-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Camera, Monitor, Mic as MicIcon, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"; // Import Alert components
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"; // Import Dialog components
import { cn } from '@/lib/utils';


// Interface for message structure
interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
  imageUrl?: string; // Optional image URL for user messages
}

// Define the model name constant
const GEMINI_MODEL_NAME = "gemini-1.5-flash"; // Correct model name

export default function VisionPage() {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
    const [tempApiKey, setTempApiKey] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null); // For scrolling

    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null); // Store the stream


    // Load API Key from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedApiKey = localStorage.getItem('geminiApiKey');
            if (storedApiKey) {
                setApiKey(storedApiKey);
            } else {
                // Optionally prompt for key if not found
                // setIsApiKeyDialogOpen(true);
            }
        }
    }, []);

    // Function to save API Key
    const handleSaveApiKey = () => {
        if (tempApiKey.trim()) {
            setApiKey(tempApiKey.trim());
            if (typeof window !== 'undefined') {
                localStorage.setItem('geminiApiKey', tempApiKey.trim());
            }
            setIsApiKeyDialogOpen(false);
            toast({ title: "API Key Saved", description: "Gemini API Key has been stored locally." });
        } else {
            toast({ variant: "destructive", title: "Invalid Key", description: "Please enter a valid API Key." });
        }
    };

    // Function to clear API Key
    const handleClearApiKey = () => {
        setApiKey(null);
        setTempApiKey(''); // Clear temp key as well
        if (typeof window !== 'undefined') {
            localStorage.removeItem('geminiApiKey');
        }
        // Keep dialog open for user to potentially enter a new one or close
        // setIsApiKeyDialogOpen(false);
        toast({ title: "API Key Cleared", description: "Gemini API Key removed from local storage." });
    };

    // Scroll to the latest message (bottom) when messages change or loading starts/stops
    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Function to handle sending messages
    const handleSendMessage = async (messageText: string, imageUrl?: string) => {
        const trimmedInput = messageText.trim();
        if (!trimmedInput && !imageUrl) return;
        if (!apiKey) {
            toast({ variant: "destructive", title: "API Key Required", description: "Please enter your Gemini API Key." });
            setIsApiKeyDialogOpen(true);
            return;
        }

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: trimmedInput,
            timestamp: Date.now(),
            imageUrl: imageUrl, // Include image URL if provided
        };
        // Add user message to the end for chronological display
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        setInputValue(''); // Clear input after sending
        setIsLoading(true);
        scrollToBottom(); // Scroll after adding user message

        const geminiApiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${apiKey}`;

        const parts = [];
        if (trimmedInput) {
            parts.push({ text: trimmedInput });
        }
        // TODO: Add image data part if imageUrl exists and needs processing
        // For now, just sending text

        const requestBody = {
            contents: [{ role: "user", parts: parts }],
            // Add generationConfig or safetySettings if needed
        };

        try {
            console.log("Sending to Gemini:", JSON.stringify(requestBody));
            const response = await fetch(geminiApiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            let errorData: any = {}; // Use any to avoid strict type errors during error parsing
            let detailedMessage = `Gemini API Error: ${response.status} ${response.statusText}`;

            if (!response.ok) {
                try {
                    const textError = await response.text(); // Get the raw text response
                    try {
                        errorData = JSON.parse(textError); // Try to parse as JSON
                         console.error("Gemini API Error Response (JSON):", errorData);
                         // Try to extract more specific error message from JSON
                         if (typeof errorData === 'object' && errorData !== null && 'error' in errorData && typeof errorData.error === 'object' && errorData.error !== null && 'message' in errorData.error) {
                            detailedMessage += ` - ${errorData.error.message}`;
                         } else if (textError) {
                             detailedMessage += ` - ${textError}`; // Use raw text if JSON parsing fails or doesn't have expected structure
                         }
                    } catch (parseError) {
                         console.error("Could not parse error response as JSON:", parseError);
                         // Use raw text error if JSON parsing failed
                         if (textError) {
                            detailedMessage += ` - ${textError}`;
                         }
                     }
                } catch (textReadError) {
                     console.error("Could not read error response text:", textReadError);
                } finally {
                    // Add specific checks for common errors
                    if (response.status === 400) {
                         if (detailedMessage.includes("API_KEY_INVALID") || detailedMessage.includes("API key not valid")) {
                            detailedMessage = "Invalid Gemini API Key. Please check your key.";
                            // Optionally clear the invalid key
                            // handleClearApiKey();
                            setIsApiKeyDialogOpen(true); // Prompt user to re-enter
                         } else if (detailedMessage.includes("not found for API version") || detailedMessage.includes("not supported for generateContent")) {
                             detailedMessage = `Model '${GEMINI_MODEL_NAME}' not found or method not supported. Check model name.`;
                         } else {
                             detailedMessage += " Bad request. Check input format.";
                         }
                    } else if (response.status === 401 || response.status === 403) {
                         detailedMessage = "Authentication failed. Check your API key permissions.";
                         setIsApiKeyDialogOpen(true);
                    } else if (response.status === 429) {
                         detailedMessage += " Rate limit exceeded. Please try again later.";
                    } else if (response.status >= 500) {
                         detailedMessage += " Server error on Gemini's side. Please try again later.";
                    }
                 }
                 throw new Error(detailedMessage);
            }

            const responseData = await response.json();
            console.log("Received from Gemini:", responseData);

            // Extract text from response - adjust based on actual Gemini API structure
            let aiText = "No text content received."; // Default message
            if (responseData.candidates && responseData.candidates.length > 0) {
                 const candidate = responseData.candidates[0];
                 if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                     // Concatenate all text parts
                     aiText = candidate.content.parts
                         .map((part: { text?: string }) => part.text || "")
                         .join("");
                 }
             }


            const aiMessage: Message = {
                id: `ai-${Date.now()}`,
                sender: 'ai',
                text: aiText,
                timestamp: Date.now(),
            };
            // Add AI message to the end
            setMessages((prevMessages) => [...prevMessages, aiMessage]);

        } catch (error: any) {
            console.error("Error sending message to Gemini:", error);
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                sender: 'ai', // Show error as AI response
                text: `Error: ${error.message}`,
                timestamp: Date.now(),
            };
            setMessages((prevMessages) => [...prevMessages, errorMessage]);
            toast({ variant: "destructive", title: "Gemini API Error", description: error.message });
        } finally {
            setIsLoading(false);
            scrollToBottom(); // Scroll after adding AI message or error
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage(inputValue);
        }
    };


    // --- Camera Handling ---
     const getCameraPermission = useCallback(async () => {
        if (hasCameraPermission !== null) return hasCameraPermission;

        if (typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true });
                setHasCameraPermission(true);
                return true;
            } catch (error) {
                console.error('Error accessing camera:', error);
                setHasCameraPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Camera Access Denied',
                    description: 'Please enable camera permissions in your browser settings.',
                });
                return false;
            }
        } else {
            setHasCameraPermission(false);
            toast({ variant: "destructive", title: "Not Supported", description: "Camera access not supported by your browser." });
            return false;
        }
    }, [hasCameraPermission]);

    const startCamera = async () => {
        const permissionGranted = await getCameraPermission();
        if (!permissionGranted) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream; // Store the stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                 // Ensure video plays when stream is attached
                videoRef.current.play().catch(e => console.error("Video play error:", e));
            }
            setIsCameraActive(true);
            console.log("Camera started");
        } catch (error) {
            console.error('Error starting camera stream:', error);
            toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not start camera.' });
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null; // Clear the stored stream
            console.log("Camera stream stopped");
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null; // Clear video source
        }
        setIsCameraActive(false);
        console.log("Camera stopped");
    };

    const handleCameraClick = () => {
        if (isCameraActive) {
            stopCamera();
        } else {
            startCamera();
        }
    };
    // --- End Camera Handling ---

    // Other source activation handlers (placeholders)
    const handleScreenClick = () => {
        toast({ title: "Info", description: "Screen sharing not yet implemented." });
    };
    const handleAudioClick = () => {
        toast({ title: "Info", description: "Audio input not yet implemented." });
    };


    return (
        <PageLayout currentPageName="Vision">
            {/* API Key Dialog */}
            <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enter Gemini API Key</DialogTitle>
                        <DialogDescription>
                            Your API Key is stored locally in your browser and is required to interact with the Gemini API. Get a key from Google AI Studio.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input
                            id="apiKey"
                            placeholder="Enter your Gemini API Key"
                            value={tempApiKey}
                            onChange={(e) => setTempApiKey(e.target.value)}
                            type="password"
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        {apiKey && ( // Show Clear button only if a key is currently set
                             <Button variant="destructive" onClick={handleClearApiKey}>Clear Key</Button>
                        )}
                         <Button variant="outline" onClick={() => setIsApiKeyDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveApiKey}>Save Key</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Main Content Area */}
            <div className="flex flex-col h-full flex-grow overflow-hidden">
                {/* Source Buttons Row */}
                 <div className="flex justify-center space-x-4 mb-4 flex-shrink-0">
                     {/* Camera Button */}
                     <Button
                        variant="outline"
                        onClick={handleCameraClick}
                        className={cn(isCameraActive && "ring-2 ring-red-500 text-red-500 animate-pulse")}
                        disabled={hasCameraPermission === false}
                    >
                        <Camera className="mr-2 h-4 w-4" />
                        {isCameraActive ? "Deactivate Camera" : "Activate Camera"}
                     </Button>
                    <Button variant="outline" onClick={handleScreenClick}>
                        <Monitor className="mr-2 h-4 w-4" /> Activate Screen
                    </Button>
                    <Button variant="outline" onClick={handleAudioClick}>
                        <MicIcon className="mr-2 h-4 w-4" /> Activate Audio
                    </Button>
                 </div>

                {/* Camera Preview Area (only if active) */}
                {isCameraActive && (
                     <div className="mb-4 flex-shrink-0 rounded-md overflow-hidden border bg-black flex justify-center items-center">
                         {/* Always render video tag, but hide if no permission initially */}
                         <video
                             ref={videoRef}
                             className={cn(
                                 "w-auto h-48 aspect-video rounded-md", // Start with fixed height, auto width
                                 { 'hidden': hasCameraPermission === false } // Hide if permission explicitly denied
                             )}
                             autoPlay
                             muted
                             playsInline // Important for mobile
                         />
                          {/* Show alert only if permission is known to be denied */}
                         {hasCameraPermission === false && (
                            <Alert variant="destructive" className="w-auto m-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Camera Access Denied</AlertTitle>
                                <AlertDescription>
                                Enable camera permissions to see the preview.
                                </AlertDescription>
                            </Alert>
                         )}
                     </div>
                 )}

                {/* Chat Display Area */}
                <ScrollArea className="flex-grow h-full border rounded-md p-4 bg-secondary/30 mb-4" viewportRef={scrollAreaRef}>
                    <div className="flex flex-col space-y-4">
                        {messages.map((message) => (
                            <div key={message.id} className="p-2">
                                <div className={`flex flex-col ${message.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                    {/* Name and Timestamp */}
                                    <div className={`flex w-full ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-1 px-1`}>
                                        <span className="text-xs font-medium opacity-80 mr-2">
                                            {message.sender === 'user' ? 'You' : 'Gemini'}
                                        </span>
                                        <span className="text-xs opacity-70">{format(message.timestamp, 'HH:mm')}</span>
                                    </div>
                                    {/* Message Bubble */}
                                    <div
                                        className={`p-3 rounded-lg max-w-[75%] whitespace-pre-wrap shadow-md ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                                    >
                                        {/* Render Image if present */}
                                        {message.imageUrl && (
                                            <div className="mb-2">
                                                <img src={message.imageUrl} alt="User upload" className="max-w-full max-h-40 rounded" />
                                            </div>
                                        )}
                                        {/* Message Text */}
                                         {message.text ? (
                                             <p className="text-sm">{message.text}</p>
                                         ) : (
                                             // Show skeleton only for the latest AI message while loading
                                             message.sender === 'ai' && isLoading && messages.length > 0 && messages[messages.length - 1]?.id === message.id && (
                                                <div className="space-y-2">
                                                    <Skeleton className="h-4 w-[80%]" />
                                                    <Skeleton className="h-4 w-[60%]" />
                                                </div>
                                             )
                                         )}
                                    </div>
                                     {/* TODO: Add Action Buttons (Resend, Copy, Delete, Speak) similar to chat/page.tsx if needed */}
                                </div>
                            </div>
                        ))}
                        {/* Placeholder when no messages */}
                        {messages.length === 0 && !isLoading && (
                             <p className="text-sm text-muted-foreground text-center p-4">
                                {apiKey ? 'Chat with Gemini or activate a source.' : 'Enter your Gemini API key to start chatting.'}
                             </p>
                        )}
                        {/* Div to mark the end of messages for scrolling */}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>


                {/* Input Area - Always visible at the bottom */}
                <div className="flex items-center space-x-2 mt-auto flex-shrink-0">
                    <Input
                        type="text"
                        placeholder="Type your message..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-grow"
                        disabled={isLoading || !apiKey} // Disable if loading or no API key
                    />
                    <Button onClick={() => handleSendMessage(inputValue)} disabled={isLoading || !apiKey || (!inputValue.trim() && messages.length === 0)}>
                        {isLoading ? <Skeleton className="h-5 w-5" /> : "Send"}
                    </Button>
                </div>
            </div>
        </PageLayout>
    );
}
