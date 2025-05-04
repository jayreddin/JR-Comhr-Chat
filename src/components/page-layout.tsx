import React from 'react';
import { AppHeader } from './app-header';

interface PageLayoutProps {
  children: React.ReactNode;
  currentPageName?: string;
  showSignIn?: boolean;
}

export function PageLayout({ children, currentPageName, showSignIn = false }: PageLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader currentPageName={currentPageName} showSignIn={showSignIn} />
      <main className="flex-grow container mx-auto p-4 md:p-6">
        {children}
      </main>
       <footer className="py-4 text-center text-sm text-muted-foreground border-t">
         OmniSwitch &copy; {new Date().getFullYear()}
       </footer>
    </div>
  );
}
