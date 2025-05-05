"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from "@/components/ui/input";
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
import { useAppState } from '@/context/app-state-context';
import { useIsMobile } from '@/hooks/use-mobile';

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

const modelProvidersStructure = [
  { provider: "OpenAI", models: [] as string[] },
  { provider: "Anthropic", models: [] as string[] },
  { provider: "DeepSeek", models: [] as string[] },
  { provider: "Gemini", models: [] as string[] },
  { provider: "Meta", models: [] as string[] },
  { provider: "Mistral", models: [] as string[] },
  { provider: "XAI", models: [] as string[] },
  { provider: "OpenRouter", models: [] as string[] },
];

const groupModelsByProvider = (enabledModels: string[]) => {
    const grouped: { provider: string; models: string[] }[] = JSON.parse(JSON.stringify(modelProvidersStructure));

    enabledModels.forEach(model => {
        let found = false;
        for (const providerGroup of grouped) {
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
                if (!model.startsWith('openrouter:')) {
                    providerGroup.models.push(model);
                    found = true;
                    break;
                }
            }
        }
        if (!found && !model.startsWith('openrouter:')) {
            const openRouterProvider = grouped.find(p => p.provider === "OpenRouter");
            if (openRouterProvider) {
                openRouterProvider.models.push(`openrouter:${model}`);
                console.warn(`Model "${model}" added to OpenRouter group without prefix.`);
            } else {
                console.warn(`Model "${model}" doesn't match known providers and OpenRouter group not found.`);
            }
        } else if (!found && model.startsWith('openrouter:')) {
            const openRouterProvider = grouped.find(p => p.provider === "OpenRouter");
            if (openRouterProvider) {
                openRouterProvider.models.push(model);
            } else {
                console.warn(`Model "${model}" has OpenRouter prefix but group not found.`);
            }
        }
    });

    return grouped
        .filter(group => group.models.length > 0)
        .map(group => ({ ...group, models: group.models.sort() }));
};

interface AppHeaderProps {
  currentPageName?: string;
  showSignIn?: boolean;
}

export function AppHeader({ currentPageName, showSignIn = true }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isImageGenPage = pathname === '/image-gen';
  const isMobile = useIsMobile();
  const { selectedModel, setSelectedModel, enabledModels } = useAppState();
  const [tempApiKey, setTempApiKey] = useState('');
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [isKeyValid, setIsKeyValid] = useState<boolean | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const testApiKey = async () => {
    setIsValidatingKey(true);
    setIsKeyValid(null);
    try {
      const geminiApiKey = tempApiKey;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
      const isValid = response.ok;
      setIsKeyValid(isValid);
      if (isValid) {
        toast({
          title: 'API Key Valid',
          description: 'Your Gemini API key is valid.',
        });
      } else {
        toast({
          title: 'Invalid API Key',
          description: 'Please check your API key and try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      setIsKeyValid(false);
      toast({
        title: 'Validation Error',
        description: 'Failed to validate API key. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsValidatingKey(false);
    }
  };

  const saveApiKey = () => {
    if (!tempApiKey) {
      toast({
        title: 'Cannot Save',
        description: 'Please enter an API key.',
        variant: 'destructive'
      });
      return;
    }
    
    localStorage.setItem('geminiApiKey', tempApiKey);
    toast({
      title: 'API Key Saved',
      description: 'Your API key has been saved successfully.'
    });
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activePage, setActivePage] = useState<NavItem | null>(null);
  const [isSignedIn, setIsSignedIn] = useState<boolean | undefined>(undefined);
  const [username, setUsername] = useState<string | null>(null);
  const [puterLoaded, setPuterLoaded] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPageSwitcherOpen, setIsPageSwitcherOpen] = useState(false);

  const groupedEnabledModels = groupModelsByProvider(enabledModels);

  const checkAuthStatus = useCallback(async (retryCount = 0) => {
    if (typeof window === 'undefined') return;

    if (window.puter?.auth) {
      if (!puterLoaded) {
          console.log("Puter object loaded.");
          setPuterLoaded(true);
      }
      try {
        console.log("Checking Puter auth status...");
        const signedIn = await window.puter.auth.isSignedIn();
        setIsSignedIn(signedIn);
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
        setIsSignedIn(false);
        setUsername(null);
      }
    } else {
      if (retryCount < 5) {
        const retryDelay = 300 * Math.pow(2, retryCount);
        console.log(`Puter not loaded yet, retrying auth check in ${retryDelay}ms... (Attempt ${retryCount + 1})`);
        setTimeout(() => checkAuthStatus(retryCount + 1), retryDelay);
      } else {
        console.error("Puter object or puter.auth not found after multiple retries.");
        setPuterLoaded(false);
        setIsSignedIn(false);
      }
    }
  }, [puterLoaded]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkAuthStatus();
    }, 200);
    return () => clearTimeout(timer);
  }, [checkAuthStatus]);

  useEffect(() => {
    const currentPathItem = navItems.find(item => pathname.startsWith(item.href));
    setActivePage(currentPathItem || null);
  }, [pathname]);

  useEffect(() => {
    if (isDialogOpen) {
      const savedKey = localStorage.getItem('geminiApiKey') || '';
      setTempApiKey(savedKey);
    }
  }, [isDialogOpen]);

  const handleSignIn = async () => {
    if (typeof window === 'undefined' || !window.puter) {
      toast({ variant: "destructive", title: "Error", description: "Authentication service not ready. Please wait a moment and try again." });
      console.error("Puter library not loaded or window not available.");
      return;
    }

    console.log("Attempting sign in...");

    const authMethod = window.puter.auth?.signIn;
    const authMethodName = 'puter.auth.signIn';

    if (!authMethod) {
        console.error(`Puter auth method (${authMethodName}) not found!`);
        toast({ variant: "destructive", title: "Error", description: "Sign in function not available." });
        return;
    }

    try {
        console.log(`Trying ${authMethodName}()...`);
        await authMethod();
        console.log(`${authMethodName} finished successfully.`);

        await new Promise(resolve => setTimeout(resolve, 300));

        console.log("Re-checking auth status after successful authentication attempt.");
        await checkAuthStatus();

    } catch (error: any) {
        console.error("Sign in error caught or process interrupted:", error);
        toast({ variant: "destructive", title: "Sign In Issue", description: `An issue occurred during sign in: ${error.message || 'Process interrupted or unknown error'}. Please try again.` });

        await new Promise(resolve => setTimeout(resolve, 300));
        console.log("Re-checking auth status after sign-in attempt resulted in error or interruption.");
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
      console.log("Attempting sign out...");
      await window.puter.auth.signOut();
      setIsSignedIn(false);
      setUsername(null);
      toast({ title: "Signed Out", description: "Successfully signed out." });
      console.log("Sign out successful.");
    } catch (error) {
      console.error("Puter sign out error:", error);
      toast({ variant: "destructive", title: "Sign Out Failed", description: "An error occurred during sign out." });
    }
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setIsPageSwitcherOpen(false);
  };

  const pageTitle = currentPageName || activePage?.name || "JR Comhrá AI";
  const isChatPage = pathname.startsWith('/chat');

  const getModelDisplayName = (modelName: string): string => {
    const nameWithoutPrefix = modelName.startsWith('openrouter:')
      ? modelName.substring('openrouter:'.length)
      : modelName;
    return nameWithoutPrefix.split('/').pop() || nameWithoutPrefix;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between max-w-screen-2xl px-4 md:px-6">
        <div className="flex items-center space-x-2 min-w-[200px]">
          {!showSignIn && <div className="min-w-[150px] h-10"></div>}
          {(
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Gemini API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set Gemini API Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-4">
                    <div className="relative">
                      <Input
                        placeholder="Enter your Gemini API key"
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                        type={showApiKey ? "text" : "password"}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={saveApiKey}
                        className="flex-1"
                        disabled={!tempApiKey || isValidatingKey}
                      >
                        Save Key
                      </Button>
                      <Button
                        onClick={testApiKey}
                        className="flex-1"
                        disabled={!tempApiKey || isValidatingKey}
                      >
                        Test Key
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {showSignIn && (
            <>
              {isSignedIn === undefined ? (
                <Button variant="outline" size="sm" disabled>Loading Auth...</Button>
              ) : isSignedIn ? (
                <div className="flex items-center space-x-2">
                  <div className="flex flex-col items-start text-xs">
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
            </>
          )}
          {!showSignIn && <div className="min-w-[150px] h-10"></div>}
        </div>

        <div className="flex items-center justify-center flex-grow">
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

        <div className="flex items-center space-x-2 min-w-[150px] justify-end">
          <TooltipProvider delayDuration={100}>
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
                <div className="flex-grow overflow-y-auto pr-2">
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
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="models">
                      <Card>
                        <CardHeader>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6 scrollbar-hide">
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
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              </DialogContent>
            </Dialog>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
}