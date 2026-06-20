/** Design tokens for the Interview Management System.
 *  Palette + type system documented in docs/ARCHITECTURE.md (Design section).
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1C2433',
        muted: '#6B7280',
        canvas: '#F5F6F8',
        surface: '#FFFFFF',
        border: '#E2E5EA',
        // Dark-mode surfaces — deliberately a cool charcoal, not pure black,
        // so the brand/signal/moss/clay accent colors keep their contrast.
        'ink-dark': '#E7E9EE',
        'muted-dark': '#8A93A6',
        'canvas-dark': '#10131A',
        'surface-dark': '#171B24',
        'border-dark': '#2A2F3A',
        brand: {
          DEFAULT: '#3454D1',
          dark: '#26399C',
          light: '#EEF1FC',
        },
        signal: {
          DEFAULT: '#F2A93B',
          light: '#FCEFD9',
        },
        moss: {
          DEFAULT: '#2E8B57',
          light: '#E3F2E9',
        },
        clay: {
          DEFAULT: '#C1502E',
          light: '#F8E6DF',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        card: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,36,51,0.04), 0 8px 24px -8px rgba(28,36,51,0.08)',
      },
    },
  },
  plugins: [],
};
