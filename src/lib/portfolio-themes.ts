/**
 * Hafash Portfolio Themes
 * 4 themes: Dark, Light, Mixed, Normal
 * Photographer settings se choose karega
 */

export type ThemeId = 'dark' | 'light' | 'mixed' | 'normal';

export interface PortfolioTheme {
  id: ThemeId;
  name: string;
  description: string;
  preview: string; // emoji for UI
  colors: {
    // Backgrounds
    pageBg: string;
    sectionBg: string;
    cardBg: string;
    heroOverlay: string;
    
    // Text
    headingText: string;
    bodyText: string;
    mutedText: string;
    heroText: string;
    
    // Accents
    primary: string;
    primaryText: string;
    border: string;
    
    // Header
    headerBg: string;
    headerBorder: string;
    headerText: string;
    
    // Footer
    footerBg: string;
    footerText: string;
  };
}

export const PORTFOLIO_THEMES: Record<ThemeId, PortfolioTheme> = {
  // ═══ 1. DARK — Premium Black & Gold ═══
  dark: {
    id: 'dark',
    name: 'Royal Dark',
    description: 'Premium black with royal gold accents',
    preview: '🌙',
    colors: {
      pageBg: '#0A0A0A',
      sectionBg: '#111111',
      cardBg: '#1A1A1A',
      heroOverlay: 'linear-gradient(to top, #0A0A0A 0%, rgba(10,10,10,0.6) 50%, transparent 100%)',
      
      headingText: '#FFFFFF',
      bodyText: '#D1D1D1',
      mutedText: '#808080',
      heroText: '#FFFFFF',
      
      primary: '#D4AF37',
      primaryText: '#0A0A0A',
      border: '#2A2A2A',
      
      headerBg: 'rgba(10,10,10,0.9)',
      headerBorder: '#2A2A2A',
      headerText: '#FFFFFF',
      
      footerBg: '#0A0A0A',
      footerText: '#808080',
    },
  },

  // ═══ 2. LIGHT — Minimal White & Gold ═══
  light: {
    id: 'light',
    name: 'Minimal Light',
    description: 'Clean white with gold accents',
    preview: '☀️',
    colors: {
      pageBg: '#FFFFFF',
      sectionBg: '#F8F8F8',
      cardBg: '#FFFFFF',
      heroOverlay: 'linear-gradient(to top, #FFFFFF 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
      
      headingText: '#0A0A0A',
      bodyText: '#333333',
      mutedText: '#666666',
      heroText: '#FFFFFF',
      
      primary: '#B8860B',
      primaryText: '#FFFFFF',
      border: '#E5E5E5',
      
      headerBg: 'rgba(255,255,255,0.95)',
      headerBorder: '#E5E5E5',
      headerText: '#0A0A0A',
      
      footerBg: '#F8F8F8',
      footerText: '#666666',
    },
  },

  // ═══ 3. MIXED — Dark Hero + Light Sections ═══
  mixed: {
    id: 'mixed',
    name: 'Mixed Premium',
    description: 'Dark hero with clean white sections',
    preview: '🌗',
    colors: {
      pageBg: '#FFFFFF',
      sectionBg: '#FFFFFF',
      cardBg: '#F8F8F8',
      heroOverlay: 'linear-gradient(to top, #0A0A0A 0%, rgba(10,10,10,0.7) 50%, transparent 100%)',
      
      headingText: '#0A0A0A',
      bodyText: '#333333',
      mutedText: '#666666',
      heroText: '#FFFFFF',
      
      primary: '#D4AF37',
      primaryText: '#0A0A0A',
      border: '#E5E5E5',
      
      headerBg: 'rgba(255,255,255,0.95)',
      headerBorder: '#E5E5E5',
      headerText: '#0A0A0A',
      
      footerBg: '#0A0A0A',
      footerText: '#808080',
    },
  },

  // ═══ 4. NORMAL — Classic Elegant ═══
  normal: {
    id: 'normal',
    name: 'Classic Normal',
    description: 'Elegant beige with warm brown',
    preview: '📜',
    colors: {
      pageBg: '#FAF7F2',
      sectionBg: '#F5F0E8',
      cardBg: '#FFFFFF',
      heroOverlay: 'linear-gradient(to top, #FAF7F2 0%, rgba(250,247,242,0.5) 50%, transparent 100%)',
      
      headingText: '#2A1810',
      bodyText: '#4A3A2A',
      mutedText: '#8A7A6A',
      heroText: '#FFFFFF',
      
      primary: '#8B6914',
      primaryText: '#FFFFFF',
      border: '#E8DDD0',
      
      headerBg: 'rgba(250,247,242,0.95)',
      headerBorder: '#E8DDD0',
      headerText: '#2A1810',
      
      footerBg: '#2A1810',
      footerText: '#D4C4B4',
    },
  },
};

export const DEFAULT_THEME: ThemeId = 'mixed';

export function getTheme(themeId: string | null | undefined): PortfolioTheme {
  if (!themeId || !(themeId in PORTFOLIO_THEMES)) {
    return PORTFOLIO_THEMES[DEFAULT_THEME];
  }
  return PORTFOLIO_THEMES[themeId as ThemeId];
}

export const THEME_LIST = Object.values(PORTFOLIO_THEMES);