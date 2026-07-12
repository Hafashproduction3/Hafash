'use client';

import { cn } from '@/lib/utils';

interface HafashLoaderProps {
  text?: string;
  className?: string;
  fullPage?: boolean;
}

/**
 * Premium Hafash Branded Loader
 * Features breathing animation, scale glow, and a CSS-based appearance delay.
 * The delay prevents "flickering" on extremely fast state transitions.
 */
export function HafashLoader({ 
  text, 
  className, 
  fullPage = true 
}: HafashLoaderProps) {
  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center animate-in fade-in duration-700",
        // We use CSS delay so the component is technically mounted immediately,
        // but only becomes visible if the loading state persists.
        "delay-200 fill-mode-forwards",
        fullPage ? "fixed inset-0 z-[100] bg-background/90 backdrop-blur-md" : "w-full h-full min-h-[400px]",
        className
      )}
    >
      <div className="relative mb-10">
        <img 
          src="/hafash-logo.png" 
          alt="Hafash Logo" 
          className="h-24 lg:h-32 w-auto object-contain animate-breathing"
        />
        <div className="absolute inset-0 bg-primary/10 blur-[50px] rounded-full animate-pulse -z-10" />
      </div>
      
      {text && (
        <div className="text-center space-y-2">
          <p className="text-primary font-headline font-bold italic text-lg lg:text-xl tracking-wide px-6">
            {text}
          </p>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary/50 to-transparent mx-auto" />
          <p className="text-[10px] uppercase font-bold tracking-[0.6em] text-muted-foreground pt-2">
            Luxury Workflow Active
          </p>
        </div>
      )}
    </div>
  );
}
