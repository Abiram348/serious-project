import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'hsl(240 10% 3.9%)',
        foreground: 'hsl(210 40% 90%)',
        card: 'hsl(240 10% 6%)',
        'card-foreground': 'hsl(210 40% 90%)',
        popover: 'hsl(240 10% 8%)',
        'popover-foreground': 'hsl(210 40% 90%)',
        primary: {
          DEFAULT: 'hsl(190 100% 50%)',
          foreground: 'hsl(240 10% 3.9%)',
        },
        secondary: {
          DEFAULT: 'hsl(260 80% 60%)',
          foreground: 'hsl(210 40% 98%)',
        },
        muted: {
          DEFAULT: 'hsl(240 5% 15%)',
          foreground: 'hsl(215 20% 65%)',
        },
        accent: {
          DEFAULT: 'hsl(155 100% 45%)',
          foreground: 'hsl(240 10% 3.9%)',
        },
        destructive: {
          DEFAULT: 'hsl(0 84% 60%)',
          foreground: 'hsl(210 40% 98%)',
        },
        warning: {
          DEFAULT: 'hsl(38 92% 50%)',
          foreground: 'hsl(240 10% 3.9%)',
        },
        border: 'hsl(240 5% 18%)',
        input: 'hsl(240 5% 18%)',
        ring: 'hsl(190 100% 50%)',
        surface: {
          DEFAULT: 'hsl(240 10% 10%)',
          elevated: 'hsl(240 10% 13%)',
          overlay: 'hsl(240 10% 16%)',
        },
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.25rem',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'JetBrains Mono', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.3)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 212, 255, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'float-y': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'card-breath': {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 hsl(190 100% 50% / 0)' },
          '50%': { transform: 'scale(1.012)', boxShadow: '0 0 24px 0 hsl(190 100% 50% / 0.18)' },
        },
        'ring-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'progress-loop': {
          '0%': { width: '12%' },
          '45%': { width: '78%' },
          '60%': { width: '82%' },
          '80%': { width: '64%' },
          '100%': { width: '12%' },
        },
        'dot-travel': {
          '0%': { offsetDistance: '0%', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { offsetDistance: '100%', opacity: '0' },
        },
        'typing-dots': {
          '0%, 20%': { content: '"."' },
          '40%': { content: '".."' },
          '60%, 100%': { content: '"..."' },
        },
        'typing-fade': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        'node-blink': {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'fade-in-left': 'fade-in-left 0.3s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'scan-line': 'scan-line 3s linear infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'float-y': 'float-y 4s ease-in-out infinite',
        'card-breath': 'card-breath 3.6s ease-in-out infinite',
        'ring-spin': 'ring-spin 14s linear infinite',
        'progress-loop': 'progress-loop 9s ease-in-out infinite',
        'node-blink': 'node-blink 1.6s ease-in-out infinite',
        'typing-fade': 'typing-fade 1.4s ease-in-out infinite',
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
        'dot-pattern':
          'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      backgroundSize: {
        'grid': '32px 32px',
        'dot': '20px 20px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
} satisfies Config;
