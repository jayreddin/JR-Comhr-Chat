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
    provider: "Gemini",
    models: ["gemini-2.0-flash", "gemini-1.5-flash", "google/gemma-2-27b-it"],
  },
  {
    provider: "Meta",
    models: [
      "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
    ],
  },
  {
    provider: "Mistral",
    models: ["mistral-large-latest", "pixtral-large-latest", "codestral-latest"],
  },
  {
    provider: "XAI",
    models: ["grok-beta"],
  },
];

const defaultModel = modelProviders.find(p => p.defaultModel)?.defaultModel || modelProviders[0].models[0];

interface AppHeaderProps {
  currentPageName?: string; // Optional prop for current page name override
}

export function AppHeader({ currentPageName }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activePage, setActivePage] = useState<NavItem | null>(null);
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);
  const [username, setUsername] = useState<string | null>(null);
  const [puterLoaded, setPuterLoaded] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPageSwitcherOpen, setIsPageSwitcherOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);

  const checkAuthStatus = useCallback(async () => {
    if (typeof window !== 'undefined' && window.puter) {
      setPuterLoaded(true);
      try {
        const signedIn = await window.puter.auth.isSignedIn();
        setIsSignedIn(signedIn);
        if (signedIn) {
          const user: PuterUser = await window.puter.auth.getUser();
          setUsername(user.username);
        } else {
          setUsername(null);
        }
      } catch (error) {
        console.error("Error checking Puter auth status:", error);
        setIsSignedIn(false);
        setUsername(null);
        // Optional: Show a toast message
        // toast({ variant: "destructive", title: "Auth Error", description: "Could not verify login status." });
      }
    } else {
        // console.log("Puter library not loaded yet or window not available.");
        // Retry after a short delay if Puter object not yet available
        // Avoid infinite loops if Puter script fails to load
        if (!puterLoaded) { // Only retry if not loaded yet
            setTimeout(checkAuthStatus, 200); // Increased delay slightly
        }
    }
  }, [puterLoaded]); // Added puterLoaded dependency


  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    const currentPathItem = navItems.find(item => pathname.startsWith(item.href));
    setActivePage(currentPathItem || null);
  }, [pathname]);

  const handleSignIn = async () => {
    if (!puterLoaded || typeof window === 'undefined' || !window.puter?.auth?.signIn) {
      toast({ variant: "destructive", title: "Error", description: "Authentication service not ready. Please wait a moment and try again." });
      console.error("Puter auth.signIn is not available.");
      return;
    }
    try {
        // Attempt to use puter.ui.authenticateWithPuter first for better mobile UX
        if (window.puter.ui && window.puter.ui.authenticateWithPuter) {
             try {
                // This method often provides a better iframe-like experience on mobile
                await window.puter.ui.authenticateWithPuter();
                await checkAuthStatus(); // Re-check status after authentication attempt
             } catch(authUiError) {
                // If authenticateWithPuter fails or is cancelled, fall back to signIn
                console.warn("authenticateWithPuter failed or cancelled, falling back to auth.signIn:", authUiError);
                 if (authUiError instanceof Error && authUiError.message !== "User cancelled the dialog.") {
                     await window.puter.auth.signIn();
                     await checkAuthStatus();
                 } else if (!(authUiError instanceof Error) && typeof authUiError === 'string' && authUiError.includes("cancelled")) {
                     // Do nothing if specifically cancelled
                 } else {
                    // Re-throw unexpected errors from authenticateWithPuter
                    // throw authUiError; // Or handle differently
                     await window.puter.auth.signIn(); // Try signIn anyway
                     await checkAuthStatus();
                 }
             }
        } else {
            // Fallback if authenticateWithPuter is not available
            await window.puter.auth.signIn();
            await checkAuthStatus();
        }

    } catch (error) {
      console.error("Puter sign in error:", error);
      // The promise rejects if the user cancels the dialog.
      // Only show error toast for actual failures.
      if (error instanceof Error && error.message !== "User cancelled the dialog.") {
         toast({ variant: "destructive", title: "Sign In Failed", description: "An error occurred during sign in. Please try again." });
      } else if (!(error instanceof Error)) {
          // Handle cases where the error might not be an Error object
           toast({ variant: "destructive", title: "Sign In Failed", description: "An unexpected error occurred during sign in." });
      }
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
              {/* Optionally show a user avatar */}
              {/* <User className="h-6 w-6 text-muted-foreground" /> */}
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
                  {selectedModel}
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
                            {model}
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
                             {/* Add model settings components here - Could link to chat page dropdown? */}
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
                            <p>API keys, system prompts, etc.</p>
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
