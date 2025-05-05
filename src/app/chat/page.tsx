
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
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton for loading

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
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for the bottom of the messages list
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


   // Function to scroll to the bottom of the chat
   const scrollToBottom = () => {
     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
     // Alternative using viewport ref:
     // const viewport = scrollAreaRef.current?.firstElementChild;
     // if (viewport) {
     //     viewport.scrollTop = viewport.scrollHeight;
     // }
   };

   // Scroll to bottom whenever messages change
   useEffect(() => {
       scrollToBottom();
   }, [messages, isLoading]); // Also trigger on isLoading change for placeholder appearance


  // Placeholder functions for message actions
  const handleResend = (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    const messageToResend = messages[messageIndex];

    if (messageToResend.sender === 'user') {
        console.log(`Resending message: ${messageId}`);
        // Find the AI response immediately following this user message, if any
        const nextMessage = messages[messageIndex + 1];
        let messagesWithoutOldResponse = [...messages];
        if (nextMessage && nextMessage.sender === 'ai') {
             // Simple removal - assumes AI response is directly after.
             // Might need more robust logic if order isn't guaranteed or history exists.
             messagesWithoutOldResponse = messages.filter((_, idx) => idx !== messageIndex + 1);
        }
        setMessages(messagesWithoutOldResponse); // Update state before sending
        handleSendMessage(messageToResend.text); // Re-trigger send logic
    } else if (messageToResend.sender === 'ai') {
        // Logic to regenerate AI response
        // Find the preceding user message
        const precedingUserMessage = messages[messageIndex - 1];
        if (precedingUserMessage && precedingUserMessage.sender === 'user') {
            console.log(`Requesting regeneration for AI message: ${messageId}`);
             // Remove the AI message we are regenerating
            const messagesWithoutCurrentAi = messages.filter((_, idx) => idx !== messageIndex);
            setMessages(messagesWithoutCurrentAi);
            // Resend the user message that prompted this AI response
            handleSendMessage(precedingUserMessage.text);
        } else {
             toast({ variant: "destructive", title: "Regenerate Failed", description: "Cannot regenerate response without the preceding user message." });
        }
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

  // Function to handle starting a new chat
  const handleNewChat = () => {
    // 1. Save current messages (optional, implement saving logic if needed)
    // const sessionId = `chat-${Date.now()}`;
    // localStorage.setItem(sessionId, JSON.stringify(messages));
    // Add sessionId to a list of sessions in localStorage

    // 2. Clear current messages state
    setMessages([]);

    // 3. Reset any other relevant state (e.g., context, input field if not already cleared)
    // Context reset might be needed if chat history affects AI responses
  };


  // Function to handle sending messages
  const handleSendMessage = async (inputText: string) => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      name: username, // Use the fetched username
      text: inputText.trim(),
      timestamp: Date.now(),
    };
    // Add user message to the beginning for newest-first display
    setMessages((prevMessages) => [userMessage, ...prevMessages]);
    setIsLoading(true);
    // No need to scrollToBottom immediately if newest is at top

    let aiMessageId = ''; // Keep track of the AI message ID for this request

    // --- Puter.js AI Call ---
    if (typeof window !== 'undefined' && window.puter?.ai?.chat) {
      try {
        aiMessageId = `ai-${Date.now()}`; // Assign ID here
        // Add a placeholder AI message for streaming at the beginning
        const placeholderAiMessage: Message = {
            id: aiMessageId,
            sender: 'ai',
            name: selectedModel.split('/').pop()?.replace('openrouter:', '') || selectedModel, // Get model name, remove prefix for display
            text: '...', // Placeholder text
            timestamp: Date.now()
        };
        // Add placeholder to the beginning
        setMessages((prevMessages) => [placeholderAiMessage, ...prevMessages]);
        // No scroll needed if newest is at top


        puterModelName = selectedModel; // Assign here

         // Standardize model names for Puter.js
         if (puterModelName.startsWith('openrouter:')) {
            // Keep the openrouter: prefix as is for the API call
         } else if (puterModelName.startsWith('gpt') || puterModelName.startsWith('o')) {
             // Puter often recognizes these directly, but let's be explicit for robustness
             // Puter API needs openai/ prefix for OpenAI models if not using OpenRouter
             puterModelName = `openai/${puterModelName}`;
         } else if (puterModelName.startsWith('claude')) {
             puterModelName = `anthropic/${puterModelName}`;
         } else if (puterModelName.startsWith('deepseek')) {
             puterModelName = `deepseek/${puterModelName}`;
         } else if (puterModelName.startsWith('grok')) {
             // Puter uses 'x-ai/' prefix for Grok as per docs
             puterModelName = `x-ai/${puterModelName}`;
         } else if (puterModelName.startsWith('mistral') || puterModelName.startsWith('pixtral') || puterModelName.startsWith('codestral')) {
             // Explicitly add Mistral prefix for clarity, though Puter might handle it
             puterModelName = `mistralai/${puterModelName}`;
         } else if (puterModelName.startsWith('google/')) {
            // Keep google prefix
         } else if (puterModelName.startsWith('meta-llama/')) {
             // Keep meta-llama prefix
         } else {
            // If no recognized prefix, assume it needs 'openrouter:' (safer than sending bare)
            // This case shouldn't happen if context provides the correct name.
            console.warn(`Model name ${selectedModel} lacks a recognized prefix. Assuming OpenRouter.`);
            puterModelName = `openrouter:${puterModelName}`;
         }

        console.log(`Using model for Puter API call: ${puterModelName}`);

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
            if (typeof part === 'string') { // Simple string chunk (less common but possible)
                chunkText = part;
            } else if (part?.text) { // Standard or simple text part (OpenAI, Gemini, some OR)
                chunkText = part.text;
            } else if (part?.message?.content) { // Nested structure (like Claude, Deepseek, Grok, some OR)
                 if (Array.isArray(part.message.content) && part.message.content[0]?.text) {
                     chunkText = part.message.content[0].text; // Claude array structure
                 } else if (typeof part.message.content === 'string') {
                    chunkText = part.message.content; // Simple string content (e.g., Grok, Deepseek, some OR)
                 }
            } else if (part?.choices?.[0]?.delta?.content) { // Common stream structure (OpenAI, some OR)
                 chunkText = part.choices[0].delta.content;
            } else if (part?.message?.output) { // Potential structure for some models like Gemini via OpenRouter?
                 if (typeof part.message.output === 'string') {
                    chunkText = part.message.output;
                 }
            }

          if (chunkText) {
            streamedText += chunkText;
            // Update the placeholder message with the streamed content
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                // Find the specific AI message by ID and update its text
                msg.id === aiMessageId ? { ...msg, text: streamedText, timestamp: Date.now() } : msg
              )
            );
             // No scroll needed if newest is at top
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

        // Remove the specific placeholder AI message added for this request on error
        if (aiMessageId) {
           setMessages((prevMessages) => prevMessages.filter(msg => msg.id !== aiMessageId));
        }

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
       // Remove the user message if Puter isn't loaded (it's at the beginning)
       setMessages((prevMessages) => prevMessages.filter(msg => msg.id !== userMessage.id));
      setIsLoading(false);
    }
    // --- End Puter.js AI Call ---
  };

  return (
    // Pass currentPageName="Chat", onSendMessage handler, and onNewChat handler to PageLayout
    <PageLayout currentPageName="Chat" onSendMessage={handleSendMessage} onNewChat={handleNewChat}>
      {/* Main container for the chat display */}
      <div className="flex flex-col h-full flex-grow overflow-hidden">
        {/* Chat Display Area - Reverse order */}
        <ScrollArea className="flex-grow h-full border rounded-md p-4 bg-secondary/30" viewportRef={scrollAreaRef}>
           {/* Use flex-col-reverse for newest at top */}
           <div className="flex flex-col-reverse space-y-4 space-y-reverse">
                {/* Div to mark the end of messages for scrolling */}
                <div ref={messagesEndRef} />

               {/* Loading indicator for initial AI response (after user message) - Now appears at top */}
               {/* {isLoading && messages.length > 0 && messages[0].sender === 'user' && (
                 <div className="flex justify-start p-2">
                    <div className="bg-muted p-3 rounded-lg max-w-[75%] shadow-md">
                        <Skeleton className="h-4 w-16" />
                    </div>
                 </div>
               )} */}

             {/* Map through messages (reverse order due to flex-col-reverse) */}
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
                         // Use Skeleton for loading indicator within the bubble
                         <div className="space-y-2">
                            <Skeleton className="h-4 w-[80%]" />
                            <Skeleton className="h-4 w-[60%]" />
                         </div>
                    ) : (
                         <p className="text-sm">{message.text}</p>
                    )}

                    </div>
                    {/* Action Buttons - Appear below the bubble */}
                    <div className="flex space-x-1 mt-1 opacity-70 hover:opacity-100 transition-opacity">
                       <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleResend(message.id)} aria-label={message.sender === 'user' ? "Resend" : "Regenerate"}>
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

             {/* Placeholder when no messages */}
             {messages.length === 0 && !isLoading && (
               <p className="text-sm text-muted-foreground text-center p-4">Start chatting by typing a message below.</p>
             )}

           </div>
         </ScrollArea>
      </div>
       {/* Footer is part of PageLayout */}
    </PageLayout>
  );
}
