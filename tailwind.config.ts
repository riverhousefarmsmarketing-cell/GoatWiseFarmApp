import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── RiverHouse Farms Brand Palette (Brand Guide v5) ──
        // Forest Green — Land, Stability, Structure
        rhf: {
          forest: {
            sidebar: '#031812',
            DEFAULT: '#0A3228',
            mid: '#105040',
            light: '#1A7058',
            bright: '#289878',
            pale: '#B8DCC8',
          },
          burgundy: {
            DEFAULT: '#5E1840',
            light: '#7E2858',
            pale: '#F4E4EE',
          },
          warm: '#E8E0D8',
          surface: '#FAFAF9',
        },
        // ── Semantic aliases mapped to brand palette ──
        // These replace the old primary-50..950 scale
        primary: {
          50: '#B8DCC8',   // forest pale — light backgrounds
          100: '#B8DCC8',
          200: '#289878',  // forest bright
          300: '#289878',
          400: '#1A7058',  // forest light
          500: '#105040',  // forest mid — primary actions
          600: '#105040',  // forest mid — buttons, links
          700: '#0A3228',  // forest DEFAULT — hover states
          800: '#0A3228',
          900: '#031812',  // forest sidebar — darkest
          950: '#031812',
        },
        accent: {
          50: '#F4E4EE',   // burgundy pale
          100: '#F4E4EE',
          200: '#F4E4EE',
          500: '#7E2858',  // burgundy light
          600: '#5E1840',  // burgundy DEFAULT
          700: '#5E1840',
          800: '#5E1840',
        },
      },
      fontFamily: {
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
