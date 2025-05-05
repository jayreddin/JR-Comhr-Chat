
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PageLayout } from '@/components/page-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Camera, Monitor, Mic as MicIcon, AlertCircle, KeyRound } from 'lucide-react'; // Added KeyRound
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Import Label
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
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
const GEMINI_MODEL_NAME = "gemini-1.5-flash-latest"; // Corrected model name based on Gemini API docs

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
    const cameraStreamRef = useRef<MediaStream | null>(null); // Store the camera stream

    const [hasScreenPermission, setHasScreenPermission] = useState<boolean | null>(null);
    const [isScreenActive, setIsScreenActive] = useState(false);
    const screenVideoRef = useRef<HTMLVideoElement>(null);
    const screenStreamRef = useRef<MediaStream | null>(null); // Store the screen stream

    const [hasAudioPermission, setHasAudioPermission] = useState<boolean | null>(null);
    const [isAudioActive, setIsAudioActive] = useState(false);
    const audioStreamRef = useRef<MediaStream | null>(null); // Store audio stream if needed
    // Add ref for audio visualization if needed
    // const audioVisualizerRef = useRef<HTMLCanvasElement>(null);

    // Load API Key from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedApiKey = localStorage.getItem('geminiApiKey');
            if (storedApiKey) {
                setApiKey(storedApiKey);
            } else {
                // Optionally prompt for key if not found on first load
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
            let responseText = ''; // Store raw response text

            if (!response.ok) {
                 try {
                    responseText = await response.text(); // Get raw text first
                    try {
                        errorData = JSON.parse(responseText); // Try parsing later
                        console.error("Gemini API Error Response (JSON):", errorData); // Log detailed error
                         if (typeof errorData === 'object' && errorData !== null && 'error' in errorData && typeof errorData.error === 'object' && errorData.error !== null && 'message' in errorData.error) {
                            detailedMessage += ` - ${errorData.error.message}`;
                         } else if (responseText) {
                             detailedMessage += ` - ${responseText}`;
                         }
                    } catch (parseError) {
                        console.error("Could not parse error response as JSON:", parseError);
                        if (responseText) {
                             detailedMessage += ` - ${responseText}`; // Use raw text if parsing failed
                         }
                    }
                } catch (textReadError) {
                    console.error("Could not read error response text:", textReadError);
                } finally {
                    // Add specific checks for common errors
                     if (response.status === 400 && (responseText.includes("API_KEY_INVALID") || responseText.includes("API key not valid"))) {
                         detailedMessage = "Invalid Gemini API Key. Please check your key.";
                         setIsApiKeyDialogOpen(true);
                     } else if (response.status === 400 && (responseText.includes("not found for API version") || responseText.includes("not supported for generateContent"))) {
                         detailedMessage = `Model '${GEMINI_MODEL_NAME}' not found or method not supported. Check model name.`;
                     } else if (response.status === 400) {
                         detailedMessage += " Bad request. Check input format.";
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
        // Ensure other sources are off
        stopScreenShare();
        stopAudio();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraStreamRef.current = stream; // Store the camera stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(e => console.error("Camera video play error:", e));
            }
            setIsCameraActive(true);
            console.log("Camera started");
        } catch (error) {
            console.error('Error starting camera stream:', error);
            toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not start camera.' });
        }
    };

    const stopCamera = useCallback(() => {
        if (cameraStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach(track => track.stop());
            cameraStreamRef.current = null; // Clear the stored stream
            console.log("Camera stream stopped");
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null; // Clear video source
        }
        setIsCameraActive(false);
        console.log("Camera stopped");
    }, []); // Empty dependencies, uses refs

    const handleCameraClick = () => {
        if (isCameraActive) {
            stopCamera();
        } else {
            startCamera();
        }
    };
    // --- End Camera Handling ---

    // --- Screen Sharing Handling ---
    const getScreenPermission = useCallback(async () => {
        if (hasScreenPermission !== null) return hasScreenPermission;

        if (typeof window !== 'undefined' && navigator.mediaDevices?.getDisplayMedia) {
            try {
                // Request permission without starting stream immediately
                 const testStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
                 testStream.getTracks().forEach(track => track.stop()); // Stop the test stream
                setHasScreenPermission(true);
                return true;
            } catch (error) {
                console.error('Error getting screen share permission:', error);
                setHasScreenPermission(false);
                 toast({
                    variant: 'destructive',
                    title: 'Screen Share Denied',
                    description: 'Please allow screen sharing in your browser or system settings.',
                });
                return false;
            }
        } else {
            setHasScreenPermission(false);
            toast({ variant: "destructive", title: "Not Supported", description: "Screen sharing not supported by your browser." });
            return false;
        }
    }, [hasScreenPermission]);

     const startScreenShare = async () => {
         const permissionGranted = await getScreenPermission();
         if (!permissionGranted) return;
         // Ensure other sources are off
         stopCamera();
         stopAudio();

         try {
             const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }); // No audio for now
             screenStreamRef.current = stream;
             if (screenVideoRef.current) {
                 screenVideoRef.current.srcObject = stream;
                 screenVideoRef.current.play().catch(e => console.error("Screen share video play error:", e));
             }
             setIsScreenActive(true);
             console.log("Screen share started");

             // Handle stream ending (e.g., user clicks "Stop sharing" button in browser UI)
             stream.getVideoTracks()[0].onended = () => {
                 stopScreenShare();
                 toast({ title: "Screen Share Stopped", description: "Screen sharing has ended." });
             };
         } catch (error) {
             console.error('Error starting screen share:', error);
             toast({ variant: 'destructive', title: 'Screen Share Error', description: 'Could not start screen share.' });
              stopScreenShare(); // Ensure state is reset on error
         }
     };

    const stopScreenShare = useCallback(() => {
        if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach(track => track.stop());
            screenStreamRef.current = null;
            console.log("Screen share stream stopped");
        }
        if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = null;
        }
        setIsScreenActive(false);
        console.log("Screen share stopped");
    }, []); // Empty dependencies, uses refs

    const handleScreenClick = () => {
        if (isScreenActive) {
            stopScreenShare();
        } else {
            startScreenShare();
        }
    };
    // --- End Screen Sharing Handling ---

    // --- Audio Handling ---
     const getAudioPermission = useCallback(async () => {
        if (hasAudioPermission !== null) return hasAudioPermission;

        if (typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
                setHasAudioPermission(true);
                return true;
            } catch (error) {
                console.error('Error accessing microphone:', error);
                setHasAudioPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Microphone Access Denied',
                    description: 'Please enable microphone permissions in your browser settings.',
                });
                return false;
            }
        } else {
            setHasAudioPermission(false);
            toast({ variant: "destructive", title: "Not Supported", description: "Microphone access not supported by your browser." });
            return false;
        }
    }, [hasAudioPermission]);

     const startAudio = async () => {
         const permissionGranted = await getAudioPermission();
         if (!permissionGranted) return;
         // Ensure other sources are off
         stopCamera();
         stopScreenShare();

         try {
             const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
             audioStreamRef.current = stream;
             setIsAudioActive(true);
             console.log("Audio input started");
             // TODO: Add audio visualization if needed
             // Example: Setup an AudioContext and AnalyserNode here
         } catch (error) {
             console.error('Error starting audio input:', error);
             toast({ variant: 'destructive', title: 'Audio Error', description: 'Could not start microphone.' });
         }
     };

    const stopAudio = useCallback(() => {
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
            console.log("Audio stream stopped");
        }
        setIsAudioActive(false);
        console.log("Audio input stopped");
        // TODO: Clean up audio visualization if implemented
    }, []); // Empty dependencies, uses refs

    const handleAudioClick = () => {
        if (isAudioActive) {
            stopAudio();
        } else {
            startAudio();
        }
    };
    // --- End Audio Handling ---

     // Cleanup streams on component unmount
    useEffect(() => {
        return () => {
            stopCamera();
            stopScreenShare();
            stopAudio();
        };
    }, [stopCamera, stopScreenShare, stopAudio]);


    return (
        // Pass showSignIn=false to PageLayout to hide the default sign-in/out
        <PageLayout currentPageName="Vision" showSignIn={false}>
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
                 {/* Top Row: Gemini Key Button and Source Buttons */}
                 <div className="flex justify-between items-center space-x-4 mb-4 flex-shrink-0">
                     {/* Gemini API Key Button (Left) */}
                     <Button variant="outline" onClick={() => setIsApiKeyDialogOpen(true)}>
                         <KeyRound className="mr-2 h-4 w-4" />
                         {apiKey ? "View/Edit API Key" : "Set API Key"}
                     </Button>

                     {/* Source Buttons (Centered) */}
                     <div className="flex justify-center space-x-4 flex-grow">
                        <Button
                            variant="outline"
                            onClick={handleCameraClick}
                            className={cn(isCameraActive && "ring-2 ring-red-500 text-red-500 animate-pulse")}
                            disabled={hasCameraPermission === false}
                        >
                            <Camera className="mr-2 h-4 w-4" />
                            {isCameraActive ? "Deactivate Camera" : "Activate Camera"}
                         </Button>
                        <Button
                            variant="outline"
                            onClick={handleScreenClick}
                            className={cn(isScreenActive && "ring-2 ring-red-500 text-red-500 animate-pulse")}
                            disabled={hasScreenPermission === false}
                        >
                            <Monitor className="mr-2 h-4 w-4" />
                             {isScreenActive ? "Stop Sharing" : "Activate Screen"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleAudioClick}
                            className={cn(isAudioActive && "ring-2 ring-red-500 text-red-500 animate-pulse")}
                            disabled={hasAudioPermission === false}
                        >
                            <MicIcon className="mr-2 h-4 w-4" />
                             {isAudioActive ? "Deactivate Audio" : "Activate Audio"}
                        </Button>
                     </div>
                      {/* Placeholder on the right to balance the key button */}
                     <div className="w-[150px]"></div>
                 </div>


                 {/* Inline Previews Area - Conditionally Rendered */}
                 {(isCameraActive || isScreenActive || isAudioActive) && (
                     <div className="mb-4 flex-shrink-0 rounded-md overflow-hidden border bg-secondary/30 flex justify-center items-center p-2 space-x-2">
                         {/* Camera Preview */}
                         {isCameraActive && (
                             <div className="flex flex-col items-center">
                                 <video
                                     ref={videoRef}
                                     className={cn(
                                         "w-auto h-32 aspect-video rounded-md bg-black",
                                         { 'hidden': hasCameraPermission === false }
                                     )}
                                     autoPlay
                                     muted
                                     playsInline
                                 />
                                 {hasCameraPermission === false && (
                                    <Alert variant="destructive" className="w-auto mt-1 text-xs">
                                        <AlertCircle className="h-3 w-3" />
                                        <AlertDescription>Enable camera permissions.</AlertDescription>
                                    </Alert>
                                 )}
                                <Label className="text-xs mt-1">Camera</Label>
                             </div>
                         )}

                         {/* Screen Preview */}
                         {isScreenActive && (
                            <div className="flex flex-col items-center">
                                <video
                                    ref={screenVideoRef}
                                    className={cn(
                                        "w-auto h-32 aspect-video rounded-md bg-black",
                                        { 'hidden': hasScreenPermission === false }
                                    )}
                                    autoPlay
                                    muted
                                    playsInline
                                />
                                {hasScreenPermission === false && (
                                     <Alert variant="destructive" className="w-auto mt-1 text-xs">
                                        <AlertCircle className="h-3 w-3" />
                                        <AlertDescription>Enable screen permissions.</AlertDescription>
                                    </Alert>
                                )}
                                <Label className="text-xs mt-1">Screen</Label>
                             </div>
                         )}

                         {/* Audio Preview/Visualization */}
                         {isAudioActive && (
                             <div className="flex flex-col items-center justify-center h-32 w-32 border rounded-md bg-black">
                                {hasAudioPermission === false ? (
                                     <Alert variant="destructive" className="w-auto m-1 text-xs">
                                        <AlertCircle className="h-3 w-3" />
                                        <AlertDescription>Enable mic permissions.</AlertDescription>
                                    </Alert>
                                ) : (
                                     <MicIcon className="h-8 w-8 text-red-500 animate-pulse" />
                                     // TODO: Add canvas for visualization here if needed
                                     // <canvas ref={audioVisualizerRef} className="w-full h-full"></canvas>
                                )}
                                <Label className="text-xs mt-1 text-white">Audio</Label>
                             </div>
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
                                {apiKey ? 'Start chatting below.' : 'Enter your Gemini API key to start chatting.'}
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
