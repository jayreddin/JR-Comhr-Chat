
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mic, Send, Paperclip, Square } from 'lucide-react'; // Added Mic, Send, Paperclip, Square
import { toast } from "@/hooks/use-toast"; // Import toast for notifications
import { cn } from '@/lib/utils'; // Import cn for conditional classes

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

interface FooterProps {
  onSendMessage?: (message: string) => void; // Make prop optional to avoid errors on non-chat pages
}

export function Footer({ onSendMessage }: FooterProps) {
    const currentYear = new Date().getFullYear();
    const [inputValue, setInputValue] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null); // null = unchecked, true = granted, false = denied
    const recognitionRef = useRef<any>(null); // Ref to store the SpeechRecognition instance

    // Initialize SpeechRecognition - Client-side only
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true; // Keep listening even after pauses
                recognitionRef.current.interimResults = true; // Get results as they come in

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
                    // Update input value with combined final and interim results
                    setInputValue(finalTranscript + interimTranscript);
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error('Speech recognition error:', event.error);
                     let description = "An unknown error occurred.";
                    if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                        description = "Microphone access denied or service not allowed. Please check browser permissions.";
                        setHasMicPermission(false); // Explicitly set permission state
                    } else if (event.error === 'no-speech') {
                        description = "No speech detected. Please try speaking again.";
                    } else {
                        description = event.error;
                    }
                    toast({ variant: "destructive", title: "Speech Recognition Error", description });
                    stopRecording(); // Stop recording on error
                };

                recognitionRef.current.onend = () => {
                     console.log("Speech recognition ended.");
                     // Only set isRecording to false if it wasn't manually stopped
                     // This check might be redundant if stopRecording always sets it
                     if (isRecording) {
                         // setIsRecording(false); // Let stopRecording handle this state update
                     }
                };

            } else {
                console.warn('Speech Recognition API not supported in this browser.');
                 // Set permission to false if API is not supported
                setHasMicPermission(false);
            }
        }
    }, [isRecording]); // Re-run effect if isRecording changes? Maybe not needed.


    const requestMicPermission = useCallback(async () => {
        if (hasMicPermission === false) { // If already denied, don't ask again
             toast({ variant: "destructive", title: "Microphone Access Denied", description: "Please enable microphone permissions in your browser settings." });
            return false;
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            toast({ variant: "destructive", title: "Mic Not Supported", description: "Your browser doesn't support microphone access." });
            setHasMicPermission(false);
            return false;
        }
        try {
            // Request microphone access
            await navigator.mediaDevices.getUserMedia({ audio: true });
            setHasMicPermission(true);
            return true;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            toast({ variant: "destructive", title: "Microphone Access Denied", description: "Please enable microphone permissions in your browser settings." });
            setHasMicPermission(false);
            return false;
        }
    }, [hasMicPermission]);


    const startRecordingLogic = () => {
        if (recognitionRef.current && !isRecording) { // Prevent multiple starts
            try {
                recognitionRef.current.start();
                setIsRecording(true);
                 console.log("Speech recognition started.");
            } catch (e: any) {
                 // Handle error if recognition is already started (should be prevented by isRecording check)
                if (e.name === 'InvalidStateError') {
                    console.warn("Recognition attempted to start while already active.");
                    // Ensure state is correct if somehow out of sync
                    setIsRecording(true);
                } else {
                    console.error("Could not start speech recognition:", e);
                    toast({ variant: "destructive", title: "Mic Error", description: "Could not start microphone." });
                    setIsRecording(false);
                }
            }
        }
    };

    const stopRecording = () => {
        if (recognitionRef.current && isRecording) { // Only stop if currently recording
            try {
                recognitionRef.current.stop();
                console.log("Speech recognition stopped.");
            } catch (e: any) {
                 if (e.name === 'InvalidStateError') {
                    console.warn("Recognition attempted to stop when not active.");
                 } else {
                    console.error("Error stopping recognition:", e);
                 }
            } finally {
                 setIsRecording(false); // Ensure state is set to false regardless of errors
            }
        } else {
             setIsRecording(false); // Ensure state is false if recognitionRef is null or not recording
        }
    };

    const handleMicClick = async () => {
        if (!recognitionRef.current) {
             toast({ variant: "destructive", title: "Not Supported", description: "Speech recognition is not supported in this browser." });
             return;
        }

        if (isRecording) {
            stopRecording();
        } else {
            let permissionGranted = hasMicPermission;
            if (permissionGranted === null) { // Check permission only if unknown
                permissionGranted = await requestMicPermission();
            }

            if (permissionGranted === true) { // Check explicit true
                startRecordingLogic();
            }
            // If permissionGranted is false or null (after failed request), do nothing (toast shown elsewhere)
        }
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value);
         if (isRecording && event.target.value !== '') {
            // Optional: Stop recording if the user starts typing manually
            // stopRecording();
        }
    };

    const handleSend = () => {
        // Check if onSendMessage function is provided before calling it
        if (onSendMessage && inputValue.trim()) {
            onSendMessage(inputValue.trim());
            setInputValue(''); // Clear input after sending
            if (isRecording) { // Stop recording if user sends manually
                stopRecording();
            }
        } else if (!onSendMessage) {
             console.warn("Send button clicked, but no onSendMessage handler provided for this page.");
             toast({ variant: "default", title: "Action Not Available", description: "Sending messages is not enabled on this page." });
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) { // Send on Enter, allow Shift+Enter for newline (though input is single line now)
            event.preventDefault(); // Prevent default form submission or newline
            handleSend();
        }
    };

    return (
        <footer className="sticky bottom-0 z-40 w-full border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container max-w-screen-2xl px-4 md:px-6 py-2 space-y-2">

                {/* Control Icons Bar (Placeholder) */}
                 {/* Only show attach button if onSendMessage is available (likely chat page) */}
                 {onSendMessage && (
                    <div className="flex items-center justify-start space-x-2 h-8">
                        <Button variant="ghost" size="icon" aria-label="Attach file">
                            <Paperclip className="h-5 w-5 text-muted-foreground" />
                        </Button>
                        {/* Add more control icons here as needed */}
                    </div>
                 )}


                {/* Input Row - Only show if onSendMessage is provided */}
                 {onSendMessage && (
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleMicClick}
                            aria-label={isRecording ? "Stop recording" : "Start recording"}
                            className={cn(
                                isRecording && "text-red-500 animate-pulse",
                                hasMicPermission === false && "opacity-50 cursor-not-allowed" // Style explicitly when denied
                            )}
                            disabled={hasMicPermission === false} // Disable if permission explicitly denied or API not supported
                        >
                            {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </Button>
                        <Input
                            type="text"
                            placeholder="Type your message..."
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            className="flex-grow"
                            aria-label="Message input"
                        />
                        <Button
                            size="icon"
                            onClick={handleSend}
                            disabled={!inputValue.trim() || !onSendMessage} // Disable if input empty or no send handler
                            aria-label="Send message"
                        >
                            <Send className="h-5 w-5" />
                        </Button>
                    </div>
                 )}

                {/* Credits and Links */}
                <div className="text-center text-xs text-muted-foreground pt-2">
                    <p>
                        Created by{' '}
                        <a
                            href="https://jayreddin.github.io"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-foreground"
                        >
                            Jamie Reddin
                        </a>{' '}
                        using{' '}
                        <a
                            href="https://puter.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-foreground"
                        >
                            Puter.com
                        </a>{' '}
                        and other{' '}
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
                                    <a
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                                    >
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
