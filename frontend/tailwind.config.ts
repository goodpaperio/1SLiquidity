import { error } from 'console'
import type { Config } from 'tailwindcss'
import scrollbarHide from 'tailwind-scrollbar-hide'

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primaryRed: 'var(--primary-red)',
        primary: 'var(--primary)',
        secondary: 'var(--secondary)',
        // background: 'hsl(var(--background))',
        // foreground: 'hsl(var(--foreground))',
        // primaryRed: 'var(--primary-red)',
        // primary: {
        //   DEFAULT: 'hsl(var(--primary))',
        //   foreground: 'hsl(var(--primary-foreground))',
        // },
        // secondary: {
        //   DEFAULT: 'hsl(var(--secondary))',
        //   foreground: 'hsl(var(--secondary-foreground))',
        // },
        gray: 'var(--border-primary)',
        white72: 'var(--white72)',
        white12: 'var(--white12)',
        white30: 'var(--white30)',
        white1: 'var(--white1)',
        white005: 'var(--white005)',
        white14: 'var(--white14)',
        white52: 'var(--white52)',
        ongoing: 'var(--ongoing)',
        scheduled: 'var(--scheduled)',
        gradientText: 'var(--gradient-text)',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      backgroundImage: {
        primaryGradient: 'var(--primary-gradient)',
        blackGradient: 'var(--black-gradient)',
        successGradient: 'var(--success-gradient)',
        gradientText: 'var(--gradient-text)',
        tabsGradient: 'var(--tabs-gradient)',
        borderGradient: 'var(--border-gradient)',
      },
      borderColor: {
        primary: 'var(--border-primary)',
        success: 'var(--primary)',
        error: 'var(--primary-red)',
        borderBottom: 'var(--border-bottom)',
        gradient: 'var(--border-gradient)',
      },
      textColor: {
        gray: 'var(--text-gray)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      screens: {
        xs: '520px',
        '400': '400px',
      },
    },
  },
  plugins: [scrollbarHide, require('tailwindcss-animate')],
} satisfies Config
