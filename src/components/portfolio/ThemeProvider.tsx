"use client";

import { useEffect, useMemo } from 'react';
import type { PortfolioTheme, FontPair } from '@/lib/portfolio-themes';

interface ThemeProviderProps {
  theme: PortfolioTheme;
  fontPair: FontPair;
  children: React.ReactNode;
}

export function ThemeProvider({ theme, fontPair, children }: ThemeProviderProps) {
  // Inject CSS variables + Google Fonts dynamically
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const colors = theme.colors;

    // ─── CSS Variables ───
    root.style.setProperty('--portfolio-page-bg', colors.pageBg);
    root.style.setProperty('--portfolio-section-bg', colors.sectionBg);
    root.style.setProperty('--portfolio-card-bg', colors.cardBg);
    root.style.setProperty('--portfolio-header-bg', colors.headerBg);
    root.style.setProperty('--portfolio-header-border', colors.headerBorder);
    root.style.setProperty('--portfolio-footer-bg', colors.footerBg);

    root.style.setProperty('--portfolio-heading-text', colors.headingText);
    root.style.setProperty('--portfolio-body-text', colors.bodyText);
    root.style.setProperty('--portfolio-muted-text', colors.mutedText);
    root.style.setProperty('--portfolio-hero-text', colors.heroText);
    root.style.setProperty('--portfolio-header-text', colors.headerText);
    root.style.setProperty('--portfolio-footer-text', colors.footerText);

    root.style.setProperty('--portfolio-primary', colors.primary);
    root.style.setProperty('--portfolio-primary-text', colors.primaryText);
    root.style.setProperty('--portfolio-border', colors.border);
    root.style.setProperty('--portfolio-hero-overlay', colors.heroOverlay);

    // ─── Fonts ───
    root.style.setProperty('--portfolio-font-heading', fontPair.headingFont);
    root.style.setProperty('--portfolio-font-body', fontPair.bodyFont);

    // ─── Dynamic Google Fonts Load ───
    const fontLinkId = 'portfolio-google-fonts';
    let fontLink = document.getElementById(fontLinkId) as HTMLLinkElement | null;
    
    if (!fontLink) {
      fontLink = document.createElement('link');
      fontLink.id = fontLinkId;
      fontLink.rel = 'stylesheet';
      document.head.appendChild(fontLink);
    }
    
    if (fontLink.href !== fontPair.googleFontsUrl) {
      fontLink.href = fontPair.googleFontsUrl;
    }

    // ─── Data Attributes for conditional styling ───
    root.setAttribute('data-portfolio-theme', theme.id);
    root.setAttribute('data-portfolio-dark', String(theme.isDark));

    // ─── Cleanup on unmount ───
    return () => {
      // Optional: reset on unmount
    };
  }, [theme, fontPair]);

  // Inline style wrapper — applies theme + fonts
  const wrapperStyle = useMemo<React.CSSProperties>(() => ({
    background: 'var(--portfolio-page-bg)',
    color: 'var(--portfolio-body-text)',
    fontFamily: 'var(--portfolio-font-body)',
    minHeight: '100vh',
  }), []);

  return (
    <>
      {/* Global style overrides */}
      <style jsx global>{`
        [data-portfolio-theme] {
          --portfolio-font-heading: ${fontPair.headingFont};
          --portfolio-font-body: ${fontPair.bodyFont};
        }
        
        [data-portfolio-theme] h1,
        [data-portfolio-theme] h2,
        [data-portfolio-theme] h3,
        [data-portfolio-theme] h4,
        [data-portfolio-theme] h5,
        [data-portfolio-theme] h6,
        [data-portfolio-theme] .font-headline {
          font-family: var(--portfolio-font-heading);
        }
        
        [data-portfolio-theme] body,
        [data-portfolio-theme] p,
        [data-portfolio-theme] span,
        [data-portfolio-theme] div {
          font-family: var(--portfolio-font-body);
        }
      `}</style>
      
      <div style={wrapperStyle}>
        {children}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// HELPER HOOK — use theme colors in components
// ═══════════════════════════════════════════════════════════════

export function useThemeColors(theme: PortfolioTheme) {
  return theme.colors;
}