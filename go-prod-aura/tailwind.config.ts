import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class', '.dark'],
  content: ['./index.html','./src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        manrope: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        'primary-active': 'var(--color-primary-active)',
        'primary-light': 'var(--color-primary-light)',
        accent: 'var(--color-accent)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--info)',
        surface: 'var(--color-bg-surface)',
        elevated: 'var(--color-bg-elevated)',
        border: 'var(--color-border)',
        text: 'var(--color-text-primary)',
        muted: 'var(--color-text-muted)',
        inverse: 'var(--color-text-inverse)',
        violetNeon: {
          500: '#713DFF',
          600: '#5f33d9',
          700: '#3d22a8',
        },
        violetNeonAlt: {
          500: '#9D5CFF',
        },
        night: {
          900: '#0A0118',
          800: '#1A0B2E',
        },
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        'violet-glow': '0 0 20px rgba(113,61,255,.30)',
        'violet-glow-strong': '0 0 40px rgba(113,61,255,.50)',
      },
      backgroundImage: {
        'grad-violet': 'linear-gradient(135deg,#713DFF 0%,#9D5CFF 100%)',
        'grad-dark': 'linear-gradient(180deg,#0A0118 0%,#1A0B2E 100%)',
        'grad-card': 'linear-gradient(135deg,rgba(113,61,255,.10) 0%,rgba(157,92,255,.05) 100%)',
      },
      borderRadius: {
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
      zIndex: {
        modal: 'var(--z-modal)',
        toast: 'var(--z-toast)',
      },
    },
  },
  plugins: [],
} satisfies Config


