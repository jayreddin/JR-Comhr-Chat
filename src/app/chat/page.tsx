
"use client"; // Required for useState, useEffect, and Puter interaction

import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns'; // For timestamp formatting
import Image from 'next/image'; // Import next/image
import { PageLayout } from '@/components/page-layout';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useAppState } from '@/context/app-state-context'; // Import context hook
import { toast } from '@/hooks/use-toast'; // For error notifications
import { Footer } from '@/components/footer'; // Import Footer for sending messages
import { Copy, Trash2, RefreshCw, Volume2, File as FileIcon } from 'lucide-react'; // Icons for message actions
import { cn } from '@/lib/utils'; // Utility for class names
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton for loading

// Define message structure with timestamp and potentially name
// Add optional fileInfo for attached files
interface Message {
  id: string;
  sender: 'user' | 'ai';
  name: string; // User name or AI model name
  text: string;
  timestamp: number; // Store timestamp as number (Date.now())
  fileInfo?: { // Optional information about an attached file
      name: string;
      type: string; // e.g., 'image/png'
      previewUrl?: string; // Data URI for image preview
  };
}

// Define Puter types locally if needed
declare global {
  interface Window {
    puter: any;
  }
}

// Define structure for saved chat sessions
interface SavedChatSession {
    id: string;
    name: string;
    timestamp: number;
    messages: Message[];
}

// Define structure for the list of sessions in localStorage
interface ChatSessionInfo {
    id: string;
    name: string;
    timestamp: number;
}


export default function ChatPage() {
  const { selectedModel, enabledModels } = useAppState(); // Get selected model and enabled models from context
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

  // Load the most recent chat session on initial mount, or start empty
  useEffect(() => {
     if (typeof window !== 'undefined') {
       const sessionListJSON = localStorage.getItem('chatSessionList');
       if (sessionListJSON) {
         try {
           const sessionList: ChatSessionInfo[] = JSON.parse(sessionListJSON);
           if (sessionList.length > 0) {
             // Sort by timestamp descending to get the most recent
             sessionList.sort((a, b) => b.timestamp - a.timestamp);
             const mostRecentSessionId = sessionList[0].id;
             handleRestoreChatSession(mostRecentSessionId, false); // Load without toast
           }
         } catch (error) {
           console.error("Error loading chat session list:", error);
           localStorage.removeItem('chatSessionList'); // Clear corrupted list
         }
       }
     }
   }, []); // Empty dependency array ensures this runs only on mount


   // Function to scroll to the bottom of the chat
   const scrollToBottom = () => {
     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
   };

   // Scroll to bottom whenever messages change
   useEffect(() => {
       // Scroll to top (since it's reversed) when new messages arrive or loading starts/stops
       if (scrollAreaRef.current) {
            // Use scrollTop = 0 for flex-col-reverse to go to the "top" (which is visually the bottom/newest)
            scrollAreaRef.current.scrollTop = 0;
       }
   }, [messages, isLoading]); // Trigger on message/loading changes


  // Placeholder functions for message actions
  const handleResend = (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    const messageToResend = messages[messageIndex];

    if (messageToResend.sender === 'user') {
        console.log(`Resending message: ${messageId}`);
        // Find the AI response immediately following this user message, if any
        // Since messages are reversed, the AI response is *before* the user message
        const previousMessage = messages[messageIndex - 1];
        let messagesWithoutOldResponse = [...messages];
        if (previousMessage && previousMessage.sender === 'ai') {
             // Simple removal - assumes AI response is directly before.
             messagesWithoutOldResponse = messages.filter((_, idx) => idx !== messageIndex - 1);
        }
        setMessages(messagesWithoutOldResponse); // Update state before sending
        // Re-trigger send logic - Check if there was a file attached originally
        // For simplicity now, we won't resend the file automatically. Need File object access again.
        handleSendMessage(messageToResend.text);
    } else if (messageToResend.sender === 'ai') {
        // Logic to regenerate AI response
        // Find the succeeding user message (which is chronologically *after* the AI message,
        // but appears *after* the AI message in the reversed array)
        const succeedingUserMessage = messages[messageIndex + 1];
        if (succeedingUserMessage && succeedingUserMessage.sender === 'user') {
            console.log(`Requesting regeneration for AI message: ${messageId}`);
             // Remove the AI message we are regenerating
            const messagesWithoutCurrentAi = messages.filter((_, idx) => idx !== messageIndex);
            setMessages(messagesWithoutCurrentAi);
            // Resend the user message that prompted this AI response
            // Again, file handling on resend needs more logic if the original user message had a file
            handleSendMessage(succeedingUserMessage.text);
        } else {
             // If it's the very first message (AI greeting maybe?) or no user message follows
             // This logic might need adjustment based on desired behavior for regenerating greetings etc.
             toast({ variant: "destructive", title: "Regenerate Failed", description: "Cannot regenerate response without the corresponding user message." });
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
    // Note: This only deletes from the current view, not from saved history yet.
    // To make deletion permanent, update the saved session in localStorage as well.
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
    if (typeof window === 'undefined') return;

    // 1. Save current messages (if any)
    if (messages.length > 0) {
        const sessionId = `chat-${Date.now()}`;
        // Create a preview name (e.g., first few words of the first user message or generic name)
        const firstUserMessage = [...messages].reverse().find(msg => msg.sender === 'user'); // Find chronological first user message
        const previewName = firstUserMessage
            ? `${firstUserMessage.text.substring(0, 30)}...`
            : `Chat ${format(Date.now(), 'yyyy-MM-dd HH:mm')}`;

        const sessionData: SavedChatSession = {
            id: sessionId,
            name: previewName,
            timestamp: Date.now(),
            // Ensure message previews (Data URIs) are saved if needed, or remove them to save space
            messages: messages.map(msg => ({
                ...msg,
                // Optionally remove large previewUrl before saving to localStorage
                // fileInfo: msg.fileInfo ? { ...msg.fileInfo, previewUrl: undefined } : undefined
            }))
        };

        try {
            // Save the full session data
            localStorage.setItem(sessionId, JSON.stringify(sessionData));

            // Update the session list
            const sessionListJSON = localStorage.getItem('chatSessionList');
            let sessionList: ChatSessionInfo[] = [];
            if (sessionListJSON) {
                try {
                    sessionList = JSON.parse(sessionListJSON);
                } catch (e) {
                    console.error("Error parsing chat session list, resetting.", e);
                    sessionList = []; // Reset if corrupted
                }
            }
            // Add new session info to the list (or update if ID somehow exists?)
             const existingIndex = sessionList.findIndex(s => s.id === sessionId);
             const newSessionInfo: ChatSessionInfo = { id: sessionId, name: previewName, timestamp: sessionData.timestamp };
             if (existingIndex > -1) {
                 sessionList[existingIndex] = newSessionInfo; // Update existing (unlikely)
             } else {
                 sessionList.push(newSessionInfo);
             }
             // Optional: Limit history size
             // sessionList.sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
             // sessionList = sessionList.slice(0, 50); // Keep only latest 50 sessions

             localStorage.setItem('chatSessionList', JSON.stringify(sessionList));

            toast({ title: "Chat Saved", description: `Session "${previewName}" saved.` });

        } catch (error) {
            console.error("Error saving chat session:", error);
            toast({ variant: "destructive", title: "Save Error", description: "Could not save the previous chat session." });
        }
    } else {
         // Don't save an empty chat
         console.log("No messages to save, starting new chat.");
    }

    // 2. Clear current messages state
    setMessages([]);

    // 3. Optional: Reset any other relevant state (e.g., input field is handled by Footer)
  };

  // Function to handle restoring a chat session
  const handleRestoreChatSession = (sessionId: string, showToast: boolean = true) => {
      if (typeof window === 'undefined') return;
      console.log(`Restoring chat session: ${sessionId}`);
      try {
          const sessionDataJSON = localStorage.getItem(sessionId);
          if (sessionDataJSON) {
              const sessionData: SavedChatSession = JSON.parse(sessionDataJSON);
              // Load messages. If previews were removed during save, they won't be present.
              setMessages(sessionData.messages);
              if (showToast) {
                 toast({ title: "Chat Restored", description: `Loaded session "${sessionData.name}".` });
              }
          } else {
               if (showToast) {
                  toast({ variant: "destructive", title: "Restore Error", description: "Could not find saved session data." });
               }
          }
      } catch (error) {
          console.error("Error restoring chat session:", error);
          if (showToast) {
             toast({ variant: "destructive", title: "Restore Error", description: "Could not load the chat session." });
          }
      }
  };


  // Function to convert File to Data URI
  const fileToDataUri = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
              if (typeof reader.result === 'string') {
                  resolve(reader.result);
              } else {
                  reject(new Error('Failed to read file as Data URI'));
              }
          };
          reader.onerror = (error) => {
              reject(error);
          };
          reader.readAsDataURL(file);
      });
  };


  // Function to handle sending messages (now accepts optional file)
  const handleSendMessage = async (inputText: string, file?: File) => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput && !file) return; // Need either text or a file

    let fileDataUri: string | undefined = undefined;
    let fileInfoForMessage: Message['fileInfo'] = undefined;

    // Handle file processing
    if (file) {
        try {
            fileDataUri = await fileToDataUri(file);
            fileInfoForMessage = {
                name: file.name,
                type: file.type,
                previewUrl: file.type.startsWith('image/') ? fileDataUri : undefined // Only store preview for images
            };
        } catch (error) {
            console.error("Error converting file to Data URI:", error);
            toast({ variant: "destructive", title: "File Error", description: "Could not process the attached file." });
            return; // Stop sending if file processing fails
        }
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      name: username, // Use the fetched username
      text: trimmedInput,
      timestamp: Date.now(),
      fileInfo: fileInfoForMessage, // Add file info to the message
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
            // Get model name, remove prefix for display
            name: selectedModel.startsWith('openrouter:')
                ? selectedModel.substring('openrouter:'.length).split('/').pop() || selectedModel
                : selectedModel.split('/').pop() || selectedModel,
            text: '...', // Placeholder text
            timestamp: Date.now()
        };
        // Add placeholder to the beginning
        setMessages((prevMessages) => [placeholderAiMessage, ...prevMessages]);
        // No scroll needed if newest is at top


        puterModelName = selectedModel; // Assign here

        console.log(`Using model for Puter API call: ${puterModelName}`);

         // Prepare arguments for puter.ai.chat
         const chatArgs: any[] = [trimmedInput];
         const chatOptions: { model: string; stream: boolean; image?: string } = {
             model: puterModelName,
             stream: true,
         };

         // Add image data URI if available and model supports vision
         // Basic check: Assume models containing 'vision' or 'gpt-4o' support images
         // More robust check needed for specific model capabilities
         const modelSupportsVision = puterModelName.includes('vision') || puterModelName.includes('gpt-4o') || puterModelName.includes('claude-3') || puterModelName.includes('gemini'); // Add other vision models

         if (fileDataUri && fileInfoForMessage?.type.startsWith('image/') && modelSupportsVision) {
             chatOptions.image = fileDataUri;
             console.log("Sending image to vision model.");
         } else if (fileDataUri && !modelSupportsVision) {
             console.warn("File attached, but selected model may not support vision.");
             // Optionally, don't send the image or show a warning
             // For now, we proceed without the image if model doesn't support it
             toast({ title: "Warning", description: "File attached, but the selected model might not support image input." });
         } else if (fileDataUri && !fileInfoForMessage?.type.startsWith('image/')) {
              console.warn("Attached file is not an image. It will not be sent to the AI.");
              toast({ title: "Info", description: "Only image files can be sent to the AI. The attached file was ignored." });
              // Clear file info from the user message visually? Or leave it? Leaving it for now.
         }

         chatArgs.push(chatOptions);


        const responseStream = await window.puter.ai.chat(...chatArgs);

        let streamedText = '';
        for await (const part of responseStream) {
           let chunkText = '';
            // Refined logic to extract text from various stream formats
            if (typeof part === 'string') { // Simple string chunk (might happen for some models/errors)
                chunkText = part;
            } else if (part?.text) { // Standard text part (OpenAI, Gemini, some OR, Mistral)
                chunkText = part.text;
            // --- Start: Updated Logic for Nested Structures ---
            } else if (part?.message?.content) { // Common nested structure (Claude, Deepseek, Grok, Llama, some OR)
                // Handle cases where content is an array (like Claude)
                 if (Array.isArray(part.message.content)) {
                     // Check if the first element has text
                     if (part.message.content[0]?.type === 'text' && part.message.content[0]?.text) {
                         chunkText = part.message.content[0].text;
                     }
                 }
                 // Handle cases where content is a simple string (like Grok, Deepseek, Llama, maybe some OR)
                 else if (typeof part.message.content === 'string') {
                    chunkText = part.message.content;
                 }
             // --- End: Updated Logic for Nested Structures ---
            } else if (part?.choices?.[0]?.delta?.content) { // Common stream structure (OpenAI, some OR)
                 chunkText = part.choices[0].delta.content;
            } else if (part?.error) { // Handle explicit errors in stream
                 console.error("Error chunk in stream:", part.error);
                 chunkText = `[Error: ${part.error.message || part.error}]`;
                 // Stop processing further chunks for this message on error
                 streamedText += chunkText; // Add error to text
                 setMessages((prevMessages) =>
                   prevMessages.map((msg) =>
                     msg.id === aiMessageId ? { ...msg, text: streamedText, timestamp: Date.now() } : msg
                   )
                 );
                 throw new Error(part.error.message || part.error); // Propagate error
            } else {
                // Log unexpected chunk format for debugging
                console.warn("Unexpected stream chunk format:", part);
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
        // Log the full error object for better diagnostics
        console.error("Puter AI chat error:", JSON.stringify(error, null, 2)); // Log the full error object
        let errorMsg = "An unknown error occurred.";
        if (error instanceof Error) {
             errorMsg = error.message;
             // Use the puterModelName variable defined outside the try block
             if (error.message.includes("Model not found") || error.message.includes("404")) {
                 errorMsg = `Model '${puterModelName}' not found or incompatible with Puter.js. Check settings.`;
             } else if (error.message.includes("quota") || error.message.includes("limit")) {
                 errorMsg = "Usage limit likely exceeded for this model.";
             } else if (error.message.includes("auth") || error.message.includes("401")) {
                 errorMsg = "Authentication failed or required. Sign in.";
             } else if (error.message.includes("Failed to fetch")) {
                 errorMsg = "Network error connecting to AI service. Please check your connection.";
             } else if (error.message.includes("Input validation error") && error.message.includes("image")) {
                 errorMsg = `Selected model '${puterModelName}' does not support image input.`;
             }
        } else if (typeof error === 'string') {
             errorMsg = error;
        } else if (typeof error === 'object' && error !== null && 'message' in error) {
             // Try to extract message from generic object error
             errorMsg = (error as { message: string }).message || JSON.stringify(error);
        } else {
             // Fallback for completely unknown error types
             errorMsg = `An unexpected error occurred: ${JSON.stringify(error)}`;
        }


        // Update the placeholder message with the error or remove it
        setMessages((prevMessages) =>
             prevMessages.map((msg) =>
               msg.id === aiMessageId ? { ...msg, text: `[Error: ${errorMsg}]`, timestamp: Date.now() } : msg
             )
         );

        toast({
          variant: "destructive",
          title: "AI Chat Error",
          description: `Could not get response: ${errorMsg}`,
        });

      } finally {
        setIsLoading(false);
      }
    } else {
      console.error("Puter AI chat function not available.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "AI functionality not available. Ensure Puter.js is loaded.",
      });
       // Remove the user message if Puter isn't loaded (it's at the beginning)
       setMessages((prevMessages) => prevMessages.filter(msg => msg.id !== userMessage.id));
      setIsLoading(false);
    }
    // --- End Puter.js AI Call ---
  };

  return (
    // Pass restore function to PageLayout -> Footer
    <PageLayout
        currentPageName="Chat"
        onSendMessage={handleSendMessage} // Pass handleSendMessage which now accepts file
        onNewChat={handleNewChat}
        onRestoreChat={handleRestoreChatSession} // Pass restore function
    >
      {/* Main container for the chat display */}
      <div className="flex flex-col h-full flex-grow overflow-hidden">
        {/* Chat Display Area - Reverse order */}
        <ScrollArea className="flex-grow h-full border rounded-md p-4 bg-secondary/30" viewportRef={scrollAreaRef}>
           {/* Use flex-col-reverse for newest at top */}
           <div className="flex flex-col-reverse space-y-4 space-y-reverse">
                {/* Div to mark the end of messages for scrolling */}
                <div ref={messagesEndRef} />

             {/* Map through messages (reverse order due to flex-col-reverse) */}
             {messages.map((message, index) => (
               <div key={message.id} className="p-2">
                 <div
                    className={`flex flex-col ${
                    message.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                 >
                    {/* Name and Timestamp */}
                    <div className={`flex w-full ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-1 px-1`}>
                        <span className="text-xs font-medium opacity-80 mr-2">{message.name}</span>
                        <span className="text-xs opacity-70">{format(message.timestamp, 'HH:mm')}</span>
                    </div>

                    {/* Message Bubble */}
                    <div
                    className={`p-3 rounded-lg max-w-[75%] whitespace-pre-wrap ${
                        message.sender === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    } shadow-md`} // Added shadow
                    >

                     {/* Render Image Preview if available */}
                     {message.fileInfo?.type.startsWith('image/') && message.fileInfo.previewUrl && (
                         <div className="mb-2 border rounded overflow-hidden max-w-xs">
                            {/* Use next/image for optimization if possible, otherwise standard img */}
                             {/* <Image src={message.fileInfo.previewUrl} alt={message.fileInfo.name} width={150} height={150} objectFit="contain" /> */}
                             <img src={message.fileInfo.previewUrl} alt={message.fileInfo.name} className="max-h-40 max-w-full object-contain" />
                         </div>
                     )}
                     {/* Render generic file icon if non-image file was attached */}
                     {message.fileInfo && !message.fileInfo.type.startsWith('image/') && (
                          <div className="mb-2 flex items-center space-x-1 text-xs opacity-80">
                             <FileIcon className="h-3 w-3" />
                             <span>{message.fileInfo.name}</span>
                          </div>
                     )}


                    {/* Message Text */}
                    {/* Handle loading state for AI messages */}
                    {(message.sender === 'ai' && message.text === '...' && isLoading && messages.indexOf(message) === 0) ? ( // Show skeleton only for the *very first* AI placeholder
                         // Use Skeleton for loading indicator within the bubble
                         <div className="space-y-2">
                            <Skeleton className="h-4 w-[80%]" />
                            <Skeleton className="h-4 w-[60%]" />
                         </div>
                    ) : (
                         // Only render paragraph if text exists
                         message.text && <p className="text-sm">{message.text}</p>
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

    