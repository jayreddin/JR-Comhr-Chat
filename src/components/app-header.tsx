
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import {
    ChevronDown, MessageSquare, Eye, Mic, Image as ImageIcon, MoreHorizontal, Home, Settings, LayoutGrid, LogIn, LogOut, User, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppState } from '@/context/app-state-context'; // Import the context hook

// Define Puter types locally to avoid TS errors if library isn't loaded server-side
declare global {
    interface Window {
        puter: any;
    }
}

interface PuterUser {
    uuid: string;
    username: string;
    email_confirmed: boolean;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: "Chat", href: "/chat", icon: MessageSquare },
  { name: "Vision", href: "/vision", icon: Eye },
  { name: "Talk", href: "/talk", icon: Mic },
  { name: "Image Gen", href: "/image-gen", icon: ImageIcon },
  { name: "More", href: "/more", icon: MoreHorizontal },
];

// AI Model Definitions
const modelProviders = [
  {
    provider: "OpenAI",
    models: [
      "gpt-4o-mini", "gpt-4o", "o1", "o1-mini", "o1-pro", "o3", "o3-mini", "o4-mini",
      "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4.5-preview",
    ],
    defaultModel: "gpt-4o-mini",
  },
  {
    provider: "Anthropic",
    models: ["claude-3-7-sonnet", "claude-3-5-sonnet"],
  },
  {
    provider: "DeepSeek",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    // Provider name mapping for Puter.js (use 'google' for Gemini models)
    provider: "Gemini",
    // Updated Gemini model names based on Puter docs
    models: [
        "google/gemini-2.0-flash-lite-001", // Match example
        "google/gemini-flash-1.5", // Match example, might be google/gemini-flash-1.5-8b? Verify if issues
        "google/gemma-2-27b-it",
        "google/gemini-2.5-flash-preview",
        "google/gemini-2.5-pro-exp-03-25:free",
        // Added more from Gemini doc example
        "google/gemini-pro-1.5",
        "google/gemini-pro",
    ],
  },
  {
    // Provider name mapping for Puter.js (use 'meta-llama' prefix)
    provider: "Meta",
    // Updated Llama model names based on Puter docs
    models: [
      "meta-llama/llama-3.1-8b-instruct", // Match example
      "meta-llama/llama-3.1-70b-instruct", // Match example
      "meta-llama/llama-3.1-405b-instruct", // Match example
      "meta-llama/llama-4-maverick",
      "meta-llama/llama-4-scout",
      "meta-llama/llama-3.3-70b-instruct",
      "meta-llama/llama-3-8b-instruct",
      "meta-llama/llama-3-70b-instruct",
      "meta-llama/llama-2-70b-chat",
      "meta-llama/llama-guard-3-8b",
    ],
  },
  {
    // Provider name mapping for Puter.js
    provider: "Mistral",
    // Updated Mistral model names based on Puter docs
    models: [
        "mistral-large-latest",
        "pixtral-large-latest",
        "codestral-latest"
    ],
  },
  {
    // Provider name mapping for Puter.js (use 'x-ai' prefix)
    provider: "XAI",
     // Updated Grok model names based on Puter docs
    models: ["x-ai/grok-3-beta"],
  },
];


interface AppHeaderProps {
  currentPageName?: string; // Optional prop for current page name override
}

export function AppHeader({ currentPageName }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedModel, setSelectedModel } = useAppState(); // Use context
  const [activePage, setActivePage] = useState<NavItem | null>(null);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>(null);
  const [puterLoaded, setPuterLoaded] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPageSwitcherOpen, setIsPageSwitcherOpen] = useState(false);


  const checkAuthStatus = useCallback(async () => {
    // Ensure running on client and puter object exists
    if (typeof window !== 'undefined' && window.puter?.auth) {
      setPuterLoaded(true); // Mark as loaded if auth object is present
      try {
        const signedIn = await window.puter.auth.isSignedIn();
        setIsSignedIn(signedIn);
        if (signedIn) {
          const user: PuterUser = await window.puter.auth.getUser();
          setUsername(user.username);
          console.log("User is signed in:", user.username); // Log signed in status
        } else {
          setUsername(null);
          console.log("User is not signed in."); // Log signed out status
        }
      } catch (error) {
        console.error("Error checking Puter auth status:", error);
        setIsSignedIn(false);
        setUsername(null);
      }
    } else {
        // Optionally retry if Puter hasn't loaded yet
        if (!puterLoaded) {
             console.log("Puter not loaded yet, retrying auth check...");
            setTimeout(checkAuthStatus, 300); // Slightly increased delay
        } else {
             console.log("Puter loaded but auth methods not available (or not on client).");
        }
    }
  }, [puterLoaded]); // Depend on puterLoaded


  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]); // Run checkAuthStatus when it or puterLoaded changes

  useEffect(() => {
    const currentPathItem = navItems.find(item => pathname.startsWith(item.href));
    setActivePage(currentPathItem || null);
  }, [pathname]);

 const handleSignIn = async () => {
    if (!puterLoaded || typeof window === 'undefined' || !window.puter) {
      toast({ variant: "destructive", title: "Error", description: "Authentication service not ready. Please wait a moment and try again." });
      console.error("Puter library not loaded or window not available.");
      return;
    }

    console.log("Attempting sign in..."); // Add log

    try {
        // Check if puter.ui.authenticateWithPuter exists and try it first
        if (window.puter.ui && window.puter.ui.authenticateWithPuter) {
             console.log("Trying puter.ui.authenticateWithPuter()..."); // Add log
             try {
                await window.puter.ui.authenticateWithPuter();
                console.log("authenticateWithPuter completed (or cancelled)."); // Add log
                // No explicit error means it either succeeded or was cancelled by user.
                // Re-check status regardless to update UI state.
                await checkAuthStatus();
                return; // Exit after attempting this method
             } catch(authUiError) {
                console.warn("puter.ui.authenticateWithPuter() failed or was cancelled:", authUiError); // Add log
                // Check if it was *not* a user cancellation before falling back
                 if (authUiError instanceof Error && authUiError.message.toLowerCase().includes("cancel")) {
                     console.log("User cancelled authenticateWithPuter dialog."); // Add log
                     // Don't fall back if user explicitly cancelled
                     await checkAuthStatus(); // Still check status in case something changed unexpectedly
                     return;
                 } else {
                     // Fallback to signIn for other errors or if the method failed unexpectedly
                     console.log("Falling back to puter.auth.signIn() due to authenticateWithPuter error."); // Add log
                     // Proceed to the signIn block below
                 }
             }
        } else {
             console.log("puter.ui.authenticateWithPuter() not found, using puter.auth.signIn()..."); // Add log
        }

        // Fallback or primary method: puter.auth.signIn()
        if (window.puter.auth && window.puter.auth.signIn) {
            await window.puter.auth.signIn();
            console.log("puter.auth.signIn() completed (or cancelled)."); // Add log
            // signIn resolves even on cancellation, so always check status after.
            await checkAuthStatus();
        } else {
            console.error("Puter auth.signIn method not found!"); // Add log
            toast({ variant: "destructive", title: "Error", description: "Sign in function not available." });
        }

    } catch (error) {
      // Catch errors primarily from the outer try block (less likely now)
      console.error("General sign in error caught:", error); // Add log
      // Handle potential errors (though cancellations are usually handled above)
      if (error instanceof Error && !error.message.toLowerCase().includes("cancel")) {
         toast({ variant: "destructive", title: "Sign In Failed", description: "An error occurred during sign in. Please try again." });
      } else if (!(error instanceof Error)) {
          toast({ variant: "destructive", title: "Sign In Failed", description: "An unexpected error occurred during sign in." });
      }
      // Ensure status is checked even on error
      await checkAuthStatus();
    }
  };


  const handleSignOut = async () => {
    if (!puterLoaded || typeof window === 'undefined' || !window.puter?.auth?.signOut) {
      toast({ variant: "destructive", title: "Error", description: "Authentication service not ready." });
      console.error("Puter auth.signOut is not available.");
      return;
    }
    try {
      await window.puter.auth.signOut();
      setIsSignedIn(false);
      setUsername(null);
      toast({ title: "Signed Out", description: "Successfully signed out." });
    } catch (error) {
      console.error("Puter sign out error:", error);
      toast({ variant: "destructive", title: "Sign Out Failed", description: "An error occurred during sign out." });
    }
  };


  const handleNavigation = (href: string) => {
    router.push(href);
    setIsPageSwitcherOpen(false); // Close dialog on navigation
  };

  // Determine the title to display (or dropdown for Chat page)
  const pageTitle = currentPageName || activePage?.name || "JR Comhrá AI";
  const isChatPage = pathname.startsWith('/chat');

  // Function to get display name (short version without provider prefix)
  const getModelDisplayName = (modelName: string): string => {
     return modelName.split('/').pop() || modelName;
  }


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between max-w-screen-2xl px-4 md:px-6">

        {/* Left side: Authentication */}
        <div className="flex items-center space-x-2">
          {!puterLoaded ? (
            <Button variant="outline" size="sm" disabled>Loading...</Button>
          ) : isSignedIn ? (
            <div className="flex items-center space-x-2">
              <div className="flex flex-col items-start text-xs">
                <span className="font-medium text-foreground">{username || 'User'}</span>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-auto p-0 text-muted-foreground hover:text-destructive">
                  <LogOut className="mr-1 h-3 w-3" /> Sign Out
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={handleSignIn}>
              <LogIn className="mr-2 h-4 w-4" /> Sign In
            </Button>
          )}
        </div>

        {/* Center: App Title or Model Selector */}
        <div className="flex items-center">
          {isChatPage ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-lg font-semibold text-primary hover:text-accent transition-colors px-2">
                  {getModelDisplayName(selectedModel)}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 max-h-96 overflow-y-auto">
                 <DropdownMenuRadioGroup value={selectedModel} onValueChange={setSelectedModel}>
                    {modelProviders.map(provider => (
                        <DropdownMenuGroup key={provider.provider}>
                        <DropdownMenuLabel>{provider.provider}</DropdownMenuLabel>
                        {provider.models.map(model => (
                            <DropdownMenuRadioItem key={model} value={model}>
                              {getModelDisplayName(model)}
                            </DropdownMenuRadioItem>
                        ))}
                        </DropdownMenuGroup>
                    ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/" className="flex items-center">
                <h1 className="text-lg font-semibold text-primary hover:text-accent transition-colors">
                    {pageTitle}
                </h1>
            </Link>
          )}
        </div>


        {/* Right side: Page Switcher & Settings */}
        <div className="flex items-center space-x-2">
          <TooltipProvider delayDuration={100}>
            {/* Page Switcher Dialog */}
            <Dialog open={isPageSwitcherOpen} onOpenChange={setIsPageSwitcherOpen}>
              <Tooltip>
                  <TooltipTrigger asChild>
                     <DialogTrigger asChild>
                       <Button variant="ghost" size="icon">
                         <LayoutGrid className="h-5 w-5" />
                         <span className="sr-only">Switch Page</span>
                       </Button>
                     </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                     <p>Switch Page</p>
                  </TooltipContent>
              </Tooltip>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Switch Page</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  {navItems.map((item) => (
                    <Button
                      key={item.name}
                      variant={pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
                      onClick={() => handleNavigation(item.href)}
                      className="justify-start"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.name}</span>
                    </Button>
                  ))}
                  <Button
                      variant={pathname === '/' ? 'secondary' : 'ghost'}
                      onClick={() => handleNavigation('/')}
                      className="justify-start"
                  >
                      <Home className="mr-2 h-4 w-4" />
                      <span>Landing Page</span>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Settings Dialog */}
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Settings className="h-5 w-5" />
                        <span className="sr-only">Settings</span>
                      </Button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Settings</p>
                  </TooltipContent>
                </Tooltip>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle>Settings</DialogTitle>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto pr-2"> {/* Added overflow and padding */}
                    <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-4">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="models">Models</TabsTrigger>
                        <TabsTrigger value="advanced">Advanced</TabsTrigger>
                        <TabsTrigger value="camera-audio">Media</TabsTrigger>
                        <TabsTrigger value="misc">Misc</TabsTrigger>
                        <TabsTrigger value="help">Help</TabsTrigger>
                    </TabsList>
                    <TabsContent value="general">
                        <Card>
                        <CardHeader>
                            <CardTitle>General Settings</CardTitle>
                            <CardDescription>Basic application preferences.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>Theme, language, etc.</p>
                            {/* Add general settings components here */}
                        </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="models">
                        <Card>
                        <CardHeader>
                            <CardTitle>Model Settings</CardTitle>
                            <CardDescription>Configure AI model parameters.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>Select models, adjust temperature, etc.</p>
                             {/* Could potentially display the model dropdown here too */}
                             {/* Or add other model-specific settings */}
                        </CardContent>
                        </Card>
                    </TabsContent>
                     <TabsContent value="advanced">
                        <Card>
                        <CardHeader>
                            <CardTitle>Advanced Settings</CardTitle>
                            <CardDescription>Expert configurations.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>API keys (if applicable), system prompts, etc.</p>
                            {/* Add advanced settings components here */}
                        </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="camera-audio">
                         <Card>
                        <CardHeader>
                            <CardTitle>Camera & Audio Settings</CardTitle>
                            <CardDescription>Manage media input devices.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>Select camera, microphone, output device.</p>
                            {/* Add camera/audio settings components here */}
                        </CardContent>
                        </Card>
                    </TabsContent>
                     <TabsContent value="misc">
                         <Card>
                        <CardHeader>
                            <CardTitle>Miscellaneous Settings</CardTitle>
                            <CardDescription>Other configurations.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>Export/Import settings, reset options.</p>
                            {/* Add misc settings components here */}
                        </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="help">
                         <Card>
                        <CardHeader>
                            <CardTitle>Help & About</CardTitle>
                            <CardDescription>Information and support.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p>Version info, documentation links, contact.</p>
                            {/* Add help content here */}
                        </CardContent>
                        </Card>
                    </TabsContent>
                    </Tabs>
                </div>
                 {/* Removed DialogFooter for consistency, close button is in top right */}
              </DialogContent>
            </Dialog>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
}

