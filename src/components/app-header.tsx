"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, MessageSquare, Eye, Mic, Image as ImageIcon, MoreHorizontal, Home } from 'lucide-react';

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

interface AppHeaderProps {
  currentPageName?: string; // Optional prop for current page name override
  showSignIn?: boolean;
}

export function AppHeader({ currentPageName, showSignIn = false }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activePage, setActivePage] = useState<NavItem | null>(null);

  useEffect(() => {
    const currentPathItem = navItems.find(item => pathname.startsWith(item.href));
    setActivePage(currentPathItem || null);
  }, [pathname]);

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const pageTitle = currentPageName || activePage?.name || "OmniSwitch";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between max-w-screen-2xl px-4 md:px-6">
        {/* Left side: Sign In Button or Placeholder */}
        <div className="flex items-center space-x-4">
          {showSignIn ? (
            <Button variant="outline" size="sm">Sign In</Button>
          ) : (
            <Link href="/" className="flex items-center space-x-2 text-primary hover:text-accent transition-colors">
              <Home className="h-5 w-5" />
              <span className="font-semibold hidden sm:inline">Home</span>
            </Link>
          )}
        </div>

        {/* Center: Navigation Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-1 text-lg font-semibold">
              {pageTitle}
              <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56">
            <DropdownMenuLabel>Switch Section</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {navItems.map((item) => (
              <DropdownMenuItem
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`flex items-center gap-2 cursor-pointer ${pathname.startsWith(item.href) ? 'bg-accent text-accent-foreground' : ''}`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </DropdownMenuItem>
            ))}
             <DropdownMenuSeparator />
             <DropdownMenuItem onClick={() => handleNavigation("/")} className="flex items-center gap-2 cursor-pointer">
               <Home className="h-4 w-4" />
               <span>Landing Page</span>
             </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Right side: Placeholder for potential future elements (e.g., user avatar) */}
        <div className="w-20 flex justify-end">
           {/* Reserved space */}
        </div>
      </div>
    </header>
  );
}
