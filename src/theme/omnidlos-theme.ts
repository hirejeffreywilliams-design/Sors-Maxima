/**
 * OmniDLOS Design System — Theme Configuration
 * Omnivex Ecosystem Standard
 * 
 * All applications MUST use this theme for visual consistency.
 */

export const OMNIDLOS_THEME = {
  colors: {
    // Core palette
    background: {
      primary: '#0a0a0a',
      secondary: '#111111',
      tertiary: '#1a1a1a',
      elevated: '#1e1e1e',
      glass: 'rgba(10, 10, 10, 0.85)',
    },
    accent: {
      primary: '#0EA5E9',    // Sky blue — primary CTA
      secondary: '#06B6D4',  // Cyan — secondary elements
      tertiary: '#8B5CF6',   // Purple — premium features
      success: '#10B981',    // Emerald — success states
      warning: '#F59E0B',    // Amber — warnings
      error: '#EF4444',      // Red — errors/destructive
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#A1A1AA',
      muted: '#71717A',
      inverse: '#0a0a0a',
    },
    border: {
      default: 'rgba(255, 255, 255, 0.08)',
      hover: 'rgba(255, 255, 255, 0.15)',
      active: '#0EA5E9',
    },
  },

  // Glass-morphism presets
  glass: {
    panel: {
      background: 'rgba(17, 17, 17, 0.75)',
      backdropFilter: 'blur(24px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
    },
    card: {
      background: 'rgba(26, 26, 26, 0.65)',
      backdropFilter: 'blur(16px) saturate(150%)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: '12px',
    },
    modal: {
      background: 'rgba(10, 10, 10, 0.90)',
      backdropFilter: 'blur(32px) saturate(200%)',
      border: '1px solid rgba(255, 255, 255, 0.10)',
      borderRadius: '20px',
    },
  },

  // Typography
  typography: {
    fontFamily: {
      heading: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      body: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", monospace',
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
    },
  },

  // Animation presets
  motion: {
    fast: '150ms ease-out',
    normal: '250ms ease-out',
    slow: '400ms ease-out',
    spring: { type: 'spring', stiffness: 300, damping: 30 },
    gentleSpring: { type: 'spring', stiffness: 200, damping: 25 },
  },

  // Shadows
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
    md: '0 4px 12px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
    glow: {
      primary: '0 0 20px rgba(14, 165, 233, 0.3)',
      success: '0 0 20px rgba(16, 185, 129, 0.3)',
      error: '0 0 20px rgba(239, 68, 68, 0.3)',
    },
  },

  // Spacing
  spacing: {
    page: { x: '1.5rem', y: '2rem' },
    section: '3rem',
    card: '1.5rem',
  },

  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

export type OmniDLOSTheme = typeof OMNIDLOS_THEME;
