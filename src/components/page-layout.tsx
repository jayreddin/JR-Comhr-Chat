
import React from 'react';
import { AppHeader } from './app-header';
import { Footer } from './footer'; // Import the new Footer component

interface PageLayoutProps {
  children: React.ReactNode;
  currentPageName?: string;
  onSendMessage?: (message: string) => void; // Add optional onSendMessage prop
  onNewChat?: () => void; // Add optional onNewChat prop
  onRestoreChat?: (sessionId: string) => void; // Add optional onRestoreChat prop
}

export function PageLayout({ children, currentPageName, onSendMessage, onNewChat, onRestoreChat }: PageLayoutProps) {
  return (
    // Ensure the root layout div takes full height and uses flex column
    <div className="flex flex-col min-h-screen">
      <AppHeader currentPageName={currentPageName} />
      {/* Make the main content area grow and allow its children to take full height */}
      <main className="flex-grow container mx-auto p-4 md:p-6 flex flex-col overflow-hidden">
        {/* Ensure children can consume the available space */}
        <div className="flex-grow flex flex-col h-full">
            {children}
        </div>
      </main>
       <Footer
            onSendMessage={onSendMessage}
            onNewChat={onNewChat}
            onRestoreChat={onRestoreChat} // Pass restore function to Footer
        />
    </div>
  );
}
