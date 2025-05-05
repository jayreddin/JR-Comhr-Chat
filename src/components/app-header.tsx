
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
import { useIsMobile } from '@/hooks/use-mobile'; // Import mobile hook

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

// AI Model Definitions (Initial structure, actual list managed by context)
const modelProvidersStructure = [
  { provider: "OpenAI", models: [] as string[] },
  { provider: "Anthropic", models: [] as string[] },
  { provider: "DeepSeek", models: [] as string[] },
  { provider: "Gemini", models: [] as string[] },
  { provider: "Meta", models: [] as string[] },
  { provider: "Mistral", models: [] as string[] },
  { provider: "XAI", models: [] as string[] },
  { provider: "OpenRouter", models: [] as string[] }, // Add OpenRouter placeholder
];

// Helper function to group enabled models by provider
const groupModelsByProvider = (enabledModels: string[]) => {
    const grouped: { provider: string; models: string[] }[] = JSON.parse(JSON.stringify(modelProvidersStructure)); // Deep copy

    enabledModels.forEach(model => {
        let found = false;
        for (const providerGroup of grouped) {
            // Check if model belongs to a known default provider based on prefix or known list
            // Handle OpenRouter prefix explicitly
             if (providerGroup.provider === "OpenRouter" && model.startsWith('openrouter:')) {
                providerGroup.models.push(model);
                found = true;
                break;
            } else if (
                (providerGroup.provider === "OpenAI" && (model.startsWith('gpt') || model.startsWith('o'))) ||
                (providerGroup.provider === "Anthropic" && model.startsWith('claude')) ||
                (providerGroup.provider === "DeepSeek" && model.startsWith('deepseek')) ||
                (providerGroup.provider === "Gemini" && model.startsWith('google/')) ||
                (providerGroup.provider === "Meta" && model.startsWith('meta-llama/')) ||
                (providerGroup.provider === "Mistral" && (model.startsWith('mistral') || model.startsWith('pixtral') || model.startsWith('codestral'))) ||
                (providerGroup.provider === "XAI" && model.startsWith('x-ai/'))
            ) {
                // Exclude models that might accidentally match a default prefix but are OpenRouter
                if (!model.startsWith('openrouter:')) {
                     providerGroup.models.push(model);
                     found = true;
                     break;
                }
            }
        }
        // If not found in default providers AND doesn't have openrouter: prefix, try assigning to OpenRouter anyway
        // This is a fallback, ideally context provides the correct prefix.
        if (!found && !model.startsWith('openrouter:')) {
            const openRouterProvider = grouped.find(p => p.provider === "OpenRouter");
            if (openRouterProvider) {
                // Add the prefix for consistency internally? Or leave as is?
                // Adding prefix might be safer for differentiation.
                openRouterProvider.models.push(`openrouter:${model}`);
                console.warn(`Model "${model}" added to OpenRouter group without prefix.`);
            } else {
                console.warn(`Model "${model}" doesn't match known providers and OpenRouter group not found.`);
            }
        } else if (!found && model.startsWith('openrouter:')) {
             // Should have been found, but handle case where OpenRouter group might be missing initially
             const openRouterProvider = grouped.find(p => p.provider === "OpenRouter");
             if (openRouterProvider) {
                openRouterProvider.models.push(model);
             } else {
                 console.warn(`Model "${model}" has OpenRouter prefix but group not found.`);
             }
        }
    });

    // Filter out providers with no enabled models and sort models within each provider
    return grouped
        .filter(group => group.models.length > 0)
        .map(group => ({ ...group, models: group.models.sort() }));
};


interface AppHeaderProps {
  currentPageName?: string; // Optional prop for current page name override
}

export function AppHeader({ currentPageName }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile(); // Check if mobile
  // Use context for selected model and the list of enabled models
  const { selectedModel, setSelectedModel, enabledModels } = useAppState();
  const [activePage, setActivePage] = useState<NavItem | null>(null);
  const [isSignedIn, setIsSignedIn] = useState<boolean | undefined>(undefined); // Start as undefined
  const [username, setUsername] = useState<string | null>(null);
  const [puterLoaded, setPuterLoaded] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPageSwitcherOpen, setIsPageSwitcherOpen] = useState(false);

  // Group the enabled models from context for the dropdown
  const groupedEnabledModels = groupModelsByProvider(enabledModels);

  const checkAuthStatus = useCallback(async (retryCount = 0) => {
    // Ensure running on client
    if (typeof window === 'undefined') return;

    if (window.puter?.auth) {
      if (!puterLoaded) {
          console.log("Puter object loaded.");
          setPuterLoaded(true); // Mark as loaded
      }
      try {
        console.log("Checking Puter auth status...");
        const signedIn = await window.puter.auth.isSignedIn();
        setIsSignedIn(signedIn); // Update state
        if (signedIn) {
          const user: PuterUser = await window.puter.auth.getUser();
          setUsername(user.username);
          console.log("User is signed in:", user.username);
        } else {
          setUsername(null);
          console.log("User is not signed in.");
        }
      } catch (error) {
        console.error("Error checking Puter auth status:", error);
        setIsSignedIn(false); // Assume not signed in on error
        setUsername(null);
      }
    } else {
      // Optionally retry if Puter hasn't loaded yet, with a limit
      if (retryCount < 5) {
        const retryDelay = 300 * Math.pow(2, retryCount); // Exponential backoff
        console.log(`Puter not loaded yet, retrying auth check in ${retryDelay}ms... (Attempt ${retryCount + 1})`);
        setTimeout(() => checkAuthStatus(retryCount + 1), retryDelay);
      } else {
        console.error("Puter object or puter.auth not found after multiple retries.");
        setPuterLoaded(false); // Mark as not loaded if it fails repeatedly
        setIsSignedIn(false); // Assume not signed in if Puter never loads
      }
    }
  }, [puterLoaded]); // Re-run if puterLoaded changes

  // Initial auth check on component mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]); // Depend on the useCallback function


  useEffect(() => {
    const currentPathItem = navItems.find(item => pathname.startsWith(item.href));
    setActivePage(currentPathItem || null);
  }, [pathname]);

 const handleSignIn = async () => {
    if (typeof window === 'undefined' || !window.puter) {
      toast({ variant: "destructive", title: "Error", description: "Authentication service not ready. Please wait a moment and try again." });
      console.error("Puter library not loaded or window not available.");
      return;
    }

    console.log("Attempting sign in...");

    // Use puter.ui.authenticateWithPuter on desktop, puter.auth.signIn on mobile
    const authMethod = !isMobile && window.puter.ui?.authenticateWithPuter
        ? window.puter.ui.authenticateWithPuter
        : window.puter.auth?.signIn;

     const authMethodName = !isMobile && window.puter.ui?.authenticateWithPuter
         ? 'puter.ui.authenticateWithPuter'
         : 'puter.auth.signIn';


    if (!authMethod) {
         console.error(`Puter auth method (${authMethodName}) not found!`);
         toast({ variant: "destructive", title: "Error", description: "Sign in function not available." });
         return;
    }

    try {
      console.log(`Trying ${authMethodName}()...`);
      // Call the selected authentication method
      await authMethod();
      // The promise resolves when the dialog/popup is closed or auth completes.
      // It doesn't guarantee success, only that the flow finished.
      console.log(`${authMethodName} finished (or cancelled by user).`);

      // Wait slightly longer AFTER the promise resolves to allow Puter's internal state
      // and potential redirects/refreshes to settle before checking status.
      await new Promise(resolve => setTimeout(resolve, 1000)); // Increased delay

      console.log("Re-checking auth status after authentication attempt.");
      await checkAuthStatus(); // Check status again after the attempt

    } catch (error: any) {
       // Check specifically for cancellation errors
      const isCancellation = error?.message?.toLowerCase().includes("cancel") || error?.code === 'auth_canceled';

      if (isCancellation) {
         console.log("User cancelled the authentication process.");
         // No need for an error toast if the user cancelled
      } else {
         console.error("Sign in error caught:", error);
         toast({ variant: "destructive", title: "Sign In Failed", description: `An error occurred: ${error.message || 'Unknown error'}. Please try again.` });
      }

      // Ensure status is checked even on error/cancellation after a small delay
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log("Re-checking auth status after sign-in attempt resulted in error or cancellation.");
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
      console.log("Attempting sign out..."); // Add log
      await window.puter.auth.signOut();
      setIsSignedIn(false);
      setUsername(null);
      toast({ title: "Signed Out", description: "Successfully signed out." });
      console.log("Sign out successful."); // Add log
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
     // Remove potential 'openrouter:' prefix for display
     const nameWithoutPrefix = modelName.startsWith('openrouter:')
        ? modelName.substring('openrouter:'.length)
        : modelName;
     // Then take the part after the last '/'
     return nameWithoutPrefix.split('/').pop() || nameWithoutPrefix;
  }


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between max-w-screen-2xl px-4 md:px-6">

        {/* Left side: Authentication */}
        <div className="flex items-center space-x-2 min-w-[150px]"> {/* Added min-width */}
          {isSignedIn === undefined ? ( // Show loading state until status is known
            <Button variant="outline" size="sm" disabled>Loading Auth...</Button>
          ) : isSignedIn ? (
            <div className="flex items-center space-x-2">
              <div className="flex flex-col items-start text-xs">
                {/* Add border to username */}
                <span className="font-medium text-foreground border border-border rounded-md px-2 py-1">{username || 'User'}</span>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-auto p-0 text-muted-foreground hover:text-destructive mt-1">
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
        <div className="flex items-center justify-center flex-grow"> {/* Added flex-grow and justify-center */}
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
                    {/* Map over the grouped ENABLED models */}
                    {groupedEnabledModels.map(providerGroup => (
                        <DropdownMenuGroup key={providerGroup.provider}>
                            <DropdownMenuLabel>{providerGroup.provider}</DropdownMenuLabel>
                            {providerGroup.models.map(model => (
                                <DropdownMenuRadioItem key={model} value={model}>
                                {getModelDisplayName(model)}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuGroup>
                    ))}
                     {/* Show message if no models are enabled */}
                    {enabledModels.length === 0 && (
                         <DropdownMenuLabel className="text-muted-foreground text-xs italic text-center py-2">
                            No models enabled in settings.
                        </DropdownMenuLabel>
                    )}
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
        <div className="flex items-center space-x-2 min-w-[150px] justify-end"> {/* Added min-width and justify-end */}
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
                            {/* Removed Title/Description from here */}
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6 scrollbar-hide">
                            {/* Model selection UI moved to Footer */}
                            <p className="text-sm text-muted-foreground">Model selection is available in the chat settings (cog icon) in the footer.</p>
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

// Removed duplicate useIsMobile function as it's imported from hooks/use-mobile
