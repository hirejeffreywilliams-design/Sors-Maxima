// OmniDLOS Unified Design System
export const OMNIDLOS_THEME = {
  colors: {
    primary: '#0EA5E9',
    secondary: '#06B6D4', 
    background: '#0a0a0a',
    card: '#111111',
    cardHover: '#161616',
    border: '#1e1e1e',
    borderHover: '#2a2a2a',
    text: '#ffffff',
    textMuted: '#a1a1aa',
    success: '#22c55e',
    warning: '#eab308',
    danger: '#ef4444',
    accent: '#8b5cf6',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #0EA5E9, #06B6D4)',
    accent: 'linear-gradient(135deg, #8b5cf6, #0EA5E9)',
    dark: 'linear-gradient(180deg, #0a0a0a, #111111)',
  },
  brand: {
    name: 'OmniDLOS',
    tagline: 'Digital Life Operating System',
    ecosystem: true,
  }
} as const;
