
import React from 'react';
import { AppHeader } from './app-header';
import { Footer, FileUploadData } from './footer'; // Import the new Footer component and FileUploadData

interface PageLayoutProps {
  children: React.ReactNode;
  currentPageName?: string;
  showSignIn?: boolean; // Add optional prop to control sign-in display
  // Update onSendMessage to accept FileUploadData
  onSendMessage?: (message: string, fileUploadData?: FileUploadData) => void;
  onNewChat?: () => void; // Add optional onNewChat prop
  onRestoreChat?: (sessionId: string) => void; // Add optional onRestoreChat prop
}

export function PageLayout({
    children,
    currentPageName,
    showSignIn = true, // Default to true if not provided
    onSendMessage,
    onNewChat,
    onRestoreChat
}: PageLayoutProps) {
  return (
    // Ensure the root layout div takes full height and uses flex column
    <div className="flex flex-col min-h-screen">
       {/* Pass showSignIn prop to AppHeader */}
      <AppHeader currentPageName={currentPageName} showSignIn={showSignIn} />
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
