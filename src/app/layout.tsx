
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import Script from 'next/script'; // Import next/script
import { AppStateProvider } from '@/context/app-state-context'; // Import the provider

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'JR Comhrá AI', // Updated App Name
  description: 'AI chat app with multiple functionalities',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Ensure no whitespace directly inside html tag
    <html lang="en" suppressHydrationWarning>
      <head>
          {/* Add Puter.js script here */}
          <Script src="https://js.puter.com/v2/" strategy="beforeInteractive" />
      </head>
      {/* Remove suppressHydrationWarning from body, keep only on html */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
         <AppStateProvider> {/* Wrap children with the provider */}
           {children}
           <Toaster />
         </AppStateProvider>
      </body>
    </html>
  );
}
