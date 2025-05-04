import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { MessageSquare, Eye, Mic, Image as ImageIcon, MoreHorizontal } from 'lucide-react';

const sections = [
  { name: "Chat", href: "/chat", icon: MessageSquare, description: "Engage in text-based conversations." },
  { name: "Vision", href: "/vision", icon: Eye, description: "Analyze and understand images." },
  { name: "Talk", href: "/talk", icon: Mic, description: "Interact using voice commands." },
  { name: "Image Gen", href: "/image-gen", icon: ImageIcon, description: "Generate images from text prompts." },
  { name: "More", href: "/more", icon: MoreHorizontal, description: "Explore additional features." },
];

const providerLinks = [
    { name: "Jamie Reddin", href: "https://jayreddin.github.io" },
    { name: "Jamie Discord", href: "https://discord.gg/3YdvQfpPPr" },
    { name: "Puter.com", href: "https://puter.com" },
    { name: "Puter.com Discord", href: "https://discord.gg/gtVFcCQa" },
    { name: "Google Gemini", href: "https://gemini.google.com" },
    { name: "OpenRouter", href: "https://openrouter.ai/" },
];


export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-primary mb-2">OmniSwitch</h1>
        <p className="text-lg text-muted-foreground">Your versatile AI companion.</p>
      </header>
      <main className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl w-full">
        {sections.map((section) => (
          <Link href={section.href} key={section.name} passHref>
            <Card className="hover:shadow-lg transition-shadow duration-300 cursor-pointer flex flex-col h-full group">
              <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                <section.icon className="w-8 h-8 text-accent group-hover:scale-110 transition-transform" />
                <CardTitle className="text-xl font-semibold">{section.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription>{section.description}</CardDescription>
              </CardContent>
              <div className="p-4 pt-0 text-right">
                 <Button variant="link" className="text-accent p-0 h-auto group-hover:underline">
                   Go to {section.name} &rarr;
                 </Button>
              </div>
            </Card>
          </Link>
        ))}
      </main>
      <footer className="mt-12 text-center text-xs text-muted-foreground">
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
          .
        </p>
      </footer>
    </div>
  );
}
