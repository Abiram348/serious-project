import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#FAF6F0',
        foreground: '#1A1817',
        card: '#FFFFFF',
        'card-foreground': '#1A1817',
        popover: '#FFFFFF',
        'popover-foreground': '#1A1817',
        primary: {
          DEFAULT: '#F5500B',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#FFA180',
          foreground: '#1A1817',
        },
        muted: {
          DEFAULT: '#F1EAE2',
          foreground: '#6B6661',
        },
        accent: {
          DEFAULT: '#FFC9B5',
          foreground: '#1A1817',
        },
        destructive: {
          DEFAULT: '#C2410C',
          foreground: '#FFFFFF',
        },
        warning: {
          DEFAULT: '#F59E0B',
          foreground: '#1A1817',
        },
        border: '#EAE2DA',
        input: '#EAE2DA',
        ring: '#F5500B',
        surface: {
          DEFAULT: '#FFFFFF',
          elevated: '#FAF6F0',
          overlay: '#F1EAE2',
        },
        warm: {
          50: '#FAF6F0',
          100: '#F1EAE2',
          200: '#EAE2DA',
          300: '#DDD3C9',
          400: '#D8D0CA',
          500: '#C9C2BB',
          600: '#9B948D',
          700: '#6B6661',
          800: '#4A443E',
          900: '#1A1817',
        },
        orange: {
          DEFAULT: '#F5500B',
          light: '#FFA180',
          soft: '#FFC9B5',
          muted: '#FFD9C7',
        },
        dark: {
          DEFAULT: '#211F1E',
          surface: '#1D1B1A',
        },
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.25rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      fontFamily: {
        sans: ['var(--font-hanken)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
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
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'typing-dot': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.35' },
          '40%': { transform: 'translateY(-3px)', opacity: '1' },
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
      },
      animation: {
        marquee: 'marquee 38s linear infinite',
        'fade-in': 'fade-in 0.4s ease-out',
        'fade-in-up': 'fade-in-up 0.9s ease-out forwards',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        shimmer: 'shimmer 2s linear infinite',
        'typing-dot': 'typing-dot 1.2s ease-in-out infinite',
        blink: 'blink 1.1s step-end infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
} satisfies Config;
