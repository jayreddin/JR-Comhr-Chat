
"use client";

import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const providerLinks = [
    { name: "Jamie Reddin", href: "https://jayreddin.github.io" },
    { name: "Jamie Discord", href: "https://discord.gg/3YdvQfpPPr" },
    { name: "Puter.com", href: "https://puter.com" },
    { name: "Puter.com Discord", href: "https://discord.gg/gtVFcCQa" },
    { name: "Google Gemini", href: "https://gemini.google.com" },
    { name: "OpenRouter", href: "https://openrouter.ai/" },
];

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="py-4 px-4 md:px-6 text-center text-xs text-muted-foreground border-t">
            <p>
                Created by{' '}
                <a
                    href="https://jayreddin.github.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                >
                    Jamie Reddin
                </a>{' '}
                using{' '}
                <a
                    href="https://puter.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-foreground"
                >
                    Puter.com
                </a>{' '}
                and other{' '}
                <Popover>
                    <PopoverTrigger asChild>
                    <Button variant="link" size="sm" className="p-0 h-auto text-xs text-muted-foreground underline hover:text-foreground">
                        providers
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="center">
                    <ul className="space-y-1">
                        {providerLinks.map((link) => (
                        <li key={link.name}>
                            <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm"
                            >
                            {link.name}
                            </a>
                        </li>
                        ))}
                    </ul>
                    </PopoverContent>
                </Popover>
                . | JR Comhrá AI &copy; {currentYear}
            </p>
         </footer>
    );
}
