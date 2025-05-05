
"use client";

import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if window is defined (runs only on client-side)
    if (typeof window !== 'undefined') {
        const checkDevice = () => {
        setIsMobile(window.innerWidth < 768); // Example breakpoint
        };
        checkDevice(); // Initial check
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice); // Cleanup
    }
  }, []); // Empty dependency array ensures this runs once on mount (client-side)

  return isMobile;
}
