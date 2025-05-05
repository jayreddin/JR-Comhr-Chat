
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
      content?: string; // Text content for non-image files
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
  const [isSignedIn, setIsSignedIn] = useState<boolean | undefined>(undefined); // Track auth status
  const scrollAreaRef = useRef<HTMLDivElement>(null); // Ref for the scroll area viewport
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for the bottom of the messages list
  const [nonImageFileWarningShown, setNonImageFileWarningShown] = useState(false); // Track if warning shown

  // Get username from Puter auth when component mounts
  useEffect(() => {
    const fetchUserAndStatus = async () => {
      if (typeof window !== 'undefined' && window.puter?.auth) {
        try {
          const signedIn = await window.puter.auth.isSignedIn();
          setIsSignedIn(signedIn);
          if (signedIn) {
            const user = await window.puter.auth.getUser();
            setUsername(user.username || 'User');
          } else {
            setUsername('User'); // Reset to default if not signed in
          }
        } catch (error) {
          console.error("Error fetching Puter user/status:", error);
          setIsSignedIn(false); // Assume not signed in on error
          setUsername('User');
        }
      } else {
        // Handle case where Puter might not be loaded yet
        setIsSignedIn(false);
        setUsername('User');
      }
    };
    fetchUserAndStatus();

    // Optional: Add listener for auth changes if Puter SDK supports it
    // This depends on Puter.js v2 having an event listener for auth state changes
    // Example hypothetical listener:
    /*
    const unsubscribe = window.puter?.auth?.onAuthStateChanged((user) => {
      if (user) {
        setIsSignedIn(true);
        setUsername(user.username || 'User');
      } else {
        setIsSignedIn(false);
        setUsername('User');
      }
    });
    return () => unsubscribe?.(); // Cleanup listener on unmount
    */
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
        handleSendMessage(messageToResend.text, messageToResend.fileInfo); // Pass fileInfo if it exists
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
            // Pass fileInfo if it exists on the user message
            handleSendMessage(succeedingUserMessage.text, succeedingUserMessage.fileInfo);
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
    // Find the current session ID (assuming the most recent is the active one)
     if (typeof window !== 'undefined') {
         const sessionListJSON = localStorage.getItem('chatSessionList');
         if (sessionListJSON) {
             try {
                 const sessionList: ChatSessionInfo[] = JSON.parse(sessionListJSON);
                 sessionList.sort((a, b) => b.timestamp - a.timestamp);
                 if (sessionList.length > 0) {
                     const currentSessionId = sessionList[0].id;
                     const sessionDataJSON = localStorage.getItem(currentSessionId);
                     if (sessionDataJSON) {
                         const sessionData: SavedChatSession = JSON.parse(sessionDataJSON);
                         sessionData.messages = sessionData.messages.filter(msg => msg.id !== messageId);
                         localStorage.setItem(currentSessionId, JSON.stringify(sessionData));
                         console.log(`Message ${messageId} deleted from saved session ${currentSessionId}`);
                     }
                 }
             } catch (error) {
                 console.error("Error updating saved session after delete:", error);
             }
         }
     }
  };

  const handleSpeak = (text: string) => {
    console.log(`Speaking message: ${text}`);
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech before starting new one
        window.speechSynthesis.cancel();
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
         // Check if the current messages belong to an existing saved session
         const sessionListJSON = localStorage.getItem('chatSessionList');
         let currentSessionId: string | null = null;
         let sessionList: ChatSessionInfo[] = [];
         let sessionName = `Chat ${format(Date.now(), 'yyyy-MM-dd HH:mm')}`; // Default new name

         if (sessionListJSON) {
             try {
                 sessionList = JSON.parse(sessionListJSON);
                 sessionList.sort((a, b) => b.timestamp - a.timestamp); // Newest first
                 // Assume the most recent session in the list is the one currently being viewed
                 if (sessionList.length > 0) {
                     currentSessionId = sessionList[0].id;
                     sessionName = sessionList[0].name; // Use existing name if updating
                 }
             } catch (e) {
                 console.error("Error parsing chat session list during save, starting fresh.", e);
                 sessionList = [];
                 currentSessionId = null; // Treat as a new session if list is corrupt
             }
         }

         // If no currentSessionId, generate a new one
         if (!currentSessionId) {
             currentSessionId = `chat-${Date.now()}`;
         } else {
              // If updating, use the existing name unless it's the default placeholder
               const existingSessionInfo = sessionList.find(s => s.id === currentSessionId);
              if (existingSessionInfo && !existingSessionInfo.name.startsWith("Chat ")) {
                   sessionName = existingSessionInfo.name;
              } else {
                   // Try to generate a better preview name if possible
                    const firstUserMessage = [...messages].reverse().find(msg => msg.sender === 'user');
                   sessionName = firstUserMessage
                       ? `${firstUserMessage.text.substring(0, 30)}...`
                       : `Chat ${format(Date.now(), 'yyyy-MM-dd HH:mm')}`;
              }
         }


        const sessionData: SavedChatSession = {
            id: currentSessionId,
            name: sessionName,
            timestamp: Date.now(), // Always update timestamp on save/new
            // Ensure message previews (Data URIs) and content are saved
            messages: messages.map(msg => ({
                ...msg,
                // Keep fileInfo, including content and previewUrl if present
            }))
        };

        try {
            // Save the full session data
            localStorage.setItem(currentSessionId, JSON.stringify(sessionData));

            // Update the session list (add if new, update timestamp if existing)
            const existingIndex = sessionList.findIndex(s => s.id === currentSessionId);
            const newSessionInfo: ChatSessionInfo = { id: currentSessionId, name: sessionName, timestamp: sessionData.timestamp };

            if (existingIndex > -1) {
                sessionList[existingIndex] = newSessionInfo; // Update existing entry
            } else {
                sessionList.push(newSessionInfo); // Add new entry
            }
            // Sort and limit history size
            sessionList.sort((a, b) => b.timestamp - a.timestamp); // Sort newest first
            // sessionList = sessionList.slice(0, 50); // Optional: Keep only latest 50 sessions

            localStorage.setItem('chatSessionList', JSON.stringify(sessionList));

            toast({ title: "Chat Saved", description: `Session "${sessionName}" saved.` });

        } catch (error) {
            console.error("Error saving chat session:", error);
            toast({ variant: "destructive", title: "Save Error", description: "Could not save the chat session." });
        }
    } else {
         // Don't save an empty chat
         console.log("No messages to save, starting new chat.");
    }

    // 2. Clear current messages state
    setMessages([]);
    setNonImageFileWarningShown(false); // Reset warning flag

    // 3. Optional: Reset any other relevant state (e.g., input field is handled by Footer)
    // Optional: Set a default 'new chat' placeholder message?
    /*
    setMessages([{
        id: `ai-${Date.now()}`,
        sender: 'ai',
        name: 'System',
        text: 'Started a new chat.',
        timestamp: Date.now()
    }]);
    */
  };


  // Function to handle restoring a chat session
  const handleRestoreChatSession = (sessionId: string, showToast: boolean = true) => {
      if (typeof window === 'undefined') return;
      console.log(`Restoring chat session: ${sessionId}`);
      try {
          const sessionDataJSON = localStorage.getItem(sessionId);
          if (sessionDataJSON) {
              const sessionData: SavedChatSession = JSON.parse(sessionDataJSON);
              // Load messages. Restore previews and content if saved.
              setMessages(sessionData.messages);
               setNonImageFileWarningShown(false); // Reset warning flag on load
              if (showToast) {
                 toast({ title: "Chat Restored", description: `Loaded session "${sessionData.name}".` });
              }
                // Ensure the restored session is moved to the top of the list visually in history
                 const sessionListJSON = localStorage.getItem('chatSessionList');
                 if (sessionListJSON) {
                     let sessionList: ChatSessionInfo[] = JSON.parse(sessionListJSON);
                     const restoredIndex = sessionList.findIndex(s => s.id === sessionId);
                     if (restoredIndex > -1) {
                         const restoredItem = sessionList.splice(restoredIndex, 1)[0];
                         restoredItem.timestamp = Date.now(); // Update timestamp to make it most recent
                         sessionList.unshift(restoredItem); // Add to the beginning
                         localStorage.setItem('chatSessionList', JSON.stringify(sessionList));
                     }
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

  // Function to read file as text
  const fileToText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to read file as text'));
            }
        };
        reader.onerror = (error) => {
            reject(error);
        };
        reader.readAsText(file);
    });
  };


   // handleSendMessage now accepts existing fileInfo for resend scenarios
  const handleSendMessage = async (inputText: string, fileOrInfo?: File | Message['fileInfo']) => {
    const trimmedInput = inputText.trim();
    const hasFile = !!fileOrInfo;

    if (!trimmedInput && !hasFile) return; // Need either text or a file

    // Prevent sending if not signed in (or status unknown)
    if (isSignedIn === false) {
      toast({
        variant: "destructive",
        title: "Sign In Required",
        description: "Please sign in to send messages.",
      });
      return;
    }
     if (isSignedIn === undefined) {
      toast({
        variant: "destructive",
        title: "Loading...",
        description: "Checking authentication status. Please wait.",
      });
      return;
    }

    let fileDataUri: string | undefined = undefined;
    let fileInfoForMessage: Message['fileInfo'] = undefined;
    let textToSend = trimmedInput; // Start with the user's typed text

    // Handle file processing (if a new File is provided)
     if (fileOrInfo instanceof File) {
        const file = fileOrInfo;
        const isImage = file.type.startsWith('image/');
        const isText = file.type.startsWith('text/') || ['application/json', 'application/javascript', 'application/xml'].includes(file.type);
         const isPdf = file.type === 'application/pdf'; // Basic PDF check

        try {
            let fileContent: string | undefined = undefined;
            if (isImage) {
                fileDataUri = await fileToDataUri(file);
            } else if (isText) {
                 fileContent = await fileToText(file);
            } else if (isPdf) {
                 // Handle PDF - For now, just indicate it's a PDF. Advanced parsing would go here.
                 fileContent = `[Content of PDF file: ${file.name}]`;
            } else {
                 // Other binary types
                 fileContent = `[Binary file attached: ${file.name}, Type: ${file.type}]`;
            }

            fileInfoForMessage = {
                name: file.name,
                type: file.type,
                previewUrl: isImage ? fileDataUri : undefined,
                content: fileContent
            };

            // Prepend file information to the text prompt for the AI
             if (fileContent) {
                textToSend = `[User has attached a file: ${file.name} (${file.type}, ${Math.round(file.size / 1024)} KB)]\n--- File Content Start ---\n${fileContent}\n--- File Content End ---\n\nUser's message: ${trimmedInput}`;
             } else if (isImage) {
                 // If it's an image, the visual data is sent separately (if supported)
                 textToSend = `[User has attached an image: ${file.name} (${file.type}, ${Math.round(file.size / 1024)} KB)]\n\nUser's message: ${trimmedInput}`;
             } else {
                 // Fallback for unhandled types
                  textToSend = `[User has attached a file: ${file.name} (${file.type}, ${Math.round(file.size / 1024)} KB)]\n\nUser's message: ${trimmedInput}`;
             }


        } catch (error) {
            console.error("Error processing file:", error);
            toast({ variant: "destructive", title: "File Error", description: `Could not process the attached file: ${file.name}` });
            return; // Stop sending if file processing fails
        }
    } else if (fileOrInfo) { // If existing fileInfo is provided (resend scenario)
         fileInfoForMessage = fileOrInfo;
         fileDataUri = fileInfoForMessage.previewUrl; // Use existing preview URL for image data

         // Reconstruct the textToSend based on existing fileInfo
         if (fileInfoForMessage.content) {
             textToSend = `[User has attached a file: ${fileInfoForMessage.name} (${fileInfoForMessage.type})]\n--- File Content Start ---\n${fileInfoForMessage.content}\n--- File Content End ---\n\nUser's message: ${trimmedInput}`;
         } else if (fileInfoForMessage.type.startsWith('image/')) {
             textToSend = `[User has attached an image: ${fileInfoForMessage.name} (${fileInfoForMessage.type})]\n\nUser's message: ${trimmedInput}`;
         } else {
             textToSend = `[User has attached a file: ${fileInfoForMessage.name} (${fileInfoForMessage.type})]\n\nUser's message: ${trimmedInput}`;
         }
    }


    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      name: username, // Use the fetched username
      text: trimmedInput, // Keep the original user text visually separate
      timestamp: Date.now(),
      fileInfo: fileInfoForMessage, // Add file info to the message object
    };
    // Add user message to the beginning for newest-first display
    setMessages((prevMessages) => [userMessage, ...prevMessages]);
    setIsLoading(true);
    // No need to scrollToBottom immediately if newest is at top

    let aiMessageId = ''; // Keep track of the AI message ID for this request
    let puterModelName = selectedModel; // Assign selected model name

    // --- Puter.js AI Call ---
    if (typeof window !== 'undefined' && window.puter?.ai?.chat) {
      try {
        aiMessageId = `ai-${Date.now()}`; // Assign ID here
        // Add a placeholder AI message for streaming at the beginning
        const placeholderAiMessage: Message = {
            id: aiMessageId,
            sender: 'ai',
            // Get model name, remove prefix for display
            name: puterModelName.startsWith('openrouter:')
                ? puterModelName.substring('openrouter:'.length).split('/').pop() || puterModelName
                : puterModelName.split('/').pop() || puterModelName,
            text: '...', // Placeholder text
            timestamp: Date.now()
        };
        // Add placeholder to the beginning
        setMessages((prevMessages) => [placeholderAiMessage, ...prevMessages]);
        // No scroll needed if newest is at top

        console.log(`Using model for Puter API call: ${puterModelName}`);
        console.log(`Text being sent to AI: ${textToSend}`); // Log the actual text sent


         // Prepare arguments for puter.ai.chat
         const chatArgs: any[] = [textToSend]; // Send the combined text (file info + user input)
         const chatOptions: { model: string; stream: boolean; image?: string } = {
             model: puterModelName,
             stream: true,
         };

         // Add image data URI if available and model supports vision
         // Basic check: Assume models containing 'vision', 'gpt-4o', 'claude-3', 'gemini', 'qwen', 'phi-4' support images
         const modelSupportsVision = puterModelName.includes('vision')
            || puterModelName.includes('gpt-4o')
            || puterModelName.includes('claude-3')
            || puterModelName.includes('gemini')
            || puterModelName.includes('qwen') // Added Qwen
            || puterModelName.includes('phi-4'); // Added Phi-4


         if (fileDataUri && fileInfoForMessage?.type.startsWith('image/') && modelSupportsVision) {
             chatOptions.image = fileDataUri;
             console.log("Sending image to vision model.");
         } else if (fileInfoForMessage && !fileInfoForMessage?.type.startsWith('image/')) {
             // Non-image file attached, content is in the prompt
             console.log("Non-image file attached. Content included in the prompt.");
             // No specific warning needed here as content is sent
         } else if (fileDataUri && !modelSupportsVision) {
              console.warn("Image file attached, but selected model may not support vision.");
              if (!nonImageFileWarningShown) { // Show toast only once per session
                 toast({ title: "Warning", description: "Image file attached, but the selected model might not support image input. Image data will be ignored." });
                 setNonImageFileWarningShown(true);
              }
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
                 // Check for cancellation specifically
                 if (part.error?.code === 'auth_canceled' || part.error?.message?.toLowerCase().includes('cancel')) {
                    chunkText = "[Authentication Canceled]";
                 } else {
                    chunkText = `[Error: ${part.error.message || part.error}]`;
                 }
                 // Stop processing further chunks for this message on error
                 streamedText += chunkText; // Add error to text
                 setMessages((prevMessages) =>
                   prevMessages.map((msg) =>
                     msg.id === aiMessageId ? { ...msg, text: streamedText, timestamp: Date.now() } : msg
                   )
                 );
                 throw part.error; // Propagate error object
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

      } catch (error: any) {
         // Check if the error object has a specific structure indicating cancellation
         const isAuthCancelled = error?.code === 'auth_canceled' || error?.message?.toLowerCase().includes('cancel');

        // Log the error *unless* it's a user cancellation
        if (!isAuthCancelled) {
             console.error("Puter AI chat error:", error); // Log the raw error object
        } else {
             console.log("Puter authentication cancelled by user during chat attempt.");
        }

        let errorMsg = "An unknown error occurred.";

        if (isAuthCancelled) {
            errorMsg = "Authentication Canceled";
        } else if (error instanceof Error) {
             errorMsg = error.message;
             if (error.message.includes("Model not found") || error.message.includes("404")) {
                 errorMsg = `Model '${puterModelName}' not found or incompatible. Check settings.`;
             } else if (error.message.includes("quota") || error.message.includes("limit")) {
                 errorMsg = "Usage limit likely exceeded for this model.";
             } else if (error.message.includes("auth") || error.message.includes("401")) {
                 errorMsg = "Authentication failed or required. Sign in.";
             } else if (error.message.includes("Failed to fetch")) {
                 errorMsg = "Network error connecting to AI service. Check connection.";
             } else if (error.message.includes("Input validation error") && error.message.includes("image")) {
                 errorMsg = `Selected model '${puterModelName}' does not support image input.`;
             }
        } else if (typeof error === 'object' && error !== null && 'message' in error) {
            // Handle cases where error is an object with a message (like the auth_canceled one)
            errorMsg = (error as { message: string }).message || JSON.stringify(error);
        } else if (typeof error === 'string') {
             errorMsg = error;
        } else {
             try {
                 errorMsg = `An unexpected error occurred: ${JSON.stringify(error)}`;
             } catch {
                 errorMsg = "An unexpected and unstringifiable error occurred.";
             }
        }


        // Update the placeholder message with the error or cancellation message
        setMessages((prevMessages) =>
             prevMessages.map((msg) =>
               msg.id === aiMessageId ? { ...msg, text: `[${errorMsg}]`, timestamp: Date.now() } : msg
             )
         );

         // Only show toast for actual errors, not cancellations
        if (!isAuthCancelled) {
            toast({
                variant: "destructive",
                title: "AI Chat Error",
                description: `Could not get response: ${errorMsg}`,
            });
        }

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
                     {/* Render generic file icon and potentially content preview link for non-image files */}
                     {message.fileInfo && !message.fileInfo.type.startsWith('image/') && (
                          <div className="mb-2 flex items-center space-x-1 text-xs opacity-80">
                             <FileIcon className="h-3 w-3" />
                             <span>{message.fileInfo.name}</span>
                             {/* Optionally add a button/link to view content if stored */}
                             {/* {message.fileInfo.content && <Button size="xs">View</Button>} */}
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
