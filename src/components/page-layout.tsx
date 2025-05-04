import React from 'react';
import { AppHeader } from './app-header';
import { Footer } from './footer'; // Import the new Footer component

interface PageLayoutProps {
  children: React.ReactNode;
  currentPageName?: string;
}

export function PageLayout({ children, currentPageName }: PageLayoutProps) {
  return (
    // Ensure the root layout div takes full height and uses flex column
    <div className="flex flex-col min-h-screen">
      <AppHeader currentPageName={currentPageName} />
      {/* Make the main content area grow and allow its children to take full height */}
      <main className="flex-grow container mx-auto p-4 md:p-6 flex flex-col overflow-hidden">
        {children}
      </main>
       <Footer /> {/* Footer remains sticky at the bottom */}
    </div>
  );
}
