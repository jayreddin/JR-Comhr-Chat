"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PageLayout } from '@/components/page-layout';
import { GeminiWsClient } from '@/ai/gemini-ws-client';
import { useAudioStream } from '@/hooks/use-audio-stream';
import { ToolManager } from '@/ai/tool-manager';
import { GoogleSearchTool } from '@/ai/tools/google-search';
import { Button } from '@/components/ui/button';
import { Upload, Camera, Monitor, Mic as MicIcon, AlertCircle, Loader2, CheckCircle2, Trash2, XCircle } from 'lucide-react'; // Added XCircle
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

// --- Constants ---
const PLACEHOLDER_WS_URL = "wss://your-gemini-ws-endpoint";
const MAX_IMAGE_SIZE_MB = 4; // Max image size in MB for upload

// --- API Key Manager Component ---
const ApiKeyManager: React.FC<{
  apiKeys: string[];
  selectedKey: string | null; // This is the key currently selected in the dialog (pending)
  activeKey: string | null; // This is the key currently active in the app
  onSelect: (key: string) => void;
  onAdd: (key: string) => void;
  onDelete: (key: string) => void;
  onTest: (key: string) => Promise<boolean>;
  onClose: () => void;
  onSave: () => void;
}> = ({
  apiKeys,
  selectedKey,
  activeKey, // Receive activeKey to compare
  onSelect,
  onAdd,
  onDelete,
  onTest,
  onClose,
  onSave
}) => {
  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<null | boolean>(null);
  const [testing, setTesting] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* Add New Key Section */}
      <div>
        <Label htmlFor="newApiKeyInput" className="text-sm font-medium">Add New Key</Label>
        <div className="flex items-center gap-2 mt-1">
          <Input
            id="newApiKeyInput"
            placeholder="Enter new Gemini API Key"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            type={showKey ? "text" : "password"}
            className="flex-grow"
          />
          <Button variant="outline" size="icon" onClick={() => setShowKey(v => !v)} aria-label={showKey ? "Hide Key" : "Show Key"}>
            {/* Basic eye icons */}
            {showKey ? '👁️‍🗨️' : '👁️'}
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2">
           <Button
             onClick={async () => {
               setTesting(true);
               setTestResult(null);
               const valid = await onTest(newKey.trim());
               setTestResult(valid);
               setTesting(false);
               if (valid) {
                 toast({ title: "API Key Valid", description: "The key appears to be valid." });
               } else {
                 toast({ variant: "destructive", title: "Invalid API Key", description: "The key could not be validated." });
               }
             }}
             disabled={testing || !newKey.trim()}
             variant="outline"
             className="flex-1"
           >
             {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
             Test Key
           </Button>
           <Button
             onClick={() => { onAdd(newKey.trim()); setNewKey(""); setTestResult(null); }}
             disabled={!newKey.trim()}
             className="flex-1"
           >
             Add Key
           </Button>
        </div>
        {testResult !== null && (
          <p className={`text-xs mt-1 ${testResult ? "text-green-600" : "text-red-600"}`}>
            {testResult ? "Key validation successful." : "Key validation failed."}
          </p>
        )}
      </div>

      {/* Saved Keys Section */}
      <div className="w-full">
        <Label className="text-sm font-medium">Saved Keys</Label>
        {apiKeys.length === 0 ? (
          <p className="text-xs text-muted-foreground mt-1">No keys saved yet.</p>
        ) : (
          <ScrollArea className="h-40 w-full mt-1 border rounded-md p-2">
            <div className="flex flex-col gap-2 w-full">
              {apiKeys.map(key => (
                <div key={key} className="flex items-center gap-2 w-full">
                   <Button
                     variant={selectedKey === key ? "secondary" : "outline"}
                     className={cn(
                       "flex-grow justify-start items-center text-left px-3 py-2 h-auto", // Adjusted padding and height
                       selectedKey === key && "ring-2 ring-primary ring-offset-1" // More prominent selection
                     )}
                     onClick={() => onSelect(key)}
                   >
                     <span className="truncate font-mono text-sm"> {/* Monospace for keys */}
                       {key.slice(0, 6)}...{key.slice(-4)}
                     </span>
                     {/* Show indicator if it's the currently *active* key in the app */}
                     {activeKey === key && (
                       <CheckCircle2 className="ml-auto h-4 w-4 text-green-600 flex-shrink-0" aria-label="Currently Active" />
                     )}
                   </Button>
                   <Button
                     variant="ghost"
                     size="icon"
                     className="text-muted-foreground hover:text-destructive flex-shrink-0"
                     onClick={() => onDelete(key)}
                     aria-label="Delete Key"
                   >
                     <Trash2 className="h-4 w-4" />
                   </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Dialog Footer */}
      <DialogFooter className="gap-2 mt-2"> {/* Added mt-2 */}
        <Button variant="outline" onClick={onClose}>Close</Button>
        <Button onClick={onSave} disabled={!selectedKey || selectedKey === activeKey}> {/* Disable if no selection or selection is already active */}
          Activate Selected Key
        </Button>
      </DialogFooter>
    </div>
  );
};

// --- Audio Visualizer ---
function AudioVisualizer({ isActive }: { isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [wave, setWave] = useState<Float32Array | null>(null);
  useAudioStream(isActive, (data) => setWave(new Float32Array(data)));

  useEffect(() => {
    if (!canvasRef.current || !wave) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 128, 64);
    ctx.strokeStyle = "#ef4444";
    ctx.beginPath();
    for (let i = 0; i < wave.length; i++) {
      const x = (i / wave.length) * 128;
      const y = 32 + wave[i] * 30;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [wave]);

  return (
    <canvas
      ref={canvasRef}
      width={128}
      height={64}
      style={{ width: "100%", height: "48px", background: "black" }}
    />
  );
}

// --- Audio streaming to Gemini WebSocket ---
function useSendAudioToGemini(isActive: boolean, wsClientRef: React.MutableRefObject<GeminiWsClient | null>) {
  useAudioStream(isActive, (data) => {
    // Add null check for wsClientRef.current
    if (wsClientRef.current?.isConnected && isActive) {
      const uint8 = new Uint8Array(data.buffer);
      const b64 = btoa(String.fromCharCode(...uint8));
      wsClientRef.current.send({
        type: "audio",
        audio: b64
      });
    }
  });
}
function SendAudioToGemini({ isActive, wsClientRef }: { isActive: boolean, wsClientRef: React.MutableRefObject<GeminiWsClient | null> }) {
  useSendAudioToGemini(isActive, wsClientRef);
  return null;
}

// --- Types ---
type GeminiWsMessage = {
  type: string;
  text?: string;
  error?: string;
};
interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
  imageUrl?: string; // Keep for future image upload
}

// --- Main Page ---
export default function VisionPage() {
  const [apiKey, setApiKey] = useState<string | null>(null); // The currently *active* API key
  const [apiKeys, setApiKeys] = useState<string[]>([]); // List of all saved keys
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [pendingSelectedKey, setPendingSelectedKey] = useState<string | null>(null); // Key selected in the dialog, not yet saved/activated
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Image Upload State
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImageDataUrl, setSelectedImageDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const [hasScreenPermission, setHasScreenPermission] = useState<boolean | null>(null);
  const [isScreenActive, setIsScreenActive] = useState(false);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const [hasAudioPermission, setHasAudioPermission] = useState<boolean | null>(null);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // --- Gemini WebSocket Client ---
  const wsClientRef = useRef<GeminiWsClient | null>(null);

  // --- Tool Manager ---
  const toolManagerRef = useRef<ToolManager | null>(null);
  if (!toolManagerRef.current) {
    toolManagerRef.current = new ToolManager();
    toolManagerRef.current.registerTool("googleSearch", new GoogleSearchTool());
  }

  // --- Get WebSocket URL from Environment Variable ---
  const geminiWsUrl = process.env.NEXT_PUBLIC_GEMINI_WS_URL;

  // --- WebSocket connect/disconnect ---
  useEffect(() => {
    // Close existing connection if apiKey changes or URL changes
    wsClientRef.current?.close();

    if (!apiKey) {
      console.log("No active API key, WebSocket not connecting.");
      return;
    }

    if (!geminiWsUrl || geminiWsUrl === PLACEHOLDER_WS_URL) {
        console.error("Gemini WebSocket URL is not configured or is still the placeholder. Please set NEXT_PUBLIC_GEMINI_WS_URL environment variable.");
        toast({
            variant: "destructive",
            title: "WebSocket URL Missing",
            description: "The Gemini WebSocket URL is not configured. Please set it in your environment variables.",
            duration: 10000 // Show longer
        });
        return; // Don't attempt to connect
    }


    console.log(`Connecting WebSocket to ${geminiWsUrl} with active API key...`);
    wsClientRef.current = new GeminiWsClient(geminiWsUrl); // Use the validated URL
    wsClientRef.current.connect();

    wsClientRef.current.setOnError((errorEvent) => {
        console.error("WebSocket connection error:", errorEvent);
        toast({
            variant: "destructive",
            title: "WebSocket Connection Error",
            description: "Could not connect to the Gemini WebSocket service. Check the URL and your network.",
        });
        // Optionally, try to reconnect or update UI state
    });


    wsClientRef.current.setOnMessage((raw) => {
      let data: GeminiWsMessage;
      try {
        data = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e, raw);
        data = { type: "error", error: "Malformed message from Gemini WebSocket." };
      }
      // console.log("WebSocket message received:", data); // Debugging
      if (data.type === "chat" && data.text) {
        setMessages(prev => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'ai',
            text: data.text ?? "",
            timestamp: Date.now(),
          }
        ]);
        setIsLoading(false);
        scrollToBottom();
      } else if (data.type === "error" && data.error) {
         console.error("WebSocket Error Message:", data.error);
         toast({ variant: "destructive", title: "Gemini Error", description: data.error });
        setMessages(prev => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            sender: 'ai',
            text: `Error: ${data.error ?? "Unknown error"}`,
            timestamp: Date.now(),
          }
        ]);
        setIsLoading(false);
        scrollToBottom();
      }
    });

    // Cleanup function
    return () => {
      console.log("Closing WebSocket connection.");
      wsClientRef.current?.close();
    };
  }, [apiKey, geminiWsUrl]); // Reconnect if apiKey or URL changes


  // --- Camera frame streaming to Gemini WebSocket ---
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    // Add null check for wsClientRef.current
    if (isCameraActive && videoRef.current && wsClientRef.current?.isConnected) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      interval = setInterval(() => {
        // Add null check for wsClientRef.current inside interval as well
        if (!videoRef.current || !ctx || videoRef.current.readyState < videoRef.current.HAVE_METADATA || videoRef.current.videoWidth === 0 || !wsClientRef.current?.isConnected) return;
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        // Use optional chaining for safety, though isConnected is checked above
        wsClientRef.current?.send({
          type: "camera_frame",
          image: dataUrl
        });
      }, 1000 / 5); // 5 FPS
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCameraActive]); // Removed wsClientRef, videoRef from deps as they are refs

  // --- Screen frame streaming to Gemini WebSocket ---
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    // Add null check for wsClientRef.current
    if (isScreenActive && screenVideoRef.current && wsClientRef.current?.isConnected) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      interval = setInterval(() => {
         // Add null check for wsClientRef.current inside interval as well
        if (!screenVideoRef.current || !ctx || screenVideoRef.current.readyState < screenVideoRef.current.HAVE_METADATA || screenVideoRef.current.videoWidth === 0 || !wsClientRef.current?.isConnected) return;
        canvas.width = screenVideoRef.current.videoWidth;
        canvas.height = screenVideoRef.current.videoHeight;
        ctx.drawImage(screenVideoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        // Use optional chaining for safety
        wsClientRef.current?.send({
          type: "screen_frame",
          image: dataUrl
        });
      }, 1000 / 5); // 5 FPS
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScreenActive]); // Removed wsClientRef, screenVideoRef from deps


  // --- Load API Keys from localStorage ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedApiKey = localStorage.getItem('geminiApiKey');
      const storedApiKeys = JSON.parse(localStorage.getItem('geminiApiKeys') || '[]');

      if (storedApiKey) {
        setApiKey(storedApiKey);
        setPendingSelectedKey(storedApiKey); // Initialize pending key with active key
      } else {
        setPendingSelectedKey(null);
      }

      if (Array.isArray(storedApiKeys)) {
        setApiKeys(storedApiKeys);
      }

      // Event listener for header button
      const openDialog = () => {
        setPendingSelectedKey(apiKey); // Reset pending key to current active key when opening
        setIsApiKeyDialogOpen(true);
      };
      window.addEventListener("openGeminiApiKeyDialog", openDialog);

      // Update header button label
      const label = document.getElementById("gemini-api-key-btn-label");
      // Add null check for label
      if (label) {
        label.textContent = apiKey ? "View API Key" : "Enter API Key";
      }

      // Cleanup listener
      return () => {
        window.removeEventListener("openGeminiApiKeyDialog", openDialog);
      };
    }
  }, [apiKey]); // Rerun when active apiKey changes to update header label

  // --- API Key Management Logic ---
  const handleSelectApiKeyInDialog = (key: string) => {
    setPendingSelectedKey(key); // Update the key selected within the dialog
  };

  const handleAddApiKey = (key: string) => {
    if (!key) {
       toast({ variant: "destructive", title: "Invalid Key", description: "API Key cannot be empty." });
       return;
    }
     if (apiKeys.includes(key)) {
        toast({ variant: "default", title: "Key Exists", description: "This API Key is already saved." });
        setPendingSelectedKey(key); // Select the existing key
        return;
     }
    const newKeys = [...apiKeys, key];
    setApiKeys(newKeys);
    setPendingSelectedKey(key); // Automatically select the newly added key
    localStorage.setItem('geminiApiKeys', JSON.stringify(newKeys)); // Save updated list
    toast({ title: "API Key Added", description: "Select 'Activate Selected Key' to use it." });
  };

  const handleDeleteApiKey = (keyToDelete: string) => {
    const newKeys = apiKeys.filter(k => k !== keyToDelete);
    setApiKeys(newKeys);
    localStorage.setItem('geminiApiKeys', JSON.stringify(newKeys)); // Save updated list

    // If the deleted key was the pending selection, clear pending selection
    if (pendingSelectedKey === keyToDelete) {
      setPendingSelectedKey(null);
    }

    // If the deleted key was the *active* key, clear active key and notify user
    if (apiKey === keyToDelete) {
      setApiKey(null);
      localStorage.removeItem('geminiApiKey');
      toast({ title: "Active API Key Deleted", description: "The currently active API key was removed." });
       // Update header button label immediately
       const label = document.getElementById("gemini-api-key-btn-label");
       // Add null check for label
       if (label) {
         label.textContent = "Enter API Key";
       }
    } else {
       toast({ title: "API Key Deleted" });
    }
  };

  const handleTestApiKey = async (key: string): Promise<boolean> => {
     if (!key) return false;
    try {
      // Use the v1beta/models endpoint for a simple list request which requires a valid key
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      return resp.ok; // Check if the response status is OK (2xx)
    } catch (error) {
      console.error("API Key test failed:", error);
      return false; // Network error or other issue - Added return
    }
  };

  const handleActivateApiKey = () => {
    if (pendingSelectedKey && pendingSelectedKey !== apiKey) {
      setApiKey(pendingSelectedKey); // Activate the key
      localStorage.setItem('geminiApiKey', pendingSelectedKey); // Persist the active key
      setIsApiKeyDialogOpen(false);
      toast({ title: "API Key Activated", description: `Key ending in ...${pendingSelectedKey.slice(-4)} is now active.` });
    } else if (!pendingSelectedKey) {
        toast({ variant: "destructive", title: "No Key Selected", description: "Please select a key to activate." });
    } else {
        // Key selected is already active, just close dialog
        setIsApiKeyDialogOpen(false);
    }
  };

  // --- Chat/Message Logic ---
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // --- Image Upload Handling ---
  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ variant: "destructive", title: "Invalid File Type", description: "Please select an image file." });
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > MAX_IMAGE_SIZE_MB) {
      toast({ variant: "destructive", title: "Image Too Large", description: `Please select an image smaller than ${MAX_IMAGE_SIZE_MB} MB.` });
      return;
    }

    setSelectedImageFile(file);

    // Read file as Data URL for preview and sending
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImageDataUrl(reader.result as string);
    };
    reader.onerror = () => {
      console.error("Error reading file");
      toast({ variant: "destructive", title: "File Read Error", description: "Could not read the selected image file." });
      setSelectedImageFile(null);
      setSelectedImageDataUrl(null);
    };
    reader.readAsDataURL(file);

    // Reset file input value to allow selecting the same file again
    if (event.target) {
        event.target.value = '';
    }
  };

  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    setSelectedImageDataUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the input
    }
  };
  // --- End Image Upload Handling ---

  const handleSendMessage = async (messageText: string, imageUrl?: string | null) => { // Accept null for imageUrl
    const trimmedInput = messageText.trim();
    // Require either text input OR an image to send
    if (!trimmedInput && !imageUrl) return; // Check against passed imageUrl

    // Check for WS URL configuration first
    if (!geminiWsUrl || geminiWsUrl === PLACEHOLDER_WS_URL) {
        toast({
            variant: "destructive",
            title: "WebSocket URL Missing",
            description: "Cannot send message. Configure the Gemini WebSocket URL.",
            duration: 7000
        });
        return;
    }

    if (!apiKey) {
      toast({ variant: "destructive", title: "API Key Required", description: "Please set an active Gemini API Key via the header button." });
      setIsApiKeyDialogOpen(true);
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmedInput,
      timestamp: Date.now(),
      imageUrl: imageUrl ?? undefined, // Handle null case
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue('');
    handleRemoveImage(); // Clear image state AFTER adding message
    setIsLoading(true);
    scrollToBottom(); // Scroll after adding user message

    // Check WebSocket connection state using the new getter
     if (wsClientRef.current?.isConnected) {
       wsClientRef.current.send({
         type: "chat",
         apiKey,
         text: trimmedInput,
         imageUrl: userMessage.imageUrl // Send the potentially undefined imageUrl
       });
     } else {
       console.error("WebSocket not connected, cannot send message."); // Simplified log
       toast({ variant: "destructive", title: "Connection Error", description: "WebSocket not connected. Please check your API key and network, or wait for connection." });
      // Add error message to chat *without* removing the user's message attempt
       setMessages((prevMessages) => [
         ...prevMessages,
         {
           id: `error-${Date.now()}`,
           sender: 'ai',
           text: "Error: WebSocket not connected. Message not sent.",
           timestamp: Date.now(),
         }
       ]);
      setIsLoading(false); // Reset loading state on connection error
     }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      // Pass both inputValue and selectedImageDataUrl
      handleSendMessage(inputValue, selectedImageDataUrl);
    }
  };

  // --- Media Permissions ---
  const getCameraPermission = useCallback(async () => {
    if (hasCameraPermission !== null) return hasCameraPermission;
    if (typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        setHasCameraPermission(true);
        return true;
      } catch (error) {
        console.error('Error getting camera permission:', error);
        setHasCameraPermission(false);
        toast({ variant: 'destructive', title: 'Camera Access Denied', description: 'Please enable camera permissions.' });
        return false;
      }
    } else {
      setHasCameraPermission(false);
      toast({ variant: "destructive", title: "Not Supported", description: "Camera access not supported." });
      return false;
    }
  }, [hasCameraPermission]);

  const getScreenPermission = useCallback(async () => {
    if (hasScreenPermission !== null) return hasScreenPermission;
    if (typeof window !== 'undefined' && navigator.mediaDevices?.getDisplayMedia) {
      try {
        const testStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        testStream.getTracks().forEach(track => track.stop());
        setHasScreenPermission(true);
        return true;
      } catch (error) {
        console.error('Error getting screen share permission:', error);
        setHasScreenPermission(false);
        toast({ variant: 'destructive', title: 'Screen Share Denied', description: 'Please allow screen sharing.' });
        return false;
      }
    } else {
      setHasScreenPermission(false);
      toast({ variant: "destructive", title: "Not Supported", description: "Screen sharing not supported." });
      return false;
    }
  }, [hasScreenPermission]);

  const getAudioPermission = useCallback(async () => {
    if (hasAudioPermission !== null) return hasAudioPermission;
    if (typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setHasAudioPermission(true);
        return true;
      } catch (error) {
         console.error('Error getting audio permission:', error);
        setHasAudioPermission(false);
        toast({ variant: 'destructive', title: 'Microphone Access Denied', description: 'Please enable microphone permissions.' });
        return false;
      }
    } else {
      setHasAudioPermission(false);
      toast({ variant: "destructive", title: "Not Supported", description: "Microphone access not supported." });
      return false;
    }
  }, [hasAudioPermission]);

  // --- Media Stop Functions --- (Defined before start functions)
  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
      videoRef.current.onerror = null;
    }
    if (isCameraActive) { // Only log/set state if it was active
        console.log("Camera stopped.");
        setIsCameraActive(false);
    }
  }, [isCameraActive]); // Depend on isCameraActive

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = null;
      screenVideoRef.current.onloadedmetadata = null;
      screenVideoRef.current.onerror = null;
    }
    if (isScreenActive) { // Only log/set state if it was active
        console.log("Screen share stopped.");
        setIsScreenActive(false);
    }
  }, [isScreenActive]); // Depend on isScreenActive

  const stopAudio = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
     if (isAudioActive) { // Only log/set state if it was active
        console.log("Audio input stopped.");
        setIsAudioActive(false);
     }
  }, [isAudioActive]); // Depend on isAudioActive

  // --- Media Start Functions --- (Defined after stop functions)
  const startCamera = async () => {
    const permissionGranted = await getCameraPermission();
    if (!permissionGranted) return;
    stopScreenShare(); // Ensure other sources are off
    stopAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve, reject) => {
            if (!videoRef.current) return reject(new Error("Video ref became null"));
            videoRef.current.onloadedmetadata = () => resolve();
            videoRef.current.onerror = (e) => reject(new Error(`Video element error: ${e}`));
        });
        await videoRef.current?.play();
        setIsCameraActive(true);
        console.log("Camera started successfully.");
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      toast({ variant: 'destructive', title: 'Camera Error', description: `Could not start camera. ${error instanceof Error ? error.message : ''}` });
      stopCamera(); // Clean up on error
    }
  };

  const startScreenShare = async () => {
    const permissionGranted = await getScreenPermission();
    if (!permissionGranted) return;
    stopCamera(); // Ensure other sources are off
    stopAudio();
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = stream;
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
         await new Promise<void>((resolve, reject) => {
            if (!screenVideoRef.current) return reject(new Error("Screen video ref became null"));
            screenVideoRef.current.onloadedmetadata = () => resolve();
            screenVideoRef.current.onerror = (e) => reject(new Error(`Screen video element error: ${e}`));
        });
        await screenVideoRef.current?.play();
        setIsScreenActive(true);
        console.log("Screen share started successfully.");
      }
      stream.getVideoTracks()[0].onended = () => {
        // Use the already defined stop function
        stopScreenShare();
        toast({ title: "Screen Share Stopped", description: "Screen sharing has ended." });
      };
    } catch (error) {
      console.error('Error starting screen share:', error);
      toast({ variant: 'destructive', title: 'Screen Share Error', description: `Could not start screen share. ${error instanceof Error ? error.message : ''}` });
      stopScreenShare(); // Clean up on error
    }
  };

  const startAudio = async () => {
    const permissionGranted = await getAudioPermission();
    if (!permissionGranted) return;
    stopCamera(); // Ensure other sources are off
    stopScreenShare();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setIsAudioActive(true);
      console.log("Audio input started.");
    } catch (error) {
      console.error('Error starting audio input:', error);
      toast({ variant: 'destructive', title: 'Audio Error', description: `Could not start microphone. ${error instanceof Error ? error.message : ''}` });
      stopAudio(); // Clean up on error
    }
  };

  // --- Media Click Handlers ---
  const handleCameraClick = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const handleScreenClick = () => {
    if (isScreenActive) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  const handleAudioClick = () => {
    if (isAudioActive) {
      stopAudio();
    } else {
      startAudio();
    }
  };

  // --- Cleanup streams on component unmount ---
  useEffect(() => {
    // Return function for cleanup
    return () => {
      stopCamera();
      stopScreenShare();
      stopAudio();
    };
  }, [stopCamera, stopScreenShare, stopAudio]); // Add stop functions to dependency array

  // --- Render ---
  return (
    <PageLayout currentPageName="Vision" showSignIn={false}> {/* Ensure showSignIn is false */}
      {/* API Key Dialog */}
      <Dialog open={isApiKeyDialogOpen} onOpenChange={setIsApiKeyDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Gemini API Keys</DialogTitle>
            <DialogDescription>
              Manage your Gemini API keys. The active key is used for Vision features. Keys are stored locally.
            </DialogDescription>
          </DialogHeader>
          {/* Ensure all required props are passed */}
          <ApiKeyManager
            apiKeys={apiKeys}
            selectedKey={pendingSelectedKey}
            activeKey={apiKey}
            onSelect={handleSelectApiKeyInDialog}
            onAdd={handleAddApiKey}
            onDelete={handleDeleteApiKey}
            onTest={handleTestApiKey}
            onClose={() => setIsApiKeyDialogOpen(false)}
            onSave={handleActivateApiKey}
          />
        </DialogContent>
      </Dialog>

      {/* Main Content Area */}
      <div className="flex flex-col h-full flex-grow overflow-hidden">
        {/* Top Row: Source Buttons */}
        <div className="flex justify-between items-center space-x-4 mb-4 flex-shrink-0">
          <div className="w-[150px] flex-shrink-0"></div> {/* Placeholder */}
          <div className="flex justify-center items-center gap-8 flex-grow">
            <Button
              variant={isCameraActive ? "secondary" : "ghost"}
              size="icon"
              onClick={handleCameraClick}
              className={cn("rounded-full w-12 h-12", isCameraActive && "ring-2 ring-red-500 text-red-500 animate-pulse")}
              disabled={hasCameraPermission === false}
              aria-label={isCameraActive ? "Deactivate Camera" : "Activate Camera"}
            >
              <Camera className="h-6 w-6" />
            </Button>
            <Button
              variant={isScreenActive ? "secondary" : "ghost"}
              size="icon"
              onClick={handleScreenClick}
              className={cn("rounded-full w-12 h-12", isScreenActive && "ring-2 ring-red-500 text-red-500 animate-pulse")}
              disabled={hasScreenPermission === false}
              aria-label={isScreenActive ? "Stop Sharing" : "Activate Screen"}
            >
              <Monitor className="h-6 w-6" />
            </Button>
            <Button
              variant={isAudioActive ? "secondary" : "ghost"}
              size="icon"
              onClick={handleAudioClick}
              className={cn("rounded-full w-12 h-12", isAudioActive && "ring-2 ring-red-500 text-red-500 animate-pulse")}
              disabled={hasAudioPermission === false}
              aria-label={isAudioActive ? "Deactivate Audio" : "Activate Audio"}
            >
              <MicIcon className="h-6 w-6" />
            </Button>
          </div>
          <div className="w-[150px] flex-shrink-0"></div> {/* Placeholder */}
        </div>

        {/* Inline Previews Area */}
        {(isCameraActive || isScreenActive || isAudioActive) && (
          <div className="mb-4 flex-shrink-0 rounded-lg overflow-hidden border bg-secondary/30 flex justify-center items-center p-2 space-x-4">
            {isCameraActive && (
              <div className="flex flex-col items-center">
                <video
                  ref={videoRef}
                  className={cn("w-auto h-32 aspect-video rounded-md bg-black object-cover", { 'hidden': hasCameraPermission === false })}
                  autoPlay muted playsInline
                />
                {hasCameraPermission === false && (
                  <Alert variant="destructive" className="w-auto mt-1 text-xs p-1">
                    <AlertCircle className="h-3 w-3" /> <AlertDescription>Enable camera</AlertDescription>
                  </Alert>
                )}
                <Label className="text-xs mt-1 text-muted-foreground">Camera</Label>
              </div>
            )}
            {isScreenActive && (
              <div className="flex flex-col items-center">
                <video
                  ref={screenVideoRef}
                  className={cn("w-auto h-32 aspect-video rounded-md bg-black object-contain", { 'hidden': hasScreenPermission === false })}
                  autoPlay muted playsInline
                />
                {hasScreenPermission === false && (
                   <Alert variant="destructive" className="w-auto mt-1 text-xs p-1">
                    <AlertCircle className="h-3 w-3" /> <AlertDescription>Enable screen</AlertDescription>
                  </Alert>
                )}
                <Label className="text-xs mt-1 text-muted-foreground">Screen</Label>
              </div>
            )}
            {isAudioActive && (
              <div className="flex flex-col items-center justify-center h-32 w-32 border rounded-md bg-black p-1">
                {hasAudioPermission === false ? (
                   <Alert variant="destructive" className="w-auto m-1 text-xs p-1">
                    <AlertCircle className="h-3 w-3" /> <AlertDescription>Enable mic</AlertDescription>
                  </Alert>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full">
                    <AudioVisualizer isActive={isAudioActive} />
                    <SendAudioToGemini isActive={isAudioActive} wsClientRef={wsClientRef} />
                  </div>
                )}
                <Label className="text-xs mt-1 text-muted-foreground">Audio</Label>
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
                  <div className={`flex w-full items-center ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-1 px-1 gap-2`}>
                    <span className="text-xs font-medium opacity-80">{message.sender === 'user' ? 'You' : 'Gemini'}</span>
                    <span className="text-xs opacity-70">{format(message.timestamp, 'HH:mm')}</span>
                  </div>
                  <div className={`p-3 rounded-lg max-w-[75%] whitespace-pre-wrap shadow-md ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {message.imageUrl && ( // Display image if present
                      <div className="mb-2">
                        <img src={message.imageUrl} alt="User upload" className="max-w-full max-h-60 rounded" />
                      </div>
                    )}
                    {message.text ? (
                      <p className="text-sm">{message.text}</p>
                    ) : (
                      message.sender === 'ai' && isLoading && messages.length > 0 && messages[messages.length - 1]?.id === message.id && (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[80%]" />
                          <Skeleton className="h-4 w-[60%]" />
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
            {messages.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground text-center p-4">
                {/* Updated text */}
                {apiKey ? 'Activate a source (Camera, Screen, Audio), upload an image, or start chatting below.' : 'Click the header button to enter your Gemini API key.'}
                 {(!geminiWsUrl || geminiWsUrl === PLACEHOLDER_WS_URL) && <span className="text-destructive block mt-2">WebSocket URL not configured!</span>}
              </p>
            )}
            <div ref={messagesEndRef} /> {/* Scroll target */}
          </div>
        </ScrollArea>

        {/* Image Preview Area (Above Input) */}
        {selectedImageDataUrl && (
          <div className="relative mb-2 p-2 border rounded-md bg-secondary/50 w-fit self-start ml-1">
            <img src={selectedImageDataUrl} alt="Selected preview" className="h-20 w-auto rounded" />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
              onClick={handleRemoveImage}
              aria-label="Remove image"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        )}


        {/* Input Area */}
        <div className="flex items-center space-x-2 mt-auto flex-shrink-0">
          {/* Hidden File Input (already added) */}
           <input
             type="file"
             ref={fileInputRef}
             onChange={handleFileChange}
             accept="image/*"
             className="hidden"
           />
          <Input
            type="text"
            // Updated placeholder
            placeholder={apiKey ? "Type your message or upload an image..." : "Please set an API Key first"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow"
            disabled={isLoading || !apiKey || !geminiWsUrl || geminiWsUrl === PLACEHOLDER_WS_URL}
          />
          {/* File Upload Button */}
          <Button
             variant="outline"
             size="icon"
             onClick={handleImageUploadClick} // Connect handler
             // Update disabled logic
             disabled={isLoading || !apiKey || !geminiWsUrl || geminiWsUrl === PLACEHOLDER_WS_URL || !!selectedImageDataUrl}
             title="Upload Image"
           >
            <Upload className="h-4 w-4" />
          </Button>
          <Button
             // Pass both inputValue and selectedImageDataUrl
             onClick={() => handleSendMessage(inputValue, selectedImageDataUrl)}
             disabled={
               isLoading ||
               !apiKey ||
               !geminiWsUrl ||
               geminiWsUrl === PLACEHOLDER_WS_URL ||
               // Update disabled logic: disable if no text AND no image
               (!inputValue.trim() && !selectedImageDataUrl)
             }
           >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send"}
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
