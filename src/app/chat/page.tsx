
"use client"; // Required for useState, useEffect, and Puter interaction

import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns'; // For timestamp formatting
import { PageLayout } from '@/components/page-layout';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useAppState } from '@/context/app-state-context'; // Import context hook
import { toast } from '@/hooks/use-toast'; // For error notifications
import { Footer } from '@/components/footer'; // Import Footer for sending messages
import { Copy, Trash2, RefreshCw, Volume2 } from 'lucide-react'; // Icons for message actions
import { cn } from '@/lib/utils'; // Utility for class names

// Define message structure with timestamp and potentially name
interface Message {
  id: string;
  sender: 'user' | 'ai';
  name: string; // User name or AI model name
  text: string;
  timestamp: number; // Store timestamp as number (Date.now())
}

// Define Puter types locally if needed
declare global {
  interface Window {
    puter: any;
  }
}

export default function ChatPage() {
  const { selectedModel } = useAppState(); // Get selected model from context
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState<string>('User'); // Placeholder username
  const scrollAreaRef = useRef<HTMLDivElement>(null); // Ref for the scroll area viewport
  let puterModelName: string = ''; // Declare variable outside try block

  // Get username from Puter auth when component mounts
  useEffect(() => {
    const fetchUser = async () => {
      if (typeof window !== 'undefined' && window.puter?.auth?.isSignedIn && await window.puter.auth.isSignedIn()) {
        try {
          const user = await window.puter.auth.getUser();
          setUsername(user.username || 'User');
        } catch (error) {
          console.error("Error fetching Puter user:", error);
        }
      }
    };
    fetchUser();
  }, []);


   // Function to scroll to the bottom (or top if reversed) of the chat
   // Since we are reversing, we might not need explicit scrolling on new message,
   // as new messages appear at the top. However, keep it for potential manual scroll needs.
   const scrollToBottom = () => {
    // Adjust if needed based on layout changes
    const viewport = scrollAreaRef.current?.firstElementChild;
    if (viewport) {
        // If reversed, scroll to top might be more relevant, but new items appear there anyway.
        // Keep scrolling to bottom for consistency or remove if layout handles it.
        viewport.scrollTop = viewport.scrollHeight;
    }
  };

  // Placeholder functions for message actions
  const handleResend = (messageId: string) => {
    const messageToResend = messages.find(msg => msg.id === messageId);
    if (messageToResend && messageToResend.sender === 'user') {
        console.log(`Resending message: ${messageId}`);
        // Remove the original AI response if it exists immediately after
        // This needs careful implementation based on message order and IDs
        handleSendMessage(messageToResend.text); // Re-trigger send logic
    } else if (messageToResend && messageToResend.sender === 'ai') {
        // Logic to regenerate AI response - might need the preceding user message
        console.log(`Requesting regeneration for AI message: ${messageId}`);
        toast({ title: "Regenerate", description: "AI regeneration not yet implemented." });
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast({ title: "Copied!", description: "Message copied to clipboard." }))
      .catch(err => toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy message." }));
  };

  const handleDelete = (messageId: string) => {
    console.log(`Deleting message: ${messageId}`);
    setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
    toast({ title: "Deleted", description: "Message removed from view." });
  };

  const handleSpeak = (text: string) => {
    console.log(`Speaking message: ${text}`);
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        // Optional: Configure voice, rate, pitch here
        window.speechSynthesis.speak(utterance);
    } else {
        toast({ variant: "destructive", title: "Not Supported", description: "Text-to-speech is not supported in your browser." });
    }
  };


  // Function to handle sending messages
  const handleSendMessage = async (inputText: string) => {
    if (!inputText.trim()) return;

    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      name: username, // Use the fetched username
      text: inputText.trim(),
      timestamp: Date.now(),
    };
    // Add to the beginning for newest-first display
    setMessages((prevMessages) => [userMessage, ...prevMessages]);
    setIsLoading(true);

    // --- Puter.js AI Call ---
    if (typeof window !== 'undefined' && window.puter?.ai?.chat) {
      try {
        const aiMessageId = `ai-${Date.now()}`;
        // Add a placeholder AI message for streaming
        const placeholderAiMessage: Message = {
            id: aiMessageId,
            sender: 'ai',
            name: selectedModel.split('/').pop() || selectedModel, // Get model name
            text: '...',
            timestamp: Date.now()
        };
        setMessages((prevMessages) => [placeholderAiMessage, ...prevMessages]);


        puterModelName = selectedModel; // Assign here

         // Standardize model names for Puter.js
         if (puterModelName.startsWith('openrouter:')) {
            // Keep the openrouter: prefix as is
         } else if (puterModelName.startsWith('gpt') || puterModelName.startsWith('o')) {
             puterModelName = `openai/${puterModelName}`;
         } else if (puterModelName.startsWith('claude')) {
             puterModelName = `anthropic/${puterModelName}`;
         } else if (puterModelName.startsWith('deepseek')) {
             puterModelName = `deepseek/${puterModelName}`;
         } else if (puterModelName.startsWith('grok')) {
             // Puter uses 'x-ai/' prefix for Grok as per docs
             puterModelName = `x-ai/${puterModelName}`;
         } else if (puterModelName.startsWith('mistral') || puterModelName.startsWith('pixtral') || puterModelName.startsWith('codestral')) {
             // Puter doesn't seem to require a prefix for these based on docs
             // Keep them as is unless errors occur - prepend if needed
             // puterModelName = `mistralai/${puterModelName}`; // Example if needed
         } else if (puterModelName.startsWith('google/')) {
            // Keep google prefix
         } else if (puterModelName.startsWith('meta-llama/')) {
             // Keep meta-llama prefix
         } else {
            // If none of the known prefixes match, assume it might be an OpenRouter model
            // or another provider Puter recognizes directly or via OpenRouter fallback.
            // Check if it was originally an OpenRouter model that lost its prefix somehow?
            // This case shouldn't happen if AppState context provides the full name.
            // If it's not an OR model and has no prefix, try prepending 'openrouter:' as a guess.
            // This might be fragile. A safer approach is ensuring models always have correct context.
            console.warn(`Model name ${selectedModel} lacks a recognized prefix. Assuming OpenRouter.`);
            puterModelName = `openrouter:${puterModelName}`;
            // Alternatively, just send as-is:
            // console.warn(`Model name ${selectedModel} lacks a recognized prefix. Sending as-is.`);
         }

        console.log(`Using model for Puter: ${puterModelName}`);

        const responseStream = await window.puter.ai.chat(
          inputText.trim(),
          {
            model: puterModelName,
            stream: true,
          }
        );

        let streamedText = '';
        for await (const part of responseStream) {
           let chunkText = '';
            // Refined logic to extract text from various stream formats
            if (part?.text) { // Standard or simple text part (OpenAI, Gemini)
                chunkText = part.text;
            } else if (part?.message?.content) { // Nested structure (like Claude, Deepseek, Grok, OpenRouter)
                 if (Array.isArray(part.message.content) && part.message.content[0]?.text) {
                     chunkText = part.message.content[0].text; // Claude array structure
                 } else if (typeof part.message.content === 'string') {
                    chunkText = part.message.content; // Simple string content (e.g., Grok, Deepseek, some OpenRouter)
                 }
            } else if (typeof part === 'string') { // The part itself is the text chunk (less common now)
                chunkText = part;
            } else if (part?.choices?.[0]?.delta?.content) { // OpenRouter specific stream structure sometimes
                 chunkText = part.choices[0].delta.content;
            }

          if (chunkText) {
            streamedText += chunkText;
            // Update the placeholder message with the streamed content
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.id === aiMessageId ? { ...msg, text: streamedText, timestamp: Date.now() } : msg // Update timestamp on stream update
              )
            );
            // scrollToBottom(); // Scrolling might be less necessary with reverse order
          }
        }

        // Final update if stream ended successfully but yielded no text
         if (!streamedText && responseStream) {
             setMessages((prevMessages) =>
               prevMessages.map((msg) =>
                 msg.id === aiMessageId ? { ...msg, text: "[AI responded with no text]", timestamp: Date.now() } : msg
               )
             );
         }

      } catch (error) {
        console.error("Puter AI chat error:", error);
        let errorMsg = "An unknown error occurred.";
        if (error instanceof Error) {
             errorMsg = error.message;
             // Use the puterModelName variable defined outside the try block
             if (error.message.includes("Model not found") || error.message.includes("404")) {
                 errorMsg = `Model '${puterModelName}' not found or incompatible with Puter.js. Please check the selected model name.`;
             } else if (error.message.includes("quota") || error.message.includes("limit")) {
                 errorMsg = "You may have exceeded your usage limit for this model.";
             } else if (error.message.includes("auth") || error.message.includes("401")) {
                 errorMsg = "Authentication failed or is required. Please sign in.";
             }
        } else if (typeof error === 'string') {
             errorMsg = error;
        }

        toast({
          variant: "destructive",
          title: "AI Chat Error",
          description: `Could not get response from AI: ${errorMsg}`,
        });

        // Attempt to find and remove the AI placeholder message on error
        // Finding the exact placeholder ID can be tricky if time passes.
        // We might need a more robust way, like filtering by text '...' and sender 'ai'.
        setMessages((prevMessages) => prevMessages.filter(msg => !(msg.sender === 'ai' && msg.text === '...')));

      } finally {
        setIsLoading(false);
      }
    } else {
      console.error("Puter AI chat function not available.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "AI functionality is not available. Ensure Puter.js is loaded and you are signed in.",
      });
       // Remove the user message if Puter isn't loaded
       setMessages((prevMessages) => prevMessages.filter(msg => msg.id !== userMessage.id));
      setIsLoading(false);
    }
    // --- End Puter.js AI Call ---
  };

  return (
    // Pass currentPageName="Chat" and onSendMessage handler to PageLayout
    <PageLayout currentPageName="Chat" onSendMessage={handleSendMessage}>
      {/* Main container for the chat display */}
      <div className="flex flex-col h-full flex-grow overflow-hidden">
        {/* Chat Display Area - Reversed order */}
        <ScrollArea className="flex-grow h-full border rounded-md p-4 bg-secondary/30" viewportRef={scrollAreaRef}>
           {/* Use flex-col-reverse on the container inside ScrollArea to show newest first */}
           <div className="flex flex-col-reverse space-y-4 space-y-reverse">
             {/* Placeholder when no messages */}
             {messages.length === 0 && !isLoading && (
               <p className="text-sm text-muted-foreground text-center p-4">Start chatting by typing a message below.</p>
             )}

             {/* Loading indicator at the top (effectively bottom when reversed) if waiting for first AI response */}
              {isLoading && messages.length === 1 && messages[0].sender === 'user' && (
                 <div className="flex justify-start p-2">
                    <div className="bg-muted p-3 rounded-lg max-w-[75%] shadow-md">
                       <p className="text-sm animate-pulse">...</p>
                    </div>
                 </div>
              )}
              {/* Loading indicator when streaming the very first message */}
               {isLoading && messages.length === 1 && messages[0].sender === 'ai' && messages[0].text === '...' && (
                 <div className="flex justify-start p-2">
                    <div className="bg-muted p-3 rounded-lg max-w-[75%] shadow-md">
                       <p className="text-sm animate-pulse">...</p>
                    </div>
                 </div>
               )}


             {/* Map through messages (already reversed by CSS) */}
             {messages.map((message, index) => (
               <div key={message.id} className="p-2">
                 <div
                    className={`flex flex-col ${
                    message.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                 >
                    {/* Message Bubble */}
                    <div
                    className={`p-3 rounded-lg max-w-[75%] whitespace-pre-wrap ${
                        message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    } shadow-md`} // Added shadow
                    >
                    {/* Name and Timestamp */}
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium opacity-80">{message.name}</span>
                        <span className="text-xs opacity-70">{format(message.timestamp, 'HH:mm')}</span>
                    </div>
                    {/* Message Text */}
                    {/* Handle loading state for AI messages */}
                    {(message.sender === 'ai' && message.text === '...' && isLoading) ? (
                         <p className="text-sm animate-pulse">...</p>
                    ) : (
                         <p className="text-sm">{message.text}</p>
                    )}

                    </div>
                    {/* Action Buttons - Appear below the bubble */}
                    <div className="flex space-x-1 mt-1 opacity-70 hover:opacity-100 transition-opacity">
                       <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleResend(message.id)} aria-label="Resend/Regenerate">
                           <RefreshCw className="h-3 w-3" />
                       </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(message.text)} aria-label="Copy">
                            <Copy className="h-3 w-3" />
                        </Button>
                         <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSpeak(message.text)} aria-label="Speak">
                           <Volume2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/80" onClick={() => handleDelete(message.id)} aria-label="Delete">
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                 </div>
               </div>
             ))}


           </div>
         </ScrollArea>
      </div>
       {/* Footer is part of PageLayout */}
    </PageLayout>
  );
}
