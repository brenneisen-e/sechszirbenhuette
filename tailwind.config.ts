import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      // Extra small devices (very small phones)
      xs: '360px',
      // Small devices (phones)
      sm: '640px',
      // Medium devices (tablets)
      md: '768px',
      // Large devices (laptops/desktops)
      lg: '1024px',
      // Extra large devices (large desktops)
      xl: '1280px',
      // 2XL devices (extra large screens)
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // Markenfarben (Corporate Design V3, src/styles/brand.css)
        'logo-green': '#263d35',
        zirbe: '#263d35',
        leinen: '#f2efe6',
        fassadenbraun: '#4a3328',
        fensterladenrot: '#e94d3d',
        'on-red': '#141a16',
        rinde: '#202824',
        moos: '#8d987e',
        holz: '#d7c3a2',
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        wood: {
          50: '#faf6f1',
          100: '#f5ede3',
          200: '#e8d5c4',
          300: '#d9b89e',
          400: '#c69876',
          500: '#b87f5a',
          600: '#ab6d4d',
          700: '#8f5841',
          800: '#744839',
          900: '#5f3d31',
          950: '#331e18',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        hand: ['var(--font-hand)'],
        serif: ['Georgia', 'serif'],
      },
      // Fluid spacing scale
      spacing: {
        'safe-top': 'var(--safe-area-inset-top)',
        'safe-bottom': 'var(--safe-area-inset-bottom)',
        'safe-left': 'var(--safe-area-inset-left)',
        'safe-right': 'var(--safe-area-inset-right)',
      },
      // Dynamic viewport height utilities
      minHeight: {
        'screen-dvh': '100dvh',
        'screen-svh': '100svh',
        'screen-lvh': '100lvh',
      },
      height: {
        'screen-dvh': '100dvh',
        'screen-svh': '100svh',
        'screen-lvh': '100lvh',
      },
    },
  },
  plugins: [],
};
export default config;
