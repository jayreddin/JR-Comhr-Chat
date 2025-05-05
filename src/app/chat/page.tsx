
"use client"; // Required for useState, useEffect, and Puter interaction

import React, { useState, useEffect, useRef } from 'react';
import { PageLayout } from '@/components/page-layout';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppState } from '@/context/app-state-context'; // Import context hook
import { toast } from '@/hooks/use-toast'; // For error notifications
import { Footer } from '@/components/footer'; // Import Footer for sending messages

// Define message structure
interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
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
  const scrollAreaRef = useRef<HTMLDivElement>(null); // Ref for the scroll area viewport

   // Function to scroll to the bottom of the chat
  const scrollToBottom = () => {
    // The actual scrollable element is usually the first child of the ScrollArea's viewport
    const viewport = scrollAreaRef.current?.firstElementChild;
    if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
    }
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Function to handle sending messages
  const handleSendMessage = async (inputText: string) => {
    if (!inputText.trim()) return;

    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: inputText.trim(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setIsLoading(true);

    // --- Puter.js AI Call ---
    if (typeof window !== 'undefined' && window.puter?.ai?.chat) {
      try {
        const aiMessageId = `ai-${Date.now()}`;
        // Add a placeholder AI message for streaming
        setMessages((prevMessages) => [...prevMessages, { id: aiMessageId, sender: 'ai', text: '...' }]);

        // Determine the correct model name format for Puter.js
        // Assume selectedModel might need prefixing for some providers
        // This mapping might need refinement based on specific provider requirements in Puter.js
        let puterModelName = selectedModel;
        // Example prefixing (adjust as needed based on puter.js docs/behavior)
        if (!puterModelName.includes('/') && (puterModelName.startsWith('gpt') || puterModelName.startsWith('o'))) {
             puterModelName = `openai/${puterModelName}`;
        } else if (!puterModelName.includes('/') && puterModelName.startsWith('claude')) {
             puterModelName = `anthropic/${puterModelName}`;
        } else if (!puterModelName.includes('/') && puterModelName.startsWith('deepseek')) {
             puterModelName = `deepseek/${puterModelName}`; // Assuming 'deepseek/' prefix
        } else if (!puterModelName.includes('/') && puterModelName.startsWith('grok')) {
             puterModelName = `x-ai/${puterModelName}`; // Assuming 'x-ai/' prefix
        } else if (!puterModelName.includes('/') && puterModelName.startsWith('mistral') || puterModelName.startsWith('pixtral') || puterModelName.startsWith('codestral')) {
             puterModelName = `mistralai/${puterModelName}`; // Assuming 'mistralai/' prefix, might vary
        }
        // Llama and Gemini models in the list already have prefixes

        console.log(`Using model for Puter: ${puterModelName}`); // Log the model name being used

        const responseStream = await window.puter.ai.chat(
          inputText.trim(),
          {
            model: puterModelName, // Use the (potentially prefixed) model name
            stream: true,
          }
        );

        let streamedText = '';
        for await (const part of responseStream) {
          // Check various possible structures for the streamed text
           let chunkText = '';
            if (part?.text) {
                chunkText = part.text; // Standard case
            } else if (part?.message?.content) {
                // Handle cases like Claude where content might be nested
                 if (Array.isArray(part.message.content) && part.message.content[0]?.text) {
                     chunkText = part.message.content[0].text;
                 } else if (typeof part.message.content === 'string') {
                    chunkText = part.message.content;
                 }
            } else if (typeof part === 'string') {
                // Handle cases where the part itself might be the string
                chunkText = part;
            }


          if (chunkText) {
            streamedText += chunkText;
            // Update the placeholder message with the streamed content
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.id === aiMessageId ? { ...msg, text: streamedText } : msg
              )
            );
             scrollToBottom(); // Scroll as new content arrives
          }
        }

        // Optional: Final check/update if the stream yielded nothing but was successful
         if (!streamedText && responseStream) { // Check if stream existed but produced no text
             setMessages((prevMessages) =>
               prevMessages.map((msg) =>
                 msg.id === aiMessageId ? { ...msg, text: "[AI response received, but no text content]" } : msg
               )
             );
         }

      } catch (error) {
        console.error("Puter AI chat error:", error);
        let errorMsg = "An unknown error occurred.";
        if (error instanceof Error) {
             errorMsg = error.message;
             // Check for specific Puter/API errors if possible
             if (error.message.includes("Model not found")) {
                 errorMsg = `Model '${selectedModel}' not found or incompatible. Please try another model.`;
             } else if (error.message.includes("quota") || error.message.includes("limit")) {
                 errorMsg = "You may have exceeded your usage limit for this model.";
             }
        } else if (typeof error === 'string') {
             errorMsg = error;
        }

        toast({
          variant: "destructive",
          title: "AI Chat Error",
          description: `Could not get response from AI: ${errorMsg}`,
        });
        // Remove the AI placeholder message on error
         setMessages((prevMessages) => prevMessages.filter(msg => msg.id !== `ai-${Date.now() - 1}`)); // Attempt to remove placeholder
         setMessages((prevMessages) => prevMessages.filter(msg => !(msg.sender === 'ai' && msg.text === '...')));


      } finally {
        setIsLoading(false);
      }
    } else {
      console.error("Puter AI chat function not available.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "AI functionality is not available. Please ensure Puter.js is loaded and you are signed in.",
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
        {/* Chat Display Area */}
        {/* Pass the ref to the ScrollArea's viewport parent */}
        <ScrollArea className="flex-grow h-full border rounded-md p-4 bg-secondary/30" viewportRef={scrollAreaRef}>
           <div className="space-y-4">
             {messages.length === 0 && !isLoading && (
               <p className="text-sm text-muted-foreground text-center">Start chatting by typing a message below.</p>
             )}
             {messages.map((message) => (
               <div
                 key={message.id}
                 className={`flex ${
                   message.sender === 'user' ? 'justify-end' : 'justify-start'
                 }`}
               >
                 <div
                   className={`p-3 rounded-lg max-w-[75%] whitespace-pre-wrap ${
                     message.sender === 'user'
                       ? 'bg-primary text-primary-foreground'
                       : 'bg-muted'
                   } shadow-md`} // Added shadow
                 >
                   <p className="text-sm">{message.text}</p>
                 </div>
               </div>
             ))}
             {/* Show loading dots only when AI is thinking *after* user sent message */}
             {isLoading && messages.length > 0 && messages[messages.length-1]?.sender === 'user' && (
                 <div className="flex justify-start">
                    <div className="bg-muted p-3 rounded-lg max-w-[75%] shadow-md">
                       <p className="text-sm animate-pulse">...</p> {/* Loading indicator */}
                    </div>
                 </div>
             )}
             {/* Show placeholder/loading only when streaming *and* the last message IS the AI message being streamed */}
              {isLoading && messages.length > 0 && messages[messages.length - 1]?.sender === 'ai' && messages[messages.length - 1]?.text === '...' && (
                 <div className="flex justify-start">
                    <div className="bg-muted p-3 rounded-lg max-w-[75%] shadow-md">
                       <p className="text-sm animate-pulse">...</p>
                    </div>
                 </div>
              )}
           </div>
         </ScrollArea>
      </div>
       {/* Footer is now part of PageLayout and receives onSendMessage */}
    </PageLayout>
  );
}
