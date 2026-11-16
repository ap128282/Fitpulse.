import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B0C10',
        panel: '#1F2833',
        cream: '#F8F9FA',
        line: '#2E3A47',
        royal: '#1A56DB',
        'royal-light': '#6C97F5',
        ember: '#E11D48',
        muted: '#9AA6B5',
        'muted-ink': '#586272',
        'line-cream': '#DDE2E8',
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
