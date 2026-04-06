import type { Config } from 'tailwindcss';

/** OmniDLOS Tailwind Preset — extend your tailwind.config.ts with this */
export const omnidlosPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        omnidlos: {
          bg: '#0a0a0a',
          'bg-secondary': '#111111',
          'bg-tertiary': '#1a1a1a',
          accent: '#0EA5E9',
          'accent-secondary': '#06B6D4',
          'accent-tertiary': '#8B5CF6',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
        },
      },
      backdropBlur: {
        omnidlos: '24px',
      },
      borderRadius: {
        omnidlos: '16px',
        'omnidlos-card': '12px',
        'omnidlos-modal': '20px',
      },
      fontFamily: {
        heading: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'omnidlos-glow': '0 0 20px rgba(14, 165, 233, 0.3)',
        'omnidlos-glow-success': '0 0 20px rgba(16, 185, 129, 0.3)',
      },
    },
  },
};
