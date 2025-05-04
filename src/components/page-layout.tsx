import React from 'react';
import { AppHeader } from './app-header';
import { Footer } from './footer'; // Import the new Footer component

interface PageLayoutProps {
  children: React.ReactNode;
  currentPageName?: string;
  // Removed showSignIn prop
}

export function PageLayout({ children, currentPageName }: PageLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader currentPageName={currentPageName} /> {/* Removed showSignIn prop */}
      <main className="flex-grow container mx-auto p-4 md:p-6">
        {children}
      </main>
       <Footer /> {/* Use the new Footer component */}
    </div>
  );
}
