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
  onSendMessage?: (message: string) => void; // Optional prop to handle sending messages
  // Add other props needed for control icons later
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
                     // Update input value, prioritizing final transcript but showing interim
                    setInputValue(prev => (finalTranscript.trim() ? prev + finalTranscript : prev.split(' ').slice(0, -1).join(' ') + ' ' + interimTranscript));
                    // If final results are received, potentially append them? Or replace? Let's append for now.
                     // This logic might need refinement based on desired UX.
                    // Using interim results directly might feel more responsive.
                    // setInputValue(prev => {
                    //      const lastWordIsInterim = prev.split(' ').pop() === interimTranscript.trim().split(' ').pop();
                    //      const base = finalTranscript.trim() ? prev + finalTranscript + ' ' : prev;
                    //      return base + interimTranscript;
                    // });
                    setInputValue(finalTranscript + interimTranscript); // Keep updating with the latest
                };

                recognitionRef.current.onerror = (event: any) => {
                    console.error('Speech recognition error:', event.error);
                    toast({ variant: "destructive", title: "Speech Recognition Error", description: event.error });
                    stopRecording(); // Stop recording on error
                };

                recognitionRef.current.onend = () => {
                    // Restart listening if it ended unexpectedly while recording is supposed to be active
                    // But only if explicitly stopped by user action (isRecording state)
                    // if (isRecording) {
                    //     console.log("Recognition ended, restarting...");
                    //     startRecordingLogic(); // Potentially restart
                    // }
                     console.log("Speech recognition ended.");
                     // Don't automatically restart here, let user control it.
                     // If we want continuous listening across pauses, handle it differently.
                     // For now, onend means stop unless user explicitly starts again.
                     // setIsRecording(false); // Mark as stopped if it ends naturally
                };

            } else {
                console.warn('Speech Recognition API not supported in this browser.');
            }
        }
    }, []); // Run only once on mount


    const requestMicPermission = useCallback(async () => {
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
    }, []);


    const startRecordingLogic = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
                setIsRecording(true);
                 console.log("Speech recognition started.");
            } catch (e: any) {
                 // Handle error if recognition is already started
                if (e.name === 'InvalidStateError') {
                    console.log("Recognition already started.");
                    // Maybe stop and restart? For now, just ensure state is correct.
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
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
                console.log("Speech recognition stopped.");
            } catch (e: any) {
                 if (e.name === 'InvalidStateError') {
                    console.log("Recognition already stopped or never started.");
                 } else {
                    console.error("Error stopping recognition:", e);
                 }
            } finally {
                 setIsRecording(false); // Ensure state is set to false regardless of errors
            }

        } else {
             setIsRecording(false); // Ensure state is false if recognitionRef is null
        }
    };

    const handleMicClick = async () => {
        if (isRecording) {
            stopRecording();
        } else {
            let permissionGranted = hasMicPermission;
            if (permissionGranted === null) { // Check permission only if unknown
                permissionGranted = await requestMicPermission();
            }

            if (permissionGranted) {
                startRecordingLogic();
            }
            // If permissionGranted is false, do nothing (toast shown in requestMicPermission)
        }
    };

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(event.target.value);
    };

    const handleSend = () => {
        if (inputValue.trim() && onSendMessage) {
            onSendMessage(inputValue.trim());
            setInputValue(''); // Clear input after sending
            if (isRecording) { // Stop recording if user sends manually
                stopRecording();
            }
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
                <div className="flex items-center justify-start space-x-2 h-8">
                    <Button variant="ghost" size="icon" aria-label="Attach file">
                        <Paperclip className="h-5 w-5 text-muted-foreground" />
                    </Button>
                    {/* Add more control icons here as needed */}
                </div>

                {/* Input Row */}
                <div className="flex items-center space-x-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleMicClick}
                        aria-label={isRecording ? "Stop recording" : "Start recording"}
                        className={cn(isRecording && "text-red-500 animate-pulse")} // Apply red color and pulse when recording
                        disabled={hasMicPermission === false} // Disable if permission explicitly denied
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
                        disabled={!inputValue.trim()} // Disable if input is empty
                        aria-label="Send message"
                    >
                        <Send className="h-5 w-5" />
                    </Button>
                </div>

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