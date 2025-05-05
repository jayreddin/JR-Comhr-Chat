
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

        const responseStream = await window.puter.ai.chat(
          inputText.trim(),
          {
            model: selectedModel, // Use the model from context
            stream: true,
          }
        );

        let streamedText = '';
        for await (const part of responseStream) {
          if (part?.text) {
            streamedText += part.text;
            // Update the placeholder message with the streamed content
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.id === aiMessageId ? { ...msg, text: streamedText } : msg
              )
            );
             scrollToBottom(); // Scroll as new content arrives
          }
        }

        // Final update after streaming finishes (optional, if needed)
        // setMessages((prevMessages) =>
        //   prevMessages.map((msg) =>
        //     msg.id === aiMessageId ? { ...msg, text: streamedText } : msg
        //   )
        // );

      } catch (error) {
        console.error("Puter AI chat error:", error);
        const errorMsg = error instanceof Error ? error.message : "An unknown error occurred.";
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
        description: "AI functionality is not available. Please ensure Puter.js is loaded.",
      });
       // Remove the user message if Puter isn't loaded
       setMessages((prevMessages) => prevMessages.filter(msg => msg.id !== userMessage.id));
      setIsLoading(false);
    }
    // --- End Puter.js AI Call ---
  };

  return (
    // Pass currentPageName="Chat" to PageLayout so AppHeader knows to show the model selector
    <PageLayout currentPageName="Chat">
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
                   }`}
                 >
                   <p className="text-sm">{message.text}</p>
                 </div>
               </div>
             ))}
             {isLoading && messages[messages.length-1]?.sender === 'user' && (
                 <div className="flex justify-start">
                    <div className="bg-muted p-3 rounded-lg max-w-[75%]">
                       <p className="text-sm animate-pulse">...</p> {/* Loading indicator */}
                    </div>
                 </div>
             )}
           </div>
         </ScrollArea>
      </div>
       {/* Replace the simple div with the actual Footer component */}
       {/* Pass the handleSendMessage function to the Footer */}
       {/* Note: Footer is now part of PageLayout, so we don't render it directly here */}
       {/* Ensure the Footer component inside PageLayout receives the onSendMessage prop correctly */}
    </PageLayout>
  );
}

// Update PageLayout to accept and pass onSendMessage to Footer
// This change needs to be made in src/components/page-layout.tsx
// And the Footer component needs to accept and use onSendMessage
// These changes are included in the respective file updates.
