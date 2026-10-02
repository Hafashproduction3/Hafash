/**
 * Hafash Portfolio Themes
 * 10 Predefined Themes + Custom Colors
 * 4 Font Pairs
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ThemeId =
  | 'royal-gold'
  | 'midnight-blue'
  | 'rose-gold'
  | 'emerald'
  | 'monochrome'
  | 'ivory-classic'
  | 'coral-sunset'
  | 'deep-maroon'
  | 'charcoal-copper'
  | 'pearl-white'
  | 'custom';

export type FontPairId =
  | 'playfair-ptsans'
  | 'cormorant-montserrat'
  | 'bebas-lato'
  | 'greatvibes-opensans';

export interface ThemeColors {
  // Backgrounds
  pageBg: string;
  sectionBg: string;
  cardBg: string;
  headerBg: string;
  headerBorder: string;
  footerBg: string;
  
  // Text
  headingText: string;
  bodyText: string;
  mutedText: string;
  heroText: string;
  headerText: string;
  footerText: string;
  
  // Accents
  primary: string;
  primaryText: string;
  border: string;
  
  // Special
  heroOverlay: string;
}

export interface PortfolioTheme {
  id: ThemeId;
  name: string;
  description: string;
  preview: string; // emoji
  isDark: boolean;
  colors: ThemeColors;
}

export interface FontPair {
  id: FontPairId;
  name: string;
  description: string;
  headingFont: string;
  bodyFont: string;
  googleFontsUrl: string;
}

// ═══════════════════════════════════════════════════════════════
// 10 PREDEFINED THEMES
// ═══════════════════════════════════════════════════════════════

export const PORTFOLIO_THEMES: Record<ThemeId, PortfolioTheme> = {
  // ═══ 1. ROYAL GOLD (Default) ═══
  'royal-gold': {
    id: 'royal-gold',
    name: 'Royal Gold',
    description: 'Premium black with royal gold accents',
    preview: '👑',
    isDark: true,
    colors: {
      pageBg: '#0A0A0A',
      sectionBg: '#111111',
      cardBg: '#1A1A1A',
      headerBg: 'rgba(10,10,10,0.9)',
      headerBorder: '#2A2A2A',
      footerBg: '#0A0A0A',
      headingText: '#FFFFFF',
      bodyText: '#D1D1D1',
      mutedText: '#808080',
      heroText: '#FFFFFF',
      headerText: '#FFFFFF',
      footerText: '#808080',
      primary: '#D4AF37',
      primaryText: '#0A0A0A',
      border: '#2A2A2A',
      heroOverlay: 'linear-gradient(to top, #0A0A0A 0%, rgba(10,10,10,0.6) 50%, transparent 100%)',
    },
  },

  // ═══ 2. MIDNIGHT BLUE ═══
  'midnight-blue': {
    id: 'midnight-blue',
    name: 'Midnight Blue',
    description: 'Deep navy with silver accents',
    preview: '🌙',
    isDark: true,
    colors: {
      pageBg: '#0A1428',
      sectionBg: '#0F1B33',
      cardBg: '#152238',
      headerBg: 'rgba(10,20,40,0.9)',
      headerBorder: '#1E2D48',
      footerBg: '#0A1428',
      headingText: '#FFFFFF',
      bodyText: '#B8C5D6',
      mutedText: '#6B7A8F',
      heroText: '#FFFFFF',
      headerText: '#FFFFFF',
      footerText: '#6B7A8F',
      primary: '#C0C0C0',
      primaryText: '#0A1428',
      border: '#1E2D48',
      heroOverlay: 'linear-gradient(to top, #0A1428 0%, rgba(10,20,40,0.6) 50%, transparent 100%)',
    },
  },

  // ═══ 3. ROSE GOLD ═══
  'rose-gold': {
    id: 'rose-gold',
    name: 'Rose Gold',
    description: 'Romantic pink with rose gold',
    preview: '🌹',
    isDark: false,
    colors: {
      pageBg: '#FDF6F3',
      sectionBg: '#F9EDE8',
      cardBg: '#FFFFFF',
      headerBg: 'rgba(253,246,243,0.95)',
      headerBorder: '#E8D5D0',
      footerBg: '#2A1818',
      headingText: '#2A1818',
      bodyText: '#5A3A38',
      mutedText: '#9B7B78',
      heroText: '#FFFFFF',
      headerText: '#2A1818',
      footerText: '#9B7B78',
      primary: '#B76E79',
      primaryText: '#FFFFFF',
      border: '#E8D5D0',
      heroOverlay: 'linear-gradient(to top, #FDF6F3 0%, rgba(253,246,243,0.4) 50%, transparent 100%)',
    },
  },

  // ═══ 4. EMERALD ═══
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    description: 'Classic green with cream',
    preview: '💚',
    isDark: false,
    colors: {
      pageBg: '#F7F5EF',
      sectionBg: '#EDE9DF',
      cardBg: '#FFFFFF',
      headerBg: 'rgba(247,245,239,0.95)',
      headerBorder: '#D5D0C0',
      footerBg: '#1A2E1F',
      headingText: '#1A2E1F',
      bodyText: '#3A4A3F',
      mutedText: '#7A8A7F',
      heroText: '#FFFFFF',
      headerText: '#1A2E1F',
      footerText: '#7A8A7F',
      primary: '#2D6A4F',
      primaryText: '#FFFFFF',
      border: '#D5D0C0',
      heroOverlay: 'linear-gradient(to top, #F7F5EF 0%, rgba(247,245,239,0.4) 50%, transparent 100%)',
    },
  },

  // ═══ 5. MONOCHROME ═══
  monochrome: {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'Pure black and white minimal',
    preview: '⚫',
    isDark: false,
    colors: {
      pageBg: '#FFFFFF',
      sectionBg: '#F5F5F5',
      cardBg: '#FFFFFF',
      headerBg: 'rgba(255,255,255,0.95)',
      headerBorder: '#E0E0E0',
      footerBg: '#0A0A0A',
      headingText: '#0A0A0A',
      bodyText: '#333333',
      mutedText: '#808080',
      heroText: '#FFFFFF',
      headerText: '#0A0A0A',
      footerText: '#808080',
      primary: '#0A0A0A',
      primaryText: '#FFFFFF',
      border: '#E0E0E0',
      heroOverlay: 'linear-gradient(to top, #FFFFFF 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
    },
  },

  // ═══ 6. IVORY CLASSIC ═══
  'ivory-classic': {
    id: 'ivory-classic',
    name: 'Ivory Classic',
    description: 'Traditional cream with brown',
    preview: '📜',
    isDark: false,
    colors: {
      pageBg: '#FAF7F2',
      sectionBg: '#F5F0E8',
      cardBg: '#FFFFFF',
      headerBg: 'rgba(250,247,242,0.95)',
      headerBorder: '#E8DDD0',
      footerBg: '#2A1810',
      headingText: '#2A1810',
      bodyText: '#4A3A2A',
      mutedText: '#8A7A6A',
      heroText: '#FFFFFF',
      headerText: '#2A1810',
      footerText: '#8A7A6A',
      primary: '#8B6914',
      primaryText: '#FFFFFF',
      border: '#E8DDD0',
      heroOverlay: 'linear-gradient(to top, #FAF7F2 0%, rgba(250,247,242,0.5) 50%, transparent 100%)',
    },
  },

  // ═══ 7. CORAL SUNSET ═══
  'coral-sunset': {
    id: 'coral-sunset',
    name: 'Coral Sunset',
    description: 'Warm coral and peach tones',
    preview: '🌅',
    isDark: false,
    colors: {
      pageBg: '#FFF8F5',
      sectionBg: '#FFEFE8',
      cardBg: '#FFFFFF',
      headerBg: 'rgba(255,248,245,0.95)',
      headerBorder: '#FFD5C5',
      footerBg: '#2A1815',
      headingText: '#2A1815',
      bodyText: '#5A3A30',
      mutedText: '#9A7A70',
      heroText: '#FFFFFF',
      headerText: '#2A1815',
      footerText: '#9A7A70',
      primary: '#FF6B4A',
      primaryText: '#FFFFFF',
      border: '#FFD5C5',
      heroOverlay: 'linear-gradient(to top, #FFF8F5 0%, rgba(255,248,245,0.4) 50%, transparent 100%)',
    },
  },

  // ═══ 8. DEEP MAROON ═══
  'deep-maroon': {
    id: 'deep-maroon',
    name: 'Deep Maroon',
    description: 'Regal maroon with gold',
    preview: '🍷',
    isDark: true,
    colors: {
      pageBg: '#1A0808',
      sectionBg: '#250C0C',
      cardBg: '#2F1010',
      headerBg: 'rgba(26,8,8,0.9)',
      headerBorder: '#3A1818',
      footerBg: '#1A0808',
      headingText: '#FFFFFF',
      bodyText: '#E0C0C0',
      mutedText: '#A08080',
      heroText: '#FFFFFF',
      headerText: '#FFFFFF',
      footerText: '#808080',
      primary: '#D4AF37',
      primaryText: '#1A0808',
      border: '#3A1818',
      heroOverlay: 'linear-gradient(to top, #1A0808 0%, rgba(26,8,8,0.6) 50%, transparent 100%)',
    },
  },

  // ═══ 9. CHARCOAL COPPER ═══
  'charcoal-copper': {
    id: 'charcoal-copper',
    name: 'Charcoal Copper',
    description: 'Modern charcoal with copper',
    preview: '🔶',
    isDark: true,
    colors: {
      pageBg: '#1A1A1A',
      sectionBg: '#222222',
      cardBg: '#2A2A2A',
      headerBg: 'rgba(26,26,26,0.9)',
      headerBorder: '#333333',
      footerBg: '#1A1A1A',
      headingText: '#FFFFFF',
      bodyText: '#C8C8C8',
      mutedText: '#888888',
      heroText: '#FFFFFF',
      headerText: '#FFFFFF',
      footerText: '#888888',
      primary: '#B87333',
      primaryText: '#1A1A1A',
      border: '#333333',
      heroOverlay: 'linear-gradient(to top, #1A1A1A 0%, rgba(26,26,26,0.6) 50%, transparent 100%)',
    },
  },

  // ═══ 10. PEARL WHITE ═══
  'pearl-white': {
    id: 'pearl-white',
    name: 'Pearl White',
    description: 'Pure white with subtle gold',
    preview: '🤍',
    isDark: false,
    colors: {
      pageBg: '#FFFFFF',
      sectionBg: '#FAFAF8',
      cardBg: '#FFFFFF',
      headerBg: 'rgba(255,255,255,0.95)',
      headerBorder: '#E8E8E0',
      footerBg: '#1A1A1A',
      headingText: '#0A0A0A',
      bodyText: '#4A4A4A',
      mutedText: '#8A8A8A',
      heroText: '#FFFFFF',
      headerText: '#0A0A0A',
      footerText: '#8A8A8A',
      primary: '#C9A961',
      primaryText: '#0A0A0A',
      border: '#E8E8E0',
      heroOverlay: 'linear-gradient(to top, #FFFFFF 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
    },
  },

  // ═══ CUSTOM (placeholder — photographer custom colors) ═══
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Your custom colors',
    preview: '🎨',
    isDark: true,
    colors: {
      pageBg: '#0A0A0A',
      sectionBg: '#111111',
      cardBg: '#1A1A1A',
      headerBg: 'rgba(10,10,10,0.9)',
      headerBorder: '#2A2A2A',
      footerBg: '#0A0A0A',
      headingText: '#FFFFFF',
      bodyText: '#D1D1D1',
      mutedText: '#808080',
      heroText: '#FFFFFF',
      headerText: '#FFFFFF',
      footerText: '#808080',
      primary: '#D4AF37',
      primaryText: '#0A0A0A',
      border: '#2A2A2A',
      heroOverlay: 'linear-gradient(to top, #0A0A0A 0%, rgba(10,10,10,0.6) 50%, transparent 100%)',
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// 4 FONT PAIRS
// ═══════════════════════════════════════════════════════════════

export const FONT_PAIRS: Record<FontPairId, FontPair> = {
  'playfair-ptsans': {
    id: 'playfair-ptsans',
    name: 'Playfair + PT Sans',
    description: 'Classic luxury (default)',
    headingFont: "'Playfair Display', serif",
    bodyFont: "'PT Sans', sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=PT+Sans:wght@400;700&display=swap',
  },
  'cormorant-montserrat': {
    id: 'cormorant-montserrat',
    name: 'Cormorant + Montserrat',
    description: 'Elegant modern',
    headingFont: "'Cormorant Garamond', serif",
    bodyFont: "'Montserrat', sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@400;500;700&display=swap',
  },
  'bebas-lato': {
    id: 'bebas-lato',
    name: 'Bebas + Lato',
    description: 'Bold statement',
    headingFont: "'Bebas Neue', sans-serif",
    bodyFont: "'Lato', sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Lato:wght@400;700&display=swap',
  },
  'greatvibes-opensans': {
    id: 'greatvibes-opensans',
    name: 'Great Vibes + Open Sans',
    description: 'Romantic script',
    headingFont: "'Great Vibes', cursive",
    bodyFont: "'Open Sans', sans-serif",
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Open+Sans:wght@400;600;700&display=swap',
  },
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_THEME: ThemeId = 'royal-gold';
export const DEFAULT_FONT: FontPairId = 'playfair-ptsans';

export function getTheme(
  themeId: string | null | undefined,
  customColors?: Partial<ThemeColors>
): PortfolioTheme {
  // If custom theme + custom colors provided
  if (themeId === 'custom' && customColors) {
    return {
      ...PORTFOLIO_THEMES.custom,
      colors: {
        ...PORTFOLIO_THEMES.custom.colors,
        ...customColors,
      },
    };
  }

  if (!themeId || !(themeId in PORTFOLIO_THEMES)) {
    return PORTFOLIO_THEMES[DEFAULT_THEME];
  }

  return PORTFOLIO_THEMES[themeId as ThemeId];
}

export function getFontPair(fontId: string | null | undefined): FontPair {
  if (!fontId || !(fontId in FONT_PAIRS)) {
    return FONT_PAIRS[DEFAULT_FONT];
  }
  return FONT_PAIRS[fontId as FontPairId];
}

export const THEME_LIST = Object.values(PORTFOLIO_THEMES).filter(t => t.id !== 'custom');
export const FONT_LIST = Object.values(FONT_PAIRS);